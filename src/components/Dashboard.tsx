import { useMemo } from 'react';
import { Target, TrendingUp, Calendar, Award, Flame, Zap, Trophy, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ExerciseLog, ClassItem, ReviewItem, Goals, UserProgress, MedicalArea } from '@/lib/types';
import { AREA_COLORS } from '@/lib/constants';

interface DashboardProps {
  exercises: ExerciseLog[];
  classes: ClassItem[];
  pendingReviews: ReviewItem[];
  goals: Goals;
  setGoals: (goals: Goals) => void;
  userProgress: UserProgress;
}

const LEVELS = [
  { level: 1, name: 'Estudante Iniciante', minXP: 0 },
  { level: 2, name: 'Estudante Dedicado', minXP: 100 },
  { level: 3, name: 'Interno Focado', minXP: 300 },
  { level: 4, name: 'R1 Determinado', minXP: 600 },
  { level: 5, name: 'R2 Experiente', minXP: 1000 },
  { level: 6, name: 'R3 Sênior', minXP: 1500 },
  { level: 7, name: 'Chefe de Plantão', minXP: 2200 },
  { level: 8, name: 'Preceptor', minXP: 3000 },
  { level: 9, name: 'Especialista', minXP: 4000 },
  { level: 10, name: 'Professor Titular', minXP: 5500 }
];

function getLevelInfo(xp: number) {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];

  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].minXP) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || LEVELS[i];
    } else {
      break;
    }
  }

  const progressInLevel = xp - currentLevel.minXP;
  const xpNeededForNext = nextLevel.minXP - currentLevel.minXP;
  const progressPercent = xpNeededForNext > 0 ? (progressInLevel / xpNeededForNext) * 100 : 100;

  return { currentLevel, nextLevel, progressPercent, xpNeeded: nextLevel.minXP - xp };
}

