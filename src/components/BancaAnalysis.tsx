import { useMemo } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExamLog } from '@/lib/types';

interface BancaAnalysisProps {
  exams: ExamLog[];
}

export default function BancaAnalysis({ exams }: BancaAnalysisProps) {
  const bancaStats = useMemo(() => {
    const stats = new Map<string, { total: number; correct: number; count: number }>();

    exams.forEach(exam => {
      const current = stats.get(exam.institution) || { total: 0, correct: 0, count: 0 };
      stats.set(exam.institution, {
        total: current.total + exam.totalQuestions,
        correct: current.correct + exam.correctAnswers,
        count: current.count + 1
      });
    });

    return Array.from(stats.entries())
      .map(([institution, data]) => ({
        institution,
        accuracy: (data.correct / data.total) * 100,
        total: data.total,
        count: data.count
      }))
      .sort((a, b) => b.accuracy - a.accuracy);
  }, [exams]);

  const maxAccuracy = bancaStats.length > 0 ? Math.max(...bancaStats.map(b => b.accuracy)) : 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Raio-X da Banca
          </CardTitle>
          <CardDescription>
            Estratégia inteligente: saiba onde você tem melhor desempenho
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bancaStats.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhuma prova cadastrada ainda.</p>
              <p className="text-sm mt-2">Registre suas provas para ver a análise por banca!</p>
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardDescription>Melhor Desempenho</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">{bancaStats[0].institution}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {bancaStats[0].count} prova{bancaStats[0].count > 1 ? 's' : ''} • {bancaStats[0].total} questões
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-primary">
                      {bancaStats[0].accuracy.toFixed(1)}%
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Ranking Completo
                </h3>
                {bancaStats.map((banca, index) => (
                  <Card key={banca.institution}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-semibold text-sm">
                              {index + 1}º
                            </div>
                            <div>
                              <div className="font-semibold">{banca.institution}</div>
                              <div className="text-xs text-muted-foreground">
                                {banca.count} prova{banca.count > 1 ? 's' : ''} • {banca.total} questões
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{banca.accuracy.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${(banca.accuracy / maxAccuracy) * 100}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
