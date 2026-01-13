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

export function WeeklyAgenda({ userId, isAdminView = false }: WeeklyAgendaProps) {
  const { agenda, loading, updateDayTasks, toggleTaskCompletion } = useWeeklyAgenda(userId);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [newTask, setNewTask] = useState('');
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [editingTaskValue, setEditingTaskValue] = useState('');

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const today = new Date().getDay();

  const handleAddTask = async (dayOfWeek: number) => {
    if (!newTask.trim() || !agenda) return;
    
    const dayAgenda = agenda.days.find(d => d.dayOfWeek === dayOfWeek);
    const currentTasks = dayAgenda?.tasks || [];
    await updateDayTasks(dayOfWeek, [...currentTasks, newTask.trim()]);
    setNewTask('');
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
    if (!editingTaskValue.trim() || !agenda) return;
    
    const dayAgenda = agenda.days.find(d => d.dayOfWeek === dayOfWeek);
    const currentTasks = dayAgenda?.tasks || [];
    const newTasks = [...currentTasks];
    newTasks[taskIndex] = editingTaskValue.trim();
    await updateDayTasks(dayOfWeek, newTasks);
    setEditingTaskIndex(null);
    setEditingTaskValue('');
  };

  const startEditingTask = (taskIndex: number, currentValue: string) => {
    setEditingTaskIndex(taskIndex);
    setEditingTaskValue(currentValue);
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

            return (
              <div
                key={day.dayOfWeek}
                className={`
                  p-4 rounded-lg backdrop-blur-sm border transition-all min-w-0
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
                    onClick={() => setEditingDay(isEditing ? null : day.dayOfWeek)}
                  >
                    {isEditing ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="space-y-2 min-h-[80px]">
                  {day.tasks.length === 0 && !isEditing && (
                    <p className="text-sm text-slate-400 italic">Nenhuma tarefa</p>
                  )}
                  
                  {day.tasks.map((task, taskIndex) => {
                    const isCompleted = day.completedIndices?.includes(taskIndex);
                    
                    return (
                      <div
                        key={taskIndex}
                        className="flex items-start gap-2 group"
                      >
                        {editingTaskIndex === taskIndex && isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editingTaskValue}
                              onChange={(e) => setEditingTaskValue(e.target.value)}
                              className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditTask(day.dayOfWeek, taskIndex);
                                if (e.key === 'Escape') setEditingTaskIndex(null);
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-400 hover:text-green-300 hover:bg-green-400/10"
                              onClick={() => handleEditTask(day.dayOfWeek, taskIndex)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            {!isAdminView && (
                              <Checkbox
                                checked={isCompleted}
                                onCheckedChange={() => toggleTaskCompletion(day.dayOfWeek, taskIndex)}
                                className="mt-0.5 border-slate-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            )}
                            <span className={`text-sm leading-relaxed flex-1 break-words whitespace-normal ${
                              isCompleted ? 'text-slate-400 line-through' : 'text-white'
                            }`}>
                              {isAdminView && '• '}{task}
                            </span>
                            {isEditing && (
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-300 hover:text-white hover:bg-white/10"
                                  onClick={() => startEditingTask(taskIndex, task)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-300 hover:text-red-400 hover:bg-red-400/10"
                                  onClick={() => handleRemoveTask(day.dayOfWeek, taskIndex)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}

                  {isEditing && (
                    <div className="flex items-center gap-2 mt-3">
                      <Input
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        placeholder="Nova tarefa..."
                        className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTask(day.dayOfWeek);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10"
                        onClick={() => handleAddTask(day.dayOfWeek)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
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
