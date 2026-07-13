import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExerciseLog, MedicalArea } from '@/lib/types';
import { AREA_COLORS } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, TrendingDown, Target, ChevronDown, ChevronRight, History } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { ensurePdfExtension, savePdf } from '@/lib/pdf-helpers';
import { getPerformanceColor } from '@/lib/utils';
import { saveAs } from 'file-saver';

interface AnalysisProps {
  exercises: ExerciseLog[];
}

const TopicRow = ({ topic, index }: { topic: any, index: number }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell className="w-10 text-center">
          {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground mx-auto" /> : <ChevronRight className="w-4 h-4 text-muted-foreground mx-auto" />}
        </TableCell>
        <TableCell className="text-muted-foreground w-12 text-center">{index + 1}</TableCell>
        <TableCell className="font-medium">{topic.topic}</TableCell>
        <TableCell className="text-center">
          <Badge variant={topic.acurácia >= 70 ? 'default' : topic.acurácia >= 50 ? 'secondary' : 'destructive'}>
            {topic.acurácia}%
          </Badge>
        </TableCell>
        <TableCell className="text-center">{topic.questões}</TableCell>
        <TableCell className="text-center text-green-600">{topic.acertos}</TableCell>
        <TableCell className="text-center text-red-500">{topic.erros}</TableCell>
        <TableCell className="text-center text-sm text-muted-foreground">{topic.ultimaPratica}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={8} className="p-4">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm animate-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">Histórico de Evolução - {topic.topic}</h4>
              </div>
              <div className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-0 bg-muted/50">
                      <TableHead>Data</TableHead>
                      <TableHead>Nome do Bloco</TableHead>
                      <TableHead className="text-center">Questões</TableHead>
                      <TableHead className="text-center">Acertos</TableHead>
                      <TableHead className="text-center">Erros</TableHead>
                      <TableHead className="text-center">Aproveitamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topic.history.map((log: any, idx: number) => (
                      <TableRow key={idx} className="border-b-0">
                        <TableCell className="py-2">{new Date(log.date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="py-2 font-medium">{log.blockName || 'Bloco de Exercícios'}</TableCell>
                        <TableCell className="text-center py-2">{log.total}</TableCell>
                        <TableCell className="text-center text-green-600 py-2">{log.correct}</TableCell>
                        <TableCell className="text-center text-red-500 py-2">{log.total - log.correct}</TableCell>
                        <TableCell className="text-center py-2">
                          <span className={`font-semibold ${getPerformanceColor(log.accuracy)}`}>
                            {log.accuracy.toFixed(0)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export default function Analysis({ exercises }: AnalysisProps) {
  const [selectedArea, setSelectedArea] = useState<MedicalArea | 'all'>('all');
  // Filter exercises by selected area
  const filteredExercises = selectedArea === 'all'
    ? exercises
    : exercises.filter(ex => ex.area === selectedArea);

  // KPIs for selected area
  const totalExercises = filteredExercises.length;
  const uniqueTopics = new Set(filteredExercises.map(ex => ex.topic)).size;
  const totalQuestions = filteredExercises.reduce((sum, ex) => sum + ex.totalQuestions, 0);
  const totalCorrect = filteredExercises.reduce((sum, ex) => sum + ex.correctAnswers, 0);
  const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

  // Topic performance (for selected area)
  const topicStats = filteredExercises.reduce((acc, ex) => {
    if (!acc[ex.topic]) {
      acc[ex.topic] = {
        topic: ex.topic,
        total: 0,
        correct: 0,
        lastPractice: ex.date,
        history: []
      };
    }
    acc[ex.topic].total += ex.totalQuestions;
    acc[ex.topic].correct += ex.correctAnswers;
    if (ex.date > acc[ex.topic].lastPractice) {
      acc[ex.topic].lastPractice = ex.date;
    }

    // Add history
    if (!acc[ex.topic].history) acc[ex.topic].history = [];
    acc[ex.topic].history.push({
      date: ex.date,
      total: ex.totalQuestions,
      correct: ex.correctAnswers,
      accuracy: ex.totalQuestions > 0 ? (ex.correctAnswers / ex.totalQuestions) * 100 : 0,
      blockName: ex.blockName
    });

    return acc;
  }, {} as Record<string, { topic: string; total: number; correct: number; lastPractice: string; history: any[] }>);

  const topicData = Object.values(topicStats)
    .map(t => ({
      topic: t.topic,
      acurácia: Math.round((t.correct / t.total) * 100),
      questões: t.total,
      acertos: t.correct,
      erros: t.total - t.correct,
      ultimaPratica: new Date(t.lastPractice).toLocaleDateString('pt-BR'),
      history: t.history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }))
    .sort((a, b) => a.acurácia - b.acurácia); // Sort from worst to best

  // Pie chart data (correct vs incorrect)
  const pieData = [
    { name: 'Acertos', value: totalCorrect, color: 'hsl(var(--medical-preventiva))' },
    { name: 'Erros', value: totalQuestions - totalCorrect, color: 'hsl(var(--destructive))' }
  ];

  const generatePDF = async () => {
    try {
      const { PdfService } = await import('@/lib/pdf-service');
      const pdf = new PdfService();
      const areaName = selectedArea === 'all' ? 'Todas as Áreas' : selectedArea;

      await pdf.initialize('Análise Geral de Desempenho');
      pdf.addSubtitle(`${areaName} • Gerado em: ${new Date().toLocaleDateString('pt-BR')}`);

      // --- Executive Summary (Grid) ---
      const startY = pdf.getCurrentY();
      const margin = pdf.getMargin();
      const contentWidth = pdf.getContentWidth();
      const colGap = 10;
      const colWidth = (contentWidth - (colGap * 3)) / 4;

      // Card 1: Total Questões
      pdf.drawCard(margin, startY, colWidth, 40, 'Questões');
      pdf.addMetricAt(margin + (colWidth / 2), startY + 15, '', totalQuestions.toString(), 'center');

      // Card 2: Temas
      pdf.drawCard(margin + colWidth + colGap, startY, colWidth, 40, 'Temas Únicos');
      pdf.addMetricAt(margin + colWidth + colGap + (colWidth / 2), startY + 15, '', uniqueTopics.toString(), 'center');

      // Card 3: Acertos
      pdf.drawCard(margin + (colWidth * 2) + (colGap * 2), startY, colWidth, 40, 'Acertos');
      pdf.addMetricAt(margin + (colWidth * 2) + (colGap * 2) + (colWidth / 2), startY + 15, '', totalCorrect.toString(), 'center');

      // Card 4: Taxa de Acerto
      pdf.drawCard(margin + (colWidth * 3) + (colGap * 3), startY, colWidth, 40, 'Aproveitamento');
      // Determine color
      let accColor: [number, number, number] = [60, 60, 60];
      if (overallAccuracy >= 80) accColor = [16, 185, 129];
      else if (overallAccuracy >= 60) accColor = [245, 158, 11];
      else accColor = [239, 68, 68];

      pdf.addTextAt(margin + (colWidth * 3) + (colGap * 3) + (colWidth / 2), startY + 20, `${overallAccuracy.toFixed(1)}%`, 14, {
        align: 'center',
        bold: true,
        color: accColor
      });

      pdf.moveY(55);

      // --- Topics Table ---
      pdf.addSection('Desempenho Detalhado por Tema');

      pdf.addTable(
        ['Tema', 'Acurácia', 'Questões', 'Acertos', 'Erros', 'Última Prática'],
        topicData.map(topic => [
          topic.topic,
          `${topic.acurácia}%`,
          topic.questões.toString(),
          topic.acertos.toString(),
          topic.erros.toString(),
          topic.ultimaPratica
        ]),
        {
          columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'center', fontStyle: 'bold' },
            2: { halign: 'center' },
            3: { halign: 'center', textColor: [22, 163, 74] }, // Green
            4: { halign: 'center', textColor: [220, 38, 38] }, // Red
            5: { halign: 'center', cellWidth: 30 }
          },
          didDrawCell: (data: any) => {
            if (data.column.index === 1 && data.section === 'body') {
              const val = parseFloat(data.cell.raw.replace('%', ''));
              if (val >= 80) data.cell.styles.textColor = [16, 185, 129];
              else if (val >= 50) data.cell.styles.textColor = [245, 158, 11];
              else data.cell.styles.textColor = [239, 68, 68];
            }
          }
        }
      );

      const filename = `relatorio-${areaName.toLowerCase().replace(/\s/g, '-')}-${new Date().toISOString().split('T')[0]}`;
      pdf.save(filename);

      toast({
        title: "PDF gerado!",
        description: "O relatório foi baixado com sucesso.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao criar o relatório.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Filter and Export */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Análise Geral de Desempenho</CardTitle>
              <CardDescription>Filtre por área para ver estatísticas detalhadas</CardDescription>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Select value={selectedArea} onValueChange={(value) => setSelectedArea(value as MedicalArea | 'all')}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Selecione a área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Áreas</SelectItem>
                  {Object.values(MedicalArea).map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={generatePDF} variant="outline" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Exercícios</CardDescription>
            <CardTitle className="text-3xl">{totalExercises}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Temas Únicos</CardDescription>
            <CardTitle className="text-3xl">{uniqueTopics}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Taxa de Acerto</CardDescription>
            <CardTitle className={`text-3xl ${getPerformanceColor(overallAccuracy)}`}>
              {overallAccuracy.toFixed(1)}%
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Questões</CardDescription>
            <CardTitle className="text-3xl">{totalQuestions}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Pie Chart and Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Proporção Acertos x Erros</CardTitle>
            <CardDescription>{selectedArea === 'all' ? 'Geral' : selectedArea}</CardDescription>
          </CardHeader>
          <CardContent>
            {totalQuestions > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo de Performance</CardTitle>
            <CardDescription>Visão consolidada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-medium">Acertos</span>
              </div>
              <span className="text-2xl font-bold text-performance-success">{totalCorrect}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-performance-danger" />
                <span className="font-medium">Erros</span>
              </div>
              <span className="text-2xl font-bold text-performance-danger">{totalQuestions - totalCorrect}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="font-medium">Progresso</span>
              </div>
              <span className={`text-2xl font-bold ${getPerformanceColor(overallAccuracy)}`}>
                {overallAccuracy.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Topics Performance Table */}
      {topicData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Desempenho por Tema</CardTitle>
            <CardDescription>Ordenado do pior para o melhor (foco nas áreas de atenção)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center"></TableHead>
                    <TableHead className="w-12 text-center text-muted-foreground">#</TableHead>
                    <TableHead className="text-left font-semibold">Tema</TableHead>
                    <TableHead className="text-center font-semibold">Acurácia</TableHead>
                    <TableHead className="text-center font-semibold">Questões</TableHead>
                    <TableHead className="text-center font-semibold">Acertos</TableHead>
                    <TableHead className="text-center font-semibold">Erros</TableHead>
                    <TableHead className="text-center font-semibold hidden md:table-cell">Última Prática</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topicData.map((topic, index) => (
                    <TopicRow key={topic.topic} topic={topic} index={index} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {topicData.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>Nenhum dado disponível para a área selecionada.</p>
              <p className="text-sm mt-1">Comece cadastrando exercícios!</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
