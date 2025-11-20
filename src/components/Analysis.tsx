import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExerciseLog, MedicalArea } from '@/lib/types';
import { AREA_COLORS } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface AnalysisProps {
  exercises: ExerciseLog[];
}

export default function Analysis({ exercises }: AnalysisProps) {
  // Performance by Area
  const areaStats = Object.values(MedicalArea).map(area => {
    const areaExercises = exercises.filter(ex => ex.area === area);
    const total = areaExercises.reduce((sum, ex) => sum + ex.totalQuestions, 0);
    const correct = areaExercises.reduce((sum, ex) => sum + ex.correctAnswers, 0);
    
    return {
      area,
      questões: total,
      acurácia: total > 0 ? Math.round((correct / total) * 100) : 0,
      color: AREA_COLORS[area]
    };
  });

  // Performance over time (last 30 days)
  const last30Days = [...Array(30)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toISOString().split('T')[0];
    
    const dayExercises = exercises.filter(ex => ex.date === dateStr);
    const total = dayExercises.reduce((sum, ex) => sum + ex.totalQuestions, 0);
    const correct = dayExercises.reduce((sum, ex) => sum + ex.correctAnswers, 0);
    
    return {
      date: `${date.getDate()}/${date.getMonth() + 1}`,
      questões: total,
      acurácia: total > 0 ? Math.round((correct / total) * 100) : null
    };
  }).filter(d => d.questões > 0); // Only show days with activity

  // Topic performance
  const topicStats = exercises.reduce((acc, ex) => {
    if (!acc[ex.topic]) {
      acc[ex.topic] = { topic: ex.topic, total: 0, correct: 0 };
    }
    acc[ex.topic].total += ex.totalQuestions;
    acc[ex.topic].correct += ex.correctAnswers;
    return acc;
  }, {} as Record<string, { topic: string; total: number; correct: number }>);

  const topicData = Object.values(topicStats)
    .map(t => ({
      topic: t.topic,
      acurácia: Math.round((t.correct / t.total) * 100),
      questões: t.total
    }))
    .sort((a, b) => b.questões - a.questões)
    .slice(0, 10); // Top 10 topics

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Area Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Área Médica</CardTitle>
          <CardDescription>Distribuição de questões e acurácia</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={areaStats}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="area" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem'
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="questões" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              <Bar yAxisId="right" dataKey="acurácia" fill="hsl(var(--medical-preventiva))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Questões</CardTitle>
            <CardDescription>Por área médica</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={areaStats.filter(a => a.questões > 0)}
                  dataKey="questões"
                  nameKey="area"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ area, percent }) => `${area.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                >
                  {areaStats.map((entry, index) => (
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
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas Gerais</CardTitle>
            <CardDescription>Resumo do desempenho</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {areaStats.map(area => (
                <div key={area.area} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{area.area}</span>
                    <span className="text-muted-foreground">{area.acurácia}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${area.acurácia}%`,
                        backgroundColor: area.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      {last30Days.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolução Temporal</CardTitle>
            <CardDescription>Últimos 30 dias de atividade</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={last30Days}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" className="text-xs" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem'
                  }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="questões" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="acurácia" stroke="hsl(var(--medical-preventiva))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Topics */}
      {topicData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Tópicos</CardTitle>
            <CardDescription>Mais praticados</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topicData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="topic" type="category" width={150} className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem'
                  }}
                />
                <Legend />
                <Bar dataKey="questões" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                <Bar dataKey="acurácia" fill="hsl(var(--medical-preventiva))" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
