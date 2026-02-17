import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ActivityType = 'exercise' | 'exam' | 'class' | 'flashcard' | 'notebook' | 'editorial';

export interface StudyActivity {
    id: string;
    user_id: string;
    activity_date: string;
    activity_type: ActivityType;
    created_at: string;
}

export interface DailyActivitySummary {
    date: string;
    count: number;
    types: ActivityType[];
}

export interface StreakInfo {
    currentStreak: number;
    lastActivityDate: string | null;
}

export function useStudyActivityLog(userId: string | undefined) {
    const [activities, setActivities] = useState<StudyActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [streak, setStreak] = useState<StreakInfo>({ currentStreak: 0, lastActivityDate: null });

    // Fetch all activities for the user
    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const fetchActivities = async () => {
            try {
                const { data, error } = await supabase
                    .from('study_activity_log')
                    .select('*')
                    .eq('user_id', userId)
                    .order('activity_date', { ascending: false });

                if (error) throw error;

                setActivities((data as StudyActivity[]) || []);
                calculateStreak((data as StudyActivity[]) || []);
            } catch (error) {
                console.error('Error fetching study activities:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchActivities();
    }, [userId]);

    // Calculate current streak from activities
    const calculateStreak = (activityData: StudyActivity[]) => {
        if (!activityData || activityData.length === 0) {
            setStreak({ currentStreak: 0, lastActivityDate: null });
            return;
        }

        // Get unique dates sorted descending
        const uniqueDates = Array.from(new Set(activityData.map(a => a.activity_date))).sort((a, b) => b.localeCompare(a));

        if (uniqueDates.length === 0) {
            setStreak({ currentStreak: 0, lastActivityDate: null });
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const lastActivityDate = uniqueDates[0];

        // Check if last activity was today or yesterday (streak is still alive)
        const lastActivityTime = new Date(lastActivityDate).getTime();
        const todayTime = new Date(today).getTime();
        const daysDiff = Math.floor((todayTime - lastActivityTime) / (1000 * 60 * 60 * 24));

        if (daysDiff > 1) {
            // Streak broken
            setStreak({ currentStreak: 0, lastActivityDate });
            return;
        }

        // Calculate consecutive days
        let currentStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(uniqueDates[i - 1]).getTime();
            const currDate = new Date(uniqueDates[i]).getTime();
            const diff = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));

            if (diff === 1) {
                currentStreak++;
            } else {
                break;
            }
        }

        setStreak({ currentStreak, lastActivityDate });
    };

    // Get daily activity summary for last N days (for calendar/heatmap)
    const getDailyActivitySummary = (days: number = 180): DailyActivitySummary[] => {
        const summary: DailyActivitySummary[] = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const dayActivities = activities.filter(a => a.activity_date === dateStr);
            const types = Array.from(new Set(dayActivities.map(a => a.activity_type)));

            summary.push({
                date: dateStr,
                count: dayActivities.length,
                types
            });
        }

        return summary;
    };

    // Log a new activity (used by components)
    const logActivity = async (activityType: ActivityType, activityDate?: string) => {
        if (!userId) return;

        const dateToLog = activityDate || new Date().toISOString().split('T')[0];

        try {
            const { data, error } = await supabase
                .from('study_activity_log')
                .insert({
                    user_id: userId,
                    activity_date: dateToLog,
                    activity_type: activityType
                })
                .select()
                .single();

            if (error) {
                // Ignore duplicate key errors (activity already logged for this day/type)
                if (!error.message.includes('duplicate key')) {
                    console.error('Error logging activity:', error);
                }
                return;
            }

            // Update local state
            if (data) {
                const newActivity = data as StudyActivity;
                setActivities(prev => [newActivity, ...prev]);
                calculateStreak([newActivity, ...activities]);
            }
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    };

    return {
        activities,
        loading,
        streak,
        getDailyActivitySummary,
        logActivity
    };
}
