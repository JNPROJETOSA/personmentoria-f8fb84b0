import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EditorialData, TopicStatus } from '@/lib/types';
import { EDITORIAL_TEMPLATE } from '@/lib/constants';

export function useEditorial(userId: string | undefined) {
  const [editorialData, setEditorialData] = useState<EditorialData>(JSON.parse(JSON.stringify(EDITORIAL_TEMPLATE)));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchEditorial = async () => {
      const { data, error } = await supabase
        .from('editorial_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching editorial:', error);
      } else {
        // Reconstruct editorial data from database rows
        const editorial = JSON.parse(JSON.stringify(EDITORIAL_TEMPLATE)) as EditorialData;
        
        data.forEach(entry => {
          const area = editorial.areas.find(a => a.name === entry.area);
          if (area) {
            const subarea = area.subareas.find(s => s.name === entry.sub_area);
            if (subarea) {
              const topic = subarea.topics.find(t => t.name === entry.topic);
              if (topic) {
                topic.status = entry.status as TopicStatus;
              }
            }
          }
        });
        
        setEditorialData(editorial);
      }
      setLoading(false);
    };

    fetchEditorial();
  }, [userId]);

  const updateTopicStatus = async (areaName: string, subareaName: string, topicName: string, status: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('editorial_progress')
      .upsert({
        user_id: userId,
        area: areaName,
        sub_area: subareaName,
        topic: topicName,
        status: status
      }, {
        onConflict: 'user_id,area,sub_area,topic'
      });

    if (error) {
      console.error('Error updating editorial:', error);
    } else {
      // Update local state
      setEditorialData(prev => {
        const newData = { ...prev };
        const area = newData.areas.find(a => a.name === areaName);
        if (area) {
          const subarea = area.subareas.find(s => s.name === subareaName);
          if (subarea) {
            const topic = subarea.topics.find(t => t.name === topicName);
            if (topic) {
              topic.status = status as TopicStatus;
            }
          }
        }
        return newData;
      });
    }
  };

  return { editorialData, loading, updateTopicStatus, setEditorialData };
}
