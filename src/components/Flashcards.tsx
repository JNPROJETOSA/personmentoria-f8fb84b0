import { useState } from 'react';
import { Plus, Trash2, Edit, RotateCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Flashcard, MedicalArea } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

interface FlashcardsProps {
  flashcards: Flashcard[];
  setFlashcards: (flashcards: Flashcard[]) => void;
}

export default function Flashcards({ flashcards, setFlashcards }: FlashcardsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isStudying, setIsStudying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterArea, setFilterArea] = useState<MedicalArea | 'all'>('all');
  
  const [newCard, setNewCard] = useState({
    area: MedicalArea.PEDIATRIA,
    front: '',
    back: ''
  });

  const filteredCards = filterArea === 'all' 
    ? flashcards 
    : flashcards.filter(c => c.area === filterArea);

  const handleCreate = () => {
    if (!newCard.front.trim() || !newCard.back.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a frente e o verso do card",
        variant: "destructive"
      });
      return;
    }

    const card: Flashcard = {
      id: Date.now().toString(),
      area: newCard.area,
      front: newCard.front,
      back: newCard.back,
      difficulty: null,
      lastReviewed: null,
      nextReview: null,
      reviewCount: 0
    };

    setFlashcards([...flashcards, card]);
    setNewCard({ area: MedicalArea.PEDIATRIA, front: '', back: '' });
    setIsCreating(false);
    
    toast({
      title: "Flashcard criado!",
      description: "Card adicionado com sucesso"
    });
  };

  const handleDifficultySelect = (difficulty: 'easy' | 'medium' | 'hard') => {
    const card = filteredCards[currentIndex];
    const intervals = { easy: 7, medium: 3, hard: 1 };
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + intervals[difficulty]);

    const updated = flashcards.map(c =>
      c.id === card.id
        ? {
            ...c,
            difficulty,
            lastReviewed: new Date().toISOString().split('T')[0],
            nextReview: nextReview.toISOString().split('T')[0],
            reviewCount: c.reviewCount + 1
          }
        : c
    );

    setFlashcards(updated);
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

  const handleDelete = (id: string) => {
    setFlashcards(flashcards.filter(c => c.id !== id));
    toast({ title: "Card excluído" });
  };

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Flashcards</CardTitle>
              <CardDescription>Sistema de memorização ativa</CardDescription>
            </div>
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
                    <Select value={newCard.area} onValueChange={(v) => setNewCard({ ...newCard, area: v as MedicalArea })}>
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
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <Select value={filterArea} onValueChange={(v) => setFilterArea(v as any)}>
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
            
            {filteredCards.length > 0 && (
              <Button onClick={() => { setIsStudying(true); setCurrentIndex(0); setIsFlipped(false); }}>
                <RotateCw className="w-4 h-4 mr-2" />
                Iniciar Estudo ({filteredCards.length} cards)
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCards.map(card => (
              <Card key={card.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardDescription className="text-xs">{card.area}</CardDescription>
                      <CardTitle className="text-sm mt-1 line-clamp-2">{card.front}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(card.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">{card.back}</p>
                  {card.reviewCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Revisado {card.reviewCount}x
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCards.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum flashcard encontrado.</p>
              <p className="text-sm mt-2">Crie seu primeiro card para começar!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
