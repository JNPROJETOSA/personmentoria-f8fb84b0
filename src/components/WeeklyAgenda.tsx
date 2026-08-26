import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Plus, X, Edit2, Check, Trash2, ChevronLeft, ChevronRight, Settings, Sparkles, AlertTriangle } from 'lucide-react';
import { useWeeklyAgenda } from '@/hooks/useWeeklyAgenda';
import { useWeeklyAgendaTemplate } from '@/hooks/useWeeklyAgendaTemplate';
import { WeeklyAgendaTemplateModal } from '@/components/WeeklyAgendaTemplateModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface WeeklyAgendaProps {
  userId?: string; // If provided, admin is editing another user's agenda
  isAdminView?: boolean;
  studentName?: string;
}

interface TimeBlock {
  start: string;
  end: string;
  description: string;
  originalIndex: number; // To track position in the main array
  isCompleted: boolean;
}

// Helper to parse a task string which might be JSON or plain text
const parseTask = (taskString: string, index: number, completedIndices: number[] = []): TimeBlock => {
  try {
    const parsed = JSON.parse(taskString);
    if (typeof parsed === 'object' && parsed !== null && 'start' in parsed && 'end' in parsed) {
      return {
        start: parsed.start,
        end: parsed.end,
        description: parsed.description || parsed.task || '', // back-compat with plan thought
        originalIndex: index,
        isCompleted: completedIndices.includes(index)
      };
    }
  } catch (e) {
    // Not JSON, treat as legacy
  }

  return {
    start: '',
    end: '',
    description: taskString,
    originalIndex: index,
    isCompleted: completedIndices.includes(index)
  };
};

const serializeTask = (block: Omit<TimeBlock, 'originalIndex' | 'isCompleted'>): string => {
  return JSON.stringify({
    start: block.start,
    end: block.end,
    description: block.description
  });
};

