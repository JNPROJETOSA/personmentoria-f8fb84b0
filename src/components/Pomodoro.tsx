import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { usePomodoroSettings } from '@/hooks/usePomodoroSettings';

type PomodoroMode = 'focus' | 'short-break' | 'long-break';

export default function Pomodoro() {
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [task, setTask] = useState('');

  // Use Custom Hook for persistence
  const { settings: savedSettings, loading, saveSettings } = usePomodoroSettings();

  // Local state for the slider, initialized with saved settings
  const [localSettings, setLocalSettings] = useState({
    focus: 25,
    shortBreak: 5,
    longBreak: 15
  });

  // Sync local settings when saved settings load
  useEffect(() => {
    if (!loading) {
      setLocalSettings(savedSettings);

      // Also update current timer if not running
      if (!isRunning) {
        if (mode === 'focus') setTimeLeft(savedSettings.focus * 60);
        if (mode === 'short-break') setTimeLeft(savedSettings.shortBreak * 60);
        if (mode === 'long-break') setTimeLeft(savedSettings.longBreak * 60);
      }
    }
  }, [savedSettings, loading]); // Remove 'mode' dependency to avoid resetting timer on mode switch if running

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiqF0fPTgjMGHm7A7+OZRQ0PVa3n77FdGAU+mejxw2sjBC+D0fLWhTUHImzB7uSXSQ0PV67n8LNfGQVAnerzxG4kBSuE0/PYhzYIIW/D7eSZSQ0OVrDn8LRgGQU+mujywm8kBS2E1PPaiDcII3DD7uSaSg0NVrHo8bVgGgVBnOjywXAjBS+F1PPaizgJJHLE7uSbSw0NV7Lo8LVhGwVCnerywnAkBjCG1PPaizgKJXTE7+WcTA0MWLP='
    );
  }, []);

  const durations = {
    focus: localSettings.focus * 60,
    'short-break': localSettings.shortBreak * 60,
    'long-break': localSettings.longBreak * 60
  };

  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(durations[mode]);
    }
  }, [mode, localSettings]); // Update when mode changes or settings change (if not running)

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          audioRef.current?.play();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((durations[mode] - timeLeft) / durations[mode]) * 100;

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(durations[mode]);
  };

  const handleSaveSettings = () => {
    saveSettings(localSettings);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Time de Estudos
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configurações do Timer</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Foco</Label>
                      <span className="text-sm text-muted-foreground">{localSettings.focus} min</span>
                    </div>
                    <Slider
                      value={[localSettings.focus]}
                      onValueChange={([v]) => setLocalSettings(s => ({ ...s, focus: v }))}
                      min={1}
                      max={60}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Pausa Curta</Label>
                      <span className="text-sm text-muted-foreground">{localSettings.shortBreak} min</span>
                    </div>
                    <Slider
                      value={[localSettings.shortBreak]}
                      onValueChange={([v]) => setLocalSettings(s => ({ ...s, shortBreak: v }))}
                      min={1}
                      max={15}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Pausa Longa</Label>
                      <span className="text-sm text-muted-foreground">{localSettings.longBreak} min</span>
                    </div>
                    <Slider
                      value={[localSettings.longBreak]}
                      onValueChange={([v]) => setLocalSettings(s => ({ ...s, longBreak: v }))}
                      min={5}
                      max={30}
                      step={1}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveSettings} className="w-full sm:w-auto">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar como Padrão
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>Técnica Pomodoro para foco máximo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2 justify-center">
            <Button
              variant={mode === 'focus' ? 'default' : 'outline'}
              onClick={() => setMode('focus')}
              disabled={isRunning}
            >
              Foco
            </Button>
            <Button
              variant={mode === 'short-break' ? 'default' : 'outline'}
              onClick={() => setMode('short-break')}
              disabled={isRunning}
            >
              Pausa Curta
            </Button>
            <Button
              variant={mode === 'long-break' ? 'default' : 'outline'}
              onClick={() => setMode('long-break')}
              disabled={isRunning}
            >
              Pausa Longa
            </Button>
          </div>

          <div className="flex flex-col items-center space-y-6">
            <div className="relative w-64 h-64">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 120}`}
                  strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                  className="text-primary transition-all duration-1000"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl font-bold">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {mode === 'focus' ? 'Focando' : mode === 'short-break' ? 'Pausa Curta' : 'Pausa Longa'}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-md space-y-4">
              <div className="space-y-2">
                <Label>No que você está focando agora?</Label>
                <Input
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Ex: Estudar Pediatria - Imunização"
                />
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  size="lg"
                  onClick={() => setIsRunning(!isRunning)}
                  className="w-32"
                >
                  {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
