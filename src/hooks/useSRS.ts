/**
 * useSRS — Hook para gerenciar dados de Repetição Espaçada (FSRS)
 * 
 * Responsável por:
 * - Carregar/inicializar dados SRS para todos os flashcards do usuário
 * - Submeter revisões (atualizar SRS + registrar log)
 * - Montar filas de estudo
 * - Calcular estatísticas por baralho e do dia
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  SRSCardData, 
  SRSRating,
  createNewCard, 
  applyRating, 
  dbRowToSRSCard, 
  srsCardToDbUpdate,
  isDue,
  getNextStates,
  formatInterval,
  type NextStates,
} from '@/lib/fsrs';

export interface DeckStats {
  newCount: number;
  learningCount: number;
  dueCount: number;
  total: number;
}

export interface TodayStats {
  reviewed: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
}

export interface StudyQueueItem {
  flashcardId: string;
  srsData: SRSCardData;
  priority: number; // lower = higher priority
}

// Map of flashcard_id → SRSCardData
type SRSMap = Map<string, SRSCardData>;

const MAX_NEW_PER_DAY = 20;
const MAX_REVIEWS_PER_DAY = 200;

export function useSRS(userId: string | undefined) {
  const [srsMap, setSrsMap] = useState<SRSMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<TodayStats>({
    reviewed: 0, againCount: 0, hardCount: 0, goodCount: 0, easyCount: 0,
  });
  const submittingRef = useRef<Set<string>>(new Set()); // anti-double-click per card
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ─── Load SRS Data ─────────────────────────────────────────────────

  const fetchSRSData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

    try {
      // 1. Fetch all existing SRS data
      const { data: srsRows, error: srsError } = await supabase
        .from('flashcard_srs_data')
        .select('*')
        .eq('user_id', userId);

      if (srsError) throw srsError;

      // 2. Fetch all flashcard IDs to find cards without SRS data
      const { data: flashcardRows, error: fcError } = await supabase
        .from('flashcards')
        .select('id')
        .eq('user_id', userId);

      if (fcError) throw fcError;

      // 3. Build SRS map from existing data
      const map: SRSMap = new Map();
      for (const row of (srsRows || [])) {
        map.set(row.flashcard_id, dbRowToSRSCard(row));
      }

      // 4. Find flashcards without SRS data and initialize them
      const existingIds = new Set(map.keys());
      const missingIds = (flashcardRows || [])
        .map(f => f.id)
        .filter(id => !existingIds.has(id));

      if (missingIds.length > 0) {
        const newRecords = missingIds.map(id => ({
          user_id: userId,
          flashcard_id: id,
          state: 'new' as const,
          difficulty: 0.3,
          stability: 0.0,
          due: new Date().toISOString(),
          last_review: null,
          reps: 0,
          lapses: 0,
          elapsed_days: 0,
          scheduled_days: 0,
        }));

        const { error: insertError } = await supabase
          .from('flashcard_srs_data')
          .insert(newRecords);

        if (insertError) {
          console.error('Error initializing SRS data:', insertError);
        } else {
          for (const id of missingIds) {
            map.set(id, createNewCard());
          }
        }
      }

      // 5. Load today's review stats
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayLogs, error: logError } = await supabase
        .from('flashcard_review_log')
        .select('rating')
        .eq('user_id', userId)
        .gte('created_at', todayStart.toISOString());

      if (!logError && todayLogs) {
        const stats: TodayStats = {
          reviewed: todayLogs.length,
          againCount: todayLogs.filter(l => l.rating === 1).length,
          hardCount: todayLogs.filter(l => l.rating === 2).length,
          goodCount: todayLogs.filter(l => l.rating === 3).length,
          easyCount: todayLogs.filter(l => l.rating === 4).length,
        };
        if (isMountedRef.current) setTodayStats(stats);
      }

      if (isMountedRef.current) {
        setSrsMap(map);
        setLoading(false);
      }
    } catch (e) {
      console.error('Error fetching SRS data:', e);
      if (isMountedRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSRSData();
  }, [fetchSRSData]);

  // ─── Submit Review ──────────────────────────────────────────────────

  const submitReview = useCallback(async (
    flashcardId: string, 
    rating: SRSRating,
    durationMs?: number
  ): Promise<SRSCardData | null> => {
    if (!userId) return null;

    // Anti-double-click
    if (submittingRef.current.has(flashcardId)) return null;
    submittingRef.current.add(flashcardId);

    try {
      const currentData = srsMap.get(flashcardId);
      if (!currentData) {
        console.error('No SRS data for flashcard:', flashcardId);
        return null;
      }

      const now = new Date();
      const result = applyRating(currentData, rating, now);

      // 1. Update SRS data in database
      const dbUpdate = srsCardToDbUpdate(result.card);
      const { error: updateError } = await supabase
        .from('flashcard_srs_data')
        .update(dbUpdate)
        .eq('user_id', userId)
        .eq('flashcard_id', flashcardId);

      if (updateError) throw updateError;

      // 2. Insert review log
      const { error: logError } = await supabase
        .from('flashcard_review_log')
        .insert({
          user_id: userId,
          flashcard_id: flashcardId,
          rating,
          state_before: result.log.stateBefore,
          state_after: result.log.stateAfter,
          difficulty_before: result.log.difficultyBefore,
          difficulty_after: result.log.difficultyAfter,
          stability_before: result.log.stabilityBefore,
          stability_after: result.log.stabilityAfter,
          due_before: result.log.dueBefore.toISOString(),
          due_after: result.log.dueAfter.toISOString(),
          elapsed_days: result.log.elapsedDays,
          scheduled_days: result.log.scheduledDays,
          review_duration_ms: durationMs ?? null,
        });

      if (logError) console.error('Error logging review:', logError);

      // 3. Update local state
      if (isMountedRef.current) {
        setSrsMap(prev => {
          const next = new Map(prev);
          next.set(flashcardId, result.card);
          return next;
        });
        setTodayStats(prev => ({
          reviewed: prev.reviewed + 1,
          againCount: prev.againCount + (rating === 1 ? 1 : 0),
          hardCount: prev.hardCount + (rating === 2 ? 1 : 0),
          goodCount: prev.goodCount + (rating === 3 ? 1 : 0),
          easyCount: prev.easyCount + (rating === 4 ? 1 : 0),
        }));
      }

      return result.card;
    } catch (e) {
      console.error('Error submitting review:', e);
      return null;
    } finally {
      submittingRef.current.delete(flashcardId);
    }
  }, [userId, srsMap]);

  // ─── Study Queue ────────────────────────────────────────────────────

  const getStudyQueue = useCallback((
    flashcardIds: string[],
  ): StudyQueueItem[] => {
    const now = new Date();
    const queue: StudyQueueItem[] = [];

    // Categorize cards
    const relearning: StudyQueueItem[] = [];
    const learning: StudyQueueItem[] = [];
    const dueReviews: StudyQueueItem[] = [];
    const newCards: StudyQueueItem[] = [];

    for (const id of flashcardIds) {
      const srs = srsMap.get(id);
      if (!srs) continue;

      if (srs.state === 'relearning' && isDue(srs, now)) {
        relearning.push({ flashcardId: id, srsData: srs, priority: 0 });
      } else if (srs.state === 'learning' && isDue(srs, now)) {
        learning.push({ flashcardId: id, srsData: srs, priority: 1 });
      } else if (srs.state === 'review' && isDue(srs, now)) {
        dueReviews.push({ flashcardId: id, srsData: srs, priority: 2 });
      } else if (srs.state === 'new') {
        newCards.push({ flashcardId: id, srsData: srs, priority: 3 });
      }
    }

    // Sort due reviews by most overdue first
    dueReviews.sort((a, b) => a.srsData.due.getTime() - b.srsData.due.getTime());

    // Limit new cards
    const limitedNew = newCards.slice(0, MAX_NEW_PER_DAY);

    // Build final queue: relearning → learning → due reviews → new
    queue.push(...relearning, ...learning, ...dueReviews, ...limitedNew);

    return queue.slice(0, MAX_REVIEWS_PER_DAY);
  }, [srsMap]);

  // ─── Deck Stats ──────────────────────────────────────────────────────

  const getDeckStats = useCallback((flashcardIds: string[]): DeckStats => {
    const now = new Date();
    let newCount = 0;
    let learningCount = 0;
    let dueCount = 0;

    for (const id of flashcardIds) {
      const srs = srsMap.get(id);
      if (!srs) continue;

      if (srs.state === 'new') {
        newCount++;
      } else if (srs.state === 'learning' || srs.state === 'relearning') {
        if (isDue(srs, now)) learningCount++;
      } else if (srs.state === 'review' && isDue(srs, now)) {
        dueCount++;
      }
    }

    return {
      newCount: Math.min(newCount, MAX_NEW_PER_DAY),
      learningCount,
      dueCount,
      total: flashcardIds.length,
    };
  }, [srsMap]);

  // ─── Get Next States Preview ─────────────────────────────────────────

  const getCardNextStates = useCallback((flashcardId: string): NextStates | null => {
    const srs = srsMap.get(flashcardId);
    if (!srs) return null;
    return getNextStates(srs, new Date());
  }, [srsMap]);

  // ─── Get SRS data for a specific card ─────────────────────────────────

  const getSRSData = useCallback((flashcardId: string): SRSCardData | null => {
    return srsMap.get(flashcardId) ?? null;
  }, [srsMap]);

  // ─── Initialize SRS for a newly created card ──────────────────────────

  const initializeCard = useCallback(async (flashcardId: string) => {
    if (!userId) return;

    const newData = createNewCard();
    const { error } = await supabase
      .from('flashcard_srs_data')
      .insert({
        user_id: userId,
        flashcard_id: flashcardId,
        ...srsCardToDbUpdate(newData),
      });

    if (error) {
      console.error('Error initializing SRS for new card:', error);
    } else if (isMountedRef.current) {
      setSrsMap(prev => {
        const next = new Map(prev);
        next.set(flashcardId, newData);
        return next;
      });
    }
  }, [userId]);

  // ─── Get Free Study Queue (all cards, ignoring schedule) ─────────────

  const getFreeStudyQueue = useCallback((
    flashcardIds: string[],
  ): StudyQueueItem[] => {
    const queue: StudyQueueItem[] = [];
    for (const id of flashcardIds) {
      const srs = srsMap.get(id) || createNewCard();
      queue.push({ flashcardId: id, srsData: srs, priority: 0 });
    }
    return queue;
  }, [srsMap]);

  return {
    srsMap,
    loading,
    todayStats,
    submitReview,
    getStudyQueue,
    getFreeStudyQueue,
    getDeckStats,
    getCardNextStates,
    getSRSData,
    initializeCard,
    formatInterval,
    refetch: fetchSRSData,
  };
}
