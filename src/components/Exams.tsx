import { useState } from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ExamLog, MedicalArea } from '@/lib/types';
import { AREA_COLORS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';

interface ExamsProps {
  exams: ExamLog[];
  setExams: (exams: ExamLog[]) => void;
}

export default function Exams({ exams, setExams }: ExamsProps) {
  const [newExam, setNewExam] = useState<Partial<ExamLog>>({
    name: '',
    date: new Date().toISOString().split('T')[0],
    totalQuestions: 0,
    correctAnswers: 0,
    areas: []
  });

  const handleAreaToggle = (area: MedicalArea) => {
    const areas = newExam.areas || [];
    if (areas.includes(area)) {
      setNewExam({ ...newExam, areas: areas.filter(a => a !== area) });
    } else {
      setNewExam({ ...newExam, areas: [...areas, area] });
    }
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

    if (!newExam.totalQuestions || newExam.totalQuestions < 1) {
      toast({
        title: "Quantidade inválida",
        description: "Informe o número de questões.",
        variant: "destructive"
      });
      return;
    }

    if (newExam.correctAnswers! > newExam.totalQuestions!) {
      toast({
        title: "Valor inconsistente",
        description: "Acertos não podem ser maiores que o total.",
        variant: "destructive"
      });
      return;
    }

    const item: ExamLog = {
      id: Date.now().toString(),
      name: newExam.name,
      date: newExam.date!,
      totalQuestions: newExam.totalQuestions,
      correctAnswers: newExam.correctAnswers!,
      areas: newExam.areas!
    };

    setExams([...exams, item]);
    
    const accuracy = (item.correctAnswers / item.totalQuestions) * 100;
    toast({
      title: "Prova registrada!",
      description: `${item.correctAnswers}/${item.totalQuestions} corretas (${accuracy.toFixed(0)}%)`,
    });

    setNewExam({
      name: '',
      date: new Date().toISOString().split('T')[0],
      totalQuestions: 0,
      correctAnswers: 0,
      areas: []
    });
  };

  const handleDelete = (id: string) => {
    setExams(exams.filter(e => e.id !== id));
    toast({
      title: "Prova removida",
      description: "O registro foi excluído.",
    });
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
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={newExam.date}
                onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total">Total de Questões</Label>
              <Input
                id="total"
                type="number"
                min={1}
                placeholder="100"
                value={newExam.totalQuestions || ''}
                onChange={(e) => setNewExam({ ...newExam, totalQuestions: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="correct">Acertos</Label>
              <Input
                id="correct"
                type="number"
                min={0}
                placeholder="75"
                value={newExam.correctAnswers || ''}
                onChange={(e) => setNewExam({ ...newExam, correctAnswers: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Áreas Abordadas</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.values(MedicalArea).map(area => (
                <div key={area} className="flex items-center space-x-2">
                  <Checkbox
                    id={`area-${area}`}
                    checked={newExam.areas?.includes(area)}
                    onCheckedChange={() => handleAreaToggle(area)}
                  />
                  <label
                    htmlFor={`area-${area}`}
                    className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {area.split(' ')[0]}
                  </label>
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
              return (
                <div
                  key={exam.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg">{exam.name}</h3>
                      
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span>{new Date(exam.date).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <span className="font-medium text-foreground">
                          {exam.correctAnswers}/{exam.totalQuestions} acertos
                        </span>
                        <span>•</span>
                        <span className={accuracy >= 80 ? 'text-medical-preventiva font-medium' : accuracy >= 60 ? 'text-medical-clinica' : 'text-destructive font-medium'}>
                          {accuracy.toFixed(1)}%
                        </span>
                      </div>

                      {exam.areas.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {exam.areas.map(area => (
                            <span
                              key={area}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-background"
                              style={{ borderLeft: `3px solid ${AREA_COLORS[area]}` }}
                            >
                              {area.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(exam.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
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
