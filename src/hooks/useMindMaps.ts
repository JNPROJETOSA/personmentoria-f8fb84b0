import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MedicalArea } from '@/lib/types';
import { Node, Edge, Viewport } from 'reactflow';

export type MindMapFolder = {
    id: string;
    name: string;
    area: MedicalArea;
    createdAt: string;
};

export type MindMap = {
    id: string;
    title: string;
    folderId?: string; // Optional, might be directly under area
    area: MedicalArea;
    nodes: Node[];
    edges: Edge[];
    viewport: Viewport;
    createdAt: string;
    updatedAt: string;
};

// Generic type stored in DB
type DBContent = {
    type: 'folder' | 'map';
    data: any;
};

export function useMindMaps(userId?: string) {
    const [folders, setFolders] = useState<MindMapFolder[]>([]);
    const [maps, setMaps] = useState<MindMap[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchItems = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('dream_board_items')
                .select('*')
                .eq('user_id', userId)
                .in('type', ['mind_map_folder', 'mind_map']);

            if (error) throw error;

            const loadedFolders: MindMapFolder[] = [];
            const loadedMaps: MindMap[] = [];

            data?.forEach(item => {
                try {
                    const content = JSON.parse(item.content);
                    if (item.type === 'mind_map_folder') {
                        loadedFolders.push({
                            id: item.id,
                            name: content.name,
                            area: content.area,
                            createdAt: item.created_at || new Date().toISOString()
                        });
                    } else if (item.type === 'mind_map') {
                        loadedMaps.push({
                            id: item.id,
                            title: content.title,
                            folderId: content.folderId,
                            area: content.area,
                            nodes: content.nodes || [],
                            edges: content.edges || [],
                            viewport: content.viewport || { x: 0, y: 0, zoom: 1 },
                            createdAt: item.created_at || new Date().toISOString(),
                            updatedAt: content.updatedAt || item.created_at
                        });
                    }
                } catch (e) {
                    console.error('Failed to parse mind map item', e);
                }
            });

            setFolders(loadedFolders);
            setMaps(loadedMaps);

        } catch (err) {
            console.error('Error fetching mind maps:', err);
            toast({
                title: "Erro ao carregar mapas",
                description: "Não foi possível carregar seus mapas mentais.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [userId, toast]);

    const createFolder = async (name: string, area: MedicalArea) => {
        if (!userId) return;
        try {
            const content = JSON.stringify({ name, area });
            const { data, error } = await supabase
                .from('dream_board_items')
                .insert({
                    user_id: userId,
                    type: 'mind_map_folder',
                    content
                })
                .select()
                .single();

            if (error) throw error;

            setFolders(prev => [...prev, {
                id: data.id,
                name,
                area,
                createdAt: data.created_at || new Date().toISOString()
            }]);

            toast({ title: "Pasta criada!" });
            return data.id;
        } catch (err) {
            console.error(err);
            toast({ title: "Erro ao criar pasta", variant: "destructive" });
        }
    };

    const saveMap = async (map: Omit<MindMap, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string) => {
        if (!userId) return;
        try {
            const content = JSON.stringify({
                ...map,
                updatedAt: new Date().toISOString()
            });

            if (existingId) {
                // Update
                const { error } = await supabase
                    .from('dream_board_items')
                    .update({ content })
                    .eq('id', existingId);

                if (error) throw error;

                setMaps(prev => prev.map(m => m.id === existingId ? { ...m, ...map, updatedAt: new Date().toISOString() } : m));
                toast({ title: "Mapa salvo!" });
                return existingId;
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('dream_board_items')
                    .insert({
                        user_id: userId,
                        type: 'mind_map',
                        content
                    })
                    .select()
                    .single();

                if (error) throw error;

                const newMap: MindMap = {
                    id: data.id,
                    ...map,
                    createdAt: data.created_at || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                setMaps(prev => [...prev, newMap]);
                toast({ title: "Mapa criado!" });
                return data.id;
            }
        } catch (err) {
            console.error(err);
            toast({ title: "Erro ao salvar mapa", variant: "destructive" });
        }
    };

    const deleteItem = async (id: string, type: 'folder' | 'map') => {
        try {
            const { error } = await supabase
                .from('dream_board_items')
                .delete()
                .eq('id', id);

            if (error) throw error;

            if (type === 'folder') {
                setFolders(prev => prev.filter(f => f.id !== id));
                // Also delete maps in this folder? Ideally yes, but logic might be complex if we stored map IDs in folder.
                // For now, we rely on filtering maps by folderId in logic. 
                // Or we should delete linked maps too.
                const mapsToDelete = maps.filter(m => m.folderId === id);
                if (mapsToDelete.length > 0) {
                    // Best effort cleanup
                    mapsToDelete.forEach(async (m) => {
                        await supabase.from('dream_board_items').delete().eq('id', m.id);
                    });
                    setMaps(prev => prev.filter(m => m.folderId !== id));
                }
            } else {
                setMaps(prev => prev.filter(m => m.id !== id));
            }

            toast({ title: "Item excluído" });
        } catch (err) {
            console.error(err);
            toast({ title: "Erro ao excluir", variant: "destructive" });
        }
    };

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const moveMap = async (mapId: string, folderId: string | null) => {
        if (!userId) return;
        try {
            // Get current map content first (or optimistic update)
            const mapToUpdate = maps.find(m => m.id === mapId);
            if (!mapToUpdate) return;

            const content = JSON.stringify({
                ...mapToUpdate, // This includes title, nodes, edges...
                folderId: folderId // Update folderId
            });

            const { error } = await supabase
                .from('dream_board_items')
                .update({ content })
                .eq('id', mapId);

            if (error) throw error;

            setMaps(prev => prev.map(m => m.id === mapId ? { ...m, folderId: folderId || undefined } : m));
            toast({ title: folderId ? "Mapa movido para pasta!" : "Mapa removido da pasta!" });
        } catch (err) {
            console.error(err);
            toast({ title: "Erro ao mover mapa", variant: "destructive" });
        }
    };

    return {
        folders,
        maps,
        loading,
        createFolder,
        saveMap,
        deleteItem,
        moveMap,
        refresh: fetchItems
    };
}
