import { useState, useEffect } from 'react';
import { ChevronDown, BookOpen, Plus, Eye, Trash2, Edit2, CheckCircle, Circle, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TopicStatus, EditorialData, EditorialSubarea, EditorialTopic } from '@/lib/types';
import { AREA_COLORS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import { EditorialItem } from '@/hooks/useEditorial';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { savePdf } from '@/lib/pdf-helpers';
import { saveAs } from 'file-saver';

interface EditorialProps {
  data: EditorialData;
  setData: (data: EditorialData) => void;
  updateTopicStatus: (areaName: string, subareaName: string, topicName: string, status: string) => Promise<void>;
  onAddXP: (xp: number) => void;
  onTabChange: (tab: string) => void;
  editorials: EditorialItem[];
  selectedEditorialId: string | null;
  setSelectedEditorialId: (id: string | null) => void;
  createEditorial: (name: string) => Promise<string | null>;
  deleteEditorial: (id: string) => Promise<void>;
  renameEditorial: (id: string, name: string) => Promise<void>;
  deleteSubarea?: (areaId: string, subareaId: string) => Promise<void>;
  renameSubarea?: (areaId: string, subareaId: string, newName: string) => Promise<void>;
  deleteTopic?: (areaId: string, subareaId: string, topicId: string) => Promise<void>;
  renameTopic?: (areaId: string, subareaId: string, topicId: string, newName: string) => Promise<void>;
}

const STATUS_CONFIG = {
  [TopicStatus.NOT_STARTED]: {
    label: 'Não Visto',
    color: 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800',
    textColor: 'text-slate-500',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
  },
  [TopicStatus.THEORY_SEEN]: {
    label: 'Visto',
    color: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
  }
};

export default function Editorial({
  data: editorialData,
  setData: setEditorialData,
  updateTopicStatus,
  onAddXP,
  onTabChange,
  editorials,
  selectedEditorialId,
  setSelectedEditorialId,
  createEditorial,
  deleteEditorial,
  renameEditorial,
  deleteSubarea,
  renameSubarea,
  deleteTopic,
  renameTopic
}: EditorialProps) {
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedSubareas, setExpandedSubareas] = useState<Set<string>>(new Set());

  // Dialog states
  const [isAddTopicDialogOpen, setIsAddTopicDialogOpen] = useState(false);
  const [isAddSubareaDialogOpen, setIsAddSubareaDialogOpen] = useState(false);
  const [selectedAreaForTopic, setSelectedAreaForTopic] = useState<string>('');
  const [selectedAreaForSubarea, setSelectedAreaForSubarea] = useState<string>('');
  const [selectedSubareaForTopic, setSelectedSubareaForTopic] = useState<string>('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newSubareaName, setNewSubareaName] = useState('');

  // Editorial management states
  const [isCreateEditorialDialogOpen, setIsCreateEditorialDialogOpen] = useState(false);
  const [newEditorialName, setNewEditorialName] = useState('');
  const [editingEditorialId, setEditingEditorialId] = useState<string | null>(null);
  const [editingEditorialName, setEditingEditorialName] = useState('');

  // Editing Item (Subarea/Topic) states
  const [itemToRename, setItemToRename] = useState<{
    type: 'subarea' | 'topic',
    areaId: string,
    subareaId: string,
    topicId?: string,
    currentName: string
  } | null>(null);
  const [newNameInput, setNewNameInput] = useState('');

  const calculateProgress = () => {
    let total = 0;
    let completed = 0;

    editorialData.areas.forEach(area => {
      area.subareas.forEach(subarea => {
        subarea.topics.forEach(topic => {
          total++;
          if (topic.status !== TopicStatus.NOT_STARTED) {
            completed++;
          }
        });
      });
    });

    return total > 0 ? (completed / total) * 100 : 0;
  };

  const calculateAreaProgress = (options: { areaId?: string, subareaId?: string }) => {
    let total = 0;
    let completed = 0;

    const countTopic = (topic: EditorialTopic) => {
      total++;
      if (topic.status !== TopicStatus.NOT_STARTED) completed++;
    };

    if (options.areaId) {
      const area = editorialData.areas.find(a => a.id === options.areaId);
      area?.subareas.forEach(subarea => subarea.topics.forEach(countTopic));
    } else if (options.subareaId) {
      // Find subarea across all areas (assuming unique IDs ideally, or pass areaId too)
      editorialData.areas.forEach(a => {
        const sub = a.subareas.find(s => s.id === options.subareaId);
        if (sub) sub.topics.forEach(countTopic);
      });
    }

    return total > 0 ? (completed / total) * 100 : 0;
  };

  const toggleArea = (areaId: string) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(areaId)) {
      newExpanded.delete(areaId);
    } else {
      newExpanded.add(areaId);
    }
    setExpandedAreas(newExpanded);
  };

  const toggleSubarea = (subareaId: string) => {
    const newExpanded = new Set(expandedSubareas);
    if (newExpanded.has(subareaId)) {
      newExpanded.delete(subareaId);
    } else {
      newExpanded.add(subareaId);
    }
    setExpandedSubareas(newExpanded);
  };

  const handleToggleSeen = async (areaId: string, subareaId: string, topicId: string, currentStatus: TopicStatus, topicName: string) => {
    // Logic: Toggle between NOT_STARTED and THEORY_SEEN (Mark/Unmark as Seen)
    // If it's anything else (MASTERED, etc), logic can default to toggle off or just set to SEEN if needed.
    // Simplifying to: If NOT_STARTED -> THEORY_SEEN. Else -> NOT_STARTED.

    const newStatus = currentStatus === TopicStatus.NOT_STARTED
      ? TopicStatus.THEORY_SEEN
      : TopicStatus.NOT_STARTED;

    // Optimistic update handled by hook if connected, but let's notify user
    const area = editorialData.areas.find(a => a.id === areaId);
    const subarea = area?.subareas.find(s => s.id === subareaId);

    if (area && subarea) {
      await updateTopicStatus(area.name, subarea.name, topicName, newStatus);

      if (newStatus === TopicStatus.THEORY_SEEN) {
        toast({
          title: "Marcado como visto",
          description: `Você completou o estudo de ${topicName}`,
        });

        // 100% check
        const areaProgress = calculateAreaProgress({ areaId });
        // Since state updates might lag slightly, this check is approximation or needs real-time calc
        if (areaProgress >= 99) { // nearly 100
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        }
      }
    }
  };

  const addCustomTopic = () => {
    if (!newTopicName.trim() || !selectedAreaForTopic || !selectedSubareaForTopic) return;

    const updatedData = { ...editorialData };
    const area = updatedData.areas.find(a => a.id === selectedAreaForTopic);
    const subarea = area?.subareas.find(s => s.id === selectedSubareaForTopic);

    if (area && subarea) {
      const newTopic: EditorialTopic = {
        id: `custom-${Date.now()}`,
        name: newTopicName.trim(),
        status: TopicStatus.NOT_STARTED
      };
      subarea.topics.push(newTopic);
      setEditorialData(updatedData);

      toast({ title: "Tópico Adicionado", description: newTopicName });
      setNewTopicName('');
      setIsAddTopicDialogOpen(false);
    }
  };

  const addCustomSubarea = () => {
    if (!newSubareaName.trim() || !selectedAreaForSubarea) return;

    const updatedData = { ...editorialData };
    const area = updatedData.areas.find(a => a.id === selectedAreaForSubarea);

    if (area) {
      const newSubarea: EditorialSubarea = {
        id: `custom-subarea-${Date.now()}`,
        name: newSubareaName.trim(),
        topics: []
      };
      area.subareas.push(newSubarea);
      setEditorialData(updatedData);

      toast({ title: "Subárea Adicionada", description: newSubareaName });
      setNewSubareaName('');
      setSelectedAreaForSubarea('');
      setIsAddSubareaDialogOpen(false);
    }
  };

  const handleCreateEditorial = async () => {
    if (!newEditorialName.trim()) return;
    const id = await createEditorial(newEditorialName.trim());
    if (id) {
      toast({ title: "Edital Criado", description: newEditorialName });
      setNewEditorialName('');
      setIsCreateEditorialDialogOpen(false);
    }
  };

  const handleDeleteEditorial = async (id: string) => {
    if (editorials.length <= 1) return;
    await deleteEditorial(id);
    toast({ title: "Edital Excluído" });
  };

  const handleSaveRename = async () => {
    if (!itemToRename || !newNameInput.trim()) return;

    try {
      if (itemToRename.type === 'subarea' && renameSubarea) {
        await renameSubarea(itemToRename.areaId, itemToRename.subareaId, newNameInput.trim());
      } else if (itemToRename.type === 'topic' && renameTopic && itemToRename.topicId) {
        await renameTopic(itemToRename.areaId, itemToRename.subareaId, itemToRename.topicId, newNameInput.trim());
      }
      toast({ title: "Item renomeado com sucesso" });
      setItemToRename(null);
      setNewNameInput('');
    } catch (error) {
      toast({ title: "Erro ao renomear", variant: "destructive" });
    }
  };

  const handleDeleteItem = async (type: 'subarea' | 'topic', areaId: string, subareaId: string, topicId?: string) => {
    try {
      if (type === 'subarea' && deleteSubarea) {
        await deleteSubarea(areaId, subareaId);
      } else if (type === 'topic' && deleteTopic && topicId) {
        await deleteTopic(areaId, subareaId, topicId);
      }
      toast({ title: "Item excluído", description: "O item foi removido do edital." });
    } catch (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const handleExportPDF = async () => {
    try {
      const { PdfService } = await import('@/lib/pdf-service');
      const pdf = new PdfService();
      const currentEditorialName = editorials.find(e => e.id === selectedEditorialId)?.name || 'Edital';
      const progress = calculateProgress();

      await pdf.initialize('Relatório de Progresso Acadêmico');
      pdf.addSubtitle(`${currentEditorialName} • Gerado em: ${new Date().toLocaleDateString('pt-BR')}`);

      // --- Progress Card ---
      const startY = pdf.getCurrentY();
      const margin = pdf.getMargin();
      const contentWidth = pdf.getContentWidth();

      pdf.drawCard(margin, startY, contentWidth, 40, 'Progresso Geral do Edital');

      // Determine color based on progress
      let progressColor: [number, number, number] = [60, 60, 60];
      if (progress >= 80) progressColor = [16, 185, 129]; // Emerald
      else if (progress >= 50) progressColor = [245, 158, 11]; // Amber
      else progressColor = [239, 68, 68]; // Red

      pdf.addTextAt(margin + (contentWidth / 2), startY + 25, `${progress.toFixed(1)}%`, 24, {
        align: 'center',
        bold: true,
        color: progressColor
      });

      pdf.moveY(55);

      // --- Detailed Table ---
      const tableData: any[] = [];

      editorialData.areas.forEach(area => {
        // Area Header Row (Custom)
        const areaProgress = calculateAreaProgress({ areaId: area.id });

        // We push a special row for the area
        // Note: PdfService addTable is simple, but we can use autoTable features via options
        // We will flatten it: [Area Name, ''] then [Topic, Status]

        // However, to make it look like the previous section row, we might need a custom hook or just plain rows styled differently.
        // Let's use the 'didParseCell' or 'didDrawCell' to style Area rows if we mark them.

        // Strategy: Add area as a row with a special prefix or metadata
        tableData.push([`>>>AREA<<<${area.name.toUpperCase()} (${areaProgress.toFixed(0)}%)`, '']);

        area.subareas.forEach(subarea => {
          subarea.topics.forEach(topic => {
            const status = topic.status === TopicStatus.THEORY_SEEN ? 'VISTO' : 'NÃO VISTO';
            tableData.push([
              `${subarea.name}: ${topic.name}`,
              status
            ]);
          });
        });
      });

      pdf.addTable(
        ['Tópico', 'Status'],
        tableData,
        {
          columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 40, halign: 'center' }
          },
          didParseCell: (data: any) => {
            // Style Area Rows
            if (data.section === 'body' && data.row.raw[0].toString().startsWith('>>>AREA<<<')) {
              // It's a header row
              data.cell.styles.fillColor = [240, 240, 240];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.textColor = [0, 0, 0];

              if (data.column.index === 0) {
                data.cell.colSpan = 2;
                data.cell.text = [data.row.raw[0].toString().replace('>>>AREA<<<', '')];
              }
            }

            // Style Status Cell
            if (data.section === 'body' && data.column.index === 1 && !data.row.raw[0].toString().startsWith('>>>AREA<<<')) {
              if (data.cell.text[0] === 'VISTO') {
                data.cell.styles.textColor = [22, 163, 74];
                data.cell.styles.fontStyle = 'bold';
              } else {
                data.cell.styles.textColor = [156, 163, 175];
              }
            }
          }
        }
      );

      const filename = `progresso_edital_${new Date().toISOString().split('T')[0]}`;
      pdf.save(filename);

      toast({ title: "PDF Exportado", description: "O relatório de progresso foi baixado." });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao gerar PDF", variant: "destructive", description: "Ocorreu um erro." });
    }
  };

  const globalProgress = calculateProgress();
  const currentEditorialName = editorials.find(e => e.id === selectedEditorialId)?.name || 'CNRM Geral';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5" />
              Selecionar Edital
            </CardTitle>
            <CardDescription>
              Gerencie múltiplos editais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={selectedEditorialId || ''} onValueChange={setSelectedEditorialId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um edital" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {editorials.map(ed => (
                    <SelectItem key={ed.id} value={ed.id}>{ed.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setIsCreateEditorialDialogOpen(true)} title="Novo Edital">
                <Plus className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => selectedEditorialId && handleDeleteEditorial(selectedEditorialId)} disabled={editorials.length <= 1} title="Excluir Edital">
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleExportPDF} title="Exportar PDF do Progresso">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-6 h-6" />
              Progresso Geral
            </CardTitle>
            <CardDescription>
              {currentEditorialName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Conclusão</span>
                <span>{globalProgress.toFixed(1)}%</span>
              </div>
              <Progress value={globalProgress} className="h-3 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Areas List */}
      <div className="space-y-4">
        {editorialData.areas.map(area => {
          const areaProgress = calculateAreaProgress({ areaId: area.id });
          const isExpanded = expandedAreas.has(area.id);

          return (
            <Card key={area.id} className="overflow-hidden border-l-4" style={{ borderLeftColor: AREA_COLORS[area.name] || '#888' }}>
              <div
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleArea(area.id)}
              >
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <CardTitle className="text-lg">{area.name}</CardTitle>
                          <span className="text-sm font-bold text-muted-foreground">{areaProgress.toFixed(0)}%</span>
                        </div>
                        <Progress value={areaProgress} className="h-1.5" />
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 ml-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </div>

              {isExpanded && (
                <CardContent className="pt-0 pb-4 bg-slate-50/50 dark:bg-slate-900/20">
                  <div className="space-y-4 mt-4">
                    {area.subareas.map(subarea => {
                      const isSubareaExpanded = expandedSubareas.has(subarea.id);
                      const subProgress = calculateAreaProgress({ subareaId: subarea.id });

                      return (
                        <div key={subarea.id} className="bg-background border rounded-lg overflow-hidden shadow-sm">
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleSubarea(subarea.id)}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <h4 className="font-semibold text-sm">{subarea.name}</h4>
                              <span className="text-xs text-muted-foreground">({subProgress.toFixed(0)}%)</span>
                            </div>

                            <div className="flex items-center gap-1 group">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-20 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setItemToRename({ type: 'subarea', areaId: area.id, subareaId: subarea.id, currentName: subarea.name });
                                  setNewNameInput(subarea.name);
                                }}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive opacity-20 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem('subarea', area.id, subarea.id);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                              <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isSubareaExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {isSubareaExpanded && (
                            <div className="p-3 pt-0 space-y-2 border-t bg-muted/30">
                              {subarea.topics.map(topic => {
                                const statusConfig = STATUS_CONFIG[topic.status === TopicStatus.NOT_STARTED ? TopicStatus.NOT_STARTED : TopicStatus.THEORY_SEEN];
                                const isSeen = topic.status !== TopicStatus.NOT_STARTED;

                                return (
                                  <div
                                    key={topic.id}
                                    className={`flex items-center justify-between p-3 rounded-md bg-background border transition-all hover:shadow-sm group items-start ${isSeen ? 'border-emerald-200/50' : 'border-slate-100'}`}
                                  >
                                    <div className="flex-1 min-w-0 mr-3">
                                      <span className={`text-sm font-medium block truncate ${isSeen ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {topic.name}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <Button
                                        variant={isSeen ? "default" : "outline"}
                                        size="sm"
                                        className={`h-8 gap-2 transition-all ${isSeen ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent' : 'text-muted-foreground hover:text-emerald-600 hover:border-emerald-200'}`}
                                        onClick={() => handleToggleSeen(area.id, subarea.id, topic.id, topic.status, topic.name)}
                                        title={isSeen ? "Marcar como não visto" : "Marcar como visto"}
                                      >
                                        {isSeen ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 opacity-50" />}
                                        <span className="text-xs hidden sm:inline">{isSeen ? 'Visto' : 'Marcar'}</span>
                                      </Button>

                                      <div className="flex items-center gap-0.5 border-l pl-2 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                                          onClick={() => {
                                            setItemToRename({ type: 'topic', areaId: area.id, subareaId: subarea.id, topicId: topic.id, currentName: topic.name });
                                            setNewNameInput(topic.name);
                                          }}
                                          title="Editar tópico"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                          onClick={() => handleDeleteItem('topic', area.id, subarea.id, topic.id)}
                                          title="Excluir tópico"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Custom Items Buttons */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row gap-3 p-4">
          <Button onClick={() => setIsAddSubareaDialogOpen(true)} variant="outline" className="flex-1">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Subárea
          </Button>
          <Button onClick={() => setIsAddTopicDialogOpen(true)} variant="outline" className="flex-1">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Tópico
          </Button>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={isAddSubareaDialogOpen} onOpenChange={setIsAddSubareaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Subárea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Grande Área</Label>
              <Select value={selectedAreaForSubarea} onValueChange={setSelectedAreaForSubarea}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  {editorialData.areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={newSubareaName} onChange={e => setNewSubareaName(e.target.value)} placeholder="Ex: Doenças Raras" />
            </div>
            <Button onClick={addCustomSubarea} className="w-full">Criar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddTopicDialogOpen} onOpenChange={setIsAddTopicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Tópico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={selectedAreaForTopic} onValueChange={setSelectedAreaForTopic}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  {editorialData.areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedAreaForTopic && (
              <div className="space-y-2">
                <Label>Subárea</Label>
                <Select value={selectedSubareaForTopic} onValueChange={setSelectedSubareaForTopic}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="z-50 bg-background">
                    {editorialData.areas.find(a => a.id === selectedAreaForTopic)?.subareas.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nome do Tópico</Label>
              <Input value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="Ex: Tratamento X" />
            </div>
            <Button onClick={addCustomTopic} className="w-full">Criar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateEditorialDialogOpen} onOpenChange={setIsCreateEditorialDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Criar Edital</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={newEditorialName} onChange={e => setNewEditorialName(e.target.value)} placeholder="Nome do edital" />
            </div>
            <Button onClick={handleCreateEditorial} className="w-full">Criar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Item Dialog */}
      <Dialog open={!!itemToRename} onOpenChange={(open) => !open && setItemToRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear {itemToRename?.type === 'subarea' ? 'Subárea' : 'Tópico'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Novo Nome</Label>
              <Input value={newNameInput} onChange={e => setNewNameInput(e.target.value)} />
            </div>
            <Button onClick={handleSaveRename} className="w-full">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
