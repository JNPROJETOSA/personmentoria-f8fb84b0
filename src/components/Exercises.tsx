import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Trash2, PenTool } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ExerciseLog, MedicalArea, ClassItem } from '@/lib/types';
import { AREA_COLORS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { getPerformanceColor } from '@/lib/utils';

interface ExercisesProps {
  exercises: ExerciseLog[];
  addExercise: (exercise: Omit<ExerciseLog, 'id'>) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
  classes?: ClassItem[];
  onAutoCompleteReview?: (topic: string) => void;
}

export default function Exercises({
  exercises,
  addExercise,
  deleteExercise,
  classes = [],
  onAutoCompleteReview
}: ExercisesProps) {
  const isMountedRef = useRef(true);
  const [topicInputMode, setTopicInputMode] = useState<'manual' | 'class'>('manual');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [newExercise, setNewExercise] = useState<Partial<ExerciseLog>>({
    date: new Date().toISOString().split('T')[0],
    area: MedicalArea.CLINICA,
    topic: '',
    totalQuestions: 0,
    correctAnswers: 0
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Filter classes by selected area - REMOVED 'studied' filter to allow linking to any class
  const filteredClasses = useMemo(() => {
    return classes.filter(c => c.area === newExercise.area);
  }, [classes, newExercise.area]);

  // When area changes, reset class selection
  useEffect(() => {
    setSelectedClassId('');
    if (topicInputMode === 'class') {
      setNewExercise(prev => ({ ...prev, topic: '' }));
    }
  }, [newExercise.area, topicInputMode]);

  // When class is selected, update topic
  useEffect(() => {
    if (selectedClassId && topicInputMode === 'class') {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      if (selectedClass) {
        setNewExercise(prev => ({ ...prev, topic: selectedClass.title }));
      }
    }
  }, [selectedClassId, classes, topicInputMode]);

  const handleAdd = async () => {
    if (!newExercise.topic?.trim()) {
      if (isMountedRef.current) {
        toast({
          title: "Campo obrigatório",
          description: "Por favor, informe o tópico estudado.",
          variant: "destructive"
        });
      }
      return;
    }

    if (!newExercise.totalQuestions || newExercise.totalQuestions < 1) {
      if (isMountedRef.current) {
        toast({
          title: "Quantidade inválida",
          description: "Informe o número de questões realizadas.",
          variant: "destructive"
        });
      }
      return;
    }

    if (newExercise.correctAnswers! > newExercise.totalQuestions!) {
      if (isMountedRef.current) {
        toast({
          title: "Valor inconsistente",
          description: "Acertos não podem ser maiores que o total de questões.",
          variant: "destructive"
        });
      }
      return;
    }

    const item: Omit<ExerciseLog, 'id'> = {
      date: newExercise.date!,
      area: newExercise.area!,
      topic: newExercise.topic,
      totalQuestions: newExercise.totalQuestions,
      correctAnswers: newExercise.correctAnswers!
    };

    await addExercise(item);

    // Auto-complete review for this topic if callback provided
    if (onAutoCompleteReview) {
      onAutoCompleteReview(item.topic);
    }

    if (!isMountedRef.current) return;

    const accuracy = (item.correctAnswers / item.totalQuestions) * 100;
    toast({
      title: "Exercício registrado!",
      description: `${item.correctAnswers}/${item.totalQuestions} corretas (${accuracy.toFixed(0)}%)`,
    });

    setNewExercise({
      date: new Date().toISOString().split('T')[0],
      area: MedicalArea.CLINICA,
      topic: '',
      totalQuestions: 0,
      correctAnswers: 0
    });
    setSelectedClassId('');
    setTopicInputMode('manual');
  };

  const handleDelete = async (id: string) => {
    await deleteExercise(id);
    if (isMountedRef.current) {
      toast({
        title: "Exercício removido",
        description: "O registro foi excluído.",
      });
    }
  };

  const sortedExercises = [...exercises].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Add New Exercise */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Registrar Questões
          </CardTitle>
          <CardDescription>Acompanhe sua prática diária</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={newExercise.date}
                onChange={(e) => setNewExercise({ ...newExercise, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Área</Label>
              <Select value={newExercise.area} onValueChange={(value) => setNewExercise({ ...newExercise, area: value as MedicalArea })}>
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

            <div className="space-y-2 lg:col-span-3">
              <Label>Tópico</Label>
              <div className="space-y-3">
                <RadioGroup
                  value={topicInputMode}
                  onValueChange={(v) => {
                    setTopicInputMode(v as 'manual' | 'class');
                    if (v === 'manual') {
                      setSelectedClassId('');
                      setNewExercise(prev => ({ ...prev, topic: '' }));
                    }
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual" id="manual" />
                    <Label htmlFor="manual" className="cursor-pointer text-sm">Digite manualmente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="class" id="class" />
                    <Label htmlFor="class" className="cursor-pointer text-sm">Selecionar de uma aula</Label>
                  </div>
                </RadioGroup>

                {topicInputMode === 'manual' ? (
                  <Input
                    id="topic"
                    placeholder="Ex: Hipertensão"
                    value={newExercise.topic}
                    onChange={(e) => setNewExercise({ ...newExercise, topic: e.target.value })}
                  />
                ) : (
                  <Select
                    value={selectedClassId}
                    onValueChange={setSelectedClassId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        filteredClasses.length === 0
                          ? "Nenhuma aula nesta área"
                          : "Selecione uma aula"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredClasses.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhuma aula em {newExercise.area}
                        </SelectItem>
                      ) : (
                        filteredClasses.map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total">Total de Questões</Label>
              <Input
                id="total"
                type="number"
                min={1}
                placeholder="20"
                value={newExercise.totalQuestions || ''}
                onChange={(e) => setNewExercise({ ...newExercise, totalQuestions: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="correct">Acertos</Label>
              <Input
                id="correct"
                type="number"
                min={0}
                placeholder="15"
                value={newExercise.correctAnswers || ''}
                onChange={(e) => setNewExercise({ ...newExercise, correctAnswers: Number(e.target.value) })}
              />
            </div>
          </div>

          <Button onClick={handleAdd} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Registro
          </Button>
        </CardContent>
      </Card>

      {/* Exercises List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="w-5 h-5" />
            Histórico de Questões ({exercises.length})
          </CardTitle>
          <CardDescription>
            {exercises.reduce((sum, ex) => sum + ex.totalQuestions, 0)} questões realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedExercises.map(ex => {
              const accuracy = (ex.correctAnswers / ex.totalQuestions) * 100;
              return (
                <div
                  key={ex.id}
                  className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: AREA_COLORS[ex.area] }}
                      />
                      <span className="font-medium">{ex.topic}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{ex.area}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{new Date(ex.date).toLocaleDateString('pt-BR')}</span>
                      <span className="font-medium text-foreground">
                        {ex.correctAnswers}/{ex.totalQuestions}
                      </span>
                      <span className={getPerformanceColor(accuracy)}>
                        {accuracy.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(ex.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}

            {sortedExercises.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <PenTool className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma questão registrada ainda.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
