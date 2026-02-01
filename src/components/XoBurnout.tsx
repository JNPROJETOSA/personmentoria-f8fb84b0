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
import { saveAs } from 'file-saver';
import autoTable from 'jspdf-autotable';
import { ensurePdfExtension, savePdf } from '@/lib/pdf-helpers';

interface XoBurnoutProps {
  data: BurnoutData;
  addCheckIn: (checkIn: Omit<CheckInEntry, 'id' | 'level'>) => Promise<void>;
}

const XoBurnout = ({ data: burnoutData, addCheckIn: addBurnoutCheckIn }: XoBurnoutProps) => {
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  // Helper to ensure strict display format: "DD/MM/AAAA"
  // Handles "YYYY-MM-DD" and "YYYY-MM-DDT..." inputs robustly
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '--/--/----';
    try {
      // Take only the date part before 'T' if strictly ISO
      const cleanDate = dateString.split('T')[0];
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        return parts.reverse().join('/');
      }
      return cleanDate; // Fallback if format is unexpected
    } catch (e) {
      return dateString;
    }
  };
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
    // Fix: Use local date to prevent UTC shift (e.g. 22h in Brazil becoming next day)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;

    const checkIn: Omit<CheckInEntry, 'id' | 'level'> = {
      date: localDateString,
      time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
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
    return last14Days.map(entry => {
      // Use robust helper
      const displayDate = formatDateForDisplay(entry.date);
      // We want just DD/MM for chart usually, so we slice the formatted string "DD/MM/YYYY"
      const shortDate = displayDate.substring(0, 5);
      return {
        date: shortDate,
        feeling: entry.feeling,
        energy: entry.energy,
        mood: entry.mood
      };
    });
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

  const generatePDF = async () => {
    const filteredData = reportDays === 'all'
      ? burnoutData.checkIns
      : burnoutData.checkIns.slice(0, parseInt(reportDays));

    // Initialize Service
    const { PdfService } = await import('@/lib/pdf-service');
    const pdf = new PdfService();

    await pdf.initialize('Relatório de Bem-Estar');

    // --- Header Metrics ---
    const periodText = reportDays === 'all'
      ? `Desde o início`
      : `Últimos ${reportDays} dias`;

    // Calculate Stats
    const greenCount = filteredData.filter(e => e.level === 'green').length;
    const yellowCount = filteredData.filter(e => e.level === 'yellow').length;
    const redCount = filteredData.filter(e => e.level === 'red').length;

    const avgFeeling = filteredData.length ? (filteredData.reduce((sum, e) => sum + e.feeling, 0) / filteredData.length).toFixed(1) : '-';
    const avgEnergy = filteredData.length ? (filteredData.reduce((sum, e) => sum + e.energy, 0) / filteredData.length).toFixed(1) : '-';
    const avgMood = filteredData.length ? (filteredData.reduce((sum, e) => sum + e.mood, 0) / filteredData.length).toFixed(1) : '-';

    const sleepGreat = filteredData.filter(e => e.sleep === 'great').length;
    const sleepOk = filteredData.filter(e => e.sleep === 'ok').length;
    const sleepBad = filteredData.filter(e => e.sleep === 'bad').length;

    // Use Grid Layout
    const startY = pdf.getCurrentY();
    const margin = pdf.getMargin();
    const contentWidth = pdf.getContentWidth();
    const colGap = 10;
    const colWidth = (contentWidth - (colGap * 2)) / 3;

    // -- Top Section: Performance Geral --
    // We can draw a large section or individual cards. Let's do individual cards for visual separation but grouped.

    // Card 1: Resumo
    pdf.drawCard(margin, startY, colWidth, 40, 'Resumo de Dias');
    pdf.addMetricAt(margin + 5, startY + 15, 'Verdes (Bem-estar)', greenCount.toString());
    pdf.addMetricAt(margin + (colWidth / 2) + 5, startY + 15, 'Amarelos', yellowCount.toString());
    pdf.addMetricAt(margin + 5, startY + 28, 'Vermelhos (Risco)', redCount.toString());

    // Card 2: Médias
    pdf.drawCard(margin + colWidth + colGap, startY, colWidth, 40, 'Médias do Período');
    pdf.addMetricAt(margin + colWidth + colGap + 5, startY + 15, 'Sentimento', avgFeeling + '/5');
    pdf.addMetricAt(margin + colWidth + colGap + (colWidth / 2) + 5, startY + 15, 'Energia', avgEnergy + '/5');
    pdf.addMetricAt(margin + colWidth + colGap + 5, startY + 28, 'Humor', avgMood + '/5');

    // Card 3: Sono
    pdf.drawCard(margin + (colWidth * 2) + (colGap * 2), startY, colWidth, 40, 'Qualidade do Sono');
    pdf.addMetricAt(margin + (colWidth * 2) + (colGap * 2) + 5, startY + 15, 'Noites Ótimas', sleepGreat.toString());
    pdf.addMetricAt(margin + (colWidth * 2) + (colGap * 2) + (colWidth / 2) + 5, startY + 15, 'Normais', sleepOk.toString());
    pdf.addMetricAt(margin + (colWidth * 2) + (colGap * 2) + 5, startY + 28, 'Ruins', sleepBad.toString());

    // Move Y past the cards
    pdf.moveY(50); // 40 height + 10 margin

    // Context info line
    pdf.addTextAt(margin, pdf.getCurrentY(), `${periodText} • Total de registros: ${filteredData.length}`, 9, { color: [100, 100, 100] });
    pdf.moveY(8);

    // -- Table Section using autoTable --
    if (filteredData.length > 0) {
      const headers = ['Data', 'Nível', 'Sentimento', 'Energia', 'Humor', 'Sono'];
      const body = filteredData.map(entry => [
        `Registro ${formatDateForDisplay(entry.date)} - ${entry.time}`,
        entry.level === 'green' ? 'Verde' : entry.level === 'yellow' ? 'Amarelo' : 'Vermelho',
        entry.feeling.toString(), // Simplified to save space
        entry.energy.toString(),
        entry.mood.toString(),
        entry.sleep === 'great' ? 'Ótimo' : entry.sleep === 'ok' ? 'Ok' : 'Ruim'
      ]);

      pdf.addTable(headers, body);
    } else {
      pdf.addText("Nenhum registro encontrado para este período.");
    }

    // -- Recommendations (Compact Footer) --
    // Check if we have space, otherwise add page
    pdf.moveY(10);
    pdf.addSection('Sugestões');

    // Draw compact suggestions in 2 columns
    const suggestions = [
      '• Mantenha uma rotina regular de sono.',
      '• Faça pausas regulares durante o estudo.',
      '• Pratique atividades físicas leves.',
      '• Mantenha contato com amigos e família.',
      '• Busque ajuda profissional se necessário.'
    ];

    const startSuggestionsY = pdf.getCurrentY();
    suggestions.forEach((sug, idx) => {
      // Simple 1-column list for readability, but compact line height
      pdf.addText(sug, 9);
    });

    // Save
    const fileName = reportDays === 'all'
      ? 'relatorio-bem-estar-completo'
      : `relatorio-bem-estar-${reportDays}dias`;

    pdf.save(fileName);

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
                  Registro {formatDateForDisplay(latestCheckIn.date)} - {latestCheckIn.time}
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
                        Registro {formatDateForDisplay(entry.date)} - {entry.time}
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
