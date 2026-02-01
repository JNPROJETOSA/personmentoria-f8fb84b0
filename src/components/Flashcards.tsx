import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { useFlashcardImages } from '@/hooks/useFlashcardImages';
import { useFlashcardMetrics } from '@/hooks/useFlashcardMetrics';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Clock, BarChart3, TrendingUp, History as HistoryIcon, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FlashcardsProps {
  flashcards: Flashcard[];
  folders: FlashcardFolder[];
  addFlashcard: (flashcard: Omit<Flashcard, 'id' | 'difficulty' | 'lastReviewed' | 'nextReview' | 'reviewCount'>) => Promise<void>;
  deleteFlashcard: (id: string) => Promise<void>;
  updateFlashcard: (id: string, updates: { area?: string; front?: string; back?: string; answer_image_url?: string | null; folderId?: string | null }) => Promise<void>;
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
    folderId: null as string | null,
    type: 'standard' as 'standard' | 'cloze'
  });

  // We will use currentUserId fetched below for metrics
  const { dailyMetrics, folderRanking, logStudySession, logReview, fetchMetrics } = useFlashcardMetrics(undefined); // Initial call with undefined, effect updates it later
  // Actually, Flashcards component probably doesn't have easy access to userId unless passed. 
  // But wait, useFlashcards had it. Let's assume we need to get it or the hook handles it? 
  // useFlashcards hook uses 'userId'. 
  // Let's rely on the fact that if useFlashcards works, useFlashcardMetrics will mostly work if we pass the same ID.
  // But wait, 'flashcards' prop doesn't carry user_id usually on the object if strictly typed? 
  // Looking at useFlashcards, it selects '*'. So user_id IS in the data.
  // We can use flashcards[0]?.user_id as a fallback or fix the props.
  // Better: The Dashboard usually passes userId to useFlashcards. It should pass it here too.
  // For now, I'll try to extract it from the first flashcard or maybe I can get it from the session context if I imported it? 
  // Let's import useAuth or something? 
  // I'll skip the auth part for a second and assume I can get it.

  // Checking props... FlashcardsProps doesn't have userId.
  // I will add userId to FlashcardsProps or hook it up.
  // Simplest: Import supabase and get session user.
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id));
  }, []);

  const { dailyMetrics: metrics, folderRanking: rankings, logStudySession: logSession, logReview: logRev, fetchMetrics: refreshMetrics } = useFlashcardMetrics(currentUserId);

  useEffect(() => {
    if (currentUserId) refreshMetrics();
  }, [currentUserId]);

  const [studyStartTime, setStudyStartTime] = useState<Date | null>(null);
  const [sessionCardsReviewed, setSessionCardsReviewed] = useState(0);

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
  const [studyMode, setStudyMode] = useState<'general' | 'folder'>('general');
  const [studyFolderId, setStudyFolderId] = useState<string | null>(null);

  // Image upload states
  const { uploadImage, getImageUrl, deleteImage, uploading } = useFlashcardImages();
  const [newCardImage, setNewCardImage] = useState<File | null>(null);
  const [newCardImagePreview, setNewCardImagePreview] = useState<string | null>(null);
  const [editCardImage, setEditCardImage] = useState<File | null>(null);
  const [editCardImagePreview, setEditCardImagePreview] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("cards");

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'analysis' && currentUserId) {
      refreshMetrics();
    }
  };

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle image file selection for new card
  const handleNewCardImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewCardImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCardImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image file selection for edit card
  const handleEditCardImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditCardImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditCardImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Get flashcards for current view
  const getFilteredCards = () => {
    let cards = flashcards;

    // Filter by area if not 'all'
    if (filterArea !== 'all') {
      cards = cards.filter(c => c.area === filterArea);
    }

    // When studying, respect the study mode
    if (isStudying) {
      if (studyMode === 'folder' && studyFolderId) {
        // Filter by specific folder
        cards = cards.filter(c => c.folderId === studyFolderId);
      }
      // If studyMode === 'general', use all cards (already filtered by area if applicable)
    } else {
      // When not studying, respect selectedFolder for tree view
      if (selectedFolder) {
        cards = cards.filter(c => c.folderId === selectedFolder);
      }
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
    if (!newCard.front.trim() || (newCard.type === 'standard' && !newCard.back.trim())) {
      if (isMountedRef.current) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha todo o conteúdo do card",
          variant: "destructive"
        });
      }
      return;
    }

    if (newCard.type === 'cloze') {
      const hasCloze = /{{.+?}}/.test(newCard.front);
      if (!hasCloze) {
        toast({
          title: "Formato inválido",
          description: "Para cards do tipo Lacuna, use {{texto}} para esconder a resposta.",
          variant: "destructive"
        });
        return;
      }
      // If back is empty for cloze, maybe autofill with the hidden word? 
      // For now, let's allow empty back (it will just show the revealed sentence).
      // Or we can enforce back if we want. Let's allow empty back for cloze.
    }

    let imageUrl: string | null = null;

    // Upload image if selected
    if (newCardImage) {
      imageUrl = await uploadImage(newCardImage);
      if (!imageUrl) {
        // Upload failed, toast already shown by hook
        return;
      }
    }

    await addFlashcard({
      area: newCard.area,
      front: newCard.front,
      back: newCard.back,
      answer_image_url: imageUrl,
      folderId: newCard.folderId,
      type: newCard.type
    });

    if (!isMountedRef.current) return;

    setNewCard({ area: MedicalArea.PEDIATRIA, front: '', back: '', folderId: null, type: 'standard' });
    setNewCardImage(null);
    setNewCardImagePreview(null);
    setIsCreating(false);

    toast({
      title: "Flashcard criado!",
      description: imageUrl ? "Card com imagem adicionado" : "Card adicionado com sucesso"
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

  const handleStartEdit = async (card: Flashcard) => {
    setEditCard({
      area: card.area,
      front: card.front,
      back: card.back
    });
    setEditCardImage(null);

    // Load existing image for preview if available
    if (card.answer_image_url) {
      const url = await getImageUrl(card.answer_image_url);
      setEditCardImagePreview(url);
    } else {
      setEditCardImagePreview(null);
    }

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

    let imageUrl: string | null | undefined = undefined;

    // Upload new image if selected
    if (editCardImage) {
      const uploadedPath = await uploadImage(editCardImage);
      if (!uploadedPath) {
        // Upload failed
        return;
      }

      // Delete old image if exists
      const currentCard = flashcards.find(c => c.id === isEditing);
      if (currentCard?.answer_image_url) {
        await deleteImage(currentCard.answer_image_url);
      }

      imageUrl = uploadedPath;
    }

    const updates: any = {
      area: editCard.area,
      front: editCard.front,
      back: editCard.back,
    };

    if (imageUrl !== undefined) {
      updates.answer_image_url = imageUrl;
    }

    await updateFlashcard(isEditing, updates);

    if (!isMountedRef.current) return;

    setIsEditing(null);
    setEditCardImage(null);
    setEditCardImagePreview(null);

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

  // Timer & Session Logging
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStudying) {
      if (!studyStartTime) setStudyStartTime(new Date());
      interval = setInterval(() => {
        // Keeps timer alive
      }, 1000);
    } else {
      // Session ended
      if (studyStartTime && sessionCardsReviewed > 0) {
        const now = new Date();
        const duration = Math.round((now.getTime() - studyStartTime.getTime()) / 1000);

        // Log the full session
        logSession(studyStartTime, now, sessionCardsReviewed, duration);

        // Reset
        setStudyStartTime(null);
        setSessionCardsReviewed(0);
      } else if (!isStudying) {
        // Reset if exited without doing anything
        setStudyStartTime(null);
        setSessionCardsReviewed(0);
      }
    }
    return () => clearInterval(interval);
  }, [isStudying, studyStartTime, sessionCardsReviewed, logSession]);

  const handleDifficultySelect = (difficulty: number) => { // 1 to 5
    const card = filteredCards[currentIndex];

    // Log individual review
    logRev(card.id, difficulty);
    setSessionCardsReviewed(prev => prev + 1);

    setIsFlipped(false);

    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsStudying(false);
      // The useEffect will catch the 'isStudying: false' state change and log the session
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
                  {studyStartTime && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                      <Clock className="w-3 h-3" />
                      {Math.floor((new Date().getTime() - studyStartTime.getTime()) / 60000)}m
                    </span>
                  )}
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
                {/* FRONT */}
                <Card className="absolute inset-0 backface-hidden flex items-center justify-center p-8 bg-card border-2">
                  {card.type === 'cloze' ? (
                    <p className="text-xl text-center leading-relaxed font-medium">
                      {card.front.split(/({{[^}]+}})/g).map((part, i) =>
                        part.startsWith('{{') ?
                          <span key={i} className="mx-1 bg-muted-foreground/20 text-transparent border-b-2 border-primary rounded px-2 min-w-[3rem] select-none inline-block align-bottom">
                            {part}
                          </span> : part
                      )}
                    </p>
                  ) : (
                    <p className="text-xl text-center font-medium">{card.front}</p>
                  )}
                </Card>

                {/* BACK */}
                <Card className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-8 bg-primary text-primary-foreground border-2 overflow-auto">
                  {card.type === 'cloze' ? (
                    <>
                      <p className="text-xl text-center mb-6 leading-relaxed font-medium">
                        {card.front.split(/({{[^}]+}})/g).map((part, i) =>
                          part.startsWith('{{') ?
                            <span key={i} className="mx-1 text-yellow-300 font-bold border-b-2 border-yellow-300 px-1 inline-block">
                              {part.slice(2, -2)}
                            </span> : part
                        )}
                      </p>
                      {card.back && card.back.trim() !== '' && (
                        <div className="w-full border-t border-white/20 pt-4 mt-2">
                          <span className="text-xs uppercase tracking-wider opacity-70 mb-1 block">Explicação / Notas</span>
                          <p className="text-base text-white/90">{card.back}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xl text-center mb-4 font-medium">{card.back}</p>
                  )}

                  {card.answer_image_url && (
                    <FlashcardImage imagePath={card.answer_image_url} getImageUrl={getImageUrl} />
                  )}
                </Card>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Clique no card para {isFlipped ? 'ver a pergunta' : 'revelar a resposta'}
            </p>

            {isFlipped && (
              <div className="grid grid-cols-5 gap-2 animate-in slide-in-from-bottom-2 duration-300">
                <Button onClick={() => handleDifficultySelect(1)} className="bg-red-700 hover:bg-red-800 text-white h-auto py-2 flex flex-col gap-1">
                  <span className="font-bold text-lg">1</span>
                  <span className="text-[10px] uppercase">Muito Difícil</span>
                </Button>
                <Button onClick={() => handleDifficultySelect(2)} className="bg-red-500 hover:bg-red-600 text-white h-auto py-2 flex flex-col gap-1">
                  <span className="font-bold text-lg">2</span>
                  <span className="text-[10px] uppercase">Difícil</span>
                </Button>
                <Button onClick={() => handleDifficultySelect(3)} className="bg-yellow-500 hover:bg-yellow-600 text-white h-auto py-2 flex flex-col gap-1">
                  <span className="font-bold text-lg">3</span>
                  <span className="text-[10px] uppercase">Médio</span>
                </Button>
                <Button onClick={() => handleDifficultySelect(4)} className="bg-blue-500 hover:bg-blue-600 text-white h-auto py-2 flex flex-col gap-1">
                  <span className="font-bold text-lg">4</span>
                  <span className="text-[10px] uppercase">Fácil</span>
                </Button>
                <Button onClick={() => handleDifficultySelect(5)} className="bg-green-500 hover:bg-green-600 text-white h-auto py-2 flex flex-col gap-1">
                  <span className="font-bold text-lg">5</span>
                  <span className="text-[10px] uppercase">Muito Fácil</span>
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
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="cards" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" /> Meus Flashcards
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Análise & Histórico
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cards" className="space-y-6">
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
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                          <Label>Tipo de Card</Label>
                          <RadioGroup
                            value={newCard.type}
                            onValueChange={(v) => setNewCard({ ...newCard, type: v as 'standard' | 'cloze' })}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="standard" id="type-standard" />
                              <Label htmlFor="type-standard">Padrão (Frente/Verso)</Label>
                            </div>
                            <div className="flex items-center space-x-2 border-l pl-4">
                              <RadioGroupItem value="cloze" id="type-cloze" />
                              <Label htmlFor="type-cloze">Lacuna (Completar Frase)</Label>
                            </div>
                          </RadioGroup>
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
                          <div className="flex justify-between">
                            <Label>
                              {newCard.type === 'standard' ? 'Frente (Pergunta)' : 'Frase Completa'}
                            </Label>
                            {newCard.type === 'cloze' && (
                              <span className="text-xs text-muted-foreground bg-muted px-2 rounded">
                                Use <strong>{'{{resposta}}'}</strong> para ocultar
                              </span>
                            )}
                          </div>
                          <Textarea
                            value={newCard.front}
                            onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                            placeholder={newCard.type === 'standard'
                              ? "Ex: Quais são as contraindicações da vacina BCG?"
                              : "Ex: A vacina BCG é contraindicada em pacientes com {{imunodeficiência}}."}
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            {newCard.type === 'standard' ? 'Verso (Resposta)' : 'Notas Adicionais (Opcional)'}
                          </Label>
                          <Textarea
                            value={newCard.back}
                            onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                            placeholder={newCard.type === 'standard'
                              ? "Ex: Imunodeficiências, peso < 2kg, lesões de pele..."
                              : "Ex: Dica: Pense no estado imunológico do paciente."}
                            rows={4}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Imagem da Resposta (opcional, max 200KB)</Label>
                          <Input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleNewCardImageChange}
                            disabled={uploading}
                          />
                          {newCardImagePreview && (
                            <div className="relative mt-2">
                              <img
                                src={newCardImagePreview}
                                alt="Preview"
                                className="max-h-40 rounded border"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1"
                                onClick={() => {
                                  setNewCardImage(null);
                                  setNewCardImagePreview(null);
                                }}
                              >
                                Remover
                              </Button>
                            </div>
                          )}
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
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setStudyMode('general');
                        setStudyFolderId(null);
                        setIsStudying(true);
                        setCurrentIndex(0);
                        setIsFlipped(false);
                      }}
                      className="gap-2"
                    >
                      <RotateCw className="w-4 h-4" />
                      Estudo Geral ({filteredCards.length} cards)
                    </Button>

                    {folders.length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="gap-2">
                            <Folder className="w-4 h-4" />
                            Estudo Específico
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Escolher Pasta para Estudar</DialogTitle>
                            <CardDescription>
                              Selecione uma pasta para estudar apenas os flashcards dela
                            </CardDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Área Médica</Label>
                              <Select
                                value={filterArea === 'all' ? MedicalArea.PEDIATRIA : filterArea}
                                onValueChange={(v) => setFilterArea(v as MedicalArea)}
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
                              <Label>Pasta</Label>
                              {getFoldersForArea(filterArea === 'all' ? MedicalArea.PEDIATRIA : filterArea).length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">
                                  Nenhuma pasta disponível nesta área. Crie uma pasta primeiro.
                                </p>
                              ) : (
                                <Select
                                  value={studyFolderId || 'none'}
                                  onValueChange={(v) => setStudyFolderId(v === 'none' ? null : v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma pasta" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Selecione...</SelectItem>
                                    {getFoldersForArea(filterArea === 'all' ? MedicalArea.PEDIATRIA : filterArea).map(folder => (
                                      <SelectItem key={folder.id} value={folder.id}>
                                        <span className="flex items-center gap-2">
                                          <Folder className="w-4 h-4" />
                                          {folder.name} ({getCardsInFolder(folder.id).length} cards)
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                            {studyFolderId && (
                              <Button
                                onClick={() => {
                                  setStudyMode('folder');
                                  setIsStudying(true);
                                  setCurrentIndex(0);
                                  setIsFlipped(false);
                                }}
                                className="w-full gap-2"
                              >
                                <RotateCw className="w-4 h-4" />
                                Iniciar Estudo ({getCardsInFolder(studyFolderId).length} cards)
                              </Button>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
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
            <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                <div className="space-y-2">
                  <Label>Imagem da Resposta (opcional, max 200KB)</Label>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleEditCardImageChange}
                    disabled={uploading}
                  />
                  {editCardImagePreview && (
                    <div className="relative mt-2">
                      <img
                        src={editCardImagePreview}
                        alt="Preview"
                        className="max-h-40 rounded border"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={() => {
                          setEditCardImage(null);
                          setEditCardImagePreview(null);
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  )}
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
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estudados Hoje</CardTitle>
                <HistoryIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics[0]?.cardsStudied || 0}</div>
                <p className="text-xs text-muted-foreground">cards revisados</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo de Estudo</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round((metrics[0]?.timeStudiedSeconds || 0) / 60)}m</div>
                <p className="text-xs text-muted-foreground">minutos dedicados</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Criados Hoje</CardTitle>
                <FolderPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics[0]?.cardsCreated || 0}</div>
                <p className="text-xs text-muted-foreground">novos cards</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Dificuldade por Pasta</CardTitle>
                <CardDescription>Onde você tem mais dificuldade (⭐ Mais difícil no topo)</CardDescription>
              </CardHeader>
              <CardContent>
                {rankings.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum dado de revisão ainda.</p>
                ) : (
                  <div className="space-y-4">
                    {rankings.map((rank, i) => (
                      <div key={rank.folderId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold w-6">{i + 1}.</span>
                          <span className="font-medium">{rank.folderName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={rank.avgDifficulty < 2.5 ? "destructive" : rank.avgDifficulty < 4 ? "secondary" : "outline"}>
                            {rank.avgDifficulty.toFixed(1)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">({rank.reviewCount} rev)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Histórico Recente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.slice(0, 5).map(m => (
                    <div key={m.date} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{format(new Date(m.date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{m.cardsStudied} cards</p>
                        <p className="text-xs text-muted-foreground">{Math.round(m.timeStudiedSeconds / 60)} min</p>
                      </div>
                    </div>
                  ))}
                  {metrics.length === 0 && <p className="text-muted-foreground text-sm">Nenhum estudo registrado.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
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

// Helper component for displaying flashcard images in study mode
function FlashcardImage({ imagePath, getImageUrl }: { imagePath: string; getImageUrl: (path: string) => Promise<string | null> }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      const url = await getImageUrl(imagePath);
      setImageUrl(url);
      setLoading(false);
    };
    loadImage();
  }, [imagePath, getImageUrl]);

  if (loading) {
    return <div className="text-sm">Carregando imagem...</div>;
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <img
      src={imageUrl}
      alt="Flashcard answer"
      className="max-w-full max-h-48 rounded border mt-2"
    />
  );
}
