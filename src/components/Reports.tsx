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

    const filteredClasses = classes.filter(cls => {
      const date = new Date(cls.date);
      return date >= start && date <= end && cls.studied;
    });

    const totalQuestions = filteredExercises.reduce((sum, ex) => sum + ex.totalQuestions, 0);
    const totalCorrect = filteredExercises.reduce((sum, ex) => sum + ex.correctAnswers, 0);
    const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    // Generate PDF with professional design
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Perry Teal color (#0d9488 = RGB: 13, 148, 136)
      const perryTeal: [number, number, number] = [13, 148, 136];
      const indigoHeader: [number, number, number] = [79, 70, 229];
      const slateHeader: [number, number, number] = [51, 65, 85];
      const royalBlueHeader: [number, number, number] = [37, 99, 235];
      const emeraldHeader: [number, number, number] = [16, 185, 129];

      // Helper function to add footer to each page
      const addFooter = () => {
        const pageCount = (pdf as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(150, 150, 150);
          pdf.text(
            `Gerado em ${new Date().toLocaleString('pt-BR')} via PERSON MENTORIA - Página ${i} de ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        }
      };

      // 1. CABEÇALHO INSTITUCIONAL (Header Institucional)
      // Barra superior Perry Teal
      pdf.setFillColor(perryTeal[0], perryTeal[1], perryTeal[2]);
      pdf.rect(0, 0, pageWidth, 25, 'F');
      
      // Título em branco
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('PERSON MENTORIA - Relatório de Desempenho', pageWidth / 2, 12, { align: 'center' });
      
      // Subtítulo de período
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(240, 240, 240);
      pdf.text(
        `Período: ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`,
        pageWidth / 2,
        19,
        { align: 'center' }
      );

      let yPosition = 35;

      // 2. QUADRO DE RESUMO (Executive Summary Card)
      // Fundo cinza suave com bordas arredondadas
      pdf.setFillColor(245, 247, 250);
      pdf.roundedRect(14, yPosition, pageWidth - 28, 35, 3, 3, 'F');
      
      // Borda sutil
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(14, yPosition, pageWidth - 28, 35, 3, 3, 'S');

      // KPIs dentro do card
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(100, 100, 100);
      
      const kpiX = 25;
      const kpiSpacing = 55;
      
      // Questões Totais
      pdf.text('QUESTÕES TOTAIS', kpiX, yPosition + 10);
      pdf.setFontSize(24);
      pdf.setTextColor(perryTeal[0], perryTeal[1], perryTeal[2]);
      pdf.text(totalQuestions.toString(), kpiX, yPosition + 23);
      
      // Acertos
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('ACERTOS', kpiX + kpiSpacing, yPosition + 10);
      pdf.setFontSize(24);
      pdf.setTextColor(16, 185, 129); // Emerald
      pdf.text(totalCorrect.toString(), kpiX + kpiSpacing, yPosition + 23);
      
      // Aproveitamento
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('APROVEITAMENTO', kpiX + kpiSpacing * 2, yPosition + 10);
      pdf.setFontSize(24);
      // Color based on performance
      if (accuracy >= 80) pdf.setTextColor(16, 185, 129); // Green
      else if (accuracy >= 60) pdf.setTextColor(245, 158, 11); // Amber
      else pdf.setTextColor(239, 68, 68); // Red
      pdf.text(`${accuracy.toFixed(1)}%`, kpiX + kpiSpacing * 2, yPosition + 23);

      yPosition += 45;

      // 3. TABELA 1: Desempenho Estratégico por Grande Área
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
        autoTable(pdf, {
          startY: yPosition,
          head: [['Área Médica', 'Questões', 'Acertos', 'Nota (%)']],
          body: areaStats.map(stat => [
            stat.area,
            stat.total.toString(),
            stat.correct.toString(),
            `${stat.accuracy.toFixed(1)}%`
          ]),
          theme: 'striped',
          headStyles: {
            fillColor: indigoHeader,
            textColor: 255,
            fontSize: 11,
            fontStyle: 'bold',
            halign: 'center'
          },
          styles: {
            fontSize: 10,
            cellPadding: 5
          },
          columnStyles: {
            0: { halign: 'left', fontStyle: 'bold' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center', fontStyle: 'bold' }
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          }
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 15;
      }

      // 4. TABELA 2: Provas na Íntegra (Simulados)
      if (filteredExams.length > 0) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        autoTable(pdf, {
          startY: yPosition,
          head: [['Data', 'Nome da Prova', 'Placar Bruto', 'Porcentagem']],
          body: filteredExams.map(exam => [
            new Date(exam.date).toLocaleDateString('pt-BR'),
            exam.name,
            `${exam.correctAnswers}/${exam.totalQuestions}`,
            `${((exam.correctAnswers / exam.totalQuestions) * 100).toFixed(1)}%`
          ]),
          theme: 'grid',
          headStyles: {
            fillColor: slateHeader,
            textColor: 255,
            fontSize: 11,
            fontStyle: 'bold',
            halign: 'center'
          },
          styles: {
            fontSize: 10,
            cellPadding: 5
          },
          columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'left', fontStyle: 'bold' },
            2: { halign: 'center' },
            3: { halign: 'center', fontStyle: 'bold' }
          }
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 15;
      }

      // 5. TABELA 3: Histórico Detalhado (Log de Exercícios)
      if (filteredExercises.length > 0) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        autoTable(pdf, {
          startY: yPosition,
          head: [['Data', 'Frente', 'Tema Específico', 'Desempenho']],
          body: filteredExercises.map(ex => [
            new Date(ex.date).toLocaleDateString('pt-BR'),
            ex.area,
            ex.topic,
            `${ex.correctAnswers}/${ex.totalQuestions} (${((ex.correctAnswers / ex.totalQuestions) * 100).toFixed(0)}%)`
          ]),
          theme: 'striped',
          headStyles: {
            fillColor: royalBlueHeader,
            textColor: 255,
            fontSize: 11,
            fontStyle: 'bold',
            halign: 'center'
          },
          styles: {
            fontSize: 9,
            cellPadding: 4
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 25 },
            1: { halign: 'left', cellWidth: 40 },
            2: { halign: 'left' },
            3: { halign: 'center', fontStyle: 'bold', cellWidth: 35 }
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          }
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 15;
      }

      // 6. TABELA 4: Aulas Teóricas (Opcional/Condicional)
      if (filteredClasses.length > 0) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        autoTable(pdf, {
          startY: yPosition,
          head: [['Data', 'Frente', 'Título da Aula']],
          body: filteredClasses.map(cls => [
            new Date(cls.date).toLocaleDateString('pt-BR'),
            cls.area,
            cls.title
          ]),
          theme: 'striped',
          headStyles: {
            fillColor: emeraldHeader,
            textColor: 255,
            fontSize: 11,
            fontStyle: 'bold',
            halign: 'center'
          },
          styles: {
            fontSize: 10,
            cellPadding: 5
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 30 },
            1: { halign: 'left', cellWidth: 40 },
            2: { halign: 'left' }
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          }
        });
      }

      // 7. RODAPÉ (Footer) - Add to all pages
      addFooter();

      // Save PDF
      pdf.save(`PERSON_MENTORIA_Relatorio_${startDate}_a_${endDate}.pdf`);

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
