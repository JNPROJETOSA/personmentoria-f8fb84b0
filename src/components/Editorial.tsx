import { useState, useEffect } from 'react';
import { ChevronDown, BookOpen, Plus, Zap, Trophy, Sparkles, Trash2, Edit2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MedicalArea, TopicStatus, EditorialData, EditorialArea, EditorialSubarea, EditorialTopic } from '@/lib/types';
import { AREA_COLORS, EDITORIAL_TEMPLATE } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import { EditorialItem } from '@/hooks/useEditorial';

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
}

const STATUS_CONFIG = {
  [TopicStatus.NOT_STARTED]: {
    label: 'Não Iniciado',
    color: 'bg-slate-300 dark:bg-slate-600',
    textColor: 'text-slate-700 dark:text-slate-300',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  },
  [TopicStatus.THEORY_SEEN]: {
    label: 'Teoria Vista',
    color: 'bg-blue-400 dark:bg-blue-600',
    textColor: 'text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
  },
  [TopicStatus.MATERIALS_DONE]: {
    label: 'Materiais Feitos',
    color: 'bg-amber-400 dark:bg-amber-600',
    textColor: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
  },
  [TopicStatus.MASTERED]: {
    label: 'Dominado',
    color: 'bg-emerald-500 dark:bg-emerald-600',
    textColor: 'text-emerald-700 dark:text-emerald-300',
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
  renameEditorial
}: EditorialProps) {
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedSubareas, setExpandedSubareas] = useState<Set<string>>(new Set());
  const [isAddTopicDialogOpen, setIsAddTopicDialogOpen] = useState(false);
  const [isAddSubareaDialogOpen, setIsAddSubareaDialogOpen] = useState(false);
  const [selectedAreaForTopic, setSelectedAreaForTopic] = useState<string>('');
  const [selectedAreaForSubarea, setSelectedAreaForSubarea] = useState<string>('');
  const [selectedSubareaForTopic, setSelectedSubareaForTopic] = useState<string>('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newSubareaName, setNewSubareaName] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<{ areaId: string; subareaId: string; topicId: string } | null>(null);
  
  // New editorial management state
  const [isCreateEditorialDialogOpen, setIsCreateEditorialDialogOpen] = useState(false);
  const [newEditorialName, setNewEditorialName] = useState('');
  const [editingEditorialId, setEditingEditorialId] = useState<string | null>(null);
  const [editingEditorialName, setEditingEditorialName] = useState('');

  const calculateProgress = () => {
    let total = 0;
    let completed = 0;

    editorialData.areas.forEach(area => {
      area.subareas.forEach(subarea => {
        subarea.topics.forEach(topic => {
          total++;
          if (topic.status === TopicStatus.MASTERED) {
            completed++;
          }
        });
      });
    });

    return total > 0 ? (completed / total) * 100 : 0;
  };

  const calculateAreaProgress = (area: EditorialArea) => {
    let total = 0;
    let completed = 0;

    area.subareas.forEach(subarea => {
      subarea.topics.forEach(topic => {
        total++;
        if (topic.status === TopicStatus.MASTERED) {
          completed++;
        }
      });
    });

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

  const handleTopicStatusChange = async (areaId: string, subareaId: string, topicId: string, newStatus: TopicStatus) => {
    const updatedData = { ...editorialData };
    const area = updatedData.areas.find(a => a.id === areaId);
    if (!area) return;

    const subarea = area.subareas.find(s => s.id === subareaId);
    if (!subarea) return;

    const topic = subarea.topics.find(t => t.id === topicId);
    if (!topic) return;

    const oldStatus = topic.status;
    topic.status = newStatus;

    setEditorialData(updatedData);
    
    // Save to cloud
    await updateTopicStatus(area.name, subarea.name, topic.name, newStatus);

    // Check if area is now 100% complete for gamification
    const areaProgress = calculateAreaProgress(area);
    if (areaProgress === 100 && oldStatus !== TopicStatus.MASTERED && newStatus === TopicStatus.MASTERED) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      onAddXP(50);
      toast({
        title: "🏆 Área Dominada!",
        description: `Parabéns! Você completou 100% de ${area.name}! +50 XP`,
      });
    } else if (newStatus === TopicStatus.MASTERED && oldStatus !== TopicStatus.MASTERED) {
      onAddXP(5);
    }

    toast({
      title: "Status Atualizado",
      description: `${topic.name}: ${STATUS_CONFIG[newStatus].label}`,
    });

    setSelectedTopic(null);
  };

  const addCustomTopic = () => {
    if (!newTopicName.trim() || !selectedAreaForTopic || !selectedSubareaForTopic) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para adicionar o tópico.",
        variant: "destructive"
      });
      return;
    }

    const updatedData = { ...editorialData };
    const area = updatedData.areas.find(a => a.id === selectedAreaForTopic);
    if (!area) return;

    const subarea = area.subareas.find(s => s.id === selectedSubareaForTopic);
    if (!subarea) return;

    const newTopic: EditorialTopic = {
      id: `custom-${Date.now()}`,
      name: newTopicName.trim(),
      status: TopicStatus.NOT_STARTED
    };

    subarea.topics.push(newTopic);
    setEditorialData(updatedData);

    toast({
      title: "Tópico Adicionado!",
      description: `${newTopicName} foi adicionado com sucesso.`,
    });

    setNewTopicName('');
    setIsAddTopicDialogOpen(false);
  };

  const addCustomSubarea = () => {
    if (!newSubareaName.trim() || !selectedAreaForSubarea) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para adicionar a subárea.",
        variant: "destructive"
      });
      return;
    }

    const updatedData = { ...editorialData };
    const area = updatedData.areas.find(a => a.id === selectedAreaForSubarea);
    if (!area) return;

    const newSubarea: EditorialSubarea = {
      id: `custom-subarea-${Date.now()}`,
      name: newSubareaName.trim(),
      topics: []
    };

    area.subareas.push(newSubarea);
    setEditorialData(updatedData);

    toast({
      title: "Subárea Adicionada!",
      description: `${newSubareaName} foi adicionada com sucesso em ${area.name}.`,
    });

    setNewSubareaName('');
    setSelectedAreaForSubarea('');
    setIsAddSubareaDialogOpen(false);
  };

  const handleQuickAction = (topicName: string, action: 'exercises' | 'flashcard' | 'class') => {
    if (action === 'exercises') {
      onTabChange('exercises');
      toast({
        title: "Indo para Exercícios",
        description: `Filtro aplicado: ${topicName}`,
      });
    } else if (action === 'flashcard') {
      onTabChange('flashcards');
      toast({
        title: "Indo para Flashcards",
        description: `Crie um flashcard sobre ${topicName}`,
      });
    } else if (action === 'class') {
      onTabChange('classes');
      toast({
        title: "Indo para Aulas",
        description: `Registre a aula sobre ${topicName}`,
      });
    }
  };

  const handleCreateEditorial = async () => {
    if (!newEditorialName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o edital.",
        variant: "destructive"
      });
      return;
    }

    const id = await createEditorial(newEditorialName.trim());
    if (id) {
      toast({
        title: "Edital Criado!",
        description: `${newEditorialName} foi criado com sucesso.`,
      });
      setNewEditorialName('');
      setIsCreateEditorialDialogOpen(false);
    }
  };

  const handleDeleteEditorial = async (id: string) => {
    if (editorials.length <= 1) {
      toast({
        title: "Não é possível excluir",
        description: "Você precisa ter pelo menos um edital.",
        variant: "destructive"
      });
      return;
    }

    await deleteEditorial(id);
    toast({
      title: "Edital Excluído",
      description: "O edital foi removido com sucesso.",
    });
  };

  const handleRenameEditorial = async () => {
    if (!editingEditorialId || !editingEditorialName.trim()) return;

    await renameEditorial(editingEditorialId, editingEditorialName.trim());
    toast({
      title: "Edital Renomeado",
      description: "O nome do edital foi atualizado.",
    });
    setEditingEditorialId(null);
    setEditingEditorialName('');
  };

  const globalProgress = calculateProgress();
  const currentEditorialName = editorials.find(e => e.id === selectedEditorialId)?.name || 'CNRM Geral';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Editorial Selector */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5" />
            Selecionar Edital
          </CardTitle>
          <CardDescription>
            Gerencie múltiplos editais para diferentes bancas ou cursos
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
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => {
                if (selectedEditorialId) {
                  const current = editorials.find(e => e.id === selectedEditorialId);
                  setEditingEditorialId(selectedEditorialId);
                  setEditingEditorialName(current?.name || '');
                }
              }}
              title="Renomear edital"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => selectedEditorialId && handleDeleteEditorial(selectedEditorialId)}
              title="Excluir edital"
              disabled={editorials.length <= 1}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setIsCreateEditorialDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Novo Edital
          </Button>
        </CardContent>
      </Card>

      {/* Global Progress */}
      <Card className="border-perry-teal dark:border-perry-teal/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-perry-teal">
            <BookOpen className="w-6 h-6" />
            Progresso: {currentEditorialName}
          </CardTitle>
          <CardDescription>
            Você dominou {globalProgress.toFixed(1)}% de todo o conteúdo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={globalProgress} className="h-4" />
            <p className="text-sm text-muted-foreground text-right">
              {globalProgress.toFixed(1)}% completo
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Areas */}
      <div className="space-y-4">
        {editorialData.areas.map(area => {
          const areaProgress = calculateAreaProgress(area);
          const isExpanded = expandedAreas.has(area.id);

          return (
            <Card key={area.id} className="overflow-hidden">
              <div
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleArea(area.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: AREA_COLORS[area.name] }}
                      />
                      <div className="flex-1">
                        <CardTitle className="text-lg">{area.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={areaProgress} className="h-2 flex-1" />
                          <span className="text-sm font-medium text-muted-foreground min-w-[45px]">
                            {areaProgress.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </CardHeader>
              </div>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-3 pl-7 border-l-2 ml-2" style={{ borderColor: AREA_COLORS[area.name] }}>
                    {area.subareas.map(subarea => {
                      const isSubareaExpanded = expandedSubareas.has(subarea.id);
                      
                      return (
                        <div key={subarea.id} className="space-y-2">
                          <div
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/30 cursor-pointer transition-colors"
                            onClick={() => toggleSubarea(subarea.id)}
                          >
                            <h4 className="font-semibold text-sm">{subarea.name}</h4>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${isSubareaExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>

                          {isSubareaExpanded && (
                            <div className="space-y-2 pl-4">
                              {subarea.topics.map(topic => (
                                <div
                                  key={topic.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${STATUS_CONFIG[topic.status].color} ${STATUS_CONFIG[topic.status].textColor} transition-all hover:shadow-md`}
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <button
                                      onClick={() => setSelectedTopic({ areaId: area.id, subareaId: subarea.id, topicId: topic.id })}
                                      className="text-sm font-medium hover:underline text-left"
                                    >
                                      {topic.name}
                                    </button>
                                    <Badge variant="secondary" className={`text-xs ${STATUS_CONFIG[topic.status].badge}`}>
                                      {STATUS_CONFIG[topic.status].label}
                                    </Badge>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleQuickAction(topic.name, 'exercises')}
                                      title="Treinar questões"
                                    >
                                      <Zap className="w-4 h-4 text-perry-accent" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
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

      {/* Add Custom Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Personalizar Edital
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button onClick={() => setIsAddSubareaDialogOpen(true)} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Subárea Personalizada
          </Button>
          <Button onClick={() => setIsAddTopicDialogOpen(true)} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Tópico Personalizado
          </Button>
        </CardContent>
      </Card>

      {/* Add Subarea Dialog */}
      <Dialog open={isAddSubareaDialogOpen} onOpenChange={setIsAddSubareaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Subárea Personalizada</DialogTitle>
            <DialogDescription>
              Crie uma nova subárea dentro de uma grande área médica
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="area-select-subarea">Grande Área</Label>
              <Select value={selectedAreaForSubarea} onValueChange={setSelectedAreaForSubarea}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a área" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {editorialData.areas.map(area => (
                    <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subarea-name">Nome da Subárea</Label>
              <Input
                id="subarea-name"
                placeholder="Ex: Reumatologia Pediátrica"
                value={newSubareaName}
                onChange={(e) => setNewSubareaName(e.target.value)}
              />
            </div>

            <Button onClick={addCustomSubarea} className="w-full">
              Adicionar Subárea
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Topic Dialog */}
      <Dialog open={isAddTopicDialogOpen} onOpenChange={setIsAddTopicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Tópico Personalizado</DialogTitle>
            <DialogDescription>
              Adicione um tópico específico da sua prova ou cursinho
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="area-select">Grande Área</Label>
              <Select value={selectedAreaForTopic} onValueChange={setSelectedAreaForTopic}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a área" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {editorialData.areas.map(area => (
                    <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAreaForTopic && (
              <div className="space-y-2">
                <Label htmlFor="subarea-select">Subárea</Label>
                <Select value={selectedSubareaForTopic} onValueChange={setSelectedSubareaForTopic}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a subárea" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {editorialData.areas
                      .find(a => a.id === selectedAreaForTopic)
                      ?.subareas.map(subarea => (
                        <SelectItem key={subarea.id} value={subarea.id}>{subarea.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="topic-name">Nome do Tópico</Label>
              <Input
                id="topic-name"
                placeholder="Ex: História da Medicina no Acre"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
              />
            </div>

            <Button onClick={addCustomTopic} className="w-full">
              Adicionar Tópico
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      {selectedTopic && (
        <Dialog open={!!selectedTopic} onOpenChange={() => setSelectedTopic(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atualizar Status</DialogTitle>
              <DialogDescription>
                Marque o progresso do seu estudo neste tópico
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-3 py-4">
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <Button
                  key={status}
                  variant="outline"
                  className={`justify-start h-auto p-4 ${config.badge}`}
                  onClick={() => handleTopicStatusChange(
                    selectedTopic.areaId,
                    selectedTopic.subareaId,
                    selectedTopic.topicId,
                    status as TopicStatus
                  )}
                >
                  <div className="text-left">
                    <div className="font-semibold">{config.label}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {status === TopicStatus.NOT_STARTED && 'Nunca vi na vida'}
                      {status === TopicStatus.THEORY_SEEN && 'Já vi aula ou li apostila'}
                      {status === TopicStatus.MATERIALS_DONE && 'Já fiz resumos ou flashcards'}
                      {status === TopicStatus.MASTERED && 'Já treino questões e acerto bem'}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Editorial Dialog */}
      <Dialog open={isCreateEditorialDialogOpen} onOpenChange={setIsCreateEditorialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Edital</DialogTitle>
            <DialogDescription>
              Crie um edital para uma banca específica, curso ou programa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editorial-name">Nome do Edital</Label>
              <Input
                id="editorial-name"
                placeholder="Ex: SES-PE 2024, MEDCURSO, ENADE..."
                value={newEditorialName}
                onChange={(e) => setNewEditorialName(e.target.value)}
              />
            </div>
            <Button onClick={handleCreateEditorial} className="w-full">
              Criar Edital
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Editorial Dialog */}
      <Dialog open={!!editingEditorialId} onOpenChange={(open) => !open && setEditingEditorialId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Edital</DialogTitle>
            <DialogDescription>
              Altere o nome do edital selecionado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-editorial-name">Novo Nome</Label>
              <Input
                id="edit-editorial-name"
                placeholder="Nome do edital"
                value={editingEditorialName}
                onChange={(e) => setEditingEditorialName(e.target.value)}
              />
            </div>
            <Button onClick={handleRenameEditorial} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
