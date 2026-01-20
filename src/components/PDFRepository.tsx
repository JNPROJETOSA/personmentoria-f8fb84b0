import { useState } from 'react';
import { Folder, Plus, Edit2, Trash2, Upload, File, Download, FolderOpen, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePDFRepository } from '@/hooks/usePDFRepository';

interface PDFRepositoryProps {
    isAdmin: boolean;
}

export default function PDFRepository({ isAdmin }: PDFRepositoryProps) {
    const {
        folders,
        loading,
        selectedFolder,
        setSelectedFolder,
        files,
        filesLoading,
        createFolder,
        updateFolder,
        deleteFolder,
        uploadFile,
        updateFileName,
        deleteFile,
        getFileUrl
    } = usePDFRepository();

    // Dialogs state
    const [createFolderDialog, setCreateFolderDialog] = useState(false);
    const [renameFolderDialog, setRenameFolderDialog] = useState<{ id: string; name: string } | null>(null);
    const [deleteFolderDialog, setDeleteFolderDialog] = useState<string | null>(null);
    const [uploadFileDialog, setUploadFileDialog] = useState(false);
    const [renameFileDialog, setRenameFileDialog] = useState<{ id: string; name: string } | null>(null);
    const [deleteFileDialog, setDeleteFileDialog] = useState<{ id: string; path: string } | null>(null);

    // Form state
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [customFileName, setCustomFileName] = useState('');

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        const success = await createFolder(newFolderName.trim());
        if (success) {
            setNewFolderName('');
            setCreateFolderDialog(false);
        }
    };

    const handleRenameFolder = async () => {
        if (!renameFolderDialog || !renameFolderDialog.name.trim()) return;
        const success = await updateFolder(renameFolderDialog.id, renameFolderDialog.name.trim());
        if (success) {
            setRenameFolderDialog(null);
        }
    };

    const handleDeleteFolder = async () => {
        if (!deleteFolderDialog) return;
        const success = await deleteFolder(deleteFolderDialog);
        if (success) {
            setDeleteFolderDialog(null);
        }
    };

    const handleUploadFile = async () => {
        if (!selectedFolder || !selectedFile) return;
        const success = await uploadFile(selectedFolder, selectedFile, customFileName.trim() || undefined);
        if (success) {
            setSelectedFile(null);
            setCustomFileName('');
            setUploadFileDialog(false);
        }
    };

    const handleRenameFile = async () => {
        if (!renameFileDialog || !renameFileDialog.name.trim()) return;
        const success = await updateFileName(renameFileDialog.id, renameFileDialog.name.trim());
        if (success) {
            setRenameFileDialog(null);
        }
    };

    const handleDeleteFile = async () => {
        if (!deleteFileDialog) return;
        const success = await deleteFile(deleteFileDialog.id, deleteFileDialog.path);
        if (success) {
            setDeleteFileDialog(null);
        }
    };

    const selectedFolderData = folders.find(f => f.id === selectedFolder);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Raio-X da Banca</h2>
                    <p className="text-muted-foreground">
                        {isAdmin ? 'Gerencie PDFs organizados por pastas' : 'Acesse os materiais oficiais'}
                    </p>
                </div>
                {isAdmin && (
                    <Button onClick={() => setCreateFolderDialog(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Nova Pasta
                    </Button>
                )}
            </div>

            <div className={`grid gap-6 ${selectedFolder ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 max-w-2xl mx-auto'}`}>
                {/* Folders List */}
                <Card className={selectedFolder ? "lg:col-span-1" : ""}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Folder className="w-5 h-5" />
                            Pastas
                        </CardTitle>
                        <CardDescription>
                            {folders.length} {folders.length === 1 ? 'pasta' : 'pastas'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[600px] pr-4">
                            <div className="space-y-2">
                                {folders.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>Nenhuma pasta criada</p>
                                    </div>
                                ) : (
                                    folders.map(folder => (
                                        <div
                                            key={folder.id}
                                            className={`group p-3 rounded-lg border transition-all ${selectedFolder === folder.id
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'hover:bg-accent hover:border-accent-foreground/20'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div
                                                    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                                                    onClick={() => setSelectedFolder(folder.id)}
                                                >
                                                    <Folder className="w-4 h-4 flex-shrink-0" />
                                                    <span className="font-medium truncate hover:underline">{folder.name}</span>
                                                </div>
                                                {isAdmin && (
                                                    <div className="flex gap-1 ml-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setRenameFolderDialog({ id: folder.id, name: folder.name });
                                                            }}
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDeleteFolderDialog(folder.id);
                                                            }}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Files List - Only show when folder is selected */}
                {selectedFolder && (
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <File className="w-5 h-5" />
                                        {selectedFolderData ? selectedFolderData.name : 'Arquivos'}
                                    </CardTitle>
                                    <CardDescription>
                                        {selectedFolder
                                            ? `${files.length} ${files.length === 1 ? 'arquivo' : 'arquivos'}`
                                            : 'Selecione uma pasta para ver os arquivos'}
                                    </CardDescription>
                                </div>
                                {isAdmin && selectedFolder && (
                                    <Button onClick={() => setUploadFileDialog(true)} size="sm" className="gap-2">
                                        <Upload className="w-4 h-4" />
                                        Upload PDF
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!selectedFolder ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg">Selecione uma pasta para visualizar os arquivos</p>
                                </div>
                            ) : filesLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : files.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <File className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg">Nenhum arquivo nesta pasta</p>
                                    {isAdmin && <p className="text-sm mt-2">Clique em "Upload PDF" para adicionar arquivos</p>}
                                </div>
                            ) : (
                                <ScrollArea className="h-[600px]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nome</TableHead>
                                                <TableHead>Tamanho</TableHead>
                                                <TableHead>Data</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {files.map(file => (
                                                <TableRow key={file.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <File className="w-4 h-4 text-red-500" />
                                                            {file.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {file.file_size ? `${(file.file_size / 1024 / 1024).toFixed(2)} MB` : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {new Date(file.created_at).toLocaleDateString('pt-BR')}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={async () => {
                                                                    const url = await getFileUrl(file.file_path);
                                                                    if (url) window.open(url, '_blank');
                                                                }}
                                                                className="gap-1"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                                Abrir
                                                            </Button>
                                                            {isAdmin && (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setRenameFileDialog({ id: file.id, name: file.name })}
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="hover:bg-destructive/20 hover:text-destructive"
                                                                        onClick={() => setDeleteFileDialog({ id: file.id, path: file.file_path })}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Dialogs */}
            {/* Create Folder Dialog */}
            <Dialog open={createFolderDialog} onOpenChange={setCreateFolderDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Criar Nova Pasta</DialogTitle>
                        <DialogDescription>Dê um nome para a nova pasta</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="folder-name">Nome da Pasta</Label>
                            <Input
                                id="folder-name"
                                placeholder="Ex: SES-PE, ENARE, etc."
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateFolderDialog(false)}>Cancelar</Button>
                        <Button onClick={handleCreateFolder}>Criar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rename Folder Dialog */}
            <Dialog open={!!renameFolderDialog} onOpenChange={() => setRenameFolderDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Renomear Pasta</DialogTitle>
                        <DialogDescription>Digite o novo nome para a pasta</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="rename-folder">Novo Nome</Label>
                            <Input
                                id="rename-folder"
                                value={renameFolderDialog?.name || ''}
                                onChange={(e) => setRenameFolderDialog(prev => prev ? { ...prev, name: e.target.value } : null)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameFolderDialog(null)}>Cancelar</Button>
                        <Button onClick={handleRenameFolder}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Folder Alert */}
            <AlertDialog open={!!deleteFolderDialog} onOpenChange={() => setDeleteFolderDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            Confirmar Exclusão
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir esta pasta? Todos os arquivos dentro dela serão removidos permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteFolderDialog(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteFolder} className="bg-destructive hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Upload File Dialog */}
            <Dialog open={uploadFileDialog} onOpenChange={setUploadFileDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload de PDF</DialogTitle>
                        <DialogDescription>Selecione um arquivo PDF para enviar</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="pdf-file">Arquivo PDF</Label>
                            <Input
                                id="pdf-file"
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="custom-name">Nome Personalizado (opcional)</Label>
                            <Input
                                id="custom-name"
                                placeholder="Deixe em branco para usar o nome original"
                                value={customFileName}
                                onChange={(e) => setCustomFileName(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUploadFileDialog(false)}>Cancelar</Button>
                        <Button onClick={handleUploadFile} disabled={!selectedFile}>Enviar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rename File Dialog */}
            <Dialog open={!!renameFileDialog} onOpenChange={() => setRenameFileDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Renomear Arquivo</DialogTitle>
                        <DialogDescription>Digite o novo nome para o arquivo</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="rename-file">Novo Nome</Label>
                            <Input
                                id="rename-file"
                                value={renameFileDialog?.name || ''}
                                onChange={(e) => setRenameFileDialog(prev => prev ? { ...prev, name: e.target.value } : null)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRenameFile()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameFileDialog(null)}>Cancelar</Button>
                        <Button onClick={handleRenameFile}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete File Alert */}
            <AlertDialog open={!!deleteFileDialog} onOpenChange={() => setDeleteFileDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            Confirmar Exclusão
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir este arquivo? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteFileDialog(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteFile} className="bg-destructive hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
