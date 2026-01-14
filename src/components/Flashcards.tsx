import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Edit, RotateCw, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Flashcard, MedicalArea } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FlashcardsProps {
  flashcards: Flashcard[];
  addFlashcard: (flashcard: Omit<Flashcard, 'id' | 'difficulty' | 'lastReviewed' | 'nextReview' | 'reviewCount'>) => Promise<void>;
  deleteFlashcard: (id: string) => Promise<void>;
  updateFlashcard: (id: string, updates: { area?: string; front?: string; back?: string }) => Promise<void>;
}

export default function Flashcards({ flashcards, addFlashcard, deleteFlashcard, updateFlashcard }: FlashcardsProps) {
  const isMountedRef = useRef(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isStudying, setIsStudying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterArea, setFilterArea] = useState<MedicalArea | 'all'>('all');
  
  const [newCard, setNewCard] = useState({
    area: MedicalArea.PEDIATRIA,
    front: '',
    back: ''
  });

  const [editCard, setEditCard] = useState({
    area: MedicalArea.PEDIATRIA,
    front: '',
    back: ''
  });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const filteredCards = filterArea === 'all' 
    ? flashcards 
    : flashcards.filter(c => c.area === filterArea);

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
    });

    if (!isMountedRef.current) return;

    setNewCard({ area: MedicalArea.PEDIATRIA, front: '', back: '' });
    setIsCreating(false);
    
    toast({
      title: "Flashcard criado!",
      description: "Card adicionado com sucesso"
    });
  };

  const handleStartEdit = (card: Flashcard) => {
    setEditCard({
      area: card.area,
      front: card.front,
      back: card.back
    });
    setIsEditing(card.id);
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

  const handleDelete = async (id: string) => {
    await deleteFlashcard(id);
    if (isMountedRef.current) {
      toast({ title: "Card excluído" });
    }
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

  const handleExportPDF = () => {
    if (flashcards.length === 0) {
      toast({
        title: "Nenhum flashcard",
        description: "Crie flashcards antes de exportar",
        variant: "destructive"
      });
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(20, 184, 166); // brand-teal
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Meus Flashcards', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Exportado em ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 35, { align: 'center' });

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Group flashcards by area
    const groupedByArea = flashcards.reduce((acc, card) => {
      if (!acc[card.area]) acc[card.area] = [];
      acc[card.area].push(card);
      return acc;
    }, {} as Record<string, Flashcard[]>);

    let yPosition = 50;

    Object.entries(groupedByArea).forEach(([area, cards]) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Area header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 184, 166);
      doc.text(area, 14, yPosition);
      yPosition += 8;

      // Table with cards
      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Pergunta (Frente)', 'Resposta (Verso)']],
        body: cards.map((card, idx) => [
          (idx + 1).toString(),
          card.front,
          card.back
        ]),
        headStyles: {
          fillColor: [20, 184, 166],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        bodyStyles: {
          textColor: [50, 50, 50]
        },
        alternateRowStyles: {
          fillColor: [240, 253, 250]
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 80 },
          2: { cellWidth: 80 }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: () => {
          // Footer on each page
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Página ${doc.getNumberOfPages()}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    });

    // Summary at the end
    doc.addPage();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 184, 166);
    doc.text('Resumo', 14, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    let summaryY = 35;
    doc.text(`Total de flashcards: ${flashcards.length}`, 14, summaryY);
    summaryY += 10;
    
    doc.text('Por área:', 14, summaryY);
    summaryY += 8;
    
    Object.entries(groupedByArea).forEach(([area, cards]) => {
      doc.text(`• ${area}: ${cards.length} cards`, 20, summaryY);
      summaryY += 7;
    });

    doc.save('meus-flashcards.pdf');

    toast({
      title: "PDF exportado!",
      description: `${flashcards.length} flashcards exportados com sucesso`
    });
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportPDF} disabled={flashcards.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
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
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEdit(card)}
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir este flashcard? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(card.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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

      {/* Dialog de Edição */}
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
                placeholder="Ex: Quais são as contraindicações da vacina BCG?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Verso (Resposta)</Label>
              <Textarea
                value={editCard.back}
                onChange={(e) => setEditCard({ ...editCard, back: e.target.value })}
                placeholder="Ex: Imunodeficiências, peso < 2kg, lesões de pele..."
                rows={4}
              />
            </div>
            <Button onClick={handleUpdate} className="w-full">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}