import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const MAX_FILE_SIZE = 200 * 1024; // 200 KB in bytes
const BUCKET_NAME = 'dream-board-images';

export function useDreamBoardImages() {
    const [uploading, setUploading] = useState(false);

    /**
     * Upload image to storage with 200KB validation
     * @param file Image file to upload
     * @returns Path to uploaded image or null if failed
     */
    const uploadImage = async (file: File): Promise<string | null> => {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            toast({
                title: "Arquivo muito grande",
                description: `A imagem deve ter no máximo 200 KB. Tamanho atual: ${(file.size / 1024).toFixed(0)} KB`,
                variant: "destructive"
            });
            return null;
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast({
                title: "Formato inválido",
                description: "Use apenas imagens JPG, PNG ou WebP",
                variant: "destructive"
            });
            return null;
        }

        setUploading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw uploadError;
            }

            return fileName;

        } catch (error: any) {
            console.error('Error uploading image:', error);
            toast({
                title: "Erro ao enviar imagem",
                description: error.message || "Tente novamente",
                variant: "destructive"
            });
            return null;
        } finally {
            setUploading(false);
        }
    };

    /**
     * Get signed URL for private image
     * @param path Image path in storage
     * @returns Signed URL or null
     */
    const getImageUrl = async (path: string): Promise<string | null> => {
        try {
            // Check if it's already a full URL (legacy/external link)
            if (path.startsWith('http')) {
                return path;
            }

            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .createSignedUrl(path, 3600); // 1 hour validity

            if (error) {
                console.error('Error getting signed URL:', error);
                return null;
            }

            return data.signedUrl;
        } catch (error) {
            console.error('Error in getImageUrl:', error);
            return null;
        }
    };

    /**
     * Delete image from storage
     * @param path Image path in storage
     */
    const deleteImage = async (path: string): Promise<boolean> => {
        // Don't try to delete external URLs
        if (path.startsWith('http')) {
            return true;
        }

        try {
            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([path]);

            if (error) {
                console.error('Error deleting image:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error in deleteImage:', error);
            return false;
        }
    };

    return {
        uploadImage,
        getImageUrl,
        deleteImage,
        uploading
    };
}
