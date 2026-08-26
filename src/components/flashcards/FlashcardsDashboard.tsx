/**
 * FlashcardsDashboard — Painel principal de flashcards
 * 
 * Exibe resumo do dia, lista de baralhos/pastas com contagens SRS,
 * e ações de criação/edição (reutilizando dialogs existentes).
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, FolderPlus, RotateCw, Sparkles, Clock, Brain, 
  ChevronDown, ChevronRight, Folder, FolderOpen, BookOpen, Flame
} from 'lucide-react';
import DeckCard from './DeckCard';
import type { Flashcard, MedicalArea } from '@/lib/types';
import type { FlashcardFolder } from '@/hooks/useFlashcardFolders';
import type { DeckStats, TodayStats } from '@/hooks/useSRS';
import { useState } from 'react';

interface FlashcardsDashboardProps {
  flashcards: Flashcard[];
  folders: FlashcardFolder[];
  todayStats: TodayStats;
  getDeckStats: (flashcardIds: string[]) => DeckStats;
  onStudyAll: () => void;
  onFreeStudyAll: () => void;
  onStudyFolder: (folderId: string) => void;
  onFreeStudyFolder: (folderId: string) => void;
  onFreeStudyLooseCards: (area: string) => void;
  onCreateCard: () => void;
  onCreateFolder: () => void;
}

export default function FlashcardsDashboard({
  flashcards,
  folders,
  todayStats,
  getDeckStats,
  onStudyAll,
  onFreeStudyAll,
  onStudyFolder,
  onFreeStudyFolder,
  onFreeStudyLooseCards,
  onCreateCard,
  onCreateFolder,
}: FlashcardsDashboardProps) {
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());

  // Global stats
  const allIds = flashcards.map(f => f.id);
  const globalStats = getDeckStats(allIds);
  const totalDue = globalStats.newCount + globalStats.learningCount + globalStats.dueCount;

  // Group folders by area
  const areas = [...new Set(folders.map(f => f.area))].sort();
  // Also include areas that have loose cards
  const areasWithLooseCards = [...new Set(flashcards.filter(f => !f.folderId).map(f => f.area))];
  const allAreas = [...new Set([...areas, ...areasWithLooseCards])].sort();

  const toggleArea = (area: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const getFolderCards = (folderId: string) => flashcards.filter(f => f.folderId === folderId);
  const getLooseCards = (area: string) => flashcards.filter(f => f.area === area && !f.folderId);
  const getAreaFolders = (area: string) => folders.filter(f => f.area === area);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Today's Summary */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary" />
                Resumo de Hoje
              </h2>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  {globalStats.newCount} novos
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  {globalStats.learningCount} aprendendo
                </span>
                <span className="flex items-center gap-1">
                  <RotateCw className="w-3.5 h-3.5 text-green-500" />
                  {globalStats.dueCount} para revisar
                </span>
                <span className="flex items-center gap-1">
                  <Brain className="w-3.5 h-3.5 text-purple-500" />
                  {todayStats.reviewed} revisados hoje
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {totalDue > 0 ? (
                <>
                  <Button 
                    onClick={onStudyAll} 
                    size="lg" 
                    className="gap-2"
                  >
                    <RotateCw className="w-4 h-4" />
                    Revisar Agora ({totalDue})
                  </Button>
                  <Button
                    onClick={onFreeStudyAll}
                    size="lg"
                    variant="outline"
                    className="gap-2"
                  >
                    Estudo Livre Geral
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={onFreeStudyAll} 
                  size="lg" 
                  variant="outline"
                  className="gap-2"
                  disabled={flashcards.length === 0}
                >
                  <RotateCw className="w-4 h-4" />
                  Estudo Livre Geral ({flashcards.length})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Meus Baralhos</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCreateFolder} className="gap-1.5">
            <FolderPlus className="w-4 h-4" />
            Nova Pasta
          </Button>
          <Button size="sm" onClick={onCreateCard} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Novo Card
          </Button>
        </div>
      </div>

      {/* Decks by Area */}
      {allAreas.length === 0 && flashcards.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">Nenhum flashcard encontrado</p>
            <p className="text-sm">Crie seu primeiro card para começar a estudar!</p>
          </CardContent>
        </Card>
      )}

      {allAreas.map(area => {
        const areaFolders = getAreaFolders(area);
        const looseCards = getLooseCards(area);
        const totalInArea = flashcards.filter(f => f.area === area).length;
        const isExpanded = expandedAreas.has(area);

        if (totalInArea === 0 && areaFolders.length === 0) return null;

        return (
          <div key={area} className="space-y-2">
            {/* Area Header */}
            <button
              onClick={() => toggleArea(area)}
              className="flex items-center gap-2 w-full text-left py-2 px-1 hover:bg-muted/50 rounded-md transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-semibold text-sm">{area}</span>
              <Badge variant="secondary" className="text-xs">{totalInArea} cards</Badge>
            </button>

            {isExpanded && (
              <div className="space-y-2 pl-2">
                {/* Folders */}
                {areaFolders.map(folder => {
                  const folderCards = getFolderCards(folder.id);
                  const folderIds = folderCards.map(c => c.id);
                  const stats = getDeckStats(folderIds);

                  return (
                    <DeckCard
                      key={folder.id}
                      name={folder.name}
                      stats={stats}
                      onStudy={() => onStudyFolder(folder.id)}
                      onFreeStudy={() => onFreeStudyFolder(folder.id)}
                      isFolder
                    />
                  );
                })}

                {/* Loose Cards */}
                {looseCards.length > 0 && (
                  <DeckCard
                    name="Sem pasta"
                    stats={getDeckStats(looseCards.map(c => c.id))}
                    onStudy={() => onStudyAll()}
                    onFreeStudy={() => onFreeStudyLooseCards(area)}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
