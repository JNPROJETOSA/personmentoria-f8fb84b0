/**
 * StudySession — Interface de estudo com repetição espaçada
 * 
 * Exibe frente/verso do card, botões de resposta (Errei/Difícil/Bom/Fácil)
 * com intervalos previstos, barra de progresso e controles da sessão.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, Eye, Sparkles, Clock, RotateCw, Brain, BookOpen } from 'lucide-react';
import { useFlashcardImages } from '@/hooks/useFlashcardImages';
import { formatInterval, getNextStates } from '@/lib/fsrs';
import type { SRSRating, NextStates } from '@/lib/fsrs';
import type { Flashcard } from '@/lib/types';
import type { SessionProgress, SessionState } from '@/hooks/useStudySession';
import type { StudyQueueItem } from '@/hooks/useSRS';

// Image display helper
function StudyCardImage({ imagePath }: { imagePath: string }) {
  const { getImageUrl } = useFlashcardImages();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getImageUrl(imagePath).then(u => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [imagePath, getImageUrl]);

  if (!url) return null;
  return <img src={url} alt="" className="max-w-full max-h-48 rounded-lg border mt-3 mx-auto" />;
}

interface StudySessionProps {
  currentItem: StudyQueueItem;
  flashcard: Flashcard;
  sessionState: SessionState;
  progress: SessionProgress;
  isFreeStudy?: boolean;
  onShowAnswer: () => void;
  onSubmitAnswer: (rating: SRSRating) => void;
  onExit: () => void;
  deckName?: string;
}

export default function StudySession({
  currentItem,
  flashcard,
  sessionState,
  progress,
  isFreeStudy,
  onShowAnswer,
  onSubmitAnswer,
  onExit,
  deckName,
}: StudySessionProps) {
  const [nextStates, setNextStates] = useState<NextStates | null>(null);
  const isShowingAnswer = sessionState === 'showing_answer';

  // Calculate next states for button previews when showing answer
  useEffect(() => {
    if (isShowingAnswer && currentItem && !isFreeStudy) {
      const states = getNextStates(currentItem.srsData, new Date());
      setNextStates(states);
    } else {
      setNextStates(null);
    }
  }, [isShowingAnswer, currentItem, isFreeStudy]);

  // State badge
  const stateBadge = () => {
    if (isFreeStudy) {
      return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 gap-1"><BookOpen className="w-3 h-3" />Estudo Livre</Badge>;
    }
    switch (currentItem.srsData.state) {
      case 'new': return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1"><Sparkles className="w-3 h-3" />Novo</Badge>;
      case 'learning': return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1"><Clock className="w-3 h-3" />Aprendendo</Badge>;
      case 'review': return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1"><RotateCw className="w-3 h-3" />Revisão</Badge>;
      case 'relearning': return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 gap-1"><Brain className="w-3 h-3" />Reaprendendo</Badge>;
    }
  };

  const progressPercent = progress.total > 0 ? ((progress.current - 1) / progress.total) * 100 : 0;

  return (
    <div className="space-y-4 animate-in fade-in duration-300 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {stateBadge()}
          {deckName && <span className="text-sm text-muted-foreground">{deckName}</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {progress.current}/{progress.total}
          </span>
          <Button variant="ghost" size="sm" onClick={onExit}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={progressPercent} className="h-1.5" />

      {/* Queue info / Free study banner */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        {isFreeStudy ? (
          <span className="text-purple-600 font-medium bg-purple-50 dark:bg-purple-950/30 px-2.5 py-0.5 rounded-full">
            Estudo livre — não altera o agendamento FSRS
          </span>
        ) : (
          <>
            {progress.newRemaining > 0 && (
              <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-blue-500" />{progress.newRemaining} novos</span>
            )}
            {progress.learningRemaining > 0 && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" />{progress.learningRemaining} aprendendo</span>
            )}
            {progress.reviewRemaining > 0 && (
              <span className="flex items-center gap-1"><RotateCw className="w-3 h-3 text-green-500" />{progress.reviewRemaining} revisão</span>
            )}
          </>
        )}
      </div>

      {/* Card */}
      <Card className="border-2 min-h-[320px] flex flex-col">
        <CardContent className="flex-1 flex flex-col justify-center items-center p-8 text-center">
          {/* Front */}
          <div className="w-full">
            {flashcard.type === 'cloze' ? (
              <p className="text-xl leading-relaxed font-medium">
                {flashcard.front.split(/({{[^}]+}})/g).map((part, i) =>
                  part.startsWith('{{') ? (
                    isShowingAnswer ? (
                      <span key={i} className="mx-1 text-primary font-bold border-b-2 border-primary px-1 inline-block">
                        {part.slice(2, -2)}
                      </span>
                    ) : (
                      <span key={i} className="mx-1 bg-muted-foreground/20 text-transparent border-b-2 border-primary rounded px-2 min-w-[3rem] select-none inline-block align-bottom">
                        {part}
                      </span>
                    )
                  ) : part
                )}
              </p>
            ) : (
              <p className="text-xl font-medium leading-relaxed">{flashcard.front}</p>
            )}

            {flashcard.front_image_url && <StudyCardImage imagePath={flashcard.front_image_url} />}
          </div>

          {/* Divider + Back (when showing answer) */}
          {isShowingAnswer && (
            <div className="w-full mt-6 pt-6 border-t animate-in fade-in slide-in-from-bottom-2 duration-300">
              {flashcard.type === 'cloze' && flashcard.back && flashcard.back.trim() !== '' ? (
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Notas</span>
                  <p className="text-base text-muted-foreground">{flashcard.back}</p>
                </div>
              ) : flashcard.type !== 'cloze' ? (
                <p className="text-lg text-primary font-medium">{flashcard.back}</p>
              ) : null}

              {flashcard.answer_image_url && <StudyCardImage imagePath={flashcard.answer_image_url} />}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {!isShowingAnswer ? (
        <Button 
          onClick={onShowAnswer} 
          className="w-full h-12 text-base gap-2"
          size="lg"
        >
          <Eye className="w-5 h-5" />
          Mostrar Resposta
        </Button>
      ) : (
        <div className="grid grid-cols-4 gap-2 animate-in slide-in-from-bottom-3 duration-300">
          <AnswerButton
            rating={1}
            label="Errei"
            interval={isFreeStudy ? 'Livre' : (nextStates ? formatInterval(nextStates.again.interval) : '...')}
            onClick={() => onSubmitAnswer(1)}
            className="bg-red-600 hover:bg-red-700 text-white border-0"
          />
          <AnswerButton
            rating={2}
            label="Difícil"
            interval={isFreeStudy ? 'Livre' : (nextStates ? formatInterval(nextStates.hard.interval) : '...')}
            onClick={() => onSubmitAnswer(2)}
            className="bg-orange-500 hover:bg-orange-600 text-white border-0"
          />
          <AnswerButton
            rating={3}
            label="Bom"
            interval={isFreeStudy ? 'Livre' : (nextStates ? formatInterval(nextStates.good.interval) : '...')}
            onClick={() => onSubmitAnswer(3)}
            className="bg-green-600 hover:bg-green-700 text-white border-0"
          />
          <AnswerButton
            rating={4}
            label="Fácil"
            interval={isFreeStudy ? 'Livre' : (nextStates ? formatInterval(nextStates.easy.interval) : '...')}
            onClick={() => onSubmitAnswer(4)}
            className="bg-blue-600 hover:bg-blue-700 text-white border-0"
          />
        </div>
      )}
    </div>
  );
}

function AnswerButton({ 
  rating, label, interval, onClick, className 
}: { 
  rating: number; label: string; interval: string; onClick: () => void; className: string 
}) {
  return (
    <Button
      onClick={onClick}
      className={`h-auto py-3 flex flex-col gap-0.5 ${className}`}
    >
      <span className="font-bold text-sm">{label}</span>
      <span className="text-[10px] opacity-80">{interval}</span>
    </Button>
  );
}
