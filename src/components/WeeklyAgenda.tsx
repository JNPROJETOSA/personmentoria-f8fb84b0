import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const { agenda, loading, updateDayTasks } = useWeeklyAgenda(userId);
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
    const newTasks = currentTasks.filter((_, i) => i !== taskIndex);
    await updateDayTasks(dayOfWeek, newTasks);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {agenda?.days.map((day) => {
            const dayDate = addDays(weekStart, day.dayOfWeek);
            const isToday = day.dayOfWeek === today;
            const isEditing = editingDay === day.dayOfWeek;

            return (
              <div
                key={day.dayOfWeek}
                className={`
                  p-3 rounded-lg backdrop-blur-sm border transition-all
                  ${isToday 
                    ? 'bg-primary/20 border-primary/50 ring-2 ring-primary/30' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className={`font-semibold text-sm ${isToday ? 'text-primary' : 'text-white'}`}>
                      {DAY_NAMES[day.dayOfWeek]}
                    </h4>
                    <span className="text-xs text-slate-400">
                      {format(dayDate, 'dd/MM')}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-white"
                    onClick={() => setEditingDay(isEditing ? null : day.dayOfWeek)}
                  >
                    {isEditing ? <X className="h-3 w-3" /> : <Edit2 className="h-3 w-3" />}
                  </Button>
                </div>

                <div className="space-y-1.5 min-h-[60px]">
                  {day.tasks.length === 0 && !isEditing && (
                    <p className="text-xs text-slate-500 italic">Nenhuma tarefa</p>
                  )}
                  
                  {day.tasks.map((task, taskIndex) => (
                    <div
                      key={taskIndex}
                      className="flex items-center gap-1 group"
                    >
                      {editingTaskIndex === taskIndex && isEditing ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            value={editingTaskValue}
                            onChange={(e) => setEditingTaskValue(e.target.value)}
                            className="h-6 text-xs bg-white/10 border-white/20"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditTask(day.dayOfWeek, taskIndex);
                              if (e.key === 'Escape') setEditingTaskIndex(null);
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-green-400"
                            onClick={() => handleEditTask(day.dayOfWeek, taskIndex)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs text-slate-300 flex-1 truncate">
                            • {task}
                          </span>
                          {isEditing && (
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-slate-400 hover:text-white"
                                onClick={() => startEditingTask(taskIndex, task)}
                              >
                                <Edit2 className="h-2.5 w-2.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-slate-400 hover:text-red-400"
                                onClick={() => handleRemoveTask(day.dayOfWeek, taskIndex)}
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}

                  {isEditing && (
                    <div className="flex items-center gap-1 mt-2">
                      <Input
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        placeholder="Nova tarefa..."
                        className="h-6 text-xs bg-white/10 border-white/20 placeholder:text-slate-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTask(day.dayOfWeek);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-primary hover:text-primary/80"
                        onClick={() => handleAddTask(day.dayOfWeek)}
                      >
                        <Plus className="h-3 w-3" />
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
