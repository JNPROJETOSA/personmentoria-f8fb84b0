import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Layers, Sparkles, Clock, RotateCw, Play, Eye } from 'lucide-react';
import type { DeckStats } from '@/hooks/useSRS';

interface DeckCardProps {
  name: string;
  stats: DeckStats;
  onStudy: () => void;
  onFreeStudy: () => void;
  onManage?: () => void;
  isFolder?: boolean;
}

export default function DeckCard({ name, stats, onStudy, onFreeStudy, onManage, isFolder }: DeckCardProps) {
  const hasWork = stats.newCount > 0 || stats.learningCount > 0 || stats.dueCount > 0;
  const totalDue = stats.newCount + stats.learningCount + stats.dueCount;

  return (
    <Card className={`group transition-all duration-200 hover:shadow-md ${hasWork ? 'border-primary/30' : 'border-muted'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left: icon + name + total */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`p-2 rounded-lg ${hasWork ? 'bg-primary/10' : 'bg-muted'}`}>
              {isFolder 
                ? <Layers className={`w-5 h-5 ${hasWork ? 'text-primary' : 'text-muted-foreground'}`} />
                : <BookOpen className={`w-5 h-5 ${hasWork ? 'text-primary' : 'text-muted-foreground'}`} />
              }
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate">{name}</h3>
              <p className="text-xs text-muted-foreground">
                {stats.total} card{stats.total !== 1 ? 's' : ''}
                {!hasWork && stats.total > 0 && <span className="text-green-600 font-medium ml-1.5">• Tudo em dia!</span>}
              </p>
            </div>
          </div>

          {/* Center: badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            {stats.newCount > 0 && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs px-1.5 py-0.5 gap-1">
                <Sparkles className="w-3 h-3" />
                {stats.newCount}
              </Badge>
            )}
            {stats.learningCount > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs px-1.5 py-0.5 gap-1">
                <Clock className="w-3 h-3" />
                {stats.learningCount}
              </Badge>
            )}
            {stats.dueCount > 0 && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs px-1.5 py-0.5 gap-1">
                <RotateCw className="w-3 h-3" />
                {stats.dueCount}
              </Badge>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {onManage && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onManage}
                title="Ver e gerenciar flashcards deste baralho"
                className="gap-1 px-2 text-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ver cards</span>
              </Button>
            )}
            {hasWork ? (
              <>
                <Button 
                  size="sm" 
                  onClick={onStudy}
                  className="gap-1"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Revisar ({totalDue})
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={onFreeStudy}
                  title="Estudo Livre (não altera agendamento)"
                  className="gap-1"
                >
                  <Play className="w-3.5 h-3.5" />
                  Livre
                </Button>
              </>
            ) : (
              <Button 
                size="sm" 
                variant="outline"
                onClick={onFreeStudy}
                disabled={stats.total === 0}
                className="gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                Estudo Livre ({stats.total})
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
