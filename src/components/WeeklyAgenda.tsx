import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Plus, X, Edit2, Check, Trash2 } from 'lucide-react';
import { useWeeklyAgenda } from '@/hooks/useWeeklyAgenda';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface WeeklyAgendaProps {
  userId?: string; // If provided, admin is editing another user's agenda
  isAdminView?: boolean;
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

export function WeeklyAgenda({ userId, isAdminView = false }: WeeklyAgendaProps) {
  const { agenda, loading, updateDayTasks, toggleTaskCompletion } = useWeeklyAgenda(userId);
  const [editingDay, setEditingDay] = useState<number | null>(null);

  // New Task State
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskEnd, setNewTaskEnd] = useState('');

  // Editing Task State
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [editingTaskDescription, setEditingTaskDescription] = useState('');
  const [editingTaskStart, setEditingTaskStart] = useState('');
  const [editingTaskEnd, setEditingTaskEnd] = useState('');

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const today = new Date().getDay();

  // Helper to get next available time slot
  const getNextTimeSlot = (dayTasks: string[]) => {
    const blocks = dayTasks
      .map((t, i) => parseTask(t, i))
      .filter(b => b.end)
      .sort((a, b) => a.end.localeCompare(b.end));

    if (blocks.length > 0) {
      const lastBlock = blocks[blocks.length - 1];
      // Default duration: 1 hour
      const nextStart = lastBlock.end;
      const [hours, minutes] = nextStart.split(':').map(Number);
      const nextEndData = new Date();
      nextEndData.setHours(hours + 1, minutes);
      const nextEnd = format(nextEndData, 'HH:mm');
      return { start: nextStart, end: nextEnd };
    }

    return { start: '08:00', end: '09:00' };
  };

  const handleAddTask = async (dayOfWeek: number) => {
    if (!newTaskDescription.trim() || !agenda) return;

    const taskString = serializeTask({
      start: newTaskStart,
      end: newTaskEnd,
      description: newTaskDescription.trim()
    });

    const dayAgenda = agenda.days.find(d => d.dayOfWeek === dayOfWeek);
    const currentTasks = dayAgenda?.tasks || [];
    await updateDayTasks(dayOfWeek, [...currentTasks, taskString]);

    setNewTaskDescription('');
    // Auto-advance time slots for next entry
    if (newTaskEnd) {
      setNewTaskStart(newTaskEnd);
      const [h, m] = newTaskEnd.split(':').map(Number);
      const nextEnd = new Date();
      nextEnd.setHours(h + 1, m);
      setNewTaskEnd(format(nextEnd, 'HH:mm'));
    }
  };

  const handleRemoveTask = async (dayOfWeek: number, taskIndex: number) => {
    if (!agenda) return;

    const dayAgenda = agenda.days.find(d => d.dayOfWeek === dayOfWeek);
    const currentTasks = dayAgenda?.tasks || [];
    const currentCompleted = dayAgenda?.completedIndices || [];
    const newTasks = currentTasks.filter((_, i) => i !== taskIndex);
    // Adjust completed indices after removal
    const newCompleted = currentCompleted
      .filter(i => i !== taskIndex)
      .map(i => i > taskIndex ? i - 1 : i);
    await updateDayTasks(dayOfWeek, newTasks, newCompleted);
  };

  const handleEditTask = async (dayOfWeek: number, taskIndex: number) => {
    if (!editingTaskDescription.trim() || !agenda) return;

    const taskString = serializeTask({
      start: editingTaskStart,
      end: editingTaskEnd,
      description: editingTaskDescription.trim()
    });

    const dayAgenda = agenda.days.find(d => d.dayOfWeek === dayOfWeek);
    const currentTasks = dayAgenda?.tasks || [];
    const newTasks = [...currentTasks];
    newTasks[taskIndex] = taskString;
    await updateDayTasks(dayOfWeek, newTasks);

    setEditingTaskIndex(null);
    setEditingTaskDescription('');
    setEditingTaskStart('');
    setEditingTaskEnd('');
  };

  const startEditingTask = (taskIndex: number, currentValue: string) => {
    const parsed = parseTask(currentValue, taskIndex);
    setEditingTaskIndex(taskIndex);
    setEditingTaskDescription(parsed.description);
    setEditingTaskStart(parsed.start);
    setEditingTaskEnd(parsed.end);
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black border-b-4 border-b-primary">
        <CardContent className="p-6">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4">
              <div className="h-4 bg-slate-700 rounded w-3/4"></div>
              <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black border-b-4 border-b-primary relative overflow-hidden">
      <div className="absolute right-4 top-4 opacity-10">
        <Calendar className="h-24 w-24 text-primary" />
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Agenda da Semana
          {isAdminView && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full ml-2">
              Modo Mentor
            </span>
          )}
        </CardTitle>
        <p className="text-sm text-slate-400">
          Semana de {format(weekStart, "dd 'de' MMMM", { locale: ptBR })}
        </p>
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
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className={`font-bold text-base ${isToday ? 'text-primary' : 'text-white'}`}>
                      {DAY_NAMES[day.dayOfWeek]}
                    </h4>
                    <span className="text-sm text-slate-300">
                      {format(dayDate, 'dd/MM')}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10"
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
    </Card>
  );
}
