import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExerciseLog, MedicalArea } from '@/lib/types';
import { AREA_COLORS } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface AnalysisProps {
  exercises: ExerciseLog[];
}

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
        lastPractice: ex.date 
      };
    }
    acc[ex.topic].total += ex.totalQuestions;
    acc[ex.topic].correct += ex.correctAnswers;
    if (ex.date > acc[ex.topic].lastPractice) {
      acc[ex.topic].lastPractice = ex.date;
    }
    return acc;
  }, {} as Record<string, { topic: string; total: number; correct: number; lastPractice: string }>);

  const topicData = Object.values(topicStats)
    .map(t => ({
      topic: t.topic,
      acurácia: Math.round((t.correct / t.total) * 100),
      questões: t.total,
      acertos: t.correct,
      erros: t.total - t.correct,
      ultimaPratica: new Date(t.lastPractice).toLocaleDateString('pt-BR')
    }))
    .sort((a, b) => a.acurácia - b.acurácia); // Sort from worst to best

  // Pie chart data (correct vs incorrect)
  const pieData = [
    { name: 'Acertos', value: totalCorrect, color: 'hsl(var(--medical-preventiva))' },
    { name: 'Erros', value: totalQuestions - totalCorrect, color: 'hsl(var(--destructive))' }
  ];

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const areaName = selectedArea === 'all' ? 'Todas as Áreas' : selectedArea;
      
      doc.setFontSize(20);
      doc.text(`Relatório - ${areaName}`, 20, 20);
      
      doc.setFontSize(12);
      let yPos = 40;
      
      // KPIs
      doc.text('Indicadores Chave:', 20, yPos);
      yPos += 10;
      doc.text(`Total de Exercícios: ${totalExercises}`, 30, yPos);
      yPos += 7;
      doc.text(`Temas Únicos: ${uniqueTopics}`, 30, yPos);
      yPos += 7;
      doc.text(`Total de Questões: ${totalQuestions}`, 30, yPos);
      yPos += 7;
      doc.text(`Taxa de Acerto: ${overallAccuracy.toFixed(1)}%`, 30, yPos);
      yPos += 15;
      
      // Topics table
      doc.text('Desempenho por Tema:', 20, yPos);
      yPos += 10;
      
      topicData.forEach((topic, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${index + 1}. ${topic.topic}`, 30, yPos);
        yPos += 7;
        doc.text(`   Acurácia: ${topic.acurácia}% | Questões: ${topic.questões} | Última: ${topic.ultimaPratica}`, 30, yPos);
        yPos += 10;
      });
      
      doc.save(`relatorio-${areaName.toLowerCase().replace(/\s/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "PDF gerado!",
        description: "O relatório foi baixado com sucesso.",
      });
    } catch (error) {
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
            <CardTitle className={`text-3xl ${
              overallAccuracy >= 80 ? 'text-medical-preventiva' : 
              overallAccuracy >= 60 ? 'text-medical-clinica' : 
              'text-destructive'
            }`}>
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
              <span className="text-2xl font-bold text-medical-preventiva">{totalCorrect}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-destructive" />
                <span className="font-medium">Erros</span>
              </div>
              <span className="text-2xl font-bold text-destructive">{totalQuestions - totalCorrect}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="font-medium">Progresso</span>
              </div>
              <span className={`text-2xl font-bold ${
                overallAccuracy >= 80 ? 'text-medical-preventiva' : 
                overallAccuracy >= 60 ? 'text-medical-clinica' : 
                'text-destructive'
              }`}>
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
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-semibold">#</th>
                    <th className="text-left py-3 px-4 font-semibold">Tema</th>
                    <th className="text-center py-3 px-4 font-semibold">Acurácia</th>
                    <th className="text-center py-3 px-4 font-semibold">Questões</th>
                    <th className="text-center py-3 px-4 font-semibold">Acertos</th>
                    <th className="text-center py-3 px-4 font-semibold">Erros</th>
                    <th className="text-center py-3 px-4 font-semibold">Última Prática</th>
                  </tr>
                </thead>
                <tbody>
                  {topicData.map((topic, index) => (
                    <tr key={topic.topic} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2 text-muted-foreground">{index + 1}</td>
                      <td className="py-3 px-4 font-medium">{topic.topic}</td>
                      <td className="text-center py-3 px-4">
                        <span className={`font-bold ${
                          topic.acurácia >= 80 ? 'text-medical-preventiva' : 
                          topic.acurácia >= 60 ? 'text-medical-clinica' : 
                          'text-destructive'
                        }`}>
                          {topic.acurácia}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">{topic.questões}</td>
                      <td className="text-center py-3 px-4 text-medical-preventiva">{topic.acertos}</td>
                      <td className="text-center py-3 px-4 text-destructive">{topic.erros}</td>
                      <td className="text-center py-3 px-4 text-sm text-muted-foreground">{topic.ultimaPratica}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
