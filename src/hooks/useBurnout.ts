import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BurnoutData, CheckInEntry } from '@/lib/types';

export function useBurnout(userId: string | undefined) {
  const [burnoutData, setBurnoutData] = useState<BurnoutData>({ checkIns: [] });
  const [loading, setLoading] = useState(true);

  // Ensure data is always defined
  useEffect(() => {
    if (!loading && !burnoutData) {
      setBurnoutData({ checkIns: [] });
    }
  }, [loading, burnoutData]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchBurnout = async () => {
      const { data, error } = await supabase
        .from('burnout_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching burnout:', error);
      } else {
        const checkIns: CheckInEntry[] = data.map(b => ({
          id: b.id,
          date: b.date,
          time: b.created_at?.split('T')[1]?.substring(0, 5) || '00:00',
          feeling: b.feeling,
          energy: b.energy,
          mood: b.mood,
          sleep: b.sleep as 'great' | 'ok' | 'bad',
          stress: b.stress > 3,
          studyPerformance: b.productivity >= 4 ? 'yes' : b.productivity >= 2 ? 'partially' : 'no',
          notes: b.notes || undefined,
          level: calculateLevel(b.feeling, b.energy, b.mood, b.stress, b.productivity)
        }));
        setBurnoutData({ checkIns });
      }
      setLoading(false);
    };

    fetchBurnout();
  }, [userId]);

  const calculateLevel = (feeling: number, energy: number, mood: number, stress: number, productivity: number) => {
    const avg = (feeling + energy + mood + (6 - stress) + productivity) / 5;
    if (avg >= 4) return 'green' as const;
    if (avg >= 3) return 'yellow' as const;
    return 'red' as const;
  };

  const addCheckIn = async (checkIn: Omit<CheckInEntry, 'id' | 'level'>) => {
    if (!userId) return;

    const level = calculateLevel(checkIn.feeling, checkIn.energy, checkIn.mood, checkIn.stress ? 5 : 1, 
      checkIn.studyPerformance === 'yes' ? 5 : checkIn.studyPerformance === 'partially' ? 3 : 1);

    const { data, error } = await supabase
      .from('burnout_checkins')
      .insert({
        user_id: userId,
        date: checkIn.date,
        feeling: checkIn.feeling,
        energy: checkIn.energy,
        mood: checkIn.mood,
        sleep: checkIn.sleep,
        stress: checkIn.stress ? 5 : 1,
        productivity: checkIn.studyPerformance === 'yes' ? 5 : checkIn.studyPerformance === 'partially' ? 3 : 1,
        notes: checkIn.notes
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding burnout check-in:', error);
    } else {
      setBurnoutData(prev => ({
        checkIns: [{
          id: data.id,
          date: data.date,
          time: data.created_at?.split('T')[1]?.substring(0, 5) || '00:00',
          feeling: data.feeling,
          energy: data.energy,
          mood: data.mood,
          sleep: data.sleep as 'great' | 'ok' | 'bad',
          stress: data.stress > 3,
          studyPerformance: data.productivity >= 4 ? 'yes' : data.productivity >= 2 ? 'partially' : 'no',
          notes: data.notes || undefined,
          level
        }, ...prev.checkIns]
      }));
    }
  };

  return { burnoutData, loading, addCheckIn, setBurnoutData };
}
