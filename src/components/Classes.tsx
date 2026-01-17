import { useState, useRef, useEffect, Fragment } from 'react';
import { Plus, Trash2, BookOpen, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClassItem, MedicalArea } from '@/lib/types';
import { AREA_COLORS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface ClassesProps {
  classes: ClassItem[];
  addClass: (classItem: Omit<ClassItem, 'id'>) => Promise<void>;
  updateClass: (id: string, updates: Partial<ClassItem>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
}

export default function Classes({ classes, addClass, updateClass, deleteClass }: ClassesProps) {
  const isMountedRef = useRef(true);
  const [newClass, setNewClass] = useState<Partial<ClassItem>>({
    title: '',
    area: MedicalArea.CLINICA,
    date: new Date().toISOString().split('T')[0],
    studied: false,
    priority: 2
  });
  const [classToDelete, setClassToDelete] = useState<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleAdd = async () => {
    if (!newClass.title?.trim()) {
      if (isMountedRef.current) {
        toast({
          title: "Campo obrigatório",
          description: "Por favor, preencha o título da aula.",
          variant: "destructive"
        });
      }
      return;
    }

    const item: Omit<ClassItem, 'id'> = {
      title: newClass.title,
      area: newClass.area!,
      date: newClass.date!,
      studied: false,
      priority: newClass.priority as 1 | 2 | 3
    };

    await addClass(item);

    if (!isMountedRef.current) return;

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

  const handleToggle = async (id: string) => {
    const classItem = classes.find(c => c.id === id);
    if (classItem) {
      await updateClass(id, { studied: !classItem.studied });
      if (isMountedRef.current && !classItem.studied) {
        toast({
          title: "Aula concluída!",
          description: `"${classItem.title}" foi marcada como estudada.`,
        });
      }
    }
  };

  const confirmDelete = async () => {
    if (classToDelete) {
      await deleteClass(classToDelete);
      setClassToDelete(null);
      if (isMountedRef.current) {
        toast({
          title: "Aula removida",
          description: "A aula foi excluída com sucesso.",
        });
      }
    }
  };

  // Separate pending and studied classes
  const pendingClasses = classes
    .filter(c => !c.studied)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  const studiedClasses = classes
    .filter(c => c.studied)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const ClassCard = ({ cls, isStudied }: { cls: ClassItem; isStudied: boolean }) => (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isStudied
          ? 'bg-muted/50 border-muted'
          : 'bg-card hover:bg-accent/50'
        }`}
    >
      <Button
        variant={isStudied ? "secondary" : "outline"}
        size="icon"
        onClick={() => handleToggle(cls.id)}
        className={`shrink-0 ${isStudied ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : ''}`}
        title={isStudied ? "Desmarcar como estudada" : "Marcar como estudada"}
      >
        <CheckCircle2 className="w-4 h-4" />
      </Button>

      <div className="flex-1 min-w-0">
        <span className={`block font-medium ${isStudied ? 'text-muted-foreground' : ''}`}>
          {cls.title}
        </span>
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
        onClick={() => setClassToDelete(cls.id)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );

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

      {/* Pending Classes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Aulas Pendentes ({pendingClasses.length})
          </CardTitle>
          <CardDescription>
            Aulas que ainda não foram estudadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pendingClasses.map(cls => (
              <Fragment key={cls.id}>
                <ClassCard cls={cls} isStudied={false} />
              </Fragment>
            ))}

            {pendingClasses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50 text-emerald-500" />
                <p>Todas as aulas foram estudadas!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Studied Classes */}
      {studiedClasses.length > 0 && (
        <Card className="border-emerald-200 dark:border-emerald-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              Aulas Estudadas ({studiedClasses.length})
            </CardTitle>
            <CardDescription>
              Aulas que você já concluiu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {studiedClasses.map(cls => (
                <Fragment key={cls.id}>
                  <ClassCard cls={cls} isStudied={true} />
                </Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!classToDelete} onOpenChange={(open) => !open && setClassToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Aula</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta aula? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
