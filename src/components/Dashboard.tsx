import { Target, TrendingUp, Calendar, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExerciseLog, ClassItem, ReviewItem, Goals } from '@/lib/types';
import { AREA_COLORS } from '@/lib/constants';

interface DashboardProps {
  exercises: ExerciseLog[];
  classes: ClassItem[];
  pendingReviews: ReviewItem[];
  goals: Goals;
  setGoals: (goals: Goals) => void;
}

export default function Dashboard({ exercises, classes, pendingReviews, goals, setGoals }: DashboardProps) {
  const last7Days = exercises.filter(ex => {
    const diff = Date.now() - new Date(ex.date).getTime();
    return diff <= 7 * 24 * 60 * 60 * 1000;
  });

  const weeklyQuestions = last7Days.reduce((sum, ex) => sum + ex.totalQuestions, 0);
  const weeklyCorrect = last7Days.reduce((sum, ex) => sum + ex.correctAnswers, 0);
  const weeklyAccuracy = weeklyQuestions > 0 ? (weeklyCorrect / weeklyQuestions) * 100 : 0;

  const uniqueTopics = new Set(last7Days.map(ex => ex.topic)).size;
  const studiedClasses = classes.filter(c => c.studied).length;
  const totalClasses = classes.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Questões (7 dias)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{weeklyQuestions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Meta: {goals.weeklyQuestions} / semana
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-medical-preventiva">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Acurácia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{weeklyAccuracy.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Meta: {goals.targetAccuracy}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-medical-go">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Revisões Pendentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{pendingReviews.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tópicos aguardando
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-medical-clinica">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Tópicos Únicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{uniqueTopics}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Meta: {goals.targetTopicsPerWeek} / semana
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress by Area */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso por Área</CardTitle>
          <CardDescription>Distribuição de questões nos últimos 7 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(
              last7Days.reduce((acc, ex) => {
                acc[ex.area] = (acc[ex.area] || 0) + ex.totalQuestions;
                return acc;
              }, {} as Record<string, number>)
            ).map(([area, count]) => {
              const percentage = weeklyQuestions > 0 ? (count / weeklyQuestions) * 100 : 0;
              return (
                <div key={area} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{area}</span>
                    <span className="text-muted-foreground">{count} questões ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: AREA_COLORS[area as keyof typeof AREA_COLORS]
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Goals Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configurar Metas</CardTitle>
          <CardDescription>Defina seus objetivos semanais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weeklyQuestions">Questões / Semana</Label>
              <Input
                id="weeklyQuestions"
                type="number"
                value={goals.weeklyQuestions}
                onChange={(e) => setGoals({ ...goals, weeklyQuestions: Number(e.target.value) })}
                min={1}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="targetAccuracy">Acurácia Alvo (%)</Label>
              <Input
                id="targetAccuracy"
                type="number"
                value={goals.targetAccuracy}
                onChange={(e) => setGoals({ ...goals, targetAccuracy: Number(e.target.value) })}
                min={0}
                max={100}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="targetTopics">Tópicos / Semana</Label>
              <Input
                id="targetTopics"
                type="number"
                value={goals.targetTopicsPerWeek}
                onChange={(e) => setGoals({ ...goals, targetTopicsPerWeek: Number(e.target.value) })}
                min={1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classes Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Aulas Assistidas</CardTitle>
          <CardDescription>
            {studiedClasses} de {totalClasses} aulas ({totalClasses > 0 ? ((studiedClasses / totalClasses) * 100).toFixed(0) : 0}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all"
              style={{ width: `${totalClasses > 0 ? (studiedClasses / totalClasses) * 100 : 0}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
