
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

export interface DailyMetric {
    date: string; // YYYY-MM-DD
    cardsStudied: number;
    timeStudiedSeconds: number;
    cardsCreated: number;
}

export interface FolderDifficulty {
    folderId: string;
    folderName: string;
    avgDifficulty: number; // 1-5
    reviewCount: number;
}

export function useFlashcardMetrics(userId: string | undefined) {
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
    const [folderRanking, setFolderRanking] = useState<FolderDifficulty[]>([]);
    const [loading, setLoading] = useState(false);

    const logStudySession = useCallback(async (
        startedAt: Date,
        endedAt: Date,
        cardsReviewed: number,
        durationSeconds: number
    ) => {
        if (!userId) return;

        const { error } = await supabase
            .from('flashcard_study_sessions')
            .insert({
                user_id: userId,
                started_at: startedAt.toISOString(),
                ended_at: endedAt.toISOString(),
                cards_reviewed: cardsReviewed,
                duration_seconds: durationSeconds
            });

        if (error) console.error('Error logging session:', error);
        else fetchMetrics(); // Refresh metrics
    }, [userId]);

    const logReview = useCallback(async (flashcardId: string, difficulty: number) => {
        if (!userId) return;

        const { error } = await supabase
            .from('flashcard_reviews')
            .insert({
                user_id: userId,
                flashcard_id: flashcardId,
                difficulty
            });

        if (error) console.error('Error logging review:', error);
    }, [userId]);

    const fetchMetrics = useCallback(async () => {
        if (!userId) return;
        setLoading(true);

        try {
            const today = new Date();
            const thirtyDaysAgo = subDays(today, 30); // Get last 30 days history

            // 1. Fetch Study Sessions
            const { data: sessions, error: sessionError } = await supabase
                .from('flashcard_study_sessions')
                .select('*')
                .eq('user_id', userId)
                .gte('started_at', thirtyDaysAgo.toISOString());

            if (sessionError) throw sessionError;

            // 2. Fetch Created Cards count
            const { data: createdCards, error: createdError } = await supabase
                .from('flashcards')
                .select('created_at')
                .eq('user_id', userId)
                .gte('created_at', thirtyDaysAgo.toISOString());

            if (createdError) throw createdError;

            // 3. Aggregate Daily Metrics
            const metricsMap = new Map<string, DailyMetric>();

            // Initialize last 7 days at least with zeros
            for (let i = 0; i < 7; i++) {
                const d = subDays(today, i);
                const key = format(d, 'yyyy-MM-dd');
                metricsMap.set(key, { date: key, cardsCreated: 0, cardsStudied: 0, timeStudiedSeconds: 0 });
            }

            sessions?.forEach(session => {
                const key = format(new Date(session.started_at), 'yyyy-MM-dd');
                const current = metricsMap.get(key) || { date: key, cardsCreated: 0, cardsStudied: 0, timeStudiedSeconds: 0 };
                current.cardsStudied += session.cards_reviewed || 0;
                current.timeStudiedSeconds += session.duration_seconds || 0;
                metricsMap.set(key, current);
            });

            createdCards?.forEach(card => {
                const key = format(new Date(card.created_at), 'yyyy-MM-dd');
                const current = metricsMap.get(key) || { date: key, cardsCreated: 0, cardsStudied: 0, timeStudiedSeconds: 0 };
                current.cardsCreated += 1;
                metricsMap.set(key, current);
            });

            setDailyMetrics(Array.from(metricsMap.values()).sort((a, b) => b.date.localeCompare(a.date)));

            // 4. Calculate Folder Difficulty
            // We fetch reviews, flashcards, and folders separately to avoid deep nested join issues with PostgREST
            const { data: reviews, error: reviewsError } = await supabase
                .from('flashcard_reviews')
                .select('difficulty, flashcard_id')
                .eq('user_id', userId);

            if (reviewsError) throw reviewsError;

            // Fetch generic flashcard info (we need map flashcard_id -> folder_id)
            const { data: allCards, error: cardsError } = await supabase
                .from('flashcards')
                .select('id, folder_id')
                .eq('user_id', userId);

            if (cardsError) throw cardsError;

            // Fetch folders
            const { data: allFolders, error: foldersError } = await supabase
                .from('flashcard_folders')
                .select('id, name')
                .eq('user_id', userId);

            if (foldersError) throw foldersError;

            // Create Maps for O(1) lookup
            const cardMap = new Map<string, string | null>(); // cardId -> folderId
            allCards?.forEach(c => cardMap.set(c.id, c.folder_id));

            const folderMap = new Map<string, string>(); // folderId -> folderName
            allFolders?.forEach(f => folderMap.set(f.id, f.name));

            const folderStats = new Map<string, { name: string; sumDiff: number; count: number }>();

            reviews?.forEach((r) => {
                const folderId = cardMap.get(r.flashcard_id);
                if (folderId && folderMap.has(folderId)) {
                    const folderName = folderMap.get(folderId)!;
                    const current = folderStats.get(folderId) || { name: folderName, sumDiff: 0, count: 0 };
                    // Current mapping: 1=Hard, 5=Easy.
                    // We want "Difficulty", so maybe invert?
                    // Or keep as is: Low Average = High Difficulty.
                    // The UI sorts by "Mais difícil no topo" (Top).
                    // If 1 is Hard, then Ascending Sort (1, 2, 3) puts Hardest first.
                    current.sumDiff += r.difficulty;
                    current.count += 1;
                    folderStats.set(folderId, current);
                }
            });

            const ranking = Array.from(folderStats.entries()).map(([id, stats]) => ({
                folderId: id,
                folderName: stats.name,
                avgDifficulty: stats.sumDiff / stats.count,
                reviewCount: stats.count
            })).sort((a, b) => a.avgDifficulty - b.avgDifficulty); // Ascending: Lower = Harder = First
            // Let's clarify:
            // Anki: 1=Again, 2=Hard, 3=Good, 4=Easy.
            // User requested 5 levels: "Muito difícil, Difícil, Médio, Fácil, Muito fácil".
            // Let's map: 1=Muito difícil, 5=Muito fácil.
            // So, LOWER numeric value = HARDER.
            // Ranking should be ASCENDING order of avgDifficulty (lowest first).

            setFolderRanking(ranking.sort((a, b) => a.avgDifficulty - b.avgDifficulty));

        } catch (e) {
            console.error('Error fetching metrics:', e);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    return { dailyMetrics, folderRanking, loading, logStudySession, logReview, fetchMetrics };
}
