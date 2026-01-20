import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, FileText, Download, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExamLog, MedicalArea } from '@/lib/types';
import { AREA_COLORS, EXAM_INSTITUTIONS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ensurePdfExtension, savePdf } from '@/lib/pdf-helpers';
import { getPerformanceColor } from '@/lib/utils';
import { saveAs } from 'file-saver';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
interface ExamsProps {
  exams: ExamLog[];
  addExam: (exam: Omit<ExamLog, 'id'>) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  addXP: (xp: number) => void;
}

export default function Exams({ exams, addExam, deleteExam, addXP }: ExamsProps) {
  const isMountedRef = useRef(true);
  const [newExam, setNewExam] = useState<Partial<ExamLog>>({
    name: '',
    institution: '',
    date: new Date().toISOString().split('T')[0],
    totalQuestions: 0,
    correctAnswers: 0,
    areas: [],
    areaDetails: []
  });

  const [inputMode, setInputMode] = useState<'detailed' | 'simple'>('detailed');
  const [simpleInput, setSimpleInput] = useState({ correct: 0, total: 0 });

  const [areaInputs, setAreaInputs] = useState<Record<string, { correct: number; total: number }>>({});
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());
  const [isAddingNewInstitution, setIsAddingNewInstitution] = useState(false);
  const [customInstitution, setCustomInstitution] = useState('');

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleAreaToggle = (area: MedicalArea) => {
    const areas = newExam.areas || [];
    if (areas.includes(area)) {
      setNewExam({ ...newExam, areas: areas.filter(a => a !== area) });
      const newInputs = { ...areaInputs };
      delete newInputs[area];
      setAreaInputs(newInputs);
    } else {
      setNewExam({ ...newExam, areas: [...areas, area] });
      setAreaInputs({ ...areaInputs, [area]: { correct: 0, total: 0 } });
    }
  };

  const handleAreaInputChange = (area: MedicalArea, field: 'correct' | 'total', value: number) => {
    setAreaInputs({
      ...areaInputs,
      [area]: { ...areaInputs[area], [field]: value }
    });
  };

  const handleAdd = () => {
    if (!newExam.name?.trim()) {
      if (isMountedRef.current) {
        toast({
          title: "Campo obrigatório",
          description: "Por favor, informe o nome da prova.",
          variant: "destructive"
        });
      }
      return;
    }

    let calculatedTotal = 0;
    let calculatedCorrect = 0;
    let areaDetails: any[] = [];
    let areasList: MedicalArea[] = [];

    if (inputMode === 'detailed') {
      // Calculate totals from area details
      areaDetails = Object.entries(areaInputs).map(([area, data]) => ({
        area: area as MedicalArea,
        correct: data.correct,
        total: data.total
      }));

      calculatedTotal = areaDetails.reduce((sum, ad) => sum + ad.total, 0);
      calculatedCorrect = areaDetails.reduce((sum, ad) => sum + ad.correct, 0);
      areasList = newExam.areas || [];

      if (calculatedTotal === 0 && isMountedRef.current) {
        toast({
          title: "Dados incompletos",
          description: "Adicione pelo menos uma área com questões.",
          variant: "destructive"
        });
        return;
      }

    } else {
      // Simple mode
      calculatedTotal = simpleInput.total;
      calculatedCorrect = simpleInput.correct;

      if (calculatedTotal === 0 && isMountedRef.current) {
        toast({
          title: "Dados inválidos",
          description: "O total de questões deve ser maior que zero.",
          variant: "destructive"
        });
        return;
      }

      if (calculatedCorrect > calculatedTotal && isMountedRef.current) {
        toast({
          title: "Dados inválidos",
          description: "O número de acertos não pode ser maior que o total.",
          variant: "destructive"
        });
        return;
      }
    }

    const item: Omit<ExamLog, 'id'> = {
      name: newExam.name,
      institution: newExam.institution || 'Não informado',
      date: newExam.date!,
      totalQuestions: calculatedTotal,
      correctAnswers: calculatedCorrect,
      areas: areasList,
      areaDetails: areaDetails
    };

    addExam(item);
    addXP(100);

    if (!isMountedRef.current) return;

    const accuracy = calculatedTotal > 0 ? (calculatedCorrect / calculatedTotal) * 100 : 0;
    toast({
      title: "Prova registrada!",
      description: `${calculatedCorrect}/${calculatedTotal} corretas (${accuracy.toFixed(0)}%)`,
    });

    setNewExam({
      name: '',
      institution: '',
      date: new Date().toISOString().split('T')[0],
      totalQuestions: 0,
      correctAnswers: 0,
      areas: [],
      areaDetails: []
    });
    setAreaInputs({});
    setSimpleInput({ correct: 0, total: 0 });
  };

  const handleDelete = (id: string) => {
    deleteExam(id);
    if (isMountedRef.current) {
      toast({
        title: "Prova removida",
        description: "O registro foi excluído.",
      });
    }
  };

  const toggleExamExpansion = (id: string) => {
    const newExpanded = new Set(expandedExams);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedExams(newExpanded);
  };

  const generateExamPDF = async (exam: ExamLog) => {
    try {
      const { PdfService } = await import('@/lib/pdf-service');
      const pdf = new PdfService();

      await pdf.initialize('Boletim de Desempenho');

      const accuracy = (exam.correctAnswers / exam.totalQuestions) * 100;

      // Subtitle with Exam Details
      pdf.addSubtitle(`${exam.name} • ${exam.institution} • ${new Date(exam.date).toLocaleDateString('pt-BR')}`);

      // --- Executive Summary (Grid) ---
      const startY = pdf.getCurrentY();
      const margin = pdf.getMargin();
      const contentWidth = pdf.getContentWidth();
      const colGap = 10;
      const colWidth = (contentWidth - (colGap * 2)) / 3;

      // Card 1: Questões
      pdf.drawCard(margin, startY, colWidth, 40, 'Questões Totais');
      pdf.addMetricAt(margin + (colWidth / 2), startY + 15, '', exam.totalQuestions.toString(), 'center');

      // Card 2: Acertos
      pdf.drawCard(margin + colWidth + colGap, startY, colWidth, 40, 'Acertos');
      pdf.addMetricAt(margin + colWidth + colGap + (colWidth / 2), startY + 15, '', exam.correctAnswers.toString(), 'center');

      // Card 3: Aproveitamento
      pdf.drawCard(margin + (colWidth * 2) + (colGap * 2), startY, colWidth, 40, 'Aproveitamento');
      pdf.addMetricAt(margin + (colWidth * 2) + (colGap * 2) + (colWidth / 2), startY + 15, '', `${accuracy.toFixed(1)}%`, 'center');

      pdf.moveY(55);

      // --- Detailed Table ---
      if (exam.areaDetails && exam.areaDetails.length > 0) {
        pdf.addSection('Desempenho por Área');

        const headers = ['Área Médica', 'Total', 'Acertos', 'Aproveitamento'];
        const body = exam.areaDetails.map(ad => {
          const areaAccuracy = ad.total > 0 ? (ad.correct / ad.total) * 100 : 0;
          return [
            ad.area,
            ad.total.toString(),
            ad.correct.toString(),
            `${areaAccuracy.toFixed(1)}%`
          ];
        });

        pdf.addTable(headers, body, {
          columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'center', cellWidth: 30 },
            2: { halign: 'center', cellWidth: 30 },
            3: { halign: 'center', cellWidth: 40, fontStyle: 'bold' }
          },
          didDrawCell: (data: any) => {
            // Example: Colorize Accuracy column 
            if (data.section === 'body' && data.column.index === 3) {
              const value = parseFloat(data.cell.raw.replace('%', ''));
              if (value >= 80) data.cell.styles.textColor = [16, 185, 129]; // Emerald
              else if (value >= 60) data.cell.styles.textColor = [245, 158, 11]; // Amber
              else data.cell.styles.textColor = [239, 68, 68]; // Red
            }
          }
        });
      } else {
        pdf.addText("Nenhum detalhe por área disponível para esta prova.");
      }

      const filename = `boletim-${exam.name.toLowerCase().replace(/\s/g, '-')}`;
      pdf.save(filename);

      toast({
        title: "PDF gerado!",
        description: "O boletim foi baixado com sucesso.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao criar o boletim.",
        variant: "destructive"
      });
    }
  };

  const sortedExams = [...exams].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Add New Exam */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Registrar Prova
          </CardTitle>
          <CardDescription>Simule provas completas de residência</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Prova</Label>
              <Input
                id="name"
                placeholder="Ex: USP 2023"
                value={newExam.name}
                onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">Instituição/Banca</Label>
              <Select
                value={newExam.institution}
                onValueChange={(value) => {
                  if (value === 'CUSTOM') {
                    setIsAddingNewInstitution(true);
                    setNewExam({ ...newExam, institution: '' });
                  } else {
                    setIsAddingNewInstitution(false);
                    setNewExam({ ...newExam, institution: value });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a banca" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {EXAM_INSTITUTIONS.map(inst => (
                    <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                  ))}
                  <SelectItem value="CUSTOM">+ Cadastrar nova banca</SelectItem>
                </SelectContent>
              </Select>

              {isAddingNewInstitution && (
                <Dialog open={isAddingNewInstitution} onOpenChange={setIsAddingNewInstitution}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cadastrar Nova Banca</DialogTitle>
                      <DialogDescription>
                        Digite o nome da nova instituição/banca
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Input
                        placeholder="Ex: Hospital das Clínicas"
                        value={customInstitution}
                        onChange={(e) => setCustomInstitution(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            if (customInstitution.trim()) {
                              setNewExam({ ...newExam, institution: customInstitution.trim() });
                              setIsAddingNewInstitution(false);
                              setCustomInstitution('');
                            }
                          }}
                          className="flex-1"
                        >
                          Confirmar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAddingNewInstitution(false);
                            setCustomInstitution('');
                          }}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={newExam.date}
                onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
              />
            </div>

          </div>

          <div className="space-y-3">
            <div className="flex flex-col space-y-2 mb-4">
              <Label>Tipo de Inserção</Label>
              <div className="flex gap-4">
                <Button
                  variant={inputMode === 'detailed' ? 'default' : 'outline'}
                  onClick={() => setInputMode('detailed')}
                  size="sm"
                  className="w-full md:w-auto"
                >
                  Por Área (Detalhado)
                </Button>
                <Button
                  variant={inputMode === 'simple' ? 'default' : 'outline'}
                  onClick={() => setInputMode('simple')}
                  size="sm"
                  className="w-full md:w-auto"
                >
                  Total Geral (Simplificado)
                </Button>
              </div>
            </div>

            {inputMode === 'detailed' ? (
              <>
                <Label>Desempenho por Área (Detalhado)</Label>
                <p className="text-sm text-muted-foreground">Selecione as áreas e insira os acertos/total de cada uma</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.values(MedicalArea).map(area => (
                    <div key={area} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`area-${area}`}
                          checked={newExam.areas?.includes(area)}
                          onCheckedChange={() => handleAreaToggle(area)}
                        />
                        <label
                          htmlFor={`area-${area}`}
                          className="text-sm font-medium cursor-pointer leading-none"
                        >
                          {area}
                        </label>
                      </div>

                      {newExam.areas?.includes(area) && (
                        <div className="grid grid-cols-2 gap-2 pl-6">
                          <div className="space-y-1">
                            <Label htmlFor={`correct-${area}`} className="text-xs">Acertos</Label>
                            <Input
                              id={`correct-${area}`}
                              type="number"
                              min={0}
                              placeholder="0"
                              value={areaInputs[area]?.correct || ''}
                              onChange={(e) => handleAreaInputChange(area, 'correct', Number(e.target.value))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`total-${area}`} className="text-xs">Total</Label>
                            <Input
                              id={`total-${area}`}
                              type="number"
                              min={0}
                              placeholder="0"
                              value={areaInputs[area]?.total || ''}
                              onChange={(e) => handleAreaInputChange(area, 'total', Number(e.target.value))}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Resultado Geral da Prova</h4>
                  <p className="text-sm text-muted-foreground">Insira apenas o total de questões e o número de acertos.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="total-simple" className="text-base">Total de Questões</Label>
                    <Input
                      id="total-simple"
                      type="number"
                      min={1}
                      placeholder="Ex: 100"
                      className="text-lg"
                      value={simpleInput.total || ''}
                      onChange={(e) => setSimpleInput({ ...simpleInput, total: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="correct-simple" className="text-base">Total de Acertos</Label>
                    <Input
                      id="correct-simple"
                      type="number"
                      min={0}
                      placeholder="Ex: 75"
                      className="text-lg"
                      value={simpleInput.correct || ''}
                      onChange={(e) => setSimpleInput({ ...simpleInput, correct: Number(e.target.value) })}
                    />
                  </div>
                </div>
                {simpleInput.total > 0 && (
                  <div className="flex items-center justify-between p-3 bg-background rounded border">
                    <span className="font-medium">Aproveitamento Calculado:</span>
                    <span className={`font-bold text-lg ${getPerformanceColor((simpleInput.correct / simpleInput.total) * 100)}`}>
                      {((simpleInput.correct / simpleInput.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <Button onClick={handleAdd} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Prova
          </Button>
        </CardContent>
      </Card>

      {/* Exams List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Histórico de Provas ({exams.length})
          </CardTitle>
          <CardDescription>
            {exams.reduce((sum, ex) => sum + ex.totalQuestions, 0)} questões de prova realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedExams.map(exam => {
              const accuracy = (exam.correctAnswers / exam.totalQuestions) * 100;
              const isExpanded = expandedExams.has(exam.id);

              return (
                <Collapsible key={exam.id} open={isExpanded} onOpenChange={() => toggleExamExpansion(exam.id)}>
                  <div className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{exam.name}</h3>
                          <span className="text-sm text-muted-foreground">({exam.institution})</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span>{new Date(exam.date).toLocaleDateString('pt-BR')}</span>
                          <span>•</span>
                          <span className="font-medium text-foreground">
                            {exam.correctAnswers}/{exam.totalQuestions} acertos
                          </span>
                          <span>•</span>
                          <span className={getPerformanceColor(accuracy)}>
                            {accuracy.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => generateExamPDF(exam)}
                          title="Baixar Boletim PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>



                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="icon">
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Essa ação não pode ser desfeita. O registro da prova "{exam.name}" será permanentemente removido do seu histórico.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(exam.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <CollapsibleContent className="mt-4">
                      {exam.areaDetails && exam.areaDetails.length > 0 ? (
                        <div className="space-y-3 pt-3 border-t">
                          <h4 className="font-semibold text-sm">Desempenho Detalhado por Área:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {exam.areaDetails.map(ad => {
                              const areaAccuracy = ad.total > 0 ? (ad.correct / ad.total) * 100 : 0;
                              return (
                                <div key={ad.area} className="p-3 rounded-lg bg-muted/50">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: AREA_COLORS[ad.area] }}
                                    />
                                    <span className="font-medium text-sm">{ad.area}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                      {ad.correct}/{ad.total} acertos
                                    </span>
                                    <span className={`font-bold ${getPerformanceColor(areaAccuracy)}`}>
                                      {areaAccuracy.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-background rounded-full h-2 mt-2">
                                    <div
                                      className="h-2 rounded-full transition-all"
                                      style={{
                                        width: `${areaAccuracy}%`,
                                        backgroundColor: AREA_COLORS[ad.area]
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground pt-3 border-t">
                          Nenhum detalhe por área disponível.
                        </p>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}

            {sortedExams.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma prova registrada ainda.</p>
                <p className="text-sm mt-1">Comece simulando provas completas!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
