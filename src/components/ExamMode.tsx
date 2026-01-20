import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ExamModeData, ExamSession, ExamSessionConfig, DistractionMark, PostSessionEmotions, AmbientSound, ExamPhase } from '@/lib/types';
import { Timer, Play, Pause, Square, Clock, Volume2, Maximize, Target, Brain, Heart, Plus, X, FileText, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { toast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

interface ExamModeProps {
  data?: ExamModeData;
  addSession: (session: Omit<ExamSession, 'id'>) => Promise<void>;
  updateMantra: (mantra: string) => void;
}

const AMBIENT_SOUNDS: { value: AmbientSound; label: string }[] = [
  { value: 'silence', label: 'Silêncio Total' },
  { value: 'exam-room', label: 'Sala de Prova' },
  { value: 'white-noise', label: 'Ruído Branco' },
  { value: 'rain', label: 'Chuva Suave' },
  { value: 'library', label: 'Biblioteca' },
  { value: 'auditorium', label: 'Auditório' }
];

const ExamMode = ({ data, addSession: addExamSession, updateMantra }: ExamModeProps) => {
  const examModeData: ExamModeData = data ?? { sessions: [], mantra: '' };
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [isPostSessionOpen, setIsPostSessionOpen] = useState(false);
  const [isDiaryOpen, setIsDiaryOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Config state
  const [totalTime, setTotalTime] = useState(180); // 3 hours default
  const [phases, setPhases] = useState<ExamPhase[]>([
    { name: 'Primeira Passada', duration: 120 },
    { name: 'Revisão Rápida', duration: 30 },
    { name: 'Revisão Crítica', duration: 30 }
  ]);
  const [ambientSound, setAmbientSound] = useState<AmbientSound>('silence');
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [resistanceMode, setResistanceMode] = useState(false);
  const [strategyNotes, setStrategyNotes] = useState('');

  // Session state
  const [currentSession, setCurrentSession] = useState<ExamSession | null>(null);
  const [distractions, setDistractions] = useState<DistractionMark[]>([]);

  // Post-session state
  const [anxiety, setAnxiety] = useState(3);
  const [focus, setFocus] = useState(3);
  const [mentalFatigue, setMentalFatigue] = useState(3);
  const [overallFeeling, setOverallFeeling] = useState('');
  const [diary, setDiary] = useState('');
  const [totalQuestions, setTotalQuestions] = useState<number | ''>('');
  const [correctAnswers, setCorrectAnswers] = useState<number | ''>('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;

          // Check phase transitions
          if (currentSession && phases.length > 0) {
            let accumulated = 0;
            for (let i = 0; i < phases.length; i++) {
              accumulated += phases[i].duration * 60;
              if (next === accumulated && i < phases.length - 1) {
                if (soundAlerts) playAlert();
                toast({
                  title: `Fase Concluída: ${phases[i].name}`,
                  description: `Iniciando: ${phases[i + 1].name}`,
                });
                setCurrentPhaseIndex(i + 1);
                break;
              }
            }
          }

          // Check final time
          const totalSeconds = totalTime * 60;
          if (next >= totalSeconds) {
            handleStopSession();
            return totalSeconds;
          }

          // 30-minute warning
          if (next === totalSeconds - 1800 && soundAlerts) {
            toast({
              title: "⏰ Últimos 30 minutos",
              description: "Continue focado. Você está indo bem.",
            });
          }

          // 10-minute warning
          if (next === totalSeconds - 600 && soundAlerts) {
            toast({
              title: "⚡ Últimos 10 minutos",
              description: "Foco total na reta final!",
              variant: "destructive"
            });
          }

          return next;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isPaused, totalTime, currentPhaseIndex, soundAlerts]);

  const playAlert = () => {
    // Simple beep using Web Audio API
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.2);
  };

  const startSession = () => {
    const config: ExamSessionConfig = {
      totalTime,
      phases,
      ambientSound,
      soundAlerts,
      fullscreen: false,
      resistanceMode,
      mantra: examModeData.mantra
    };

    const session: ExamSession = {
      id: `session-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      config,
      distractions: [],
      completed: false,
      actualDuration: 0,
      strategy: strategyNotes || undefined
    };

    setCurrentSession(session);
    setDistractions([]);
    setElapsedSeconds(0);
    setCurrentPhaseIndex(0);
    setIsRunning(true);
    setIsConfigOpen(false);

    toast({
      title: "Sessão Iniciada",
      description: examModeData.mantra || "Agora é só você e o tempo. Boa prova!",
    });
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    toast({
      title: isPaused ? "Retomando" : "Pausado",
      description: isPaused ? "Continue focado!" : "Respire fundo. Volte quando estiver pronto."
    });
  };

  const handleStopSession = () => {
    if (!currentSession) return;

    setIsRunning(false);
    setIsPaused(false);

    const completedSession: ExamSession = {
      ...currentSession,
      distractions,
      completed: true,
      actualDuration: Math.floor(elapsedSeconds / 60)
    };

    setCurrentSession(completedSession);
    setIsPostSessionOpen(true);

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    if (soundAlerts) playAlert();
  };

  const markDistraction = (type: 'mental-pause' | 'distraction') => {
    const mark: DistractionMark = {
      timestamp: elapsedSeconds,
      type
    };
    setDistractions(prev => [...prev, mark]);
    toast({
      title: type === 'distraction' ? "Distração registrada" : "Pausa mental registrada",
      description: "Continue. Você está monitorando seu foco.",
    });
  };

  const savePostSession = async () => {
    if (!currentSession) return;

    const emotions: PostSessionEmotions = {
      anxiety,
      focus,
      mentalFatigue,
      overallFeeling: overallFeeling.trim()
    };

    const finalSession: Omit<ExamSession, 'id'> = {
      ...currentSession,
      emotions,
      diary: diary.trim() || undefined,
      totalQuestions: Number(totalQuestions) || undefined,
      correctAnswers: Number(correctAnswers) || undefined
    };

    await addExamSession(finalSession);

    toast({
      title: "Sessão Salva",
      description: "Seu treino foi registrado com sucesso!"
    });

    // Reset
    setCurrentSession(null);
    setIsPostSessionOpen(false);
    setAnxiety(3);
    setFocus(3);
    setMentalFatigue(3);
    setOverallFeeling('');
    setDiary('');
    setTotalQuestions('');
    setCorrectAnswers('');
  };

  const addPhase = () => {
    setPhases([...phases, { name: `Fase ${phases.length + 1}`, duration: 30 }]);
  };

  const removePhase = (index: number) => {
    setPhases(phases.filter((_, i) => i !== index));
  };

  const updatePhase = (index: number, field: 'name' | 'duration', value: string | number) => {
    const updated = [...phases];
    if (field === 'name') {
      updated[index].name = value as string;
    } else {
      updated[index].duration = value as number;
    }
    setPhases(updated);
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getCurrentPhase = (): ExamPhase | null => {
    if (phases.length === 0) return null;
    return phases[currentPhaseIndex] || null;
  };

  const getPhaseProgress = (): number => {
    if (phases.length === 0) return 0;

    let accumulated = 0;
    for (let i = 0; i < currentPhaseIndex; i++) {
      accumulated += phases[i].duration * 60;
    }

    const currentPhase = getCurrentPhase();
    if (!currentPhase) return 100;

    const phaseElapsed = elapsedSeconds - accumulated;
    const phaseDuration = currentPhase.duration * 60;

    return Math.min((phaseElapsed / phaseDuration) * 100, 100);
  };

  const getDistractionChart = (session: ExamSession) => {
    const buckets = Array(12).fill(0); // 12 intervals of 5 minutes each (1 hour)
    session.distractions.forEach(d => {
      const bucket = Math.floor(d.timestamp / 300); // 300 seconds = 5 minutes
      if (bucket < 12) buckets[bucket]++;
    });

    return buckets.map((count, idx) => ({
      time: `${idx * 5}-${(idx + 1) * 5}min`,
      count
    }));
  };

  const getFocusInsights = () => {
    if (examModeData.sessions.length < 3) return null;

    const recentSessions = examModeData.sessions.slice(0, 10);
    const avgDistractions = recentSessions.reduce((sum, s) => sum + s.distractions.length, 0) / recentSessions.length;
    const avgFocus = recentSessions
      .filter(s => s.emotions)
      .reduce((sum, s) => sum + (s.emotions?.focus || 0), 0) / recentSessions.filter(s => s.emotions).length;

    return {
      avgDistractions: avgDistractions.toFixed(1),
      avgFocus: avgFocus.toFixed(1),
      trend: examModeData.sessions[0].distractions.length < avgDistractions ? 'improving' : 'stable'
    };
  };

  const totalSeconds = totalTime * 60;
  const progress = (elapsedSeconds / totalSeconds) * 100;
  const isLastThirty = totalSeconds - elapsedSeconds <= 1800 && totalSeconds - elapsedSeconds > 600;
  const isLastTen = totalSeconds - elapsedSeconds <= 600;

  // Idle state
  if (!isRunning && !currentSession) {
    return (
      <div className="space-y-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="w-6 h-6 text-primary" />
              Modo Prova
            </CardTitle>
            <CardDescription>
              Treine sua mente para o dia da prova. Simule pressão do tempo, controle de foco e estratégias sem ver questões.
            </CardDescription>
          </CardHeader>
        </Card>

        {examModeData.mantra && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Heart className="w-8 h-8 text-primary mx-auto" />
                <p className="text-lg font-medium italic text-muted-foreground">"{examModeData.mantra}"</p>
                <p className="text-xs text-muted-foreground">Seu mantra pessoal</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setIsConfigOpen(true)}>
            <CardContent className="pt-6 text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Play className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Nova Sessão</h3>
                <p className="text-sm text-muted-foreground">Configure e inicie um treino de prova</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setIsHistoryOpen(true)}>
            <CardContent className="pt-6 text-center space-y-4">
              <div className="p-4 bg-accent/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Histórico & Insights</h3>
                <p className="text-sm text-muted-foreground">Veja sua evolução e análise de foco</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {getFocusInsights() && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Índice Pessoal de Foco (IPF)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Média de distrações</span>
                <Badge variant="outline">{getFocusInsights()?.avgDistractions} por sessão</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Foco médio</span>
                <Badge variant="outline">{getFocusInsights()?.avgFocus}/5</Badge>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  {getFocusInsights()?.trend === 'improving'
                    ? "✨ Você está mais concentrado do que antes. Continue assim!"
                    : "💪 Mantenha a consistência. Seu foco está estável."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Config Dialog */}
        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configurar Sessão de Treino</DialogTitle>
              <DialogDescription>
                Personalize sua simulação de prova
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Total Time */}
              <div className="space-y-2">
                <Label>Tempo Total (minutos)</Label>
                <Input
                  type="number"
                  value={totalTime}
                  onChange={(e) => setTotalTime(Number(e.target.value))}
                  min={1}
                />
              </div>

              {/* Phases */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Fases da Prova</Label>
                  <Button variant="outline" size="sm" onClick={addPhase}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Fase
                  </Button>
                </div>
                {phases.map((phase, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder="Nome da fase"
                      value={phase.name}
                      onChange={(e) => updatePhase(idx, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={phase.duration}
                      onChange={(e) => updatePhase(idx, 'duration', Number(e.target.value))}
                      min={1}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">min</span>
                    {phases.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removePhase(idx)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Ambient Sound */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Ambiente Sonoro
                </Label>
                <Select value={ambientSound} onValueChange={(v) => setAmbientSound(v as AmbientSound)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {AMBIENT_SOUNDS.map(sound => (
                      <SelectItem key={sound.value} value={sound.value}>{sound.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Alertas Sonoros</Label>
                  <Switch checked={soundAlerts} onCheckedChange={setSoundAlerts} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Modo Resistência (hardcore)</Label>
                  <Switch checked={resistanceMode} onCheckedChange={setResistanceMode} />
                </div>
              </div>

              {/* Strategy Notes */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Estratégia (opcional)
                </Label>
                <Textarea
                  placeholder="Ex: 2h primeira passada, chutar questões muito difíceis, começar por Pediatria..."
                  value={strategyNotes}
                  onChange={(e) => setStrategyNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Mantra */}
              <div className="space-y-2">
                <Label>Mantra Pessoal</Label>
                <Input
                  placeholder="Ex: Eu sei resolver isso. Um passo por vez."
                  value={examModeData?.mantra || ''}
                  onChange={(e) => updateMantra(e.target.value)}
                />
              </div>

              <Button onClick={startSession} className="w-full" size="lg">
                <Play className="w-5 h-5 mr-2" />
                Iniciar Sessão
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Histórico de Sessões</DialogTitle>
              <DialogDescription>
                {examModeData.sessions.length} sessões realizadas
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {examModeData.sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma sessão realizada ainda</p>
                </div>
              ) : (
                examModeData.sessions.map(session => (
                  <Card key={session.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {new Date(session.date).toLocaleDateString('pt-BR')}
                        </CardTitle>
                        <Badge variant={session.completed ? "default" : "outline"}>
                          {session.completed ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                          {session.completed ? 'Concluída' : 'Incompleta'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tempo Planejado</p>
                          <p className="font-medium">{session.config.totalTime} min</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tempo Real</p>
                          <p className="font-medium">{session.actualDuration} min</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Distrações</p>
                          <p className="font-medium">{session.distractions.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Foco</p>
                          <p className="font-medium">{session.emotions?.focus || '-'}/5</p>
                        </div>
                      </div>

                      {session.distractions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Padrão de Distrações</p>
                          <ResponsiveContainer width="100%" height={120}>
                            <BarChart data={getDistractionChart(session)}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="time" style={{ fontSize: '10px' }} />
                              <YAxis style={{ fontSize: '10px' }} />
                              <Tooltip />
                              <Bar dataKey="count" fill="hsl(var(--primary))" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {session.emotions && (
                        <div className="p-3 bg-muted/50 rounded-lg text-sm">
                          <p className="font-medium mb-1">Sensação pós-sessão:</p>
                          <p className="text-muted-foreground">{session.emotions.overallFeeling}</p>
                        </div>
                      )}

                      {session.diary && (
                        <div className="p-3 bg-muted/50 rounded-lg text-sm">
                          <p className="font-medium mb-1">Diário:</p>
                          <p className="text-muted-foreground">{session.diary}</p>
                        </div>
                      )}

                      {(session.totalQuestions !== undefined && session.totalQuestions > 0) && (
                        <div className="p-3 bg-muted/50 rounded-lg text-sm flex justify-between items-center">
                          <span className="font-medium">Desempenho:</span>
                          <div className="flex gap-4 items-center">
                            <span>🎯 {session.correctAnswers}/{session.totalQuestions}</span>
                            <Badge variant={((session.correctAnswers || 0) / session.totalQuestions) * 100 >= 80 ? 'default' : 'secondary'}>
                              {(((session.correctAnswers || 0) / session.totalQuestions) * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Active session
  return (
    <div className="space-y-6">
      {/* Main Timer */}
      <Card className={`border-l-4 transition-all ${isLastTen ? 'border-l-red-500 animate-pulse' :
        isLastThirty ? 'border-l-amber-500' :
          'border-l-primary'
        }`}>
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            {/* Current Phase */}
            {getCurrentPhase() && (
              <div>
                <Badge variant="outline" className="mb-2">
                  Fase {currentPhaseIndex + 1} de {phases.length}
                </Badge>
                <h3 className="text-xl font-semibold">{getCurrentPhase()?.name}</h3>
              </div>
            )}

            {/* Main Clock */}
            <div className="relative">
              <div className={`text-7xl md:text-8xl font-mono font-bold ${isLastTen ? 'text-red-500' :
                isLastThirty ? 'text-amber-500' :
                  'text-primary'
                }`}>
                {formatTime(totalSeconds - elapsedSeconds)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Decorrido: {formatTime(elapsedSeconds)}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${isLastTen ? 'bg-red-500' :
                    isLastThirty ? 'bg-amber-500' :
                      'bg-primary'
                    }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {getCurrentPhase() && (
                <div className="text-xs text-muted-foreground">
                  Progresso da fase: {getPhaseProgress().toFixed(0)}%
                </div>
              )}
            </div>

            {/* Mantra */}
            {examModeData.mantra && !resistanceMode && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm italic text-muted-foreground">"{examModeData.mantra}"</p>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3 justify-center flex-wrap">
              <Button variant="outline" onClick={handlePause} size="lg">
                {isPaused ? <Play className="w-5 h-5 mr-2" /> : <Pause className="w-5 h-5 mr-2" />}
                {isPaused ? 'Retomar' : 'Pausar'}
              </Button>
              <Button variant="destructive" onClick={handleStopSession} size="lg">
                <Square className="w-5 h-5 mr-2" />
                Finalizar
              </Button>
            </div>

            {/* Distraction Tracking */}
            {!resistanceMode && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-3">Monitoramento de Foco</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markDistraction('distraction')}
                  >
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Distração ({distractions.filter(d => d.type === 'distraction').length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markDistraction('mental-pause')}
                  >
                    <Brain className="w-4 h-4 mr-1" />
                    Pausa Mental ({distractions.filter(d => d.type === 'mental-pause').length})
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Motivational Messages */}
      {!resistanceMode && isLastThirty && !isLastTen && (
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
          <CardContent className="pt-6 text-center">
            <p className="text-sm font-medium">🔥 Respira. Você está indo bem. Continue no seu ritmo.</p>
          </CardContent>
        </Card>
      )}

      {!resistanceMode && isLastTen && (
        <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 animate-pulse">
          <CardContent className="pt-6 text-center">
            <p className="text-sm font-medium">⚡ Foco total! Você já fez isso antes. Última concentração!</p>
          </CardContent>
        </Card>
      )}

      {/* Post-Session Dialog */}
      <Dialog open={isPostSessionOpen} onOpenChange={setIsPostSessionOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sessão Concluída! 🎉</DialogTitle>
            <DialogDescription>
              Como foi sua experiência? Suas respostas ajudam a evoluir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Quantitative Data */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total de Questões</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ex: 50"
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
              <div className="space-y-2">
                <Label>Acertos</Label>
                <Input
                  type="number"
                  min="0"
                  max={Number(totalQuestions)}
                  placeholder="Ex: 40"
                  value={correctAnswers}
                  onChange={(e) => setCorrectAnswers(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
            </div>

            {/* Anxiety */}
            <div className="space-y-2">
              <Label>Nível de Ansiedade ({anxiety}/5)</Label>
              <input
                type="range"
                min="1"
                max="5"
                value={anxiety}
                onChange={(e) => setAnxiety(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Muito calmo</span>
                <span>Muito ansioso</span>
              </div>
            </div>

            {/* Focus */}
            <div className="space-y-2">
              <Label>Qualidade do Foco ({focus}/5)</Label>
              <input
                type="range"
                min="1"
                max="5"
                value={focus}
                onChange={(e) => setFocus(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Muito disperso</span>
                <span>Muito focado</span>
              </div>
            </div>

            {/* Mental Fatigue */}
            <div className="space-y-2">
              <Label>Cansaço Mental ({mentalFatigue}/5)</Label>
              <input
                type="range"
                min="1"
                max="5"
                value={mentalFatigue}
                onChange={(e) => setMentalFatigue(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Sem cansaço</span>
                <span>Muito cansado</span>
              </div>
            </div>

            {/* Overall Feeling */}
            <div className="space-y-2">
              <Label>Como se sentiu durante a sessão?</Label>
              <Textarea
                placeholder="Descreva sua experiência..."
                value={overallFeeling}
                onChange={(e) => setOverallFeeling(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={savePostSession} className="flex-1">
                Salvar Sessão
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsDiaryOpen(true)}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                Adicionar Diário
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diary Dialog */}
      <Dialog open={isDiaryOpen} onOpenChange={setIsDiaryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Diário de Prova</DialogTitle>
            <DialogDescription>
              Registre o que funcionou, o que atrapalhou e insights para melhorar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Textarea
              placeholder="O que funcionou? O que mudaria? Como estava o foco? Como planeja melhorar?"
              value={diary}
              onChange={(e) => setDiary(e.target.value)}
              rows={8}
            />

            <Button onClick={() => { setIsDiaryOpen(false); savePostSession(); }} className="w-full">
              Salvar com Diário
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamMode;
