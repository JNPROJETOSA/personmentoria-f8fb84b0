import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Trash2, Edit2, Check, Clock, Calendar, Save, Copy } from 'lucide-react';
import { useWeeklyAgendaTemplate, DayAgendaTemplate } from '@/hooks/useWeeklyAgendaTemplate';
import { toast } from '@/hooks/use-toast';

interface WeeklyAgendaTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  studentName?: string;
}

const DAY_NAMES = [
  { index: 0, short: 'DOM', full: 'Domingo' },
  { index: 1, short: 'SEG', full: 'Segunda-feira' },
  { index: 2, short: 'TER', full: 'Terça-feira' },
  { index: 3, short: 'QUA', full: 'Quarta-feira' },
  { index: 4, short: 'QUI', full: 'Quinta-feira' },
  { index: 5, short: 'SEX', full: 'Sexta-feira' },
  { index: 6, short: 'SÁB', full: 'Sábado' }
];

interface TimeBlock {
  start: string;
  end: string;
  description: string;
}

const parseTask = (taskString: string): TimeBlock => {
  try {
    const parsed = JSON.parse(taskString);
    if (typeof parsed === 'object' && parsed !== null && 'start' in parsed && 'end' in parsed) {
      return {
        start: parsed.start || '',
        end: parsed.end || '',
        description: parsed.description || parsed.task || ''
      };
    }
  } catch (e) {
    // Not JSON
  }
  return {
    start: '',
    end: '',
    description: taskString
  };
};

const serializeTask = (block: TimeBlock): string => {
  return JSON.stringify({
    start: block.start,
    end: block.end,
    description: block.description
  });
};

