import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BurnoutData, CheckInEntry, BurnoutLevel } from '@/lib/types';
import { Heart, Smile, Battery, Moon, AlertTriangle, BookOpen, FileDown, TrendingUp, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface XoBurnoutProps {
  data: BurnoutData;
  addCheckIn: (checkIn: Omit<CheckInEntry, 'id' | 'level'>) => Promise<void>;
}

const XoBurnout = ({ data: burnoutData, addCheckIn: addBurnoutCheckIn }: XoBurnoutProps) => {
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportDays, setReportDays] = useState('7');
  
  // Check-in form state
  const [feeling, setFeeling] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState(3);
  const [sleep, setSleep] = useState<'great' | 'ok' | 'bad'>('ok');
  const [stress, setStress] = useState(false);
  const [studyPerformance, setStudyPerformance] = useState<'yes' | 'partially' | 'no'>('yes');
  const [notes, setNotes] = useState('');

  const calculateLevel = (
    feeling: number,
    energy: number,
    mood: number,
    sleep: string,
    stress: boolean,
    performance: string
  ): BurnoutLevel => {
    let score = 0;
    
    // Positive indicators
    score += feeling + energy + mood; // Max 15
    if (sleep === 'great') score += 3;
    if (sleep === 'ok') score += 1;
    if (performance === 'yes') score += 3;
    if (performance === 'partially') score += 1;
    
    // Negative indicators
    if (stress) score -= 3;
    
    // Total possible: 24 (15 + 3 + 3 + 3)
    // With stress: can go to 21
    
    if (score >= 18) return 'green';
    if (score >= 12) return 'yellow';
    return 'red';
  };

  const handleSubmitCheckIn = async () => {
    const level = calculateLevel(feeling, energy, mood, sleep, stress, studyPerformance);
    
    const now = new Date();
    const checkIn: Omit<CheckInEntry, 'id' | 'level'> = {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0].substring(0, 5),
      feeling,
      energy,
      mood,
      sleep,
      stress,
      studyPerformance,
      notes: notes.trim() || undefined
    };

    await addBurnoutCheckIn(checkIn);

    toast({
      title: "Check-in registrado",
      description: getLevelMessage(level),
    });

    // Reset form
    setFeeling(3);
    setEnergy(3);
    setMood(3);
    setSleep('ok');
    setStress(false);
    setStudyPerformance('yes');
    setNotes('');
    setIsCheckInOpen(false);
  };

  const getLevelMessage = (level: BurnoutLevel): string => {
    switch (level) {
      case 'green':
        return 'Você parece estar bem hoje. Continue cuidando de si com carinho. 💚';
      case 'yellow':
        return 'Sinais leves de cansaço apareceram. Talvez reduzir um pouco o ritmo seja útil. 💛';
      case 'red':
        return 'Seu corpo e mente pedem um descanso real. Vamos pensar em pequenas ações de recuperação? ❤️';
    }
  };

  const getSuggestions = (level: BurnoutLevel): string[] => {
    switch (level) {
      case 'green':
        return [
          'Manter rotina saudável',
          'Hidratar regularmente',
          'Fazer pausas curtas conscientes',
          'Dormir no horário'
        ];
      case 'yellow':
        return [
          'Reduzir um pouco a carga hoje',
          'Fazer blocos menores de estudo',
          'Pausa ativa de 10-15 minutos',
          'Praticar respiração profunda'
        ];
      case 'red':
        return [
          'Considerar um dia mais leve ou descanso',
          'Estudo mínimo (30-60 min apenas)',
          'Alongamento ou caminhada curta',
          'Priorizar sono de qualidade',
          'Reorganizar o dia com gentileza'
        ];
    }
  };

  const getLevelColor = (level: BurnoutLevel): string => {
    switch (level) {
      case 'green':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'yellow':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'red':
        return 'bg-red-100 text-red-700 border-red-300';
    }
  };

  const getLevelBgClass = (level: BurnoutLevel): string => {
    switch (level) {
      case 'green':
        return 'bg-emerald-500';
      case 'yellow':
        return 'bg-amber-500';
      case 'red':
        return 'bg-red-500';
    }
  };

  const getChartData = () => {
    const last14Days = burnoutData.checkIns.slice(0, 14).reverse();
    return last14Days.map(entry => ({
      date: new Date(entry.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      feeling: entry.feeling,
      energy: entry.energy,
      mood: entry.mood
    }));
  };

  const getLevelDistribution = () => {
    const counts = { green: 0, yellow: 0, red: 0 };
    burnoutData.checkIns.slice(0, 30).forEach(entry => {
      counts[entry.level]++;
    });
    return [
      { name: 'Verde', value: counts.green, fill: '#10b981' },
      { name: 'Amarelo', value: counts.yellow, fill: '#f59e0b' },
      { name: 'Vermelho', value: counts.red, fill: '#ef4444' }
    ];
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const filteredData = reportDays === 'all' 
      ? burnoutData.checkIns 
      : burnoutData.checkIns.slice(0, parseInt(reportDays));

    // Header
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('PERRYMED - Relatório de Bem-Estar', 105, 15, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const periodText = reportDays === 'all' 
      ? `Período: Desde o início (${filteredData.length} check-ins)` 
      : `Período: Últimos ${reportDays} dias`;
    doc.text(periodText, 20, 35);
    doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, 20, 40);

    // Summary
    const greenCount = filteredData.filter(e => e.level === 'green').length;
    const yellowCount = filteredData.filter(e => e.level === 'yellow').length;
    const redCount = filteredData.filter(e => e.level === 'red').length;

    doc.setFontSize(12);
    doc.text('Resumo do Período', 20, 50);
    doc.setFontSize(10);
    doc.text(`✓ Dias Verdes (Bem-estar): ${greenCount}`, 25, 57);
    doc.text(`⚠ Dias Amarelos (Atenção): ${yellowCount}`, 25, 63);
    doc.text(`✗ Dias Vermelhos (Desgaste): ${redCount}`, 25, 69);

    // Check-ins table
    if (filteredData.length > 0) {
      const tableData = filteredData.map(entry => [
        new Date(entry.date).toLocaleDateString('pt-BR'),
        entry.time,
        entry.level === 'green' ? 'Verde' : entry.level === 'yellow' ? 'Amarelo' : 'Vermelho',
        `${entry.feeling}/5`,
        `${entry.energy}/5`,
        `${entry.mood}/5`
      ]);

      autoTable(doc, {
        head: [['Data', 'Hora', 'Nível', 'Sentimento', 'Energia', 'Humor']],
        body: tableData,
        startY: 75,
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] }
      });
    }

    // Trends Analysis
    const finalY = (doc as any).lastAutoTable?.finalY || 75;
    
    // Calculate averages
    const avgFeeling = (filteredData.reduce((sum, e) => sum + e.feeling, 0) / filteredData.length).toFixed(1);
    const avgEnergy = (filteredData.reduce((sum, e) => sum + e.energy, 0) / filteredData.length).toFixed(1);
    const avgMood = (filteredData.reduce((sum, e) => sum + e.mood, 0) / filteredData.length).toFixed(1);
    
    doc.setFontSize(12);
    doc.text('Análise de Tendências', 20, finalY + 15);
    
    doc.setFontSize(10);
    doc.text(`Média de Sentimento: ${avgFeeling}/5`, 25, finalY + 23);
    doc.text(`Média de Energia: ${avgEnergy}/5`, 25, finalY + 29);
    doc.text(`Média de Humor: ${avgMood}/5`, 25, finalY + 35);
    
    // Visual trend bars
    const drawBar = (y: number, value: number, label: string, color: [number, number, number]) => {
      doc.setFillColor(color[0], color[1], color[2]);
      const barWidth = (value / 5) * 80;
      doc.rect(25, y, barWidth, 4, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(25, y, 80, 4, 'S');
    };
    
    drawBar(finalY + 43, parseFloat(avgFeeling), 'Sentimento', [59, 130, 246]); // Blue
    drawBar(finalY + 50, parseFloat(avgEnergy), 'Energia', [16, 185, 129]); // Green
    drawBar(finalY + 57, parseFloat(avgMood), 'Humor', [245, 158, 11]); // Orange
    
    // Sleep quality
    const sleepStats = {
      great: filteredData.filter(e => e.sleep === 'great').length,
      ok: filteredData.filter(e => e.sleep === 'ok').length,
      bad: filteredData.filter(e => e.sleep === 'bad').length
    };
    
    doc.setFontSize(10);
    doc.text('Qualidade do Sono:', 25, finalY + 67);
    doc.setFontSize(9);
    doc.text(`Ótimo: ${sleepStats.great} dias | Ok: ${sleepStats.ok} dias | Ruim: ${sleepStats.bad} dias`, 25, finalY + 73);
    
    // Recommendations
    doc.setFontSize(12);
    doc.text('Sugestões Gerais de Autocuidado', 20, finalY + 85);
    doc.setFontSize(9);
    const suggestions = [
      '• Mantenha uma rotina regular de sono',
      '• Faça pausas regulares durante o estudo',
      '• Pratique atividades físicas leves',
      '• Mantenha contato com amigos e família',
      '• Busque ajuda profissional se necessário'
    ];
    suggestions.forEach((sug, idx) => {
      doc.text(sug, 25, finalY + 92 + (idx * 6));
    });

    const fileName = reportDays === 'all' 
      ? 'relatorio-bem-estar-completo.pdf' 
      : `relatorio-bem-estar-${reportDays}dias.pdf`;
    doc.save(fileName);
    
    toast({
      title: "Relatório gerado",
      description: "Seu relatório de bem-estar foi baixado com sucesso."
    });
  };

  const latestCheckIn = burnoutData.checkIns[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary" />
            Xô Burnout
          </CardTitle>
          <CardDescription>
            Um espaço seguro e voluntário para cuidar do seu bem-estar durante a jornada rumo à residência. 
            Registre como você está se sentindo, sem pressão e sem cobrança.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Check-in Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <Heart className="w-12 h-12 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Como você está hoje?</h3>
              <p className="text-sm text-muted-foreground">
                Faça um check-in rápido para registrar seu estado emocional
              </p>
            </div>
            <Button onClick={() => setIsCheckInOpen(true)} size="lg" className="gap-2">
              <Smile className="w-5 h-5" />
              Fazer Check-in (30s)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Latest Status */}
      {latestCheckIn && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Último Check-in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {new Date(latestCheckIn.date).toLocaleDateString('pt-BR')} às {latestCheckIn.time}
                </span>
              </div>
              <Badge className={`${getLevelColor(latestCheckIn.level)} border`}>
                {latestCheckIn.level === 'green' ? 'Bem-estar' : latestCheckIn.level === 'yellow' ? 'Atenção' : 'Desgaste'}
              </Badge>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm">{getLevelMessage(latestCheckIn.level)}</p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Sugestões para você:</p>
              <ul className="space-y-1">
                {getSuggestions(latestCheckIn.level).map((suggestion, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {burnoutData.checkIns.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Tendências (Últimos 14 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                  <YAxis domain={[0, 5]} style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="feeling" stroke="#3b82f6" name="Sentimento" strokeWidth={2} />
                  <Line type="monotone" dataKey="energy" stroke="#10b981" name="Energia" strokeWidth={2} />
                  <Line type="monotone" dataKey="mood" stroke="#f59e0b" name="Humor" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição de Níveis (Últimos 30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={getLevelDistribution()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* History Timeline */}
      {burnoutData.checkIns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {burnoutData.checkIns.slice(0, 30).map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className={`w-3 h-3 rounded-full mt-1 ${getLevelBgClass(entry.level)}`} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {new Date(entry.date).toLocaleDateString('pt-BR')} - {entry.time}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {entry.level === 'green' ? '💚' : entry.level === 'yellow' ? '💛' : '❤️'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <span>Sentimento: {entry.feeling}/5</span>
                      <span>Energia: {entry.energy}/5</span>
                      <span>Humor: {entry.mood}/5</span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground italic mt-1">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            Exportar Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsReportDialogOpen(true)} variant="outline" className="w-full" disabled={burnoutData.checkIns.length === 0}>
            <FileDown className="w-4 h-4 mr-2" />
            Gerar Relatório de Bem-Estar
          </Button>
        </CardContent>
      </Card>

      {/* Check-in Dialog */}
      <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Check-in de Bem-Estar</DialogTitle>
            <DialogDescription>
              Responda com sinceridade. Suas respostas são apenas para você.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Feeling */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Smile className="w-4 h-4" />
                Como você está se sentindo agora? ({feeling}/5)
              </Label>
              <input
                type="range"
                min="1"
                max="5"
                value={feeling}
                onChange={(e) => setFeeling(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Muito mal</span>
                <span>Muito bem</span>
              </div>
            </div>

            {/* Energy */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Battery className="w-4 h-4" />
                Seu nível de energia? ({energy}/5)
              </Label>
              <input
                type="range"
                min="1"
                max="5"
                value={energy}
                onChange={(e) => setEnergy(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Esgotado</span>
                <span>Energizado</span>
              </div>
            </div>

            {/* Mood */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Humor atual? ({mood}/5)
              </Label>
              <input
                type="range"
                min="1"
                max="5"
                value={mood}
                onChange={(e) => setMood(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Péssimo</span>
                <span>Ótimo</span>
              </div>
            </div>

            {/* Sleep */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Moon className="w-4 h-4" />
                Como dormiu?
              </Label>
              <Select value={sleep} onValueChange={(v) => setSleep(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="great">Ótimo</SelectItem>
                  <SelectItem value="ok">Ok</SelectItem>
                  <SelectItem value="bad">Ruim</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stress */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Teve estresse ou irritação hoje?
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={stress ? "default" : "outline"}
                  onClick={() => setStress(true)}
                  className="flex-1"
                >
                  Sim
                </Button>
                <Button
                  type="button"
                  variant={!stress ? "default" : "outline"}
                  onClick={() => setStress(false)}
                  className="flex-1"
                >
                  Não
                </Button>
              </div>
            </div>

            {/* Study Performance */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Seu estudo rendeu?
              </Label>
              <Select value={studyPerformance} onValueChange={(v) => setStudyPerformance(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="yes">Sim</SelectItem>
                  <SelectItem value="partially">Parcialmente</SelectItem>
                  <SelectItem value="no">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Algo te deixou cansado ou preocupado? (opcional)</Label>
              <Textarea
                placeholder="Escreva aqui se quiser..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button onClick={handleSubmitCheckIn} className="w-full">
              Registrar Check-in
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Relatório de Bem-Estar</DialogTitle>
            <DialogDescription>
              Escolha o período para incluir no seu relatório
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={reportDays} onValueChange={setReportDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="14">Últimos 14 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="all">Desde o início</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={generatePDF} className="w-full">
              <FileDown className="w-4 h-4 mr-2" />
              Baixar Relatório PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default XoBurnout;
