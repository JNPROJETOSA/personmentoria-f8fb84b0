import { useState, useEffect, useRef } from 'react';
import { Save, Book, FileDown, FolderPlus, Folder, FolderOpen, Edit, Trash2, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MedicalArea } from '@/lib/types';
import { AREA_COLORS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { useNotebook, NotebookEntry } from '@/hooks/useNotebook';
import { useNotebookFolders, NotebookFolder } from '@/hooks/useNotebookFolders';
import jsPDF from 'jspdf';
import { savePdf } from '@/lib/pdf-helpers';

interface NotebookProps {
  userId: string | undefined;
}

export default function Notebook({ userId }: NotebookProps) {
  const { notebooks, loading: notebooksLoading, addNotebook, updateNotebook, deleteNotebook } = useNotebook(userId);
  const { folders, loading: foldersLoading, addFolder, updateFolder, deleteFolder } = useNotebookFolders(userId);

  const [selectedArea, setSelectedArea] = useState<MedicalArea>(MedicalArea.CLINICA);
  const [selectedNotebook, setSelectedNotebook] = useState<NotebookEntry | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [newNotebookFolder, setNewNotebookFolder] = useState<string | null>(null);
  const [newNotebookName, setNewNotebookName] = useState('');

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');

  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);
  const [editNotebookName, setEditNotebookName] = useState('');

  const [localContent, setLocalContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Sync local content with selected notebook
  useEffect(() => {
    if (selectedNotebook) {
      setLocalContent(selectedNotebook.content);
      setHasUnsavedChanges(false);
    } else {
      setLocalContent('');
      setHasUnsavedChanges(false);
    }
  }, [selectedNotebook?.id]);

  const handleContentChange = (content: string) => {
    setLocalContent(content);
    setHasUnsavedChanges(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (selectedNotebook) {
        await updateNotebook(selectedNotebook.id, { content });
        if (isMountedRef.current) {
          setHasUnsavedChanges(false);
        }
      }
    }, 5000);
  };

  const handleSaveNow = async () => {
    if (!selectedNotebook) return;

    await updateNotebook(selectedNotebook.id, { content: localContent });
    setHasUnsavedChanges(false);
    toast({
      title: "Salvo!",
      description: "Caderno atualizado com sucesso"
    });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const folder = await addFolder(selectedArea, newFolderName);
    if (folder) {
      setNewFolderName('');
      setIsCreatingFolder(false);
      toast({
        title: "Pasta criada!",
        description: `"${newFolderName}" foi adicionada`
      });
    }
  };

  const handleUpdateFolder = async () => {
    if (!editingFolderId || !editFolderName.trim()) return;

    await updateFolder(editingFolderId, editFolderName);
    setEditingFolderId(null);
    setEditFolderName('');
    toast({
      title: "Pasta renomeada!",
      description: "Nome atualizado com sucesso"
    });
  };

  const handleDeleteFolder = async (folderId: string) => {
    await deleteFolder(folderId);
    toast({
      title: "Pasta excluída",
      description: "Cadernos foram mantidos sem pasta"
    });
  };

  const handleCreateNotebook = async () => {
    if (!newNotebookName.trim()) return;

    const notebook = await addNotebook(newNotebookFolder, newNotebookName, selectedArea);
    if (notebook) {
      setNewNotebookName('');
      setNewNotebookFolder(null);
      setIsCreatingNotebook(false);
      setSelectedNotebook(notebook);
      toast({
        title: "Caderno criado!",
        description: `"${newNotebookName}" está pronto`
      });
    }
  };

  const handleUpdateNotebookName = async () => {
    if (!editingNotebookId || !editNotebookName.trim()) return;

    await updateNotebook(editingNotebookId, { name: editNotebookName });
    setEditingNotebookId(null);
    setEditNotebookName('');
    toast({
      title: "Caderno renomeado!",
      description: "Nome atualizado"
    });
  };

  const handleDeleteNotebook = async (notebookId: string) => {
    if (selectedNotebook?.id === notebookId) {
      setSelectedNotebook(null);
    }
    await deleteNotebook(notebookId);
    toast({
      title: "Caderno excluído",
      description: "Removido permanentemente"
    });
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const generatePDF = async () => {
    try {
      const { PdfService } = await import('@/lib/pdf-service');
      const pdf = new PdfService();

      await pdf.initialize('Caderno de Erros');
      pdf.addSubtitle(`Exportado em: ${new Date().toLocaleDateString('pt-BR')}`);

      let hasContent = false;

      // Group notebooks by area and folder
      for (const area of Object.values(MedicalArea)) {
        const areaNotebooks = notebooks.filter(n => n.specialty === area && n.content.trim());
        if (areaNotebooks.length === 0) continue;

        hasContent = true;

        // Area Section
        pdf.addSection(area);

        // Notebooks for this area
        areaNotebooks.forEach(notebook => {
          // Notebook Title
          pdf.addText(`${notebook.name}`, 12, [60, 60, 60], { bold: true });

          // Notebook Content
          pdf.addText(notebook.content, 10, [80, 80, 80], { indent: 0 }); // Clean content text

          // Spacer between notebooks
          pdf.moveY(10);
        });

        pdf.moveY(10); // Extra space between areas
      }

      if (!hasContent) {
        pdf.addText('Nenhum caderno com conteúdo encontrado.');
      }

      const filename = `Cadernos_${new Date().toISOString().split('T')[0]}`;
      pdf.save(filename);

      toast({
        title: "PDF gerado!",
        description: "Seus cadernos foram exportados"
      });
    } catch (error) {
      console.error('PDF error:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível exportar",
        variant: "destructive"
      });
    }
  };

  const areaFolders = folders.filter(f => f.area === selectedArea);
  const areaNotebooks = notebooks.filter(n => n.specialty === selectedArea);
  const notebooksInFolders = new Set(areaNotebooks.filter(n => n.folder_id).map(n => n.folder_id));
  const looseNotebooks = areaNotebooks.filter(n => !n.folder_id);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="w-5 h-5" />
            Caderno de Erros
          </CardTitle>
          <CardDescription>
            Organize seus cadernos por área e pastas temáticas
            {hasUnsavedChanges && (
              <span className="text-orange-500 font-semibold ml-2">• Não salvo</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedArea} onValueChange={(v) => setSelectedArea(v as MedicalArea)}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2 h-auto p-1">
              {Object.values(MedicalArea).map(area => (
                <TabsTrigger
                  key={area}
                  value={area}
                  className="data-[state=active]:border-l-4"
                  style={{ borderLeftColor: AREA_COLORS[area] }}
                >
                  {area.split(' ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.values(MedicalArea).map(area => (
              <TabsContent key={area} value={area} className="mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Left: Folders & Notebooks List */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Pastas</CardTitle>
                        <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <FolderPlus className="w-4 h-4 mr-1" />
                              Nova Pasta
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Criar Pasta</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <Label>Nome da Pasta</Label>
                                <Input
                                  value={newFolderName}
                                  onChange={(e) => setNewFolderName(e.target.value)}
                                  placeholder="Ex: Hematologia"
                                />
                              </div>
                              <Button onClick={handleCreateFolder} className="w-full">
                                Criar Pasta
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                      {/* Folders */}
                      {areaFolders.map(folder => (
                        <div key={folder.id} className="space-y-1">
                          <div className="flex items-center gap-2 p-2 rounded hover:bg-accent">
                            <button
                              onClick={() => toggleFolder(folder.id)}
                              className="flex items-center gap-2 flex-1 text-left"
                            >
                              {expandedFolders.has(folder.id) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <Folder className="w-4 h-4" />
                              <span className="font-medium">{folder.name}</span>
                            </button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingFolderId(folder.id);
                                    setEditFolderName(folder.name);
                                  }}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Renomear Pasta</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <Input
                                    value={editFolderName}
                                    onChange={(e) => setEditFolderName(e.target.value)}
                                  />
                                  <Button onClick={handleUpdateFolder} className="w-full">
                                    Salvar
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir pasta?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Os cadernos ficarão sem pasta (não serão excluídos)
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteFolder(folder.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>

                          {/* Notebooks in folder */}
                          {expandedFolders.has(folder.id) && (
                            <div className="ml-6 space-y-1">
                              {areaNotebooks
                                .filter(n => n.folder_id === folder.id)
                                .map(notebook => (
                                  <NotebookItem
                                    key={notebook.id}
                                    notebook={notebook}
                                    isSelected={selectedNotebook?.id === notebook.id}
                                    onSelect={() => setSelectedNotebook(notebook)}
                                    onEdit={(name) => {
                                      setEditingNotebookId(notebook.id);
                                      setEditNotebookName(name);
                                    }}
                                    onDelete={() => handleDeleteNotebook(notebook.id)}
                                  />
                                ))}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full justify-start text-muted-foreground"
                                onClick={() => {
                                  setNewNotebookFolder(folder.id);
                                  setIsCreatingNotebook(true);
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Novo Caderno
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Loose notebooks */}
                      {looseNotebooks.length > 0 && (
                        <div className="space-y-1 mt-4">
                          <div className="text-xs text-muted-foreground px-2">Sem pasta</div>
                          {looseNotebooks.map(notebook => (
                            <NotebookItem
                              key={notebook.id}
                              notebook={notebook}
                              isSelected={selectedNotebook?.id === notebook.id}
                              onSelect={() => setSelectedNotebook(notebook)}
                              onEdit={(name) => {
                                setEditingNotebookId(notebook.id);
                                setEditNotebookName(name);
                              }}
                              onDelete={() => handleDeleteNotebook(notebook.id)}
                            />
                          ))}
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setNewNotebookFolder(null);
                          setIsCreatingNotebook(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Caderno Avulso
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Right: Editor */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {selectedNotebook ? selectedNotebook.name : 'Selecione um caderno'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedNotebook ? (
                        <>
                          <Textarea
                            value={localContent}
                            onChange={(e) => handleContentChange(e.target.value)}
                            className="min-h-[400px] font-mono text-sm"
                            placeholder="Escreva suas anotações aqui..."
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{localContent.length} caracteres</span>
                            <span>{localContent.split('\n').length} linhas</span>
                          </div>
                          <Button
                            onClick={handleSaveNow}
                            disabled={!hasUnsavedChanges}
                            className="w-full"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {hasUnsavedChanges ? 'Salvar Agora' : 'Tudo Salvo'}
                          </Button>
                        </>
                      ) : (
                        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <Book className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>Selecione ou crie um caderno</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-6">
            <Button onClick={generatePDF} variant="outline" className="w-full">
              <FileDown className="w-4 h-4 mr-2" />
              Exportar Todos para PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Notebook Dialog */}
      <Dialog open={isCreatingNotebook} onOpenChange={setIsCreatingNotebook}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Caderno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do Caderno</Label>
              <Input
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                placeholder="Ex: Anemia - Casos Clínicos"
              />
            </div>
            <Button onClick={handleCreateNotebook} className="w-full">
              Criar Caderno
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Notebook Dialog */}
      <Dialog open={editingNotebookId !== null} onOpenChange={(open) => !open && setEditingNotebookId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Caderno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={editNotebookName}
              onChange={(e) => setEditNotebookName(e.target.value)}
            />
            <Button onClick={handleUpdateNotebookName} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Subcomponent for notebook item
function NotebookItem({
  notebook,
  isSelected,
  onSelect,
  onEdit,
  onDelete
}: {
  notebook: NotebookEntry;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: (name: string) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded cursor-pointer ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
        }`}
    >
      <button onClick={onSelect} className="flex items-center gap-2 flex-1 text-left">
        <Book className="w-3 h-3" />
        <span className="text-sm truncate">{notebook.name}</span>
      </button>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(notebook.name);
            }}
          >
            <Edit className="w-3 h-3" />
          </Button>
        </DialogTrigger>
      </Dialog>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
            <Trash2 className="w-3 h-3 text-destructive" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir caderno?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
