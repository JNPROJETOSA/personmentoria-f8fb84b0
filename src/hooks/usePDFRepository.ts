import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PDFFolder, PDFFile } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export function usePDFRepository() {
    const [folders, setFolders] = useState<PDFFolder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [files, setFiles] = useState<PDFFile[]>([]);
    const [filesLoading, setFilesLoading] = useState(false);

    // Load all folders
    useEffect(() => {
        loadFolders();
    }, []);

    // Load files when folder is selected
    useEffect(() => {
        if (selectedFolder) {
            loadFiles(selectedFolder);
        } else {
            setFiles([]);
        }
    }, [selectedFolder]);

    const loadFolders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pdf_folders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFolders((data as PDFFolder[]) || []);
        } catch (error) {
            console.error('Error loading folders:', error);
            toast({
                title: 'Erro ao carregar pastas',
                description: 'Não foi possível carregar as pastas.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const createFolder = async (name: string) => {
        try {
            const { data, error } = await supabase
                .from('pdf_folders')
                .insert([{ name }])
                .select()
                .single();

            if (error) throw error;

            setFolders(prev => [data as PDFFolder, ...prev]);
            toast({
                title: 'Pasta criada!',
                description: `A pasta "${name}" foi criada com sucesso.`
            });
            return true;
        } catch (error) {
            console.error('Error creating folder:', error);
            toast({
                title: 'Erro ao criar pasta',
                description: 'Não foi possível criar a pasta.',
                variant: 'destructive'
            });
            return false;
        }
    };

    const updateFolder = async (id: string, name: string) => {
        try {
            const { error } = await supabase
                .from('pdf_folders')
                .update({ name, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
            toast({
                title: 'Pasta atualizada!',
                description: `A pasta foi renomeada para "${name}".`
            });
            return true;
        } catch (error) {
            console.error('Error updating folder:', error);
            toast({
                title: 'Erro ao atualizar pasta',
                description: 'Não foi possível renomear a pasta.',
                variant: 'destructive'
            });
            return false;
        }
    };

    const deleteFolder = async (id: string) => {
        try {
            const { error } = await supabase
                .from('pdf_folders')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setFolders(prev => prev.filter(f => f.id !== id));
            if (selectedFolder === id) {
                setSelectedFolder(null);
            }
            toast({
                title: 'Pasta excluída!',
                description: 'A pasta foi removida com sucesso.'
            });
            return true;
        } catch (error) {
            console.error('Error deleting folder:', error);
            toast({
                title: 'Erro ao excluir pasta',
                description: 'Não foi possível excluir a pasta.',
                variant: 'destructive'
            });
            return false;
        }
    };

    const loadFiles = async (folderId: string) => {
        setFilesLoading(true);
        try {
            const { data, error } = await supabase
                .from('pdf_files')
                .select('*')
                .eq('folder_id', folderId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFiles((data as PDFFile[]) || []);
        } catch (error) {
            console.error('Error loading files:', error);
            toast({
                title: 'Erro ao carregar arquivos',
                description: 'Não foi possível carregar os arquivos.',
                variant: 'destructive'
            });
        } finally {
            setFilesLoading(false);
        }
    };

    const uploadFile = async (folderId: string, file: File, customName?: string) => {
        try {
            const fileName = customName || file.name;
            const filePath = `${folderId}/${Date.now()}_${file.name}`;

            console.log('🔵 Tentando upload:', { folderId, fileName, filePath, fileSize: file.size, fileType: file.type });

            // Upload to storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('pdfs')
                .upload(filePath, file, {
                    contentType: 'application/pdf',
                    upsert: false
                });

            if (uploadError) {
                console.error('❌ ERRO NO STORAGE:', uploadError);
                console.error('❌ Detalhes do erro:', JSON.stringify(uploadError, null, 2));
                throw uploadError;
            }

            console.log('✅ Upload no storage OK:', uploadData);

            // Create DB record
            const { data, error: dbError } = await supabase
                .from('pdf_files')
                .insert([{
                    folder_id: folderId,
                    name: fileName,
                    file_path: filePath,
                    file_size: file.size
                }])
                .select()
                .single();

            if (dbError) {
                console.error('❌ ERRO NO DB:', dbError);
                // Rollback storage upload
                await supabase.storage.from('pdfs').remove([filePath]);
                throw dbError;
            }

            console.log('✅ Registro no DB criado:', data);

            setFiles(prev => [data as PDFFile, ...prev]);
            toast({
                title: 'Arquivo enviado!',
                description: `O arquivo "${fileName}" foi enviado com sucesso.`
            });
            return true;
        } catch (error: any) {
            console.error('❌ ERRO GERAL:', error);
            console.error('❌ Error message:', error?.message);
            console.error('❌ Error details:', JSON.stringify(error, null, 2));

            toast({
                title: 'Erro ao enviar arquivo',
                description: error?.message || 'Não foi possível fazer o upload do arquivo.',
                variant: 'destructive'
            });
            return false;
        }
    };

    const updateFileName = async (fileId: string, newName: string) => {
        try {
            const { error } = await supabase
                .from('pdf_files')
                .update({ name: newName, updated_at: new Date().toISOString() })
                .eq('id', fileId);

            if (error) throw error;

            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, name: newName } : f));
            toast({
                title: 'Arquivo atualizado!',
                description: `O arquivo foi renomeado para "${newName}".`
            });
            return true;
        } catch (error) {
            console.error('Error updating file name:', error);
            toast({
                title: 'Erro ao atualizar arquivo',
                description: 'Não foi possível renomear o arquivo.',
                variant: 'destructive'
            });
            return false;
        }
    };

    const deleteFile = async (fileId: string, filePath: string) => {
        try {
            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from('pdfs')
                .remove([filePath]);

            if (storageError) throw storageError;

            // Delete from DB
            const { error: dbError } = await supabase
                .from('pdf_files')
                .delete()
                .eq('id', fileId);

            if (dbError) throw dbError;

            setFiles(prev => prev.filter(f => f.id !== fileId));
            toast({
                title: 'Arquivo excluído!',
                description: 'O arquivo foi removido com sucesso.'
            });
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            toast({
                title: 'Erro ao excluir arquivo',
                description: 'Não foi possível excluir o arquivo.',
                variant: 'destructive'
            });
            return false;
        }
    };

    const getFileUrl = async (filePath: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('pdfs')
                .createSignedUrl(filePath, 3600); // URL válida por 1 hora

            if (error) {
                console.error('Error creating signed URL:', error);
                return null;
            }

            return data.signedUrl;
        } catch (error) {
            console.error('Error in getFileUrl:', error);
            return null;
        }
    };

    return {
        folders,
        loading,
        selectedFolder,
        setSelectedFolder,
        files,
        filesLoading,
        createFolder,
        updateFolder,
        deleteFolder,
        loadFiles,
        uploadFile,
        updateFileName,
        deleteFile,
        getFileUrl,
        refreshFolders: loadFolders
    };
}
