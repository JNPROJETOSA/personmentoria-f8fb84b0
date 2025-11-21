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
  addItem: (item: Omit<DreamBoardItem, 'id'>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export default function DreamBoard({ items, addItem, deleteItem }: DreamBoardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newImage, setNewImage] = useState({ url: '', title: '' });
  const [newNote, setNewNote] = useState({ content: '', title: '' });

  const handleAddImage = async () => {
    if (!newImage.url.trim()) {
      toast({
        title: "URL obrigatória",
        description: "Insira a URL da imagem",
        variant: "destructive"
      });
      return;
    }

    await addItem({
      type: 'image',
      content: newImage.url,
      title: newImage.title || 'Imagem',
      createdAt: new Date().toISOString()
    });

    setNewImage({ url: '', title: '' });
    setIsAdding(false);
    toast({ title: "Imagem adicionada ao mural!" });
  };

  const handleAddNote = async () => {
    if (!newNote.content.trim()) {
      toast({
        title: "Conteúdo obrigatório",
        description: "Escreva algo na nota",
        variant: "destructive"
      });
      return;
    }

    await addItem({
      type: 'note',
      content: newNote.content,
      title: newNote.title || 'Nota',
      createdAt: new Date().toISOString()
    });

    setNewNote({ content: '', title: '' });
    setIsAdding(false);
    toast({ title: "Nota adicionada ao mural!" });
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
    toast({ title: "Item removido" });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-primary" />
                Mural dos Sonhos
              </CardTitle>
              <CardDescription className="mt-2">
                Visualize seus objetivos, inspire-se e mantenha o foco na aprovação
              </CardDescription>
            </div>
            <Dialog open={isAdding} onOpenChange={setIsAdding}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
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
                      Post-it
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="image" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="image-url">URL da Imagem</Label>
                      <Input
                        id="image-url"
                        placeholder="https://exemplo.com/imagem.jpg"
                        value={newImage.url}
                        onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="image-title">Título (opcional)</Label>
                      <Input
                        id="image-title"
                        placeholder="Meu objetivo"
                        value={newImage.title}
                        onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleAddImage} className="w-full">
                      Adicionar Imagem
                    </Button>
                  </TabsContent>

                  <TabsContent value="note" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="note-title">Título (opcional)</Label>
                      <Input
                        id="note-title"
                        placeholder="Lembrete"
                        value={newNote.title}
                        onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="note-content">Conteúdo</Label>
                      <Textarea
                        id="note-content"
                        placeholder="Escreva sua motivação ou lembrete aqui..."
                        value={newNote.content}
                        onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <Button onClick={handleAddNote} className="w-full">
                      Adicionar Post-it
                    </Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <StickyNote className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Seu mural está vazio</p>
              <p className="text-sm">Adicione imagens inspiradoras e lembretes motivacionais</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <Card key={item.id} className="relative group overflow-hidden">
                  {item.type === 'image' ? (
                    <div className="aspect-video relative">
                      <img
                        src={item.content}
                        alt={item.title || 'Imagem do mural'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <a
                          href={item.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-background/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      {item.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                          <p className="text-white text-sm font-medium">{item.title}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <CardContent className="pt-6 pb-4 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 min-h-[200px] relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                      {item.title && (
                        <h4 className="font-semibold mb-2 text-yellow-900 dark:text-yellow-100">{item.title}</h4>
                      )}
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap">{item.content}</p>
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
