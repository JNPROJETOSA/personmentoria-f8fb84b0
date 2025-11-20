import { useState } from 'react';
import { FileDown, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExerciseLog, ClassItem, ExamLog, MedicalArea } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

interface ReportsProps {
  exercises: ExerciseLog[];
  classes: ClassItem[];
  exams: ExamLog[];
}

export default function Reports({ exercises, classes, exams }: ReportsProps) {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const generateReport = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      toast({
        title: "Período inválido",
        description: "A data inicial deve ser anterior à data final.",
        variant: "destructive"
      });
      return;
    }

    const filteredExercises = exercises.filter(ex => {
      const date = new Date(ex.date);
      return date >= start && date <= end;
    });

    const filteredExams = exams.filter(exam => {
      const date = new Date(exam.date);
      return date >= start && date <= end;
    });

    const totalQuestions = filteredExercises.reduce((sum, ex) => sum + ex.totalQuestions, 0);
    const totalCorrect = filteredExercises.reduce((sum, ex) => sum + ex.correctAnswers, 0);
    const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    // In a real implementation, you would generate a PDF here
    // For now, we'll show the data in a toast
    toast({
      title: "Relatório gerado!",
      description: `${totalQuestions} questões • ${accuracy.toFixed(1)}% acerto • ${filteredExercises.length} sessões`,
    });

    // Log report data for demonstration
    console.log('Report Data:', {
      period: { start: startDate, end: endDate },
      exercises: filteredExercises,
      exams: filteredExams,
      summary: {
        totalQuestions,
        totalCorrect,
        accuracy: accuracy.toFixed(1)
      }
    });
  };

  // Calculate stats for preview
  const filteredExercises = exercises.filter(ex => {
    const date = new Date(ex.date);
    return date >= new Date(startDate) && date <= new Date(endDate);
  });

  const totalQuestions = filteredExercises.reduce((sum, ex) => sum + ex.totalQuestions, 0);
  const totalCorrect = filteredExercises.reduce((sum, ex) => sum + ex.correctAnswers, 0);
  const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

  // Performance by area
  const areaStats = Object.values(MedicalArea).map(area => {
    const areaExercises = filteredExercises.filter(ex => ex.area === area);
    const total = areaExercises.reduce((sum, ex) => sum + ex.totalQuestions, 0);
    const correct = areaExercises.reduce((sum, ex) => sum + ex.correctAnswers, 0);
    
    return {
      area,
      total,
      accuracy: total > 0 ? (correct / total) * 100 : 0
    };
  }).filter(a => a.total > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            Gerar Relatório PDF
          </CardTitle>
          <CardDescription>
            Exporte um relatório detalhado do seu desempenho
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data Inicial
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data Final
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={generateReport} className="w-full" size="lg">
            <FileDown className="w-4 h-4 mr-2" />
            Gerar Relatório em PDF
          </Button>
        </CardContent>
      </Card>

      {/* Preview Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Prévia do Período
          </CardTitle>
          <CardDescription>
            {new Date(startDate).toLocaleDateString('pt-BR')} até {new Date(endDate).toLocaleDateString('pt-BR')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total de Questões</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalQuestions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Acertos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalCorrect}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Acurácia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${accuracy >= 80 ? 'text-medical-preventiva' : accuracy >= 60 ? 'text-medical-clinica' : 'text-destructive'}`}>
                  {accuracy.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {areaStats.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">Desempenho por Área</h3>
              {areaStats.map(stat => (
                <div key={stat.area} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{stat.area}</span>
                    <span className="text-muted-foreground">
                      {stat.total} questões • {stat.accuracy.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${stat.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredExercises.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum dado encontrado para o período selecionado.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>O que será incluído no relatório?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>✓ Resumo geral do período com métricas principais</p>
          <p>✓ Gráficos de desempenho por área médica</p>
          <p>✓ Evolução temporal da acurácia</p>
          <p>✓ Lista detalhada de todas as sessões de estudo</p>
          <p>✓ Resultados de provas antigas realizadas</p>
          <p>✓ Estatísticas de aulas assistidas</p>
        </CardContent>
      </Card>
    </div>
  );
}
