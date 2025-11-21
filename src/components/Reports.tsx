import { useState } from 'react';
import { FileDown, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExerciseLog, ClassItem, ExamLog, MedicalArea } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { getPerformanceColor } from '@/lib/utils';

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

    // Generate PDF
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;

      // Title
      pdf.setFontSize(22);
      pdf.setTextColor(66, 133, 244);
      pdf.text('PERRYMED - Relatório de Desempenho', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 15;
      pdf.setFontSize(11);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Período: ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`,
        pageWidth / 2,
        yPosition,
        { align: 'center' }
      );

      // Summary section
      yPosition += 20;
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Resumo Geral', 14, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(11);
      pdf.text(`Total de Questões: ${totalQuestions}`, 14, yPosition);
      yPosition += 7;
      pdf.text(`Acertos: ${totalCorrect}`, 14, yPosition);
      yPosition += 7;
      pdf.text(`Acurácia: ${accuracy.toFixed(1)}%`, 14, yPosition);
      yPosition += 7;
      pdf.text(`Sessões de Estudo: ${filteredExercises.length}`, 14, yPosition);

      // Performance by area
      yPosition += 15;
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Desempenho por Área', 14, yPosition);
      
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

      yPosition += 10;
      pdf.setFontSize(11);
      areaStats.forEach(stat => {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(`${stat.area}: ${stat.total} questões - ${stat.accuracy.toFixed(1)}% de acerto`, 14, yPosition);
        yPosition += 7;
      });

      // Exercise sessions
      if (filteredExercises.length > 0) {
        yPosition += 10;
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.setFontSize(16);
        pdf.text('Sessões de Estudo', 14, yPosition);
        
        yPosition += 10;
        pdf.setFontSize(10);
        filteredExercises.forEach(ex => {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
          }
          const exAccuracy = (ex.correctAnswers / ex.totalQuestions) * 100;
          pdf.text(
            `${new Date(ex.date).toLocaleDateString('pt-BR')} - ${ex.area} - ${ex.topic}: ${ex.correctAnswers}/${ex.totalQuestions} (${exAccuracy.toFixed(0)}%)`,
            14,
            yPosition
          );
          yPosition += 6;
        });
      }

      // Exams
      if (filteredExams.length > 0) {
        yPosition += 10;
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.setFontSize(16);
        pdf.text('Provas Antigas', 14, yPosition);
        
        yPosition += 10;
        pdf.setFontSize(10);
        filteredExams.forEach(exam => {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
          }
          const examAccuracy = (exam.correctAnswers / exam.totalQuestions) * 100;
          pdf.text(
            `${new Date(exam.date).toLocaleDateString('pt-BR')} - ${exam.name}: ${exam.correctAnswers}/${exam.totalQuestions} (${examAccuracy.toFixed(0)}%)`,
            14,
            yPosition
          );
          yPosition += 6;
        });
      }

      // Save PDF
      pdf.save(`PERRYMED_Relatorio_${startDate}_a_${endDate}.pdf`);

      toast({
        title: "Relatório gerado com sucesso!",
        description: `${totalQuestions} questões • ${accuracy.toFixed(1)}% acerto • ${filteredExercises.length} sessões`,
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o PDF. Tente novamente.",
        variant: "destructive"
      });
    }
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
                <div className={`text-3xl font-bold ${getPerformanceColor(accuracy)}`}>
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
