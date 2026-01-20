import { useState } from 'react';
import { FileDown, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExerciseLog, ClassItem, ExamLog, MedicalArea } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ensurePdfExtension, savePdf } from '@/lib/pdf-helpers';
import { getPerformanceColor } from '@/lib/utils';
import { saveAs } from 'file-saver';

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

  const generateReport = async () => {
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

    const filteredClasses = classes.filter(cls => {
      const date = new Date(cls.date);
      return date >= start && date <= end && cls.studied;
    });

    const totalQuestions = filteredExercises.reduce((sum, ex) => sum + ex.totalQuestions, 0);
    const totalCorrect = filteredExercises.reduce((sum, ex) => sum + ex.correctAnswers, 0);
    const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    // Generate PDF with professional design
    try {
      const { PdfService } = await import('@/lib/pdf-service');
      const pdf = new PdfService();

      await pdf.initialize('Relatório de Desempenho');

      // Subtitle
      pdf.addSubtitle(`Período: ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')} • Gerado em: ${new Date().toLocaleDateString('pt-BR')}`);

      // --- Executive Summary (Grid) ---
      const startY = pdf.getCurrentY();
      const margin = pdf.getMargin();
      const contentWidth = pdf.getContentWidth();
      const colGap = 10;
      const colWidth = (contentWidth - (colGap * 2)) / 3;

      // Card 1: Questões Totais
      pdf.drawCard(margin, startY, colWidth, 40, 'Questões Totais');
      pdf.addMetricAt(margin + (colWidth / 2), startY + 15, '', totalQuestions.toString(), 'center');

      // Card 2: Acertos
      pdf.drawCard(margin + colWidth + colGap, startY, colWidth, 40, 'Acertos');
      pdf.addMetricAt(margin + colWidth + colGap + (colWidth / 2), startY + 15, '', totalCorrect.toString(), 'center');

      // Card 3: Aproveitamento
      pdf.drawCard(margin + (colWidth * 2) + (colGap * 2), startY, colWidth, 40, 'Aproveitamento');
      pdf.addMetricAt(margin + (colWidth * 2) + (colGap * 2) + (colWidth / 2), startY + 15, '', `${accuracy.toFixed(1)}%`, 'center');

      pdf.moveY(55);

      // --- Table 1: Desempenho por Área ---
      const areaStats = Object.values(MedicalArea).map(area => {
        const areaExercises = filteredExercises.filter(ex => ex.area === area);
        const total = areaExercises.reduce((sum, ex) => sum + ex.totalQuestions, 0);
        const correct = areaExercises.reduce((sum, ex) => sum + ex.correctAnswers, 0);
        return {
          area,
          total,
          correct,
          accuracy: total > 0 ? (correct / total) * 100 : 0
        };
      }).filter(a => a.total > 0);

      if (areaStats.length > 0) {
        pdf.addSection('Desempenho Estratégico por Área');
        pdf.addTable(
          ['Área Médica', 'Questões', 'Acertos', 'Nota (%)'],
          areaStats.map(stat => [
            stat.area,
            stat.total.toString(),
            stat.correct.toString(),
            `${stat.accuracy.toFixed(1)}%`
          ]),
          {
            columnStyles: {
              0: { halign: 'left', fontStyle: 'bold' },
              1: { halign: 'center', cellWidth: 30 },
              2: { halign: 'center', cellWidth: 30 },
              3: { halign: 'center', cellWidth: 30, fontStyle: 'bold' }
            },
            didDrawCell: (data: any) => {
              if (data.column.index === 3 && data.section === 'body') {
                const val = parseFloat(data.cell.raw.replace('%', ''));
                if (val >= 80) data.cell.styles.textColor = [16, 185, 129];
                else if (val >= 60) data.cell.styles.textColor = [245, 158, 11];
                else data.cell.styles.textColor = [239, 68, 68];
              }
            }
          }
        );
      }

      // --- Table 2: Provas na Íntegra (Simulados) ---
      if (filteredExams.length > 0) {
        pdf.moveY(10);
        pdf.addSection('Provas na Íntegra (Simulados)');
        pdf.addTable(
          ['Data', 'Nome da Prova', 'Placar', 'Nota (%)'],
          filteredExams.map(exam => [
            new Date(exam.date).toLocaleDateString('pt-BR'),
            exam.name,
            `${exam.correctAnswers}/${exam.totalQuestions}`,
            `${((exam.correctAnswers / exam.totalQuestions) * 100).toFixed(1)}%`
          ]),
          {
            columnStyles: {
              0: { halign: 'center', cellWidth: 30 },
              1: { halign: 'left' },
              2: { halign: 'center', cellWidth: 30 },
              3: { halign: 'center', cellWidth: 30, fontStyle: 'bold' }
            }
          }
        );
      }

      // --- Table 3: Histórico Detalhado ---
      if (filteredExercises.length > 0) {
        pdf.moveY(10);
        pdf.addSection('Histórico Detalhado de Questões');
        pdf.addTable(
          ['Data', 'Frente', 'Tema', 'Desempenho'],
          filteredExercises.map(ex => [
            new Date(ex.date).toLocaleDateString('pt-BR'),
            ex.area,
            ex.topic,
            `${ex.correctAnswers}/${ex.totalQuestions} (${((ex.correctAnswers / ex.totalQuestions) * 100).toFixed(0)}%)`
          ]),
          {
            columnStyles: {
              0: { halign: 'center', cellWidth: 25 },
              1: { halign: 'left', cellWidth: 40 },
              2: { halign: 'left' },
              3: { halign: 'center', fontStyle: 'bold', cellWidth: 35 }
            }
          }
        );
      }

      // --- Table 4: Aulas Teóricas ---
      if (filteredClasses.length > 0) {
        pdf.moveY(10);
        pdf.addSection('Aulas Teóricas Concluídas');
        pdf.addTable(
          ['Data', 'Frente', 'Título da Aula'],
          filteredClasses.map(cls => [
            new Date(cls.date).toLocaleDateString('pt-BR'),
            cls.area,
            cls.title
          ]),
          {
            columnStyles: {
              0: { halign: 'center', cellWidth: 30 },
              1: { halign: 'left', cellWidth: 40 },
              2: { halign: 'left' }
            }
          }
        );
      }

      const finalFilename = `Mentoria_Regisdencia_Relatorio_${startDate}_a_${endDate}`;
      pdf.save(finalFilename);

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
          <p>✓ Resultados de provas na íntegra realizadas</p>
          <p>✓ Estatísticas de aulas assistidas</p>
        </CardContent>
      </Card>
    </div>
  );
}
