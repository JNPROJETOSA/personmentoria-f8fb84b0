/**
 * useStudySession — Hook para gerenciar a sessão de estudo ativa
 * 
 * Gerencia a fila local de cards, reinserção de erros,
 * controle de progresso e resumo final.
 */

import { useState, useCallback, useRef } from 'react';
import type { SRSRating } from '@/lib/fsrs';
import type { StudyQueueItem } from '@/hooks/useSRS';

export type SessionState = 'idle' | 'studying' | 'showing_answer' | 'completed';

export interface SessionSummaryData {
  totalReviewed: number;
  newCards: number;
  reviewCards: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

export interface SessionProgress {
  current: number;
  total: number;
  remaining: number;
  newRemaining: number;
  learningRemaining: number;
  reviewRemaining: number;
}

export function useStudySession() {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [isFreeStudy, setIsFreeStudy] = useState<boolean>(false);
  const [queue, setQueue] = useState<StudyQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [summary, setSummary] = useState<SessionSummaryData | null>(null);
  
  // Track stats during session
  const statsRef = useRef({
    totalReviewed: 0,
    newCards: 0,
    reviewCards: 0,
    againCount: 0,
    hardCount: 0,
    goodCount: 0,
    easyCount: 0,
  });
  const startTimeRef = useRef<Date>(new Date());
  const cardStartTimeRef = useRef<Date>(new Date());

  // ─── Start Session ──────────────────────────────────────────────

  const startSession = useCallback((
    studyQueue: StudyQueueItem[], 
    options?: { isFreeStudy?: boolean }
  ) => {
    if (studyQueue.length === 0) return;

    setQueue([...studyQueue]);
    setCurrentIndex(0);
    setIsFreeStudy(options?.isFreeStudy ?? false);
    setSessionState('studying');
    setSummary(null);
    startTimeRef.current = new Date();
    cardStartTimeRef.current = new Date();
    statsRef.current = {
      totalReviewed: 0,
      newCards: 0,
      reviewCards: 0,
      againCount: 0,
      hardCount: 0,
      goodCount: 0,
      easyCount: 0,
    };
  }, []);

  // ─── Show Answer ────────────────────────────────────────────────

  const showAnswer = useCallback(() => {
    setSessionState('showing_answer');
  }, []);

  // ─── Get current card duration in ms ────────────────────────────

  const getCardDurationMs = useCallback((): number => {
    return Date.now() - cardStartTimeRef.current.getTime();
  }, []);

  // ─── Submit Answer ──────────────────────────────────────────────

  const submitAnswer = useCallback((
    rating: SRSRating,
    updatedItem?: StudyQueueItem,
  ) => {
    const currentItem = queue[currentIndex];
    if (!currentItem) return;

    // Update stats
    const stats = statsRef.current;
    stats.totalReviewed++;
    if (currentItem.srsData.state === 'new') stats.newCards++;
    if (currentItem.srsData.state === 'review') stats.reviewCards++;
    if (rating === 1) stats.againCount++;
    if (rating === 2) stats.hardCount++;
    if (rating === 3) stats.goodCount++;
    if (rating === 4) stats.easyCount++;

    // If "Again" and the card is learning/relearning, re-add to queue
    setQueue(prev => {
      const newQueue = [...prev];

      if (rating === 1 && updatedItem) {
        // Re-insert the card later in the queue (after ~5 more cards or at end)
        const reinsertPos = Math.min(currentIndex + 5, newQueue.length);
        newQueue.splice(reinsertPos, 0, {
          ...updatedItem,
          priority: 0, // high priority
        });
      }

      return newQueue;
    });

    // Move to next card
    const nextIndex = currentIndex + 1;
    
    // We need to check against the potentially updated queue length
    // Since setQueue is async, we check after a tick
    setTimeout(() => {
      setQueue(currentQueue => {
        if (nextIndex >= currentQueue.length) {
          // Session complete
          const endTime = new Date();
          const summaryData: SessionSummaryData = {
            ...statsRef.current,
            startTime: startTimeRef.current,
            endTime,
            durationMinutes: Math.round((endTime.getTime() - startTimeRef.current.getTime()) / 60000),
          };
          setSummary(summaryData);
          setSessionState('completed');
        } else {
          setCurrentIndex(nextIndex);
          setSessionState('studying');
          cardStartTimeRef.current = new Date();
        }
        return currentQueue;
      });
    }, 0);
  }, [queue, currentIndex]);

  // ─── End Session (manual exit) ──────────────────────────────────

  const endSession = useCallback(() => {
    if (statsRef.current.totalReviewed > 0) {
      const endTime = new Date();
      const summaryData: SessionSummaryData = {
        ...statsRef.current,
        startTime: startTimeRef.current,
        endTime,
        durationMinutes: Math.round((endTime.getTime() - startTimeRef.current.getTime()) / 60000),
      };
      setSummary(summaryData);
      setSessionState('completed');
    } else {
      setSessionState('idle');
      setSummary(null);
    }
    setQueue([]);
    setCurrentIndex(0);
  }, []);

  // ─── Reset (go back to idle) ────────────────────────────────────

  const resetSession = useCallback(() => {
    setSessionState('idle');
    setQueue([]);
    setCurrentIndex(0);
    setSummary(null);
  }, []);

  // ─── Current Card ────────────────────────────────────────────────

  const currentCard = queue[currentIndex] ?? null;

  // ─── Progress ────────────────────────────────────────────────────

  const progress: SessionProgress = {
    current: currentIndex + 1,
    total: queue.length,
    remaining: queue.length - currentIndex,
    newRemaining: queue.slice(currentIndex).filter(i => i.srsData.state === 'new').length,
    learningRemaining: queue.slice(currentIndex).filter(i => 
      i.srsData.state === 'learning' || i.srsData.state === 'relearning'
    ).length,
    reviewRemaining: queue.slice(currentIndex).filter(i => i.srsData.state === 'review').length,
  };

  return {
    sessionState,
    isFreeStudy,
    currentCard,
    progress,
    summary,
    startSession,
    showAnswer,
    submitAnswer,
    endSession,
    resetSession,
    getCardDurationMs,
  };
}
