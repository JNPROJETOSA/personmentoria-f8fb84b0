/**
 * ManageFlashcardsDialog — Interface para visualizar e gerenciar flashcards existentes
 * 
 * Permite buscar, filtrar por pasta/baralho, editar e excluir cards individualmente.
 * A exclusão solicita confirmação e atualiza os dados em tempo real.
 * Não altera os dados de agendamento FSRS ao visualizar os cards.
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Edit, Trash2, Folder, Sparkles, Clock, RotateCw, FileText } from 'lucide-react';
import type { Flashcard } from '@/lib/types';
import type { FlashcardFolder } from '@/hooks/useFlashcardFolders';
import type { SRSCardData } from '@/lib/fsrs';

interface ManageFlashcardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcards: Flashcard[];
  folders: FlashcardFolder[];
  initialFolderId?: string | null;
  initialArea?: string | null;
  onEditCard: (card: Flashcard) => void;
  onDeleteCard: (cardId: string) => Promise<void>;
  srsMap?: Map<string, SRSCardData>;
  getImageUrl?: (path: string) => Promise<string | null>;
}

// Small helper component to render async preview image
function ImagePreview({ path, getImageUrl }: { path: string; getImageUrl?: (p: string) => Promise<string | null> }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path || !getImageUrl) return;
    if (path.startsWith('http')) {
      setUrl(path);
      return;
    }
    let isMounted = true;
    getImageUrl(path).then(res => {
      if (isMounted) setUrl(res);
    });
    return () => { isMounted = false; };
  }, [path, getImageUrl]);

  if (!url) return null;

  return (
    <div className="mt-2 relative inline-block">
      <img src={url} alt="Preview" className="max-h-24 rounded border object-cover" />
    </div>
  );
}

export default function ManageFlashcardsDialog({
  open,
  onOpenChange,
  flashcards,
  folders,
  initialFolderId,
  initialArea,
  onEditCard,
  onDeleteCard,
  srsMap,
  getImageUrl,
}: ManageFlashcardsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all' | 'none'>('all');
  const [selectedArea, setSelectedArea] = useState<string | 'all'>('all');
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync initial filters when modal opens or initial props change
  useEffect(() => {
    if (open) {
      if (initialFolderId !== undefined && initialFolderId !== null) {
        setSelectedFolderId(initialFolderId);
        const folderObj = folders.find(f => f.id === initialFolderId);
        if (folderObj) setSelectedArea(folderObj.area);
      } else if (initialFolderId === null && initialArea) {
        setSelectedFolderId('none');
        setSelectedArea(initialArea);
      } else if (initialArea) {
        setSelectedArea(initialArea);
        setSelectedFolderId('all');
      } else {
        setSelectedFolderId('all');
        setSelectedArea('all');
      }
      setSearchQuery('');
    }
  }, [open, initialFolderId, initialArea, folders]);

  // List of available areas
  const areas = useMemo(() => {
    const set = new Set<string>();
    folders.forEach(f => set.add(f.area));
    flashcards.forEach(f => set.add(f.area));
    return Array.from(set).sort();
  }, [folders, flashcards]);

  // Folders filtered by selected area
  const availableFolders = useMemo(() => {
    if (selectedArea === 'all') return folders;
    return folders.filter(f => f.area === selectedArea);
  }, [folders, selectedArea]);

  // Filtered flashcards list
  const filteredFlashcards = useMemo(() => {
    return flashcards.filter(card => {
      // Area filter
      if (selectedArea !== 'all' && card.area !== selectedArea) {
        return false;
      }

      // Folder filter
      if (selectedFolderId !== 'all') {
        if (selectedFolderId === 'none') {
          if (card.folderId !== null) return false;
        } else if (card.folderId !== selectedFolderId) {
          return false;
        }
      }

      // Search query filter (front or back text)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchFront = card.front?.toLowerCase().includes(query);
        const matchBack = card.back?.toLowerCase().includes(query);
        if (!matchFront && !matchBack) return false;
      }

      return true;
    });
  }, [flashcards, selectedArea, selectedFolderId, searchQuery]);

  const handleConfirmDelete = async () => {
    if (!deletingCardId) return;
    setIsDeleting(true);
    try {
      await onDeleteCard(deletingCardId);
    } finally {
      setIsDeleting(false);
      setDeletingCardId(null);
    }
  };

  const getSRSBadge = (cardId: string) => {
    if (!srsMap) return null;
    const srs = srsMap.get(cardId);
    if (!srs) return null;

    if (srs.state === 'new') {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs gap-1">
          <Sparkles className="w-3 h-3" /> Novo
        </Badge>
      );
    }
    if (srs.state === 'learning' || srs.state === 'relearning') {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs gap-1">
          <Clock className="w-3 h-3" /> Aprendendo
        </Badge>
      );
    }
    if (srs.state === 'review') {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs gap-1">
          <RotateCw className="w-3 h-3" /> Em Revisão
        </Badge>
      );
    }
    return null;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Gerenciar Flashcards
            </DialogTitle>
            <DialogDescription>
              Visualize, busque, edite ou exclua seus flashcards existentes.
            </DialogDescription>
          </DialogHeader>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 py-4 border-b bg-muted/20 px-1 rounded-md mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por frente ou verso..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2">
              {/* Area filter */}
              <Select value={selectedArea} onValueChange={(val) => { setSelectedArea(val); setSelectedFolderId('all'); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Áreas</SelectItem>
                  {areas.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Folder filter */}
              <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Baralho/Pasta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Pastas</SelectItem>
                  <SelectItem value="none">Sem pasta</SelectItem>
                  {availableFolders.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cards Count Header */}
          <div className="flex items-center justify-between py-2 text-xs text-muted-foreground">
            <span>Mostrando <strong>{filteredFlashcards.length}</strong> de {flashcards.length} cards</span>
          </div>

          {/* Cards List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[300px]">
            {filteredFlashcards.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="font-medium">Nenhum flashcard encontrado</p>
                <p className="text-xs">Tente ajustar a busca ou os filtros de pasta.</p>
              </div>
            ) : (
              filteredFlashcards.map(card => {
                const folder = card.folderId ? folders.find(f => f.id === card.folderId) : null;
                const isCloze = card.type === 'cloze';

                return (
                  <div 
                    key={card.id} 
                    className="p-4 rounded-lg border bg-card hover:border-primary/40 transition-colors space-y-3"
                  >
                    {/* Top line: metadata badges + action buttons */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs font-normal">
                          {card.area}
                        </Badge>
                        {folder ? (
                          <Badge variant="secondary" className="text-xs gap-1 font-medium">
                            <Folder className="w-3 h-3" />
                            {folder.name}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
                            Sem pasta
                          </Badge>
                        )}
                        {isCloze && (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs">
                            Lacuna
                          </Badge>
                        )}
                        {getSRSBadge(card.id)}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            onOpenChange(false);
                            onEditCard(card);
                          }}
                          className="h-8 px-2 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingCardId(card.id)}
                          className="h-8 px-2 text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </Button>
                      </div>
                    </div>

                    {/* Card Content Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t text-sm">
                      {/* Front */}
                      <div className="bg-muted/30 p-2.5 rounded border border-muted/50 space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                          Frente (Pergunta)
                        </span>
                        <p className="whitespace-pre-wrap text-foreground font-medium text-xs sm:text-sm">
                          {card.front}
                        </p>
                        {card.front_image_url && (
                          <ImagePreview path={card.front_image_url} getImageUrl={getImageUrl} />
                        )}
                      </div>

                      {/* Back */}
                      <div className="bg-muted/30 p-2.5 rounded border border-muted/50 space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                          Verso (Resposta)
                        </span>
                        <p className="whitespace-pre-wrap text-muted-foreground text-xs sm:text-sm">
                          {card.back || <span className="italic opacity-60">(Sem resposta)</span>}
                        </p>
                        {card.answer_image_url && (
                          <ImagePreview path={card.answer_image_url} getImageUrl={getImageUrl} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deletingCardId !== null} onOpenChange={(o) => !o && setDeletingCardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Flashcard</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir este flashcard? Esta ação removerá o card e seu histórico de revisão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
