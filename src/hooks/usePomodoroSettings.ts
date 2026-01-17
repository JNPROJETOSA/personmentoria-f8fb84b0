import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface PomodoroSettings {
    focus: number;
    shortBreak: number;
    longBreak: number;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
};

export function usePomodoroSettings() {
    const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchSettings = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('dream_board_items')
                .select('*')
                .eq('user_id', user.id)
                .eq('type', 'pomodoro_settings')
                .maybeSingle();

            if (error) {
                console.error('Error fetching pomodoro settings:', error);
                return;
            }

            if (data) {
                try {
                    const parsed = JSON.parse(data.content);
                    setSettings({
                        focus: Number(parsed.focus) || 25,
                        shortBreak: Number(parsed.shortBreak) || 5,
                        longBreak: Number(parsed.longBreak) || 15,
                    });
                } catch (e) {
                    console.error('Error parsing pomodoro settings:', e);
                }
            }
        } catch (err) {
            console.error('Error in fetchSettings:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const saveSettings = async (newSettings: PomodoroSettings) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast({
                    title: "Erro ao salvar",
                    description: "Você precisa estar logado.",
                    variant: "destructive"
                });
                return;
            }

            // Check if exists first to get ID
            const { data: existing } = await supabase
                .from('dream_board_items')
                .select('id')
                .eq('user_id', user.id)
                .eq('type', 'pomodoro_settings')
                .maybeSingle();

            const content = JSON.stringify(newSettings);

            if (existing) {
                // Update
                const { error } = await supabase
                    .from('dream_board_items')
                    .update({ content })
                    .eq('id', existing.id);

                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from('dream_board_items')
                    .insert({
                        user_id: user.id,
                        type: 'pomodoro_settings',
                        content
                    });

                if (error) throw error;
            }

            setSettings(newSettings);
            toast({
                title: "Configurações salvas!",
                description: "Seus tempos padrão foram atualizados.",
            });

        } catch (err) {
            console.error('Error saving pomodoro settings:', err);
            toast({
                title: "Erro ao salvar",
                description: "Tente novamente mais tarde.",
                variant: "destructive"
            });
        }
    };

    // Fetch on mount
    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return { settings, loading, saveSettings };
}
