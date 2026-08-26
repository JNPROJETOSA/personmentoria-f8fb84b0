/**
 * Flashcards — Componente orquestrador do módulo de Flashcards
 * 
 * Integra o dashboard, sessão de estudo FSRS, resumo de sessão,
 * e todos os dialogs existentes (criar/editar/mover/excluir cards e pastas).
 * 
 * PRESERVAÇÃO: Todos os dialogs e funcionalidades existentes foram mantidos.
 * A principal mudança é a substituição do estudo simplificado pelo sistema FSRS.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Edit, FolderPlus, Folder, MoveRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Flashcard, MedicalArea } from '@/lib/types';
import { FlashcardFolder } from '@/hooks/useFlashcardFolders';
import { toast } from '@/hooks/use-toast';
import { useFlashcardImages } from '@/hooks/useFlashcardImages';
import { useSRS } from '@/hooks/useSRS';
import { useStudySession } from '@/hooks/useStudySession';
import type { SRSRating } from '@/lib/fsrs';

// Sub-components
import FlashcardsDashboard from './flashcards/FlashcardsDashboard';
import StudySessionComponent from './flashcards/StudySession';
import SessionSummary from './flashcards/SessionSummary';
import ManageFlashcardsDialog from './flashcards/ManageFlashcardsDialog';

interface FlashcardsProps {
  flashcards: Flashcard[];
  folders: FlashcardFolder[];
  addFlashcard: (flashcard: Omit<Flashcard, 'id' | 'difficulty' | 'lastReviewed' | 'nextReview' | 'reviewCount'>) => Promise<void>;
  deleteFlashcard: (id: string) => Promise<void>;
  updateFlashcard: (id: string, updates: { area?: string; front?: string; back?: string; front_image_url?: string | null; answer_image_url?: string | null; folderId?: string | null }) => Promise<void>;
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

  // ─── Auth ─────────────────────────────────────────────────────────
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id));
  }, []);

  // ─── SRS System ───────────────────────────────────────────────────
  const srs = useSRS(currentUserId);
  const session = useStudySession();

  // ─── Dialog States (preserved from original) ──────────────────────
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isEditingFolder, setIsEditingFolder] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState<string | null>(null);
  const [isManaging, setIsManaging] = useState(false);
  const [manageFolderId, setManageFolderId] = useState<string | null | undefined>(undefined);
  const [manageArea, setManageArea] = useState<string | null | undefined>(undefined);

  const handleOpenManageFolder = (folderId: string | null, area?: string) => {
    setManageFolderId(folderId);
    setManageArea(area ?? null);
    setIsManaging(true);
  };

  const handleOpenManageAll = () => {
    setManageFolderId(undefined);
    setManageArea(undefined);
    setIsManaging(true);
  };

  const [newCard, setNewCard] = useState({
    area: MedicalArea.PEDIATRIA,
    front: '',
    back: '',
    folderId: null as string | null,
    type: 'standard' as 'standard' | 'cloze'
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

  // Image states (preserved)
  const { uploadImage, getImageUrl, deleteImage, uploading } = useFlashcardImages();
  const [newCardImage, setNewCardImage] = useState<File | null>(null);
  const [newCardImagePreview, setNewCardImagePreview] = useState<string | null>(null);
  const [newCardFrontImage, setNewCardFrontImage] = useState<File | null>(null);
  const [newCardFrontImagePreview, setNewCardFrontImagePreview] = useState<string | null>(null);
  const [editCardImage, setEditCardImage] = useState<File | null>(null);
  const [editCardImagePreview, setEditCardImagePreview] = useState<string | null>(null);
  const [editCardFrontImage, setEditCardFrontImage] = useState<File | null>(null);
  const [editCardFrontImagePreview, setEditCardFrontImagePreview] = useState<string | null>(null);
  const [removeBackImage, setRemoveBackImage] = useState(false);
  const [removeFrontImage, setRemoveFrontImage] = useState(false);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // ─── Image Handlers (preserved from original) ────────────────────
  const handleNewCardImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewCardImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewCardImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEditCardImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditCardImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setEditCardImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleNewCardFrontImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewCardFrontImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewCardFrontImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEditCardFrontImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditCardFrontImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setEditCardFrontImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ─── CRUD Handlers (preserved logic) ─────────────────────────────

  const handleCreate = async () => {
    if (!newCard.front.trim() || (newCard.type === 'standard' && !newCard.back.trim())) {
      toast({ title: "Campos obrigatórios", description: "Preencha todo o conteúdo do card", variant: "destructive" });
      return;
    }

    if (newCard.type === 'cloze') {
      const hasCloze = /{{.+?}}/.test(newCard.front);
      if (!hasCloze) {
        toast({ title: "Formato inválido", description: "Para cards do tipo Lacuna, use {{texto}} para esconder a resposta.", variant: "destructive" });
        return;
      }
    }

    let imageUrl: string | null = null;
    let frontImageUrl: string | null = null;

    if (newCardFrontImage) {
      frontImageUrl = await uploadImage(newCardFrontImage);
      if (!frontImageUrl) return;
    }

    if (newCardImage) {
      imageUrl = await uploadImage(newCardImage);
      if (!imageUrl) return;
    }

    await addFlashcard({
      area: newCard.area,
      front: newCard.front,
      back: newCard.back,
      front_image_url: frontImageUrl,
      answer_image_url: imageUrl,
      folderId: newCard.folderId,
      type: newCard.type
    });

    if (!isMountedRef.current) return;

    // Initialize SRS for the newly created card
    // The SRS hook will pick it up on next refetch
    setTimeout(() => srs.refetch(), 500);

    setNewCard({ area: MedicalArea.PEDIATRIA, front: '', back: '', folderId: null, type: 'standard' });
    setNewCardImage(null);
    setNewCardImagePreview(null);
    setNewCardFrontImage(null);
    setNewCardFrontImagePreview(null);
    setIsCreating(false);

    toast({ title: "Flashcard criado!", description: "Card adicionado com sucesso" });
  };

  const handleCreateFolder = async () => {
    if (!newFolder.name.trim()) {
      toast({ title: "Nome obrigatório", description: "Digite um nome para a pasta", variant: "destructive" });
      return;
    }

    const result = await addFolder({ area: newFolder.area, name: newFolder.name });

    if (!isMountedRef.current) return;

    if (result) {
      setNewFolder({ area: MedicalArea.PEDIATRIA, name: '' });
      setIsCreatingFolder(false);
      toast({ title: "Pasta criada!", description: `Pasta "${result.name}" criada em ${result.area}` });
    }
  };

  const handleStartEdit = async (card: Flashcard) => {
    setEditCard({ area: card.area, front: card.front, back: card.back });
    setEditCardImage(null);
    setEditCardFrontImage(null);
    setRemoveBackImage(false);
    setRemoveFrontImage(false);

    if (card.answer_image_url) {
      const url = await getImageUrl(card.answer_image_url);
      setEditCardImagePreview(url);
    } else {
      setEditCardImagePreview(null);
    }

    if (card.front_image_url) {
      const url = await getImageUrl(card.front_image_url);
      setEditCardFrontImagePreview(url);
    } else {
      setEditCardFrontImagePreview(null);
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
      toast({ title: "Campos obrigatórios", description: "Preencha a frente e o verso do card", variant: "destructive" });
      return;
    }

    const currentCard = flashcards.find(c => c.id === isEditing);
    let backImageUrl: string | null | undefined = undefined;
    let frontImageUrl: string | null | undefined = undefined;

    if (removeFrontImage && currentCard?.front_image_url) {
      await deleteImage(currentCard.front_image_url);
      frontImageUrl = null;
    } else if (editCardFrontImage) {
      if (currentCard?.front_image_url) await deleteImage(currentCard.front_image_url);
      const uploadedPath = await uploadImage(editCardFrontImage);
      if (!uploadedPath) return;
      frontImageUrl = uploadedPath;
    }

    if (removeBackImage && currentCard?.answer_image_url) {
      await deleteImage(currentCard.answer_image_url);
      backImageUrl = null;
    } else if (editCardImage) {
      if (currentCard?.answer_image_url) await deleteImage(currentCard.answer_image_url);
      const uploadedPath = await uploadImage(editCardImage);
      if (!uploadedPath) return;
      backImageUrl = uploadedPath;
    }

    const updates: any = { area: editCard.area, front: editCard.front, back: editCard.back };
    if (frontImageUrl !== undefined) updates.front_image_url = frontImageUrl;
    if (backImageUrl !== undefined) updates.answer_image_url = backImageUrl;

    await updateFlashcard(isEditing, updates);

    if (!isMountedRef.current) return;

    setIsEditing(null);
    setEditCardImage(null);
    setEditCardImagePreview(null);
    setEditCardFrontImage(null);
    setEditCardFrontImagePreview(null);
    setRemoveBackImage(false);
    setRemoveFrontImage(false);

    toast({ title: "Flashcard atualizado!", description: "Card editado com sucesso" });
  };

  const handleUpdateFolder = async () => {
    if (!isEditingFolder || !editFolderName.trim()) return;
    await updateFolder(isEditingFolder, { name: editFolderName });
    if (!isMountedRef.current) return;
    setIsEditingFolder(null);
    toast({ title: "Pasta renomeada!", description: "Nome atualizado com sucesso" });
  };

  const handleDelete = async (id: string) => {
    await deleteFlashcard(id);
    await srs.refetch();
    if (isMountedRef.current) toast({ title: "Card excluído" });
  };

  const handleDeleteFolder = async (id: string) => {
    await deleteFolder(id);
    if (isMountedRef.current) toast({ title: "Pasta excluída", description: "Os flashcards foram movidos para fora da pasta" });
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
    toast({ title: "Flashcard movido!", description: targetFolder ? "Card movido para a pasta" : "Card removido da pasta" });
  };

  // ─── Study Session Handlers ──────────────────────────────────────

  const handleStudyAll = useCallback(() => {
    const allIds = flashcards.map(f => f.id);
    const queue = srs.getStudyQueue(allIds);
    if (queue.length === 0) {
      toast({ title: "Tudo em dia!", description: "Não há cards para revisar agora." });
      return;
    }
    session.startSession(queue, { isFreeStudy: false });
  }, [flashcards, srs, session]);

  const handleFreeStudyAll = useCallback(() => {
    const allIds = flashcards.map(f => f.id);
    const queue = srs.getFreeStudyQueue(allIds);
    if (queue.length === 0) {
      toast({ title: "Nenhum card", description: "Crie flashcards primeiro para estudar." });
      return;
    }
    session.startSession(queue, { isFreeStudy: true });
  }, [flashcards, srs, session]);

  const handleStudyFolder = useCallback((folderId: string) => {
    const folderCards = flashcards.filter(f => f.folderId === folderId);
    const queue = srs.getStudyQueue(folderCards.map(f => f.id));
    if (queue.length === 0) {
      toast({ title: "Tudo em dia!", description: "Não há cards para revisar nesta pasta." });
      return;
    }
    session.startSession(queue, { isFreeStudy: false });
  }, [flashcards, srs, session]);

  const handleFreeStudyFolder = useCallback((folderId: string) => {
    const folderCards = flashcards.filter(f => f.folderId === folderId);
    const queue = srs.getFreeStudyQueue(folderCards.map(f => f.id));
    if (queue.length === 0) {
      toast({ title: "Pasta vazia", description: "Não há cards nesta pasta para estudar." });
      return;
    }
    session.startSession(queue, { isFreeStudy: true });
  }, [flashcards, srs, session]);

  const handleFreeStudyLooseCards = useCallback((area: string) => {
    const looseCards = flashcards.filter(f => f.area === area && !f.folderId);
    const queue = srs.getFreeStudyQueue(looseCards.map(f => f.id));
    if (queue.length === 0) {
      toast({ title: "Nenhum card", description: "Não há cards sem pasta nesta área." });
      return;
    }
    session.startSession(queue, { isFreeStudy: true });
  }, [flashcards, srs, session]);

  const handleSubmitAnswer = useCallback(async (rating: SRSRating) => {
    const currentItem = session.currentCard;
    if (!currentItem) return;

    if (session.isFreeStudy) {
      // In Free Study mode: DO NOT modify DB SRS state or log official review!
      // Simply advance the session queue
      session.submitAnswer(rating, {
        flashcardId: currentItem.flashcardId,
        srsData: currentItem.srsData,
        priority: 0,
      });
      return;
    }

    // Official SRS Review mode: update DB SRS state and insert review log
    const durationMs = session.getCardDurationMs();
    const updatedCard = await srs.submitReview(currentItem.flashcardId, rating, durationMs);
    
    if (updatedCard) {
      session.submitAnswer(rating, {
        flashcardId: currentItem.flashcardId,
        srsData: updatedCard,
        priority: 0,
      });
    }
  }, [session, srs]);

  // ─── Render ───────────────────────────────────────────────────────

  // Study Session active
  if (session.sessionState === 'studying' || session.sessionState === 'showing_answer') {
    const currentItem = session.currentCard;
    if (!currentItem) return null;

    const flashcard = flashcards.find(f => f.id === currentItem.flashcardId);
    if (!flashcard) return null;

    const folder = flashcard.folderId ? folders.find(f => f.id === flashcard.folderId) : null;

    return (
      <StudySessionComponent
        currentItem={currentItem}
        flashcard={flashcard}
        sessionState={session.sessionState}
        progress={session.progress}
        isFreeStudy={session.isFreeStudy}
        onShowAnswer={session.showAnswer}
        onSubmitAnswer={handleSubmitAnswer}
        onExit={session.endSession}
        deckName={folder?.name ?? flashcard.area}
      />
    );
  }

  // Session completed — show summary
  if (session.sessionState === 'completed' && session.summary) {
    return (
      <SessionSummary
        summary={session.summary}
        onClose={session.resetSession}
      />
    );
  }

  // ─── Main Dashboard + Dialogs ─────────────────────────────────────

  const movingCard = isMoving ? flashcards.find(c => c.id === isMoving) : null;
  const movingCardFolders = movingCard ? folders.filter(f => f.area === movingCard.area) : [];

  return (
    <>
      <FlashcardsDashboard
        flashcards={flashcards}
        folders={folders}
        todayStats={srs.todayStats}
        getDeckStats={srs.getDeckStats}
        onStudyAll={handleStudyAll}
        onFreeStudyAll={handleFreeStudyAll}
        onStudyFolder={handleStudyFolder}
        onFreeStudyFolder={handleFreeStudyFolder}
        onFreeStudyLooseCards={handleFreeStudyLooseCards}
        onCreateCard={() => setIsCreating(true)}
        onCreateFolder={() => setIsCreatingFolder(true)}
        onManageFolder={handleOpenManageFolder}
        onManageAll={handleOpenManageAll}
      />

      {/* ═══ Manage Flashcards Dialog ═══ */}
      <ManageFlashcardsDialog
        open={isManaging}
        onOpenChange={setIsManaging}
        flashcards={flashcards}
        folders={folders}
        initialFolderId={manageFolderId}
        initialArea={manageArea}
        onEditCard={handleStartEdit}
        onDeleteCard={handleDelete}
        srsMap={srs.srsMap}
        getImageUrl={getImageUrl}
      />

      {/* ═══ Create Card Dialog (preserved) ═══ */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Flashcard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Área Médica</Label>
              <Select value={newCard.area} onValueChange={(v) => setNewCard({ ...newCard, area: v as MedicalArea, folderId: null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Select value={newCard.folderId || 'none'} onValueChange={(v) => setNewCard({ ...newCard, folderId: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Sem pasta" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem pasta</SelectItem>
                  {folders.filter(f => f.area === newCard.area).map(folder => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <span className="flex items-center gap-2"><Folder className="w-4 h-4" />{folder.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>{newCard.type === 'standard' ? 'Frente (Pergunta)' : 'Frase Completa'}</Label>
                {newCard.type === 'cloze' && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 rounded">
                    Use <strong>{'{{resposta}}'}</strong> para ocultar
                  </span>
                )}
              </div>
              <Textarea
                value={newCard.front}
                onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                placeholder={newCard.type === 'standard' ? "Ex: Quais são as contraindicações da vacina BCG?" : "Ex: A vacina BCG é contraindicada em pacientes com {{imunodeficiência}}."}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Imagem da Pergunta (opcional, max 200KB)</Label>
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleNewCardFrontImageChange} disabled={uploading} />
              {newCardFrontImagePreview && (
                <div className="relative mt-2">
                  <img src={newCardFrontImagePreview} alt="Preview" className="max-h-40 rounded border" />
                  <Button variant="destructive" size="sm" className="absolute top-1 right-1" onClick={() => { setNewCardFrontImage(null); setNewCardFrontImagePreview(null); }}>Remover</Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{newCard.type === 'standard' ? 'Verso (Resposta)' : 'Notas Adicionais (Opcional)'}</Label>
              <Textarea
                value={newCard.back}
                onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                placeholder={newCard.type === 'standard' ? "Ex: Imunodeficiências, peso < 2kg, lesões de pele..." : "Ex: Dica: Pense no estado imunológico do paciente."}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Imagem da Resposta (opcional, max 200KB)</Label>
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleNewCardImageChange} disabled={uploading} />
              {newCardImagePreview && (
                <div className="relative mt-2">
                  <img src={newCardImagePreview} alt="Preview" className="max-h-40 rounded border" />
                  <Button variant="destructive" size="sm" className="absolute top-1 right-1" onClick={() => { setNewCardImage(null); setNewCardImagePreview(null); }}>Remover</Button>
                </div>
              )}
            </div>

            <Button onClick={handleCreate} className="w-full">Criar Flashcard</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Create Folder Dialog (preserved) ═══ */}
      <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
        <DialogContent>
          <DialogHeader><DialogTitle>Criar Pasta</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Área Médica</Label>
              <Select value={newFolder.area} onValueChange={(v) => setNewFolder({ ...newFolder, area: v as MedicalArea })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(MedicalArea).map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome da Pasta</Label>
              <Input value={newFolder.name} onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })} placeholder="Ex: Vacinação, Pneumonia, Cardiopatias..." />
            </div>
            <Button onClick={handleCreateFolder} className="w-full">Criar Pasta</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Edit Card Dialog (preserved) ═══ */}
      <Dialog open={isEditing !== null} onOpenChange={(open) => !open && setIsEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Flashcard</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Área Médica</Label>
              <Select value={editCard.area} onValueChange={(v) => setEditCard({ ...editCard, area: v as MedicalArea })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(MedicalArea).map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frente (Pergunta)</Label>
              <Textarea value={editCard.front} onChange={(e) => setEditCard({ ...editCard, front: e.target.value })} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Imagem da Pergunta (opcional, max 200KB)</Label>
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleEditCardFrontImageChange} disabled={uploading} />
              {editCardFrontImagePreview && !removeFrontImage && (
                <div className="relative mt-2">
                  <img src={editCardFrontImagePreview} alt="Preview" className="max-h-40 rounded border" />
                  <Button variant="destructive" size="sm" className="absolute top-1 right-1" onClick={() => { setEditCardFrontImage(null); setEditCardFrontImagePreview(null); setRemoveFrontImage(true); }}>Remover</Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Verso (Resposta)</Label>
              <Textarea value={editCard.back} onChange={(e) => setEditCard({ ...editCard, back: e.target.value })} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Imagem da Resposta (opcional, max 200KB)</Label>
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleEditCardImageChange} disabled={uploading} />
              {editCardImagePreview && !removeBackImage && (
                <div className="relative mt-2">
                  <img src={editCardImagePreview} alt="Preview" className="max-h-40 rounded border" />
                  <Button variant="destructive" size="sm" className="absolute top-1 right-1" onClick={() => { setEditCardImage(null); setEditCardImagePreview(null); setRemoveBackImage(true); }}>Remover</Button>
                </div>
              )}
            </div>
            <Button onClick={handleUpdate} className="w-full">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Edit Folder Dialog (preserved) ═══ */}
      <Dialog open={isEditingFolder !== null} onOpenChange={(open) => !open && setIsEditingFolder(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Renomear Pasta</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Novo Nome</Label>
              <Input value={editFolderName} onChange={(e) => setEditFolderName(e.target.value)} />
            </div>
            <Button onClick={handleUpdateFolder} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Move Card Dialog (preserved) ═══ */}
      <Dialog open={isMoving !== null} onOpenChange={(open) => !open && setIsMoving(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mover Flashcard</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selecione a pasta de destino</Label>
              <Select value={moveTargetFolder} onValueChange={setMoveTargetFolder}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem pasta</SelectItem>
                  {movingCardFolders.map(folder => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <span className="flex items-center gap-2"><Folder className="w-4 h-4" />{folder.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {movingCardFolders.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma pasta disponível nesta área.</p>
              )}
            </div>
            <Button onClick={handleMoveCard} className="w-full">Mover</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
