import { useState, useRef, useEffect } from 'react';
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
  const isMountedRef = useRef(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newImage, setNewImage] = useState({ url: '', title: '' });
  const [newNote, setNewNote] = useState({
    content: '',
    title: '',
    color: '#fef3c7',
    fontColor: '#000000',
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    isAutoFit: false
  });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleAddImage = async () => {
    if (!newImage.url.trim()) {
      if (isMountedRef.current) {
        toast({
          title: "URL obrigatória",
          description: "Insira a URL da imagem",
          variant: "destructive"
        });
      }
      return;
    }

    await addItem({
      type: 'image',
      content: newImage.url,
      title: newImage.title || 'Imagem',
      createdAt: new Date().toISOString()
    });

    if (!isMountedRef.current) return;

    setNewImage({ url: '', title: '' });
    setIsAdding(false);
    toast({ title: "Imagem adicionada ao mural!" });
  };

  const handleAddNote = async () => {
    if (!newNote.content.trim()) {
      if (isMountedRef.current) {
        toast({
          title: "Conteúdo obrigatório",
          description: "Escreva algo na nota",
          variant: "destructive"
        });
      }
      return;
    }

    await addItem({
      type: 'note',
      content: newNote.content,
      title: newNote.title || 'Nota',
      color: newNote.color,
      fontColor: newNote.fontColor,
      fontSize: newNote.fontSize,
      isAutoFit: newNote.isAutoFit,
      createdAt: new Date().toISOString()
    });

    if (!isMountedRef.current) return;

    setNewNote({ content: '', title: '', color: '#fef3c7', fontColor: '#000000', fontSize: 'medium', isAutoFit: false });
    setIsAdding(false);
    toast({ title: "Nota adicionada ao mural!" });
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
    if (isMountedRef.current) {
      toast({ title: "Item removido" });
    }
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
              <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
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

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="note-title">Título (opcional)</Label>
                      <Input
                        id="note-title"
                        placeholder="Lembrete"
                        value={newNote.title}
                        onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                      />
                    </div>

                    <div className="space-y-4">
                      <Label>Personalização do Texto</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Cor do Texto</Label>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { color: '#000000', name: 'Preto' },
                              { color: '#4b5563', name: 'Cinza Escuro' },
                              { color: '#2563eb', name: 'Azul' },
                              { color: '#dc2626', name: 'Vermelho' },
                              { color: '#ffffff', name: 'Branco' },
                            ].map((preset) => (
                              <button
                                key={preset.color}
                                type="button"
                                onClick={() => setNewNote({ ...newNote, fontColor: preset.color })}
                                className={`h-6 w-6 rounded-full border shadow-sm transition-transform hover:scale-110 ${newNote.fontColor === preset.color ? 'ring-2 ring-primary ring-offset-2' : ''
                                  }`}
                                style={{ backgroundColor: preset.color }}
                                title={preset.name}
                              />
                            ))}
                            <input
                              type="color"
                              value={newNote.fontColor}
                              onChange={(e) => setNewNote({ ...newNote, fontColor: e.target.value })}
                              className="h-6 w-6 rounded-full p-0 border-0 overflow-hidden cursor-pointer"
                              title="Cor personalizada"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground block mb-2">Ajuste de Tamanho</Label>
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              id="auto-fit"
                              checked={newNote.isAutoFit}
                              onChange={(e) => setNewNote({ ...newNote, isAutoFit: e.target.checked })}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="auto-fit" className="cursor-pointer text-sm font-medium">Auto-ajustar ao espaço</Label>
                          </div>

                          {!newNote.isAutoFit && (
                            <div className="flex gap-2">
                              {['small', 'medium', 'large'].map((size) => (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => setNewNote({ ...newNote, fontSize: size as any })}
                                  className={`h-8 w-8 rounded border flex items-center justify-center transition-colors ${newNote.fontSize === size
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background hover:bg-muted'
                                    }`}
                                  title={`Tamanho ${size === 'small' ? 'Pequeno' : size === 'medium' ? 'Médio' : 'Grande'}`}
                                >
                                  <span className={size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-lg'}>A</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="note-content">Conteúdo</Label>
                      <Textarea
                        id="note-content"
                        placeholder="Escreva sua motivação ou lembrete aqui..."
                        value={newNote.content}
                        onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                        rows={4}
                        className={`transition-all duration-300 ${newNote.isAutoFit
                          ? newNote.content.length < 50 ? 'text-2xl font-semibold' : newNote.content.length < 100 ? 'text-lg' : 'text-sm'
                          : newNote.fontSize === 'small' ? 'text-xs' : newNote.fontSize === 'large' ? 'text-lg' : 'text-sm'
                          }`}
                        style={{
                          backgroundColor: newNote.color,
                          color: newNote.fontColor
                        }}
                      />
                    </div>

                    <Button onClick={handleAddNote} className="w-full">
                      Adicionar Post-it
                    </Button>
                  </div>
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
                    <CardContent
                      className={`pt-6 pb-4 min-h-[200px] relative transition-colors duration-300 ${item.isAutoFit ? 'flex flex-col justify-center items-center text-center' : ''
                        }`}
                      style={{ backgroundColor: item.color || '#fef3c7' }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/10"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4 text-gray-700" />
                      </Button>

                      {item.title && (
                        <h4 className={`font-bold mb-3 text-gray-900 border-b border-black/10 pb-2 ${item.isAutoFit ? 'w-full text-left absolute top-4 left-4 right-12 border-none' : ''
                          }`}>
                          {item.title}
                        </h4>
                      )}

                      <p
                        className={`whitespace-pre-wrap transition-all duration-300 w-full ${item.isAutoFit
                          ? (item.content.length < 30 ? 'text-3xl font-bold leading-tight' : item.content.length < 80 ? 'text-xl font-semibold' : 'text-base')
                          : (item.fontSize === 'small' ? 'text-xs' : item.fontSize === 'large' ? 'text-lg leading-relaxed' : 'text-sm')
                          } ${item.isAutoFit && item.title ? 'mt-8' : ''}`}
                        style={{ color: item.fontColor || '#000000' }}
                      >
                        {item.content}
                      </p>
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