export function WeeklyAgenda({ userId, isAdminView = false, studentName }: WeeklyAgendaProps) {
  const MAX_WEEKS_BACK = 12;
  const MAX_WEEKS_FORWARD = 12;

  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const { agenda, loading, updateDayTasks, toggleTaskCompletion } = useWeeklyAgenda(userId, currentWeekOffset);
  const { templateDays } = useWeeklyAgendaTemplate(userId);
  const [editingDay, setEditingDay] = useState<number | null>(null);

  // Template Modal & Conflict States
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [conflictTarget, setConflictTarget] = useState<{ mode: 'single' | 'full'; dayOfWeek?: number } | null>(null);

  // New Task State
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskEnd, setNewTaskEnd] = useState('');

  // Editing Task State
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [editingTaskDescription, setEditingTaskDescription] = useState('');
  const [editingTaskStart, setEditingTaskStart] = useState('');
  const [editingTaskEnd, setEditingTaskEnd] = useState('');

  const weekStart = startOfWeek(addWeeks(new Date(), currentWeekOffset), { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);
  const today = new Date().getDay();

  // Template application handlers
  const applySingleDayTemplate = async (dayOfWeek: number, mode: 'append' | 'replace' = 'append') => {
    if (!agenda) return;
    const tDay = templateDays.find(d => d.dayOfWeek === dayOfWeek);
    if (!tDay || !tDay.tasks || tDay.tasks.length === 0) {
      toast({
        title: "Semana Padrão vazia",
        description: `Nenhuma atividade cadastrada para ${DAY_NAMES[dayOfWeek]} na Semana Padrão.`,
        variant: "destructive"
      });
      return;
    }

    const currentDay = agenda.days.find(d => d.dayOfWeek === dayOfWeek);
    const existingTasks = currentDay?.tasks || [];

    let finalTasks: string[] = [];
    if (mode === 'append') {
      finalTasks = [...existingTasks, ...tDay.tasks];
    } else {
      finalTasks = [...tDay.tasks];
    }

    await updateDayTasks(dayOfWeek, finalTasks);
    toast({
      title: "Dia Padrão aplicado!",
      description: `As atividades da ${DAY_NAMES[dayOfWeek]} Padrão foram adicionadas à agenda.`,
    });
  };

  const applyFullWeekTemplate = async (mode: 'append' | 'replace' = 'append') => {
    if (!agenda) return;

    const hasAnyTemplateTasks = templateDays.some(d => d.tasks && d.tasks.length > 0);
    if (!hasAnyTemplateTasks) {
      toast({
        title: "Semana Padrão vazia",
        description: "Nenhuma atividade foi configurada na Semana Padrão. Clique em 'Configurar Semana Padrão' para definir.",
        variant: "destructive"
      });
      return;
    }

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const tDay = templateDays.find(d => d.dayOfWeek === dayIdx);
      if (!tDay || !tDay.tasks || tDay.tasks.length === 0) continue;

      const currentDay = agenda.days.find(d => d.dayOfWeek === dayIdx);
      const existingTasks = currentDay?.tasks || [];

      let finalTasks: string[] = [];
      if (mode === 'append') {
        finalTasks = [...existingTasks, ...tDay.tasks];
      } else {
        finalTasks = [...tDay.tasks];
      }

      await updateDayTasks(dayIdx, finalTasks);
    }

    toast({
      title: "Semana Padrão aplicada!",
      description: "A grade semanal padrão foi copiada para as datas desta semana.",
    });
  };

  const handleRequestApplySingleDay = (dayOfWeek: number) => {
    if (!agenda) return;
    const currentDay = agenda.days.find(d => d.dayOfWeek === dayOfWeek);
    const existingTasks = currentDay?.tasks || [];

    if (existingTasks.length > 0) {
      setConflictTarget({ mode: 'single', dayOfWeek });
    } else {
      applySingleDayTemplate(dayOfWeek, 'append');
    }
  };

  const handleRequestApplyFullWeek = () => {
    if (!agenda) return;
    const hasExistingTasksInWeek = agenda.days.some(d => d.tasks && d.tasks.length > 0);

    if (hasExistingTasksInWeek) {
      setConflictTarget({ mode: 'full' });
    } else {
      applyFullWeekTemplate('append');
    }
  };

  const handleConfirmConflict = (mode: 'append' | 'replace') => {
    if (!conflictTarget) return;

    if (conflictTarget.mode === 'single' && conflictTarget.dayOfWeek !== undefined) {
      applySingleDayTemplate(conflictTarget.dayOfWeek, mode);
    } else if (conflictTarget.mode === 'full') {
      applyFullWeekTemplate(mode);
    }

    setConflictTarget(null);
  };

  // Navigation functions
  const goToPreviousWeek = () => {
    if (currentWeekOffset > -MAX_WEEKS_BACK) {
      setCurrentWeekOffset(prev => prev - 1);
    }
  };

  const goToNextWeek = () => {
    if (currentWeekOffset < MAX_WEEKS_FORWARD) {
      setCurrentWeekOffset(prev => prev + 1);
    }
  };

  const goToCurrentWeek = () => {
    setCurrentWeekOffset(0);
  };

  // Week label
  const getWeekLabel = () => {
    if (currentWeekOffset === 0) return "Semana Atual";
    if (currentWeekOffset === -1) return "Semana Passada";
    if (currentWeekOffset === 1) return "Próxima Semana";
    if (currentWeekOffset < 0) return `${Math.abs(currentWeekOffset)} semanas atrás`;
    return `Daqui ${currentWeekOffset} semanas`;
  };

  const weekRangeLabel = `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`;

  const getNextTimeSlot = (tasks: string[]) => {
    if (tasks.length === 0) return { start: '08:00', end: '09:00' };

    // Sort tasks by time to find the last one
    const sortedTasks = tasks
      .map(t => parseTask(t, 0))
      .filter(t => t.start && t.end)
      .sort((a, b) => b.end.localeCompare(a.end));

    if (sortedTasks.length > 0) {
      const lastEnd = sortedTasks[0].end;
      const [hours, minutes] = lastEnd.split(':').map(Number);
      const nextStart = new Date();
      nextStart.setHours(hours, minutes, 0);

      const nextEnd = new Date(nextStart);
      nextEnd.setHours(nextStart.getHours() + 1);

      return {
        start: format(nextStart, 'HH:mm'),
        end: format(nextEnd, 'HH:mm')
      };
    }

    return { start: '08:00', end: '09:00' };
  };

  const handleAddTask = async (dayOfWeek: number) => {
    if (!newTaskDescription.trim() || !agenda) return;

    const dayAgenda = agenda.days.find(d => d.dayOfWeek === dayOfWeek);
    const currentTasks = dayAgenda?.tasks || [];

    const newTask: TimeBlock = {
      start: newTaskStart,
      end: newTaskEnd,
      description: newTaskDescription,
      originalIndex: -1, // Not used for new tasks
      isCompleted: false
    };

    const taskString = serializeTask(newTask);
    const newTasks = [...currentTasks, taskString];

    await updateDayTasks(dayOfWeek, newTasks);

    setNewTaskDescription('');
    const nextSlot = getNextTimeSlot(newTasks);
    setNewTaskStart(nextSlot.start);
    setNewTaskEnd(nextSlot.end);
  };

  const startEditingTask = (index: number, taskString: string) => {
    const task = parseTask(taskString, index);
    setEditingTaskIndex(index);
    setEditingTaskDescription(task.description);
    setEditingTaskStart(task.start);
    setEditingTaskEnd(task.end);
  };

  const handleEditTask = async (dayOfWeek: number, index: number) => {
    if (!agenda) return;

    const dayAgenda = agenda.days.find(d => d.dayOfWeek === dayOfWeek);
    if (!dayAgenda) return;

    const updatedTask: TimeBlock = {
      start: editingTaskStart,
      end: editingTaskEnd,
      description: editingTaskDescription,
      originalIndex: index,
      isCompleted: false // completion status is preserved in the hook's update logic if needed, but here we just update content
    };

    const newTasks = [...dayAgenda.tasks];
    newTasks[index] = serializeTask(updatedTask);

    await updateDayTasks(dayOfWeek, newTasks);
    setEditingTaskIndex(null);
  };

  const handleRemoveTask = async (dayOfWeek: number, index: number) => {
    if (!agenda) return;

    const dayAgenda = agenda.days.find(d => d.dayOfWeek === dayOfWeek);
    if (!dayAgenda) return;

    const newTasks = dayAgenda.tasks.filter((_, i) => i !== index);

    // Also need to update completed indices since they shift
    const newCompleted = (dayAgenda.completedIndices || [])
      .filter(i => i !== index)
      .map(i => i > index ? i - 1 : i);

    await updateDayTasks(dayOfWeek, newTasks, newCompleted);
  };

  if (loading) {
    // ... (loading skeleton)
  }

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black border-b-4 border-b-primary relative overflow-hidden">
      <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
        <Calendar className="h-24 w-24 text-primary" />
      </div>

      <CardHeader className="pb-2">
        <div className="flex flex-col gap-4">
          {/* Title and Week Info */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Agenda da Semana
                {isAdminView && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full ml-2">
                    Modo Mentor
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm font-medium text-primary">
                  {getWeekLabel()}
                </p>
                <span className="text-slate-500">•</span>
                <p className="text-sm text-slate-400">
                  {weekRangeLabel}
                </p>
              </div>
            </div>

            {/* Template Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTemplateModalOpen(true)}
                className="h-9 text-xs border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 font-medium"
              >
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                Configurar Semana Padrão
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleRequestApplyFullWeek}
                className="h-9 text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Aplicar Semana Padrão
              </Button>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
              disabled={currentWeekOffset <= -MAX_WEEKS_BACK}
              className="h-9 px-3 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>

            {currentWeekOffset !== 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={goToCurrentWeek}
                className="h-9 px-4 bg-primary hover:bg-primary/90 text-black font-medium"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Semana Atual
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
              disabled={currentWeekOffset >= MAX_WEEKS_FORWARD}
              className="h-9 px-3 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
          {agenda?.days.map((day) => {
            const dayDate = addDays(weekStart, day.dayOfWeek);
            const isToday = day.dayOfWeek === today;
            const isEditing = editingDay === day.dayOfWeek;

            // Parse and sort tasks
            const timeBlocks = day.tasks
              .map((t, i) => parseTask(t, i, day.completedIndices))
              .sort((a, b) => {
                if (a.start && b.start) return a.start.localeCompare(b.start);
                if (a.start) return -1;
                if (b.start) return 1;
                return 0; // Keep original order if no time
              });

            return (
              <div
                key={day.dayOfWeek}
                className={`
                  p-4 rounded-lg backdrop-blur-sm border transition-all min-w-0 flex flex-col
                  ${isToday
                    ? 'bg-primary/20 border-primary/50 ring-2 ring-primary/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-3 gap-1">
                  <div>
                    <h4 className={`font-bold text-base ${isToday ? 'text-primary' : 'text-white'}`}>
                      {DAY_NAMES[day.dayOfWeek]}
                    </h4>
                    <span className="text-sm text-slate-300">
                      {format(dayDate, 'dd/MM')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 px-1.5 font-medium"
                      title={`Aplicar ${DAY_NAMES[day.dayOfWeek]} Padrão neste dia`}
                      onClick={() => handleRequestApplySingleDay(day.dayOfWeek)}
                    >
                      + {DAY_NAMES[day.dayOfWeek].slice(0, 3)} Padrão
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 shrink-0"
                      onClick={() => {
                        if (!isEditing) {
                          const nextSlot = getNextTimeSlot(day.tasks);
                          setNewTaskStart(nextSlot.start);
                          setNewTaskEnd(nextSlot.end);
                          setEditingDay(day.dayOfWeek);
                        } else {
                          setEditingDay(null);
                        }
                      }}
                    >
                      {isEditing ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  {day.tasks.length === 0 && !isEditing && (
                    <p className="text-sm text-slate-400 italic">Nenhuma tarefa</p>
                  )}

                  {timeBlocks.map((block) => {
                    const isTaskEditing = editingTaskIndex === block.originalIndex && isEditing;

                    return (
                      <div
                        key={block.originalIndex}
                        className="group relative"
                      >
                        {isTaskEditing ? (
                          <div className="flex flex-col gap-2 p-2 bg-black/20 rounded border border-white/10">
                            <div className="flex gap-2">
                              <Input
                                type="time"
                                value={editingTaskStart}
                                onChange={(e) => setEditingTaskStart(e.target.value)}
                                className="h-7 text-xs bg-white/10 border-white/20 text-white w-20 px-1"
                              />
                              <span className="text-white self-center">-</span>
                              <Input
                                type="time"
                                value={editingTaskEnd}
                                onChange={(e) => setEditingTaskEnd(e.target.value)}
                                className="h-7 text-xs bg-white/10 border-white/20 text-white w-20 px-1"
                              />
                            </div>
                            <Input
                              value={editingTaskDescription}
                              onChange={(e) => setEditingTaskDescription(e.target.value)}
                              className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditTask(day.dayOfWeek, block.originalIndex);
                                if (e.key === 'Escape') setEditingTaskIndex(null);
                              }}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs hover:bg-white/10"
                                onClick={() => setEditingTaskIndex(null)}
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white"
                                onClick={() => handleEditTask(day.dayOfWeek, block.originalIndex)}
                              >
                                Salvar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className={`
                            flex items-start gap-2 p-2 rounded transition-colors
                            ${block.isCompleted ? 'bg-green-500/10' : 'hover:bg-white/5'}
                          `}>
                            {!isAdminView && (
                              <Checkbox
                                checked={block.isCompleted}
                                onCheckedChange={() => toggleTaskCompletion(day.dayOfWeek, block.originalIndex)}
                                className="mt-1 border-slate-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            )}

                            <div className="flex-1 min-w-0">
                              {block.start && (
                                <div className="text-xs font-mono text-primary/80 mb-0.5 font-bold">
                                  {block.start} - {block.end}
                                </div>
                              )}
                              <p className={`text-sm leading-snug break-words whitespace-normal ${block.isCompleted ? 'text-slate-400 line-through' : 'text-white'
                                }`}>
                                {block.description}
                              </p>
                            </div>

                            {isEditing && (
                              <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-300 hover:text-white hover:bg-white/10"
                                  onClick={() => startEditingTask(block.originalIndex, day.tasks[block.originalIndex])}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-300 hover:text-red-400 hover:bg-red-400/10"
                                  onClick={() => handleRemoveTask(day.dayOfWeek, block.originalIndex)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2 items-center">
                          <Input
                            type="time"
                            value={newTaskStart}
                            onChange={(e) => setNewTaskStart(e.target.value)}
                            className="h-8 text-xs bg-white/10 border-white/20 text-white w-24"
                          />
                          <span className="text-slate-400">-</span>
                          <Input
                            type="time"
                            value={newTaskEnd}
                            onChange={(e) => setNewTaskEnd(e.target.value)}
                            className="h-8 text-xs bg-white/10 border-white/20 text-white w-24"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={newTaskDescription}
                            onChange={(e) => setNewTaskDescription(e.target.value)}
                            placeholder="Nova tarefa..."
                            className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddTask(day.dayOfWeek);
                            }}
                          />
                          <Button
                            variant="default" // Changed to default for better visibility
                            size="icon"
                            className="h-8 w-8 bg-primary hover:bg-primary/80 text-black shrink-0"
                            onClick={() => handleAddTask(day.dayOfWeek)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Template Settings Modal */}
      <WeeklyAgendaTemplateModal
        open={isTemplateModalOpen}
        onOpenChange={setIsTemplateModalOpen}
        userId={userId}
        studentName={studentName}
      />

      {/* Conflict Resolution Dialog */}
      <Dialog open={!!conflictTarget} onOpenChange={(open) => !open && setConflictTarget(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-5 h-5" />
              Programação Existente Encontrada
            </DialogTitle>
            <DialogDescription>
              {conflictTarget?.mode === 'single'
                ? `Já existem tarefas cadastradas nesta data. Como deseja aplicar as tarefas da ${DAY_NAMES[conflictTarget.dayOfWeek ?? 0]} Padrão?`
                : 'Já existem tarefas cadastradas nesta semana. Como você deseja aplicar a Semana Padrão?'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-muted-foreground space-y-2">
            <p>• <strong>Adicionar às existentes:</strong> Preserva todas as tarefas que já estão na agenda e inclui as tarefas do modelo.</p>
            <p>• <strong>Substituir tarefas:</strong> Subescreve a programação atual pelas tarefas da Semana Padrão.</p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={() => setConflictTarget(null)}>
              Cancelar
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleConfirmConflict('replace')} className="text-destructive">
              Substituir Tarefas
            </Button>
            <Button size="sm" onClick={() => handleConfirmConflict('append')} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              Adicionar às Existentes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
