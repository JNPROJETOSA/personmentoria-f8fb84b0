import { useMemo, useState } from 'react';
import { Target, TrendingUp, Calendar, Award, Flame, Zap, Trophy, Activity, BrainCircuit, Edit2, Save } from 'lucide-react';
import { WeeklyAgenda } from '@/components/WeeklyAgenda';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ExerciseLog, ClassItem, ReviewItem, Goals, UserProgress, MedicalArea } from '@/lib/types';
import { AREA_COLORS, RPG_LEVELS } from '@/lib/constants';
import { getPerformanceColor } from '@/lib/utils';

interface DashboardProps {
  exercises: ExerciseLog[];
  classes: ClassItem[];
  pendingReviews: ReviewItem[];
  goals: Goals;
  setGoals: (goals: Goals) => void;
  userProgress: UserProgress;
}

function getLevelInfo(xp: number) {
  let currentLevel = RPG_LEVELS[0];
  let nextLevel = RPG_LEVELS[1];

  for (let i = 0; i < RPG_LEVELS.length; i++) {
    if (xp >= RPG_LEVELS[i].minXP) {
      currentLevel = RPG_LEVELS[i];
      nextLevel = RPG_LEVELS[i + 1] || RPG_LEVELS[i];
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
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [tempGoals, setTempGoals] = useState(goals);

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
      {/* RPG Gamification Header */}
      <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" />
        <CardContent className="pt-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Level Circle Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg ring-4 ring-background">
                <div className="text-center">
                  <div className="text-3xl font-black text-white drop-shadow-lg">{levelInfo.currentLevel.level}</div>
                  <div className="text-xs font-semibold text-white/90">NÍVEL</div>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 text-3xl">{levelInfo.currentLevel.emoji}</div>
            </div>

            {/* XP Progress Bar */}
            <div className="flex-1 w-full space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">{levelInfo.currentLevel.name}</h3>
                  <p className="text-sm text-muted-foreground">{userProgress.xp} XP Total</p>
                </div>
                {levelInfo.xpNeeded > 0 && (
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">Faltam {levelInfo.xpNeeded} XP</p>
                    <p className="text-xs text-muted-foreground">para o próximo nível</p>
                  </div>
                )}
              </div>
              
              {/* Animated Progress Bar */}
              <div className="relative h-6 bg-muted rounded-full overflow-hidden border border-border">
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-teal-500 via-blue-500 to-teal-500 transition-all duration-1000 ease-out animate-shimmer-bar"
                  style={{ width: `${Math.min(levelInfo.progressPercent, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-slow" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground drop-shadow-md mix-blend-difference">
                    {Math.round(levelInfo.progressPercent)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex md:flex-col gap-4">
              {/* Streak */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
                <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
                <div>
                  <div className="text-2xl font-black">{userProgress.streak}</div>
                  <div className="text-xs text-muted-foreground">dias</div>
                </div>
              </div>
              
              {/* Total Activities */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                <Trophy className="w-6 h-6 text-blue-500" />
                <div>
                  <div className="text-2xl font-black">{userProgress.totalActivities}</div>
                  <div className="text-xs text-muted-foreground">atividades</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metas da Semana - Tactical HUD Style */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 dark:to-black border-b-4 border-perry-accent p-6">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8">
          <BrainCircuit className="w-48 h-48 text-white opacity-10 rotate-12" />
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-perry-accent" />
            <h2 className="text-2xl font-bold text-white">Metas da Semana</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isEditingGoals) {
                setGoals(tempGoals);
              } else {
                setTempGoals(goals);
              }
              setIsEditingGoals(!isEditingGoals);
            }}
            className="text-white hover:bg-white/10"
          >
            {isEditingGoals ? (
              <>
                <Save className="w-4 h-4 mr-2 text-green-400" />
                Salvar
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </>
            )}
          </Button>
        </div>

        {/* Glassmorphism Cards */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Questões por Semana */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/70">Questões por Semana</span>
              <Zap className="w-5 h-5 text-perry-accent" />
            </div>
            
            {isEditingGoals ? (
              <Input
                type="number"
                value={tempGoals.weeklyQuestions}
                onChange={(e) => setTempGoals({ ...tempGoals, weeklyQuestions: Number(e.target.value) })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            ) : (
              <div className="text-3xl font-black text-white">
                {goals.weeklyQuestions}
              </div>
            )}

            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/50">Progresso:</span>
              <span className={`font-bold ${weeklyQuestions >= goals.weeklyQuestions ? 'text-green-400' : 'text-white'}`}>
                {weeklyQuestions}/{goals.weeklyQuestions}
              </span>
            </div>

            <div className="relative h-3 bg-black/30 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-perry-accent rounded-full transition-all duration-500"
                style={{ width: `${Math.min((weeklyQuestions / goals.weeklyQuestions) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Taxa de Acerto */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/70">Taxa de Acerto Alvo</span>
              <Trophy className="w-5 h-5 text-green-400" />
            </div>
            
            {isEditingGoals ? (
              <Input
                type="number"
                value={tempGoals.targetAccuracy}
                onChange={(e) => setTempGoals({ ...tempGoals, targetAccuracy: Number(e.target.value) })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            ) : (
              <div className="text-3xl font-black text-white">
                {goals.targetAccuracy}%
              </div>
            )}

            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/50">Atual:</span>
              <span className={`font-bold ${weeklyAccuracy >= goals.targetAccuracy ? 'text-green-400' : 'text-white'}`}>
                {weeklyAccuracy.toFixed(1)}%
              </span>
            </div>

            <div className="relative h-3 bg-black/30 rounded-full overflow-hidden">
              <div 
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                  weeklyAccuracy >= goals.targetAccuracy ? 'bg-perry-teal' : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min(weeklyAccuracy, 100)}%` }}
              />
            </div>
          </div>

          {/* Tópicos Diferentes */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/70">Tópicos Diferentes</span>
              <BrainCircuit className="w-5 h-5 text-purple-400" />
            </div>
            
            {isEditingGoals ? (
              <Input
                type="number"
                value={tempGoals.targetTopicsPerWeek}
                onChange={(e) => setTempGoals({ ...tempGoals, targetTopicsPerWeek: Number(e.target.value) })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            ) : (
              <div className="text-3xl font-black text-white">
                {goals.targetTopicsPerWeek}
              </div>
            )}

            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/50">Progresso:</span>
              <span className={`font-bold ${uniqueTopics >= goals.targetTopicsPerWeek ? 'text-green-400' : 'text-white'}`}>
                {uniqueTopics}/{goals.targetTopicsPerWeek}
              </span>
            </div>

            <div className="relative h-3 bg-black/30 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((uniqueTopics / goals.targetTopicsPerWeek) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Agenda */}
      <WeeklyAgenda />

      {/* Consistência de Estudos - Activity Garden */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-perry-teal" />
            Consistência de Estudos
          </CardTitle>
          <CardDescription>Últimos 6 meses - Não deixe buracos cinzas no seu jardim!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-2">
            <div className="inline-flex gap-1 flex-wrap min-w-full">
              {heatmapData.map((day, i) => {
                let color = 'bg-slate-100 dark:bg-slate-800';
                if (day.count > 0) {
                  if (day.count >= 50) color = 'bg-perry-teal';
                  else if (day.count >= 11) color = 'bg-teal-300';
                  else if (day.count >= 1) color = 'bg-teal-200';
                }
                return (
                  <div
                    key={i}
                    className={`w-3 h-3 md:w-4 md:h-4 rounded-sm ${color} hover:ring-2 hover:ring-perry-accent transition-all cursor-pointer relative group`}
                    title={`${day.date}: ${day.count} questões`}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {new Date(day.date).toLocaleDateString('pt-BR')}: {day.count} questões
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex items-center gap-3 mt-6 text-xs text-muted-foreground">
              <span className="font-medium">Menos</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded-sm bg-slate-100 dark:bg-slate-800 border border-border" title="Sem estudo" />
                <div className="w-4 h-4 rounded-sm bg-teal-200" title="1-10 questões" />
                <div className="w-4 h-4 rounded-sm bg-teal-300" title="11-30 questões" />
                <div className="w-4 h-4 rounded-sm bg-perry-teal" title="50+ questões (Meta batida!)" />
              </div>
              <span className="font-medium">Mais</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-performance-success">
          <CardHeader className="pb-3">
            <CardDescription>Progresso Global</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              exercises.length > 0 
                ? ((exercises.reduce((sum, ex) => sum + ex.correctAnswers, 0) / exercises.reduce((sum, ex) => sum + ex.totalQuestions, 0)) * 100) >= 80
                  ? 'text-performance-success' 
                  : ((exercises.reduce((sum, ex) => sum + ex.correctAnswers, 0) / exercises.reduce((sum, ex) => sum + ex.totalQuestions, 0)) * 100) >= 60
                  ? 'text-performance-warning'
                  : 'text-performance-danger'
                : ''
            }`}>
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

        <Card className="border-l-4 border-l-performance-danger">
          <CardHeader className="pb-3">
            <CardDescription>Área de Atenção</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-performance-danger">
              {areaStats.length > 0 ? areaStats[areaStats.length - 1].area : '-'}
            </div>
            {areaStats.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {areaStats[areaStats.length - 1].accuracy.toFixed(1)}% de acerto
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
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