export default function Dashboard({ exercises, classes, pendingReviews, goals, setGoals, userProgress }: DashboardProps) {
  const last7Days = exercises.filter(ex => {
    const diff = Date.now() - new Date(ex.date).getTime();
    return diff <= 7 * 24 * 60 * 60 * 1000;
  });

  const weeklyQuestions = last7Days.reduce((sum, ex) => sum + ex.totalQuestions, 0);
  const weeklyCorrect = last7Days.reduce((sum, ex) => sum + ex.correctAnswers, 0);
  const weeklyAccuracy = weeklyQuestions > 0 ? (weeklyCorrect / weeklyQuestions) * 100 : 0;

  const uniqueTopics = new Set(last7Days.map(ex => ex.topic)).size;
  const studiedClasses = classes.filter(c => c.studied).length;

  const levelInfo = getLevelInfo(userProgress.xp);

  // Performance by area
  const areaStats = useMemo(() => {
    const stats = Object.values(MedicalArea).map(area => {
      const areaExercises = exercises.filter(ex => ex.area === area);
      const total = areaExercises.reduce((sum, ex) => sum + ex.totalQuestions, 0);
      const correct = areaExercises.reduce((sum, ex) => sum + ex.correctAnswers, 0);
      return {
        area,
        accuracy: total > 0 ? (correct / total) * 100 : 0,
        total
      };
    }).filter(s => s.total > 0).sort((a, b) => b.accuracy - a.accuracy);

    return stats;
  }, [exercises]);

  // Heatmap data (last 180 days)
  const heatmapData = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    const today = new Date();
    
    for (let i = 179; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = exercises.filter(ex => ex.date === dateStr).reduce((sum, ex) => sum + ex.totalQuestions, 0);
      days.push({ date: dateStr, count });
    }
    
    return days;
  }, [exercises]);

  const maxCount = Math.max(...heatmapData.map(d => d.count), 1);

  // Activity by day of week
  const dayActivity = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const counts = Array(7).fill(0);
    
    exercises.forEach(ex => {
      const day = new Date(ex.date).getDay();
      counts[day] += ex.totalQuestions;
    });
    
    return days.map((name, i) => ({ name, count: counts[i] }));
  }, [exercises]);

  const maxDayCount = Math.max(...dayActivity.map(d => d.count), 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Gamification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Nível e XP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-2xl font-bold">Nível {levelInfo.currentLevel.level}</span>
                <span className="text-sm text-muted-foreground">{userProgress.xp} XP</span>
              </div>
              <p className="text-sm font-medium text-primary">{levelInfo.currentLevel.name}</p>
            </div>
            <div className="space-y-1">
              <Progress value={levelInfo.progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {levelInfo.xpNeeded > 0 ? `${levelInfo.xpNeeded} XP para ${levelInfo.nextLevel.name}` : 'Nível Máximo!'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50 bg-gradient-to-br from-destructive/5 to-transparent">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Flame className="w-4 h-4" />
              Ofensiva (Streak)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Flame className="w-16 h-16 text-destructive" />
              <div>
                <div className="text-4xl font-bold">{userProgress.streak}</div>
                <p className="text-sm text-muted-foreground">dias seguidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/50 bg-gradient-to-br from-accent/5 to-transparent">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Total de Atividades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{userProgress.totalActivities}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Questões + Aulas + Revisões
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Metas da Semana */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Metas da Semana
          </CardTitle>
          <CardDescription>Defina e acompanhe seus objetivos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Questões por Semana</Label>
              <Input
                type="number"
                value={goals.weeklyQuestions}
                onChange={(e) => setGoals({ ...goals, weeklyQuestions: Number(e.target.value) })}
              />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso:</span>
                <span className={weeklyQuestions >= goals.weeklyQuestions ? 'text-medical-preventiva font-semibold' : ''}>
                  {weeklyQuestions}/{goals.weeklyQuestions}
                </span>
              </div>
              <Progress value={(weeklyQuestions / goals.weeklyQuestions) * 100} />
            </div>

            <div className="space-y-2">
              <Label>Taxa de Acerto Alvo (%)</Label>
              <Input
                type="number"
                value={goals.targetAccuracy}
                onChange={(e) => setGoals({ ...goals, targetAccuracy: Number(e.target.value) })}
              />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Atual:</span>
                <span className={weeklyAccuracy >= goals.targetAccuracy ? 'text-medical-preventiva font-semibold' : ''}>
                  {weeklyAccuracy.toFixed(1)}%
                </span>
              </div>
              <Progress value={weeklyAccuracy} />
            </div>

            <div className="space-y-2">
              <Label>Tópicos Diferentes</Label>
              <Input
                type="number"
                value={goals.targetTopicsPerWeek}
                onChange={(e) => setGoals({ ...goals, targetTopicsPerWeek: Number(e.target.value) })}
              />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso:</span>
                <span className={uniqueTopics >= goals.targetTopicsPerWeek ? 'text-medical-preventiva font-semibold' : ''}>
                  {uniqueTopics}/{goals.targetTopicsPerWeek}
                </span>
              </div>
              <Progress value={(uniqueTopics / goals.targetTopicsPerWeek) * 100} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Mapa de Calor de Consistência
          </CardTitle>
          <CardDescription>Últimos 6 meses de atividade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-flex gap-1 flex-wrap" style={{ maxWidth: '100%' }}>
              {heatmapData.map((day, i) => {
                const intensity = day.count === 0 ? 0 : Math.ceil((day.count / maxCount) * 4);
                const colors = ['bg-muted', 'bg-primary/25', 'bg-primary/50', 'bg-primary/75', 'bg-primary'];
                return (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-sm ${colors[intensity]} hover:ring-2 hover:ring-primary transition-all cursor-pointer`}
                    title={`${day.date}: ${day.count} questões`}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <span>Menos</span>
              <div className="w-3 h-3 rounded-sm bg-muted" />
              <div className="w-3 h-3 rounded-sm bg-primary/25" />
              <div className="w-3 h-3 rounded-sm bg-primary/50" />
              <div className="w-3 h-3 rounded-sm bg-primary/75" />
              <div className="w-3 h-3 rounded-sm bg-primary" />
              <span>Mais</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-medical-preventiva">
          <CardHeader className="pb-3">
            <CardDescription>Progresso Global</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {exercises.length > 0 
                ? ((exercises.reduce((sum, ex) => sum + ex.correctAnswers, 0) / exercises.reduce((sum, ex) => sum + ex.totalQuestions, 0)) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Taxa de acerto geral</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardDescription>Melhor Área</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {areaStats.length > 0 ? areaStats[0].area : '-'}
            </div>
            {areaStats.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {areaStats[0].accuracy.toFixed(1)}% de acerto
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-3">
            <CardDescription>Área de Atenção</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {areaStats.length > 0 ? areaStats[areaStats.length - 1].area : '-'}
            </div>
            {areaStats.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {areaStats[areaStats.length - 1].accuracy.toFixed(1)}% de acerto
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-medical-clinica">
          <CardHeader className="pb-3">
            <CardDescription>Revisões Hoje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingReviews.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Tópicos pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance by Area */}
        <Card>
          <CardHeader>
            <CardTitle>Desempenho por Área</CardTitle>
            <CardDescription>Acertos vs Erros</CardDescription>
          </CardHeader>
          <CardContent>
            {areaStats.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
            ) : (
              <div className="space-y-4">
                {areaStats.map(stat => (
                  <div key={stat.area} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{stat.area}</span>
                      <span>{stat.accuracy.toFixed(1)}%</span>
                    </div>
                    <div className="flex gap-1 h-8">
                      <div
                        className="bg-medical-preventiva rounded"
                        style={{ width: `${stat.accuracy}%` }}
                        title={`Acertos: ${stat.accuracy.toFixed(1)}%`}
                      />
                      <div
                        className="bg-destructive/30 rounded"
                        style={{ width: `${100 - stat.accuracy}%` }}
                        title={`Erros: ${(100 - stat.accuracy).toFixed(1)}%`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity by Day */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade por Dia da Semana</CardTitle>
            <CardDescription>Questões resolvidas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dayActivity.map(day => (
                <div key={day.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{day.name}</span>
                    <span className="text-muted-foreground">{day.count}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-6">
                    <div
                      className="bg-primary h-6 rounded-full transition-all flex items-center justify-end px-2"
                      style={{ width: `${(day.count / maxDayCount) * 100}%` }}
                    >
                      {day.count > 0 && <span className="text-xs text-primary-foreground font-semibold">{day.count}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Aulas</CardTitle>
          <CardDescription>Progresso das aulas por área</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.values(MedicalArea).map(area => {
              const areaClasses = classes.filter(c => c.area === area);
              const studied = areaClasses.filter(c => c.studied).length;
              return (
                <div key={area} className="space-y-2">
                  <div className="text-sm font-medium">{area}</div>
                  <div className="text-2xl font-bold">{studied}/{areaClasses.length}</div>
                  <Progress value={areaClasses.length > 0 ? (studied / areaClasses.length) * 100 : 0} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
