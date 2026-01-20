import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  xp: number;
  level: number;
  streak: number;
  last_study_date: string | null;
  frozen: boolean;
  exam_year: string | null;
  target_institutions: string[] | null;
  target_specialty: string | null;
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        // Type assertion to handle potential missing columns before migration is run
        const profileData = data as any;
        setProfile({
          ...profileData,
          exam_year: profileData.exam_year || null,
          target_institutions: profileData.target_institutions || null,
          target_specialty: profileData.target_specialty || null
        } as Profile);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating profile:', error);
    } else {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  return { profile, loading, updateProfile };
}
