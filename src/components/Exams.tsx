import { useState } from 'react';
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
import { getPerformanceColor } from '@/lib/utils';

interface ExamsProps {
  exams: ExamLog[];
  setExams: (exams: ExamLog[]) => void;
}

export default function Exams({ exams, setExams }: ExamsProps) {
  const [newExam, setNewExam] = useState<Partial<ExamLog>>({
    name: '',
    institution: '',
    date: new Date().toISOString().split('T')[0],
    totalQuestions: 0,
    correctAnswers: 0,
    areas: [],
    areaDetails: []
  });
  
  const [areaInputs, setAreaInputs] = useState<Record<string, { correct: number; total: number }>>({});
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());
  const [isAddingNewInstitution, setIsAddingNewInstitution] = useState(false);
  const [customInstitution, setCustomInstitution] = useState('');

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
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o nome da prova.",
        variant: "destructive"
      });
      return;
    }

    // Calculate totals from area details
    const areaDetails = Object.entries(areaInputs).map(([area, data]) => ({
      area: area as MedicalArea,
      correct: data.correct,
      total: data.total
    }));

    const calculatedTotal = areaDetails.reduce((sum, ad) => sum + ad.total, 0);
    const calculatedCorrect = areaDetails.reduce((sum, ad) => sum + ad.correct, 0);

    const item: ExamLog = {
      id: Date.now().toString(),
      name: newExam.name,
      institution: newExam.institution || 'Não informado',
      date: newExam.date!,
      totalQuestions: calculatedTotal,
      correctAnswers: calculatedCorrect,
      areas: newExam.areas!,
      areaDetails
    };

    setExams([...exams, item]);
    
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
  };

  const handleDelete = (id: string) => {
    setExams(exams.filter(e => e.id !== id));
    toast({
      title: "Prova removida",
      description: "O registro foi excluído.",
    });
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

  const generateExamPDF = (exam: ExamLog) => {
    try {
      const doc = new jsPDF();
      const accuracy = (exam.correctAnswers / exam.totalQuestions) * 100;
      
      doc.setFontSize(20);
      doc.text('Boletim de Desempenho', 20, 20);
      
      doc.setFontSize(14);
      doc.text(`Prova: ${exam.name}`, 20, 35);
      doc.text(`Instituição: ${exam.institution}`, 20, 45);
      doc.text(`Data: ${new Date(exam.date).toLocaleDateString('pt-BR')}`, 20, 55);
      
      doc.setFontSize(16);
      doc.text('Resultado Geral', 20, 70);
      doc.setFontSize(12);
      doc.text(`Total: ${exam.correctAnswers}/${exam.totalQuestions} (${accuracy.toFixed(1)}%)`, 20, 80);
      
      if (exam.areaDetails && exam.areaDetails.length > 0) {
        doc.setFontSize(16);
        doc.text('Desempenho por Área', 20, 95);
        
        let yPos = 105;
        exam.areaDetails.forEach(ad => {
          const areaAccuracy = ad.total > 0 ? (ad.correct / ad.total) * 100 : 0;
          doc.setFontSize(12);
          doc.text(`${ad.area}:`, 25, yPos);
          doc.text(`${ad.correct}/${ad.total} (${areaAccuracy.toFixed(1)}%)`, 25, yPos + 7);
          yPos += 15;
        });
      }
      
      doc.save(`boletim-${exam.name.toLowerCase().replace(/\s/g, '-')}.pdf`);
      
      toast({
        title: "PDF gerado!",
        description: "O boletim foi baixado com sucesso.",
      });
    } catch (error) {
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
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(exam.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
