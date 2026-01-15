import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Edit, RotateCw, FolderPlus, Folder, FolderOpen, MoveRight, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Flashcard, MedicalArea } from '@/lib/types';
import { FlashcardFolder } from '@/hooks/useFlashcardFolders';
import { toast } from '@/hooks/use-toast';

interface FlashcardsProps {
  flashcards: Flashcard[];
  folders: FlashcardFolder[];
  addFlashcard: (flashcard: Omit<Flashcard, 'id' | 'difficulty' | 'lastReviewed' | 'nextReview' | 'reviewCount'>) => Promise<void>;
  deleteFlashcard: (id: string) => Promise<void>;
  updateFlashcard: (id: string, updates: { area?: string; front?: string; back?: string; folderId?: string | null }) => Promise<void>;
  addFolder: (folder: { area: MedicalArea; name: string }) => Promise<FlashcardFolder | null>;
  updateFolder: (id: string, updates: { name?: string }) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
}

export default function Flashcards({ 
  flashcards, 
  folders, 
  addFlashcard, 
  deleteFlashcard, 
  updateFlashcard,
  addFolder,
  updateFolder,
  deleteFolder
}: FlashcardsProps) {
  const isMountedRef = useRef(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isEditingFolder, setIsEditingFolder] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState<string | null>(null);
  const [isStudying, setIsStudying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterArea, setFilterArea] = useState<MedicalArea | 'all'>('all');
  const [expandedAreas, setExpandedAreas] = useState<Set<MedicalArea>>(new Set(Object.values(MedicalArea)));
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  
  const [newCard, setNewCard] = useState({
    area: MedicalArea.PEDIATRIA,
    front: '',
    back: '',
    folderId: null as string | null
  });

  const [editCard, setEditCard] = useState({
    area: MedicalArea.PEDIATRIA,
    front: '',
    back: ''
  });

  const [newFolder, setNewFolder] = useState({
    area: MedicalArea.PEDIATRIA,
    name: ''
  });

  const [editFolderName, setEditFolderName] = useState('');
  const [moveTargetFolder, setMoveTargetFolder] = useState<string | 'none'>('none');

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Get flashcards for current view
  const getFilteredCards = () => {
    let cards = flashcards;
    
    if (filterArea !== 'all') {
      cards = cards.filter(c => c.area === filterArea);
    }
    
    if (selectedFolder) {
      cards = cards.filter(c => c.folderId === selectedFolder);
    }
    
    return cards;
  };

  const filteredCards = getFilteredCards();

  // Get cards without folder for an area
  const getLooseCards = (area: MedicalArea) => {
    return flashcards.filter(c => c.area === area && !c.folderId);
  };

  // Get cards in a folder
  const getCardsInFolder = (folderId: string) => {
    return flashcards.filter(c => c.folderId === folderId);
  };

  // Get folders for an area
  const getFoldersForArea = (area: MedicalArea) => {
    return folders.filter(f => f.area === area);
  };

  const toggleArea = (area: MedicalArea) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(area)) {
      newExpanded.delete(area);
    } else {
      newExpanded.add(area);
    }
    setExpandedAreas(newExpanded);
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

  const handleCreate = async () => {
    if (!newCard.front.trim() || !newCard.back.trim()) {
      if (isMountedRef.current) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha a frente e o verso do card",
          variant: "destructive"
        });
      }
      return;
    }

    await addFlashcard({
      area: newCard.area,
      front: newCard.front,
      back: newCard.back,
      folderId: newCard.folderId
    });

    if (!isMountedRef.current) return;

    setNewCard({ area: MedicalArea.PEDIATRIA, front: '', back: '', folderId: null });
    setIsCreating(false);
    
    toast({
      title: "Flashcard criado!",
      description: "Card adicionado com sucesso"
    });
  };

  const handleCreateFolder = async () => {
    if (!newFolder.name.trim()) {
      if (isMountedRef.current) {
        toast({
          title: "Nome obrigatório",
          description: "Digite um nome para a pasta",
          variant: "destructive"
        });
      }
      return;
    }

    const result = await addFolder({
      area: newFolder.area,
      name: newFolder.name
    });

    if (!isMountedRef.current) return;

    if (result) {
      setNewFolder({ area: MedicalArea.PEDIATRIA, name: '' });
      setIsCreatingFolder(false);
      toast({
        title: "Pasta criada!",
        description: `Pasta "${result.name}" criada em ${result.area}`
      });
    }
  };

  const handleStartEdit = (card: Flashcard) => {
    setEditCard({
      area: card.area,
      front: card.front,
      back: card.back
    });
    setIsEditing(card.id);
  };

  const handleStartEditFolder = (folder: FlashcardFolder) => {
    setEditFolderName(folder.name);
    setIsEditingFolder(folder.id);
  };

  const handleUpdate = async () => {
    if (!isEditing) return;
    
    if (!editCard.front.trim() || !editCard.back.trim()) {
      if (isMountedRef.current) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha a frente e o verso do card",
          variant: "destructive"
        });
      }
      return;
    }

    await updateFlashcard(isEditing, {
      area: editCard.area,
      front: editCard.front,
      back: editCard.back,
    });

    if (!isMountedRef.current) return;

    setIsEditing(null);
    
    toast({
      title: "Flashcard atualizado!",
      description: "Card editado com sucesso"
    });
  };

  const handleUpdateFolder = async () => {
    if (!isEditingFolder || !editFolderName.trim()) return;

    await updateFolder(isEditingFolder, { name: editFolderName });

    if (!isMountedRef.current) return;

    setIsEditingFolder(null);
    toast({
      title: "Pasta renomeada!",
      description: "Nome atualizado com sucesso"
    });
  };

  const handleDelete = async (id: string) => {
    await deleteFlashcard(id);
    if (isMountedRef.current) {
      toast({ title: "Card excluído" });
    }
  };

  const handleDeleteFolder = async (id: string) => {
    // Cards in this folder will have folder_id set to NULL due to ON DELETE SET NULL
    await deleteFolder(id);
    if (isMountedRef.current) {
      toast({ title: "Pasta excluída", description: "Os flashcards foram movidos para fora da pasta" });
    }
  };

  const handleStartMove = (cardId: string, currentFolderId: string | null) => {
    setIsMoving(cardId);
    setMoveTargetFolder(currentFolderId || 'none');
  };

  const handleMoveCard = async () => {
    if (!isMoving) return;

    const targetFolder = moveTargetFolder === 'none' ? null : moveTargetFolder;
    await updateFlashcard(isMoving, { folderId: targetFolder });

    if (!isMountedRef.current) return;

    setIsMoving(null);
    toast({
      title: "Flashcard movido!",
      description: targetFolder ? "Card movido para a pasta" : "Card removido da pasta"
    });
  };

  const handleDifficultySelect = (difficulty: 'easy' | 'medium' | 'hard') => {
    setIsFlipped(false);
    
    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsStudying(false);
      setCurrentIndex(0);
      toast({
        title: "Revisão completa!",
        description: `Você revisou ${filteredCards.length} cards`
      });
    }
  };


  // Study mode
  if (isStudying && filteredCards.length > 0) {
    const card = filteredCards[currentIndex];
    
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Modo Estudo</CardTitle>
                <CardDescription>
                  Card {currentIndex + 1} de {filteredCards.length} • {card.area}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => { setIsStudying(false); setCurrentIndex(0); }}>
                Sair
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div 
              className="relative w-full h-80 cursor-pointer perspective-1000"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                <Card className="absolute inset-0 backface-hidden flex items-center justify-center p-8 bg-card border-2">
                  <p className="text-xl text-center">{card.front}</p>
                </Card>
                <Card className="absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center p-8 bg-primary text-primary-foreground border-2">
                  <p className="text-xl text-center">{card.back}</p>
                </Card>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Clique no card para {isFlipped ? 'ver a pergunta' : 'revelar a resposta'}
            </p>

            {isFlipped && (
              <div className="flex gap-2 justify-center animate-in fade-in duration-300">
                <Button onClick={() => handleDifficultySelect('hard')} variant="destructive">
                  Difícil
                </Button>
                <Button onClick={() => handleDifficultySelect('medium')} variant="secondary">
                  Médio
                </Button>
                <Button onClick={() => handleDifficultySelect('easy')}>
                  Fácil
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get current card for move dialog
  const movingCard = isMoving ? flashcards.find(c => c.id === isMoving) : null;
  const movingCardFolders = movingCard ? folders.filter(f => f.area === movingCard.area) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Flashcards</CardTitle>
              <CardDescription>Sistema de memorização ativa com pastas organizadas por área</CardDescription>
            </div>
            <div className="flex gap-2">
              {/* Create Folder Dialog */}
              <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Nova Pasta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Pasta</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Área Médica</Label>
                      <Select value={newFolder.area} onValueChange={(v) => setNewFolder({ ...newFolder, area: v as MedicalArea })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(MedicalArea).map(area => (
                            <SelectItem key={area} value={area}>{area}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nome da Pasta</Label>
                      <Input
                        value={newFolder.name}
                        onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                        placeholder="Ex: Vacinação, Pneumonia, Cardiopatias..."
                      />
                    </div>
                    <Button onClick={handleCreateFolder} className="w-full">
                      Criar Pasta
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Create Card Dialog */}
              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Card
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Flashcard</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Área Médica</Label>
                      <Select 
                        value={newCard.area} 
                        onValueChange={(v) => setNewCard({ ...newCard, area: v as MedicalArea, folderId: null })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(MedicalArea).map(area => (
                            <SelectItem key={area} value={area}>{area}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pasta (opcional)</Label>
                      <Select 
                        value={newCard.folderId || 'none'} 
                        onValueChange={(v) => setNewCard({ ...newCard, folderId: v === 'none' ? null : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sem pasta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem pasta</SelectItem>
                          {folders.filter(f => f.area === newCard.area).map(folder => (
                            <SelectItem key={folder.id} value={folder.id}>
                              <span className="flex items-center gap-2">
                                <Folder className="w-4 h-4" />
                                {folder.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Frente (Pergunta)</Label>
                      <Textarea
                        value={newCard.front}
                        onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                        placeholder="Ex: Quais são as contraindicações da vacina BCG?"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Verso (Resposta)</Label>
                      <Textarea
                        value={newCard.back}
                        onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                        placeholder="Ex: Imunodeficiências, peso < 2kg, lesões de pele..."
                        rows={4}
                      />
                    </div>
                    <Button onClick={handleCreate} className="w-full">
                      Criar Flashcard
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center flex-wrap">
            <Select value={filterArea} onValueChange={(v) => { setFilterArea(v as any); setSelectedFolder(null); }}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Áreas</SelectItem>
                {Object.values(MedicalArea).map(area => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {flashcards.length > 0 && (
              <Button onClick={() => { setIsStudying(true); setCurrentIndex(0); setIsFlipped(false); setSelectedFolder(null); }}>
                <RotateCw className="w-4 h-4 mr-2" />
                Iniciar Estudo ({filteredCards.length} cards)
              </Button>
            )}
          </div>

          {/* Folder Tree View */}
          <div className="space-y-2">
            {Object.values(MedicalArea).map(area => {
              const areaFolders = getFoldersForArea(area);
              const looseCards = getLooseCards(area);
              const totalCardsInArea = flashcards.filter(c => c.area === area).length;
              
              if (filterArea !== 'all' && filterArea !== area) return null;
              if (totalCardsInArea === 0 && areaFolders.length === 0) return null;

              return (
                <div key={area} className="border rounded-lg overflow-hidden">
                  {/* Area Header */}
                  <div
                    className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => toggleArea(area)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedAreas.has(area) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <span className="font-medium">{area}</span>
                      <span className="text-sm text-muted-foreground">
                        ({totalCardsInArea} cards, {areaFolders.length} pastas)
                      </span>
                    </div>
                  </div>

                  {expandedAreas.has(area) && (
                    <div className="p-2 space-y-2">
                      {/* Folders */}
                      {areaFolders.map(folder => {
                        const folderCards = getCardsInFolder(folder.id);
                        
                        return (
                          <div key={folder.id} className="ml-4">
                            <div
                              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30 cursor-pointer"
                              onClick={() => toggleFolder(folder.id)}
                            >
                              <div className="flex items-center gap-2">
                                {expandedFolders.has(folder.id) ? (
                                  <>
                                    <ChevronDown className="w-4 h-4" />
                                    <FolderOpen className="w-4 h-4 text-primary" />
                                  </>
                                ) : (
                                  <>
                                    <ChevronRight className="w-4 h-4" />
                                    <Folder className="w-4 h-4 text-primary" />
                                  </>
                                )}
                                <span className="font-medium">{folder.name}</span>
                                <span className="text-sm text-muted-foreground">({folderCards.length})</span>
                              </div>
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" onClick={() => handleStartEditFolder(folder)}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="w-3 h-3 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir pasta?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Os flashcards dentro desta pasta não serão excluídos, apenas movidos para fora da pasta.
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
                            </div>

                            {expandedFolders.has(folder.id) && (
                              <div className="ml-8 space-y-1 mt-1">
                                {folderCards.length === 0 ? (
                                  <p className="text-sm text-muted-foreground py-2">Pasta vazia</p>
                                ) : (
                                  folderCards.map(card => (
                                    <FlashcardItem
                                      key={card.id}
                                      card={card}
                                      onEdit={handleStartEdit}
                                      onDelete={handleDelete}
                                      onMove={handleStartMove}
                                    />
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Loose Cards (not in any folder) */}
                      {looseCards.length > 0 && (
                        <div className="ml-4">
                          <div className="text-sm text-muted-foreground py-1 px-2">
                            Sem pasta ({looseCards.length})
                          </div>
                          <div className="ml-6 space-y-1">
                            {looseCards.map(card => (
                              <FlashcardItem
                                key={card.id}
                                card={card}
                                onEdit={handleStartEdit}
                                onDelete={handleDelete}
                                onMove={handleStartMove}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {areaFolders.length === 0 && looseCards.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum flashcard nesta área
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {flashcards.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum flashcard encontrado.</p>
              <p className="text-sm mt-2">Crie seu primeiro card para começar!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Card Dialog */}
      <Dialog open={isEditing !== null} onOpenChange={(open) => !open && setIsEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Flashcard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Área Médica</Label>
              <Select value={editCard.area} onValueChange={(v) => setEditCard({ ...editCard, area: v as MedicalArea })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(MedicalArea).map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frente (Pergunta)</Label>
              <Textarea
                value={editCard.front}
                onChange={(e) => setEditCard({ ...editCard, front: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Verso (Resposta)</Label>
              <Textarea
                value={editCard.back}
                onChange={(e) => setEditCard({ ...editCard, back: e.target.value })}
                rows={4}
              />
            </div>
            <Button onClick={handleUpdate} className="w-full">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={isEditingFolder !== null} onOpenChange={(open) => !open && setIsEditingFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Novo Nome</Label>
              <Input
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
              />
            </div>
            <Button onClick={handleUpdateFolder} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move Card Dialog */}
      <Dialog open={isMoving !== null} onOpenChange={(open) => !open && setIsMoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover Flashcard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selecione a pasta de destino</Label>
              <Select value={moveTargetFolder} onValueChange={setMoveTargetFolder}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem pasta</SelectItem>
                  {movingCardFolders.map(folder => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <span className="flex items-center gap-2">
                        <Folder className="w-4 h-4" />
                        {folder.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {movingCardFolders.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma pasta disponível nesta área. Crie uma pasta primeiro.
                </p>
              )}
            </div>
            <Button onClick={handleMoveCard} className="w-full">
              Mover
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Subcomponent for flashcard item
function FlashcardItem({ 
  card, 
  onEdit, 
  onDelete, 
  onMove 
}: { 
  card: Flashcard; 
  onEdit: (card: Flashcard) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, folderId: string | null) => void;
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-card border hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0 mr-2">
        <p className="text-sm font-medium truncate">{card.front}</p>
        <p className="text-xs text-muted-foreground truncate">{card.back}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => onMove(card.id, card.folderId)}>
          <MoveRight className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(card)}>
          <Edit className="w-3 h-3" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este flashcard?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(card.id)}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
