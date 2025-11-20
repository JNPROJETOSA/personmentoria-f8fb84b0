import { useState } from 'react';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ClassItem, MedicalArea } from '@/lib/types';
import { AREA_COLORS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';

interface ClassesProps {
  classes: ClassItem[];
  setClasses: (classes: ClassItem[]) => void;
}

export default function Classes({ classes, setClasses }: ClassesProps) {
  const [newClass, setNewClass] = useState<Partial<ClassItem>>({
    title: '',
    area: MedicalArea.CLINICA,
    date: new Date().toISOString().split('T')[0],
    studied: false,
    priority: 2
  });

  const handleAdd = () => {
    if (!newClass.title?.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha o título da aula.",
        variant: "destructive"
      });
      return;
    }

    const item: ClassItem = {
      id: Date.now().toString(),
      title: newClass.title,
      area: newClass.area!,
      date: newClass.date!,
      studied: false,
      priority: newClass.priority as 1 | 2 | 3
    };

    setClasses([...classes, item]);
    setNewClass({
      title: '',
      area: MedicalArea.CLINICA,
      date: new Date().toISOString().split('T')[0],
      studied: false,
      priority: 2
    });
    
    toast({
      title: "Aula adicionada!",
      description: `"${item.title}" foi registrada.`,
    });
  };

  const handleToggle = (id: string) => {
    setClasses(classes.map(c => c.id === id ? { ...c, studied: !c.studied } : c));
  };

  const handleDelete = (id: string) => {
    setClasses(classes.filter(c => c.id !== id));
    toast({
      title: "Aula removida",
      description: "A aula foi excluída com sucesso.",
    });
  };

  const sortedClasses = [...classes].sort((a, b) => {
    if (a.studied !== b.studied) return a.studied ? 1 : -1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Add New Class */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Adicionar Aula
          </CardTitle>
          <CardDescription>Registre suas aulas teóricas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Aula</Label>
              <Input
                id="title"
                placeholder="Ex: Semiologia Cardíaca"
                value={newClass.title}
                onChange={(e) => setNewClass({ ...newClass, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Área Médica</Label>
              <Select value={newClass.area} onValueChange={(value) => setNewClass({ ...newClass, area: value as MedicalArea })}>
                <SelectTrigger id="area">
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
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={newClass.date}
                onChange={(e) => setNewClass({ ...newClass, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select 
                value={String(newClass.priority)} 
                onValueChange={(value) => setNewClass({ ...newClass, priority: Number(value) as 1 | 2 | 3 })}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Alta ⚡</SelectItem>
                  <SelectItem value="2">Média ⭐</SelectItem>
                  <SelectItem value="3">Baixa 💤</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleAdd} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Aula
          </Button>
        </CardContent>
      </Card>

      {/* Classes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Minhas Aulas ({classes.length})
          </CardTitle>
          <CardDescription>
            {classes.filter(c => c.studied).length} assistidas • {classes.filter(c => !c.studied).length} pendentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedClasses.map(cls => (
              <div
                key={cls.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  checked={cls.studied}
                  onCheckedChange={() => handleToggle(cls.id)}
                  id={`class-${cls.id}`}
                />
                
                <div className="flex-1 min-w-0">
                  <label 
                    htmlFor={`class-${cls.id}`}
                    className={`block font-medium cursor-pointer ${cls.studied ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {cls.title}
                  </label>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: AREA_COLORS[cls.area] }}
                    />
                    <span>{cls.area}</span>
                    <span>•</span>
                    <span>{new Date(cls.date).toLocaleDateString('pt-BR')}</span>
                    <span>•</span>
                    <span>
                      {cls.priority === 1 && '⚡ Alta'}
                      {cls.priority === 2 && '⭐ Média'}
                      {cls.priority === 3 && '💤 Baixa'}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(cls.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {sortedClasses.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma aula registrada ainda.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
