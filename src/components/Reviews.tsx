import { Calendar, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReviewItem } from '@/lib/types';
import { AREA_COLORS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';

interface ReviewsProps {
  reviews: ReviewItem[];
  onMarkReviewed: (topic: string) => void;
}

export default function Reviews({ reviews, onMarkReviewed }: ReviewsProps) {
  const handleMark = (topic: string) => {
    onMarkReviewed(topic);
    toast({
      title: "Revisão concluída!",
      description: `"${topic}" foi marcada como revisada.`,
    });
  };

  const today = new Date().toISOString().split('T')[0];

  // Group by priority
  const highPriority = reviews.filter(r => r.priority === 1);
  const mediumPriority = reviews.filter(r => r.priority === 2);
  const lowPriority = reviews.filter(r => r.priority === 3);

  const ReviewCard = ({ review }: { review: ReviewItem }) => {
    const isOverdue = review.dueDate < today;
    
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: AREA_COLORS[review.area] }}
            />
            <span className="font-medium">{review.topic}</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span>{review.area}</span>
            <span>•</span>
            <span className={isOverdue ? 'text-destructive font-medium' : ''}>
              {isOverdue ? 'Atrasada' : 'Hoje'}: {new Date(review.dueDate).toLocaleDateString('pt-BR')}
            </span>
            <span>•</span>
            <span>Intervalo: {review.dayInterval} dias</span>
            <span>•</span>
            <span className={review.accuracy >= 80 ? 'text-medical-preventiva' : review.accuracy >= 60 ? 'text-medical-clinica' : 'text-destructive'}>
              {review.accuracy.toFixed(0)}% acerto
            </span>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => handleMark(review.topic)}
          className="shrink-0"
        >
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Marcar
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Revisões Pendentes ({reviews.length})
          </CardTitle>
          <CardDescription>
            Sistema de repetição espaçada baseado nos intervalos: 1, 7, 14 e 30 dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma revisão pendente no momento.</p>
              <p className="text-sm mt-1">Continue praticando para gerar revisões futuras!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {highPriority.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
                    ⚡ Alta Prioridade ({highPriority.length})
                  </h3>
                  <div className="space-y-2">
                    {highPriority.map(review => (
                      <ReviewCard key={`${review.topic}-${review.dueDate}`} review={review} />
                    ))}
                  </div>
                </div>
              )}

              {mediumPriority.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-medical-clinica mb-3 flex items-center gap-2">
                    ⭐ Prioridade Média ({mediumPriority.length})
                  </h3>
                  <div className="space-y-2">
                    {mediumPriority.map(review => (
                      <ReviewCard key={`${review.topic}-${review.dueDate}`} review={review} />
                    ))}
                  </div>
                </div>
              )}

              {lowPriority.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    💤 Baixa Prioridade ({lowPriority.length})
                  </h3>
                  <div className="space-y-2">
                    {lowPriority.map(review => (
                      <ReviewCard key={`${review.topic}-${review.dueDate}`} review={review} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Repetição Espaçada:</strong> Cada tópico que você pratica gera revisões automáticas após 1, 7, 14 e 30 dias.
          </p>
          <p>
            <strong className="text-foreground">Priorização:</strong> Tópicos com alta prioridade aparecem primeiro na lista.
          </p>
          <p>
            <strong className="text-foreground">Marcação:</strong> Ao revisar um tópico (seja fazendo novas questões ou estudando teoria), marque como "revisado" para remover da lista.
          </p>
          <p>
            <strong className="text-foreground">Objetivo:</strong> Consolidar o conhecimento e combater a curva do esquecimento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
