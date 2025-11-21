import { useState } from 'react';
import { Plus, Image as ImageIcon, StickyNote, Trash2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DreamBoardItem } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

interface DreamBoardProps {
  items: DreamBoardItem[];
  setItems: (items: DreamBoardItem[]) => void;
}

export default function DreamBoard({ items, setItems }: DreamBoardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newImage, setNewImage] = useState({ url: '', title: '' });
  const [newNote, setNewNote] = useState({ content: '', title: '' });

  const handleAddImage = () => {
    if (!newImage.url.trim()) {
      toast({
        title: "URL obrigatória",
        description: "Insira a URL da imagem",
        variant: "destructive"
      });
      return;
    }

    const item: DreamBoardItem = {
      id: Date.now().toString(),
      type: 'image',
      content: newImage.url,
      title: newImage.title || 'Imagem',
      createdAt: new Date().toISOString()
    };

    setItems([...items, item]);
    setNewImage({ url: '', title: '' });
    setIsAdding(false);
    toast({ title: "Imagem adicionada ao mural!" });
  };

  const handleAddNote = () => {
    if (!newNote.content.trim()) {
      toast({
        title: "Conteúdo obrigatório",
        description: "Escreva algo na nota",
        variant: "destructive"
      });
      return;
    }

    const item: DreamBoardItem = {
      id: Date.now().toString(),
      type: 'note',
      content: newNote.content,
      title: newNote.title || 'Nota',
      createdAt: new Date().toISOString()
    };

    setItems([...items, item]);
    setNewNote({ content: '', title: '' });
    setIsAdding(false);
    toast({ title: "Nota adicionada ao mural!" });
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(i => i.id !== id));
    toast({ title: "Item removido" });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Mural dos Sonhos</CardTitle>
              <CardDescription>
                Visualize seus objetivos e mantenha a motivação
              </CardDescription>
            </div>
            <Dialog open={isAdding} onOpenChange={setIsAdding}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar ao Mural</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="image" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="image">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Imagem
                    </TabsTrigger>
                    <TabsTrigger value="note">
                      <StickyNote className="w-4 h-4 mr-2" />
                      Nota
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="image" className="space-y-4">
                    <div className="space-y-2">
                      <Label>URL da Imagem</Label>
                      <Input
                        value={newImage.url}
                        onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Título (opcional)</Label>
                      <Input
                        value={newImage.title}
                        onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
                        placeholder="Ex: Hospital dos Sonhos"
                      />
                    </div>
                    <Button onClick={handleAddImage} className="w-full">
                      Adicionar Imagem
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="note" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Título (opcional)</Label>
                      <Input
                        value={newNote.title}
                        onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                        placeholder="Ex: Minha Motivação"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Conteúdo</Label>
                      <Textarea
                        value={newNote.content}
                        onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                        placeholder="Ex: Vou passar na residência e realizar meu sonho!"
                        rows={5}
                      />
                    </div>
                    <Button onClick={handleAddNote} className="w-full">
                      Adicionar Nota
                    </Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Seu mural está vazio.</p>
              <p className="text-sm mt-2">Adicione imagens inspiradoras e notas motivacionais!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <Card key={item.id} className="overflow-hidden group relative">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  
                  {item.type === 'image' ? (
                    <>
                      <div className="aspect-video bg-muted relative overflow-hidden">
                        <img
                          src={item.content}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbSBOw6NvIEVuY29udHJhZGE8L3RleHQ+PC9zdmc+';
                          }}
                        />
                      </div>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          {item.title}
                          <a href={item.content} target="_blank" rel="noopener noreferrer" className="ml-auto">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </CardTitle>
                      </CardHeader>
                    </>
                  ) : (
                    <CardContent className="pt-6 min-h-[200px] bg-gradient-to-br from-primary/10 to-accent/10">
                      <div className="space-y-2">
                        {item.title && (
                          <h3 className="font-semibold text-lg">{item.title}</h3>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