export function WeeklyAgendaTemplateModal({
  open,
  onOpenChange,
  userId,
  studentName
}: WeeklyAgendaTemplateModalProps) {
  const { templateDays, loading, saveFullTemplate, refetchTemplate } = useWeeklyAgendaTemplate(userId);
  const [selectedDay, setSelectedDay] = useState<number>(1); // Default Segunda-feira

  // Working state for template edits before saving
  const [localTemplate, setLocalTemplate] = useState<Record<number, string[]>>({
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
  });

  // Task form state
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskStart, setNewTaskStart] = useState('08:00');
  const [newTaskEnd, setNewTaskEnd] = useState('09:00');

  // Edit task state
  const [editingTaskIdx, setEditingTaskIdx] = useState<number | null>(null);
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskStart, setEditTaskStart] = useState('');
  const [editTaskEnd, setEditTaskEnd] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      refetchTemplate();
    }
  }, [open, refetchTemplate]);

  useEffect(() => {
    const initial: Record<number, string[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    templateDays.forEach(d => {
      initial[d.dayOfWeek] = [...(d.tasks || [])];
    });
    setLocalTemplate(initial);
  }, [templateDays]);

  const currentDayTasks = localTemplate[selectedDay] || [];

  const handleAddTask = () => {
    if (!newTaskDesc.trim()) return;

    const newTask: TimeBlock = {
      start: newTaskStart,
      end: newTaskEnd,
      description: newTaskDesc.trim()
    };

    const serialized = serializeTask(newTask);
    setLocalTemplate(prev => ({
      ...prev,
      [selectedDay]: [...(prev[selectedDay] || []), serialized]
    }));

    setNewTaskDesc('');

    // Advance default start/end times intelligently
    try {
      const [h, m] = newTaskEnd.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const nextStart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const nextEnd = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        setNewTaskStart(nextStart);
        setNewTaskEnd(nextEnd);
      }
    } catch (e) {
      setNewTaskStart('08:00');
      setNewTaskEnd('09:00');
    }
  };

  const handleStartEdit = (idx: number, taskStr: string) => {
    const parsed = parseTask(taskStr);
    setEditingTaskIdx(idx);
    setEditTaskDesc(parsed.description);
    setEditTaskStart(parsed.start);
    setEditTaskEnd(parsed.end);
  };

  const handleSaveEdit = (idx: number) => {
    if (!editTaskDesc.trim()) return;

    const updatedBlock: TimeBlock = {
      start: editTaskStart,
      end: editTaskEnd,
      description: editTaskDesc.trim()
    };

    const newTasks = [...currentDayTasks];
    newTasks[idx] = serializeTask(updatedBlock);

    setLocalTemplate(prev => ({
      ...prev,
      [selectedDay]: newTasks
    }));

    setEditingTaskIdx(null);
  };

  const handleRemoveTask = (idx: number) => {
    setLocalTemplate(prev => ({
      ...prev,
      [selectedDay]: (prev[selectedDay] || []).filter((_, i) => i !== idx)
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const payload = Object.entries(localTemplate).map(([dayStr, tasks]) => ({
      dayOfWeek: Number(dayStr),
      tasks
    }));

    const success = await saveFullTemplate(payload);
    setSaving(false);

    if (success) {
      toast({
        title: "Semana Padrão salva!",
        description: "O modelo de rotina foi atualizado com sucesso no banco de dados.",
      });
      onOpenChange(false);
    } else {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a Semana Padrão. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Calendar className="w-5 h-5 text-primary" />
            Configurar Semana Padrão {studentName ? `• ${studentName}` : ''}
          </DialogTitle>
          <DialogDescription>
            Defina o modelo de rotina semanal reutilizável. Você poderá aplicar este modelo em qualquer semana real da agenda.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Carregando modelo...</div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Day Selector Tabs */}
            <Tabs value={String(selectedDay)} onValueChange={v => setSelectedDay(Number(v))}>
              <TabsList className="grid grid-cols-7 w-full bg-muted/60">
                {DAY_NAMES.map(d => {
                  const taskCount = (localTemplate[d.index] || []).length;
                  return (
                    <TabsTrigger key={d.index} value={String(d.index)} className="text-xs px-1 py-2 flex flex-col gap-0.5">
                      <span>{d.short}</span>
                      {taskCount > 0 ? (
                        <span className="text-[10px] bg-primary/20 text-primary font-bold px-1.5 py-0.2 rounded-full">
                          {taskCount}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground opacity-40">-</span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {DAY_NAMES.map(d => (
                <TabsContent key={d.index} value={String(d.index)} className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <span>{d.full} Padrão</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        ({(localTemplate[d.index] || []).length} atividades)
                      </span>
                    </h3>
                  </div>

                  {/* Add Task Box */}
                  <div className="p-3 border rounded-lg bg-card space-y-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5 text-primary" />
                      Adicionar Atividade
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                      <div className="sm:col-span-1">
                        <Label htmlFor="start-time" className="text-[11px]">Início</Label>
                        <Input
                          id="start-time"
                          type="time"
                          value={newTaskStart}
                          onChange={e => setNewTaskStart(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <Label htmlFor="end-time" className="text-[11px]">Fim</Label>
                        <Input
                          id="end-time"
                          type="time"
                          value={newTaskEnd}
                          onChange={e => setNewTaskEnd(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Label htmlFor="task-desc" className="text-[11px]">Descrição da Atividade</Label>
                        <Input
                          id="task-desc"
                          placeholder="Ex: Aula de Pediatria + 30 questões"
                          value={newTaskDesc}
                          onChange={e => setNewTaskDesc(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-1 flex items-end">
                        <Button size="sm" onClick={handleAddTask} className="w-full h-8 text-xs">
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-2">
                    {currentDayTasks.length === 0 ? (
                      <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-lg">
                        Nenhuma atividade cadastrada para {d.full}.
                      </div>
                    ) : (
                      currentDayTasks.map((tStr, idx) => {
                        const parsed = parseTask(tStr);
                        const isEditing = editingTaskIdx === idx;

                        if (isEditing) {
                          return (
                            <div key={idx} className="flex items-center gap-2 p-2 border rounded-lg bg-accent/40">
                              <Input
                                type="time"
                                value={editTaskStart}
                                onChange={e => setEditTaskStart(e.target.value)}
                                className="h-8 text-xs w-24"
                              />
                              <span>-</span>
                              <Input
                                type="time"
                                value={editTaskEnd}
                                onChange={e => setEditTaskEnd(e.target.value)}
                                className="h-8 text-xs w-24"
                              />
                              <Input
                                value={editTaskDesc}
                                onChange={e => setEditTaskDesc(e.target.value)}
                                className="h-8 text-xs flex-1"
                              />
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleSaveEdit(idx)}>
                                <Check className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        }

                        return (
                          <div key={idx} className="flex items-center justify-between p-2.5 border rounded-lg bg-card hover:bg-accent/30 transition-colors">
                            <div className="flex items-center gap-3">
                              {(parsed.start || parsed.end) && (
                                <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                                  {parsed.start || '--:--'} - {parsed.end || '--:--'}
                                </span>
                              )}
                              <span className="text-sm font-medium">{parsed.description}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => handleStartEdit(idx, tStr)}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRemoveTask(idx)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveAll} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Semana Padrão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
