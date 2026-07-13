import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Trash2, PenTool, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ExerciseLog, MedicalArea, ClassItem } from '@/lib/types';
import { AREA_COLORS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { getPerformanceColor } from '@/lib/utils';
import { getLocalDateString, formatDateDisplay } from '@/lib/dateUtils';

interface ExercisesProps {
  exercises: ExerciseLog[];
  addExercise: (exercise: Omit<ExerciseLog, 'id'>) => Promise<void>;
  updateExercise: (id: string, updates: Partial<ExerciseLog>) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
  classes?: ClassItem[];
  onAutoCompleteReview?: (topic: string) => void;
}

export default function Exercises({
  exercises,
  addExercise,
  updateExercise,
  deleteExercise,
  classes = [],
  onAutoCompleteReview
}: ExercisesProps) {
  const isMountedRef = useRef(true);
  const [topicInputMode, setTopicInputMode] = useState<'manual' | 'class'>('manual');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [newExercise, setNewExercise] = useState<Partial<ExerciseLog>>({
    date: getLocalDateString(),
    area: MedicalArea.CLINICA,
    topic: '',
    totalQuestions: 0,
    correctAnswers: 0,
    blockName: ''
  });

  // Edit states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseLog | null>(null);
  const [editBlockName, setEditBlockName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editArea, setEditArea] = useState<MedicalArea>(MedicalArea.CLINICA);
  const [editTopicInputMode, setEditTopicInputMode] = useState<'manual' | 'class'>('manual');
  const [editSelectedClassId, setEditSelectedClassId] = useState<string>('');
  const [editTopic, setEditTopic] = useState('');
  const [editTotalQuestions, setEditTotalQuestions] = useState<number>(0);
  const [editCorrectAnswers, setEditCorrectAnswers] = useState<number>(0);
  const [selectedDetailTopic, setSelectedDetailTopic] = useState<string | null>(null);

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

  // Filter classes by selected area for editing
  const filteredEditClasses = useMemo(() => {
    return classes.filter(c => c.area === editArea);
  }, [classes, editArea]);

  // Topic detail view helper calculations
  const topicExercises = useMemo(() => {
    if (!selectedDetailTopic) return [];
    return exercises.filter(ex => ex.topic.toLowerCase() === selectedDetailTopic.toLowerCase());
  }, [exercises, selectedDetailTopic]);

  const topicSummary = useMemo(() => {
    const totalBlocks = topicExercises.length;
    const totalQuestions = topicExercises.reduce((sum, ex) => sum + ex.totalQuestions, 0);
    const totalCorrect = topicExercises.reduce((sum, ex) => sum + ex.correctAnswers, 0);
    const totalErrors = totalQuestions - totalCorrect;
    const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    return {
      totalBlocks,
      totalQuestions,
      totalCorrect,
      totalErrors,
      accuracy
    };
  }, [topicExercises]);

  const sortedTopicExercises = useMemo(() => {
    return [...topicExercises].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [topicExercises]);

  // When edit area changes, reset class selection
  useEffect(() => {
    if (isEditDialogOpen) {
      setEditSelectedClassId('');
      if (editTopicInputMode === 'class') {
        setEditTopic('');
      }
    }
  }, [editArea, editTopicInputMode, isEditDialogOpen]);

  // When edit class is selected, update topic
  useEffect(() => {
    if (editSelectedClassId && editTopicInputMode === 'class' && isEditDialogOpen) {
      const selectedClass = classes.find(c => c.id === editSelectedClassId);
      if (selectedClass) {
        setEditTopic(selectedClass.title);
      }
    }
  }, [editSelectedClassId, classes, editTopicInputMode, isEditDialogOpen]);

  const handleStartEdit = (ex: ExerciseLog) => {
    setEditingExercise(ex);
    setEditBlockName(ex.blockName || '');
    setEditDate(ex.date);
    setEditArea(ex.area);
    setEditTopicInputMode(ex.classId ? 'class' : 'manual');
    setEditSelectedClassId(ex.classId || '');
    setEditTopic(ex.topic);
    setEditTotalQuestions(ex.totalQuestions);
    setEditCorrectAnswers(ex.correctAnswers);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingExercise) return;

    if (!editTopic?.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o tópico.",
        variant: "destructive"
      });
      return;
    }

    if (editTotalQuestions < 1) {
      toast({
        title: "Quantidade inválida",
        description: "Informe o número de questões.",
        variant: "destructive"
      });
      return;
    }

    if (editCorrectAnswers > editTotalQuestions) {
      toast({
        title: "Valor inconsistente",
        description: "Acertos não podem ser maiores que o total de questões.",
        variant: "destructive"
      });
      return;
    }

    if (!editDate) {
      toast({
        title: "Campo obrigatório",
        description: "Informe a data de realização.",
        variant: "destructive"
      });
      return;
    }

    let finalArea = editArea;
    let finalTopic = editTopic;
    let finalClassId = null;

    if (editTopicInputMode === 'class' && editSelectedClassId) {
      const selectedClass = classes.find(c => c.id === editSelectedClassId);
      if (selectedClass) {
        finalArea = selectedClass.area;
        finalTopic = selectedClass.title;
        finalClassId = selectedClass.id;
      }
    }

    const updates: Partial<ExerciseLog> = {
      date: editDate,
      area: finalArea,
      topic: finalTopic,
      totalQuestions: editTotalQuestions,
      correctAnswers: editCorrectAnswers,
      classId: finalClassId,
      blockName: editBlockName || null
    };

    await updateExercise(editingExercise.id, updates);
    setIsEditDialogOpen(false);
    setEditingExercise(null);
    toast({
      title: "Exercício atualizado!",
      description: "O bloco de questões foi modificado com sucesso.",
    });
  };

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
      correctAnswers: newExercise.correctAnswers!,
      classId: topicInputMode === 'class' && selectedClassId ? selectedClassId : null,
      blockName: newExercise.blockName || null
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
      date: getLocalDateString(),
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

  const renderDetailView = () => {
    if (!selectedDetailTopic) return null;

    if (topicExercises.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <PenTool className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Ainda não existem questões registradas para o tema &quot;{selectedDetailTopic}&quot;.</p>
          <Button variant="link" onClick={() => setSelectedDetailTopic(null)} className="mt-2 text-primary">
            Voltar para a lista geral
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Consolidado KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 rounded-lg border bg-muted/40 text-center">
            <span className="block text-xs text-muted-foreground">Blocos Realizados</span>
            <span className="text-lg font-bold">{topicSummary.totalBlocks}</span>
          </div>
          <div className="p-3 rounded-lg border bg-muted/40 text-center">
            <span className="block text-xs text-muted-foreground">Total de Questões</span>
            <span className="text-lg font-bold">{topicSummary.totalQuestions}</span>
          </div>
          <div className="p-3 rounded-lg border bg-muted/40 text-center">
            <span className="block text-xs text-muted-foreground text-green-600">Acertos</span>
            <span className="text-lg font-bold text-green-600">{topicSummary.totalCorrect}</span>
          </div>
          <div className="p-3 rounded-lg border bg-muted/40 text-center">
            <span className="block text-xs text-muted-foreground text-red-500">Erros</span>
            <span className="text-lg font-bold text-red-500">{topicSummary.totalErrors}</span>
          </div>
          <div className="p-3 rounded-lg border bg-muted/40 text-center col-span-2 md:col-span-1">
            <span className="block text-xs text-muted-foreground">Desempenho Geral</span>
            <span className={`text-lg font-bold ${getPerformanceColor(topicSummary.accuracy)}`}>
              {topicSummary.accuracy.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Evolução Histórica */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground">Linha do Tempo e Evolução</h4>
          <div className="space-y-2 border-l-2 border-primary/20 pl-4 ml-2">
            {sortedTopicExercises.map((ex, index) => {
              const accuracy = (ex.correctAnswers / ex.totalQuestions) * 100;
              return (
                <div key={ex.id} className="relative py-2">
                  {/* Timeline dot */}
                  <span className="absolute -left-[23px] top-[14px] block w-2 h-2 rounded-full bg-primary" />
                  
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/40 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{ex.blockName || `Bloco ${index + 1}`}</span>
                        {ex.classId && (
                          <span className="text-[9px] text-green-600 bg-green-50 dark:bg-green-950/30 px-1 py-0.5 rounded font-mono">
                            Vinculado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{formatDateDisplay(ex.date)}</span>
                        <span>•</span>
                        <span className="font-medium text-foreground">
                          {ex.correctAnswers}/{ex.totalQuestions}
                        </span>
                        <span className={getPerformanceColor(accuracy)}>
                          {accuracy.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEdit(ex)}
                        className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(ex.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
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
            <div className="space-y-2 lg:col-span-3">
              <Label htmlFor="blockName">Nome do Bloco (Opcional)</Label>
              <Input
                id="blockName"
                placeholder="Ex: Simulado Clinica Médica 1"
                value={newExercise.blockName || ''}
                onChange={(e) => setNewExercise({ ...newExercise, blockName: e.target.value })}
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={newExercise.date}
                onChange={(e) => setNewExercise({ ...newExercise, date: e.target.value })}
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PenTool className="w-5 h-5" />
              {selectedDetailTopic ? `Histórico: ${selectedDetailTopic}` : `Histórico de Questões (${exercises.length})`}
            </CardTitle>
            {selectedDetailTopic && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDetailTopic(null)}
              >
                Voltar para Geral
              </Button>
            )}
          </div>
          <CardDescription>
            {selectedDetailTopic
              ? "Detalhamento e estatísticas evolutivas do tema"
              : `${exercises.reduce((sum, ex) => sum + ex.totalQuestions, 0)} questões realizadas`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedDetailTopic ? (
            renderDetailView()
          ) : (
            <div className="space-y-2">
              {sortedExercises.map(ex => {
                const accuracy = (ex.correctAnswers / ex.totalQuestions) * 100;
                return (
                  <div
                    key={ex.id}
                    className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{ backgroundColor: AREA_COLORS[ex.area] }}
                        />
                        <span
                          className={`font-medium ${!ex.blockName ? 'cursor-pointer hover:underline hover:text-primary transition-colors' : ''}`}
                          onClick={!ex.blockName ? () => setSelectedDetailTopic(ex.topic) : undefined}
                        >
                          {ex.blockName || ex.topic}
                        </span>
                        {ex.blockName && (
                          <span
                            className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:underline hover:text-primary transition-colors"
                            onClick={() => setSelectedDetailTopic(ex.topic)}
                          >
                            {ex.topic}
                          </span>
                        )}
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">{ex.area}</span>
                        {ex.classId && (
                          <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-950/30 px-1 py-0.5 rounded font-mono border border-green-200 dark:border-green-800">
                            Vinculado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{formatDateDisplay(ex.date)}</span>
                        <span className="font-medium text-foreground">
                          {ex.correctAnswers}/{ex.totalQuestions}
                        </span>
                        <span className={getPerformanceColor(accuracy)}>
                          {accuracy.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEdit(ex)}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(ex.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Bloco de Questões</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editBlockName">Nome do Bloco (Opcional)</Label>
              <Input
                id="editBlockName"
                placeholder="Ex: Simulado Clinica Médica 1"
                value={editBlockName}
                onChange={(e) => setEditBlockName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editDate">Data de Realização</Label>
                <Input
                  id="editDate"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editArea">Área / Disciplina</Label>
                <Select value={editArea} onValueChange={(v) => setEditArea(v as MedicalArea)}>
                  <SelectTrigger id="editArea">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(MedicalArea).map(area => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tópico / Assunto</Label>
              <div className="space-y-3">
                <RadioGroup
                  value={editTopicInputMode}
                  onValueChange={(v) => {
                    setEditTopicInputMode(v as 'manual' | 'class');
                    if (v === 'manual') {
                      setEditSelectedClassId('');
                      setEditTopic('');
                    }
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual" id="edit-manual" />
                    <Label htmlFor="edit-manual" className="cursor-pointer text-sm font-normal">Digite manualmente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="class" id="edit-class" />
                    <Label htmlFor="edit-class" className="cursor-pointer text-sm font-normal">Selecionar de uma aula</Label>
                  </div>
                </RadioGroup>

                {editTopicInputMode === 'manual' ? (
                  <Input
                    id="edit-topic"
                    placeholder="Ex: Hipertensão"
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                  />
                ) : (
                  <Select
                    value={editSelectedClassId}
                    onValueChange={setEditSelectedClassId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        filteredEditClasses.length === 0
                          ? "Nenhuma aula nesta área"
                          : "Selecione uma aula"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredEditClasses.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhuma aula em {editArea}
                        </SelectItem>
                      ) : (
                        filteredEditClasses.map(cls => (
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editTotal">Questões Totais</Label>
                <Input
                  id="editTotal"
                  type="number"
                  min={1}
                  value={editTotalQuestions || ''}
                  onChange={(e) => setEditTotalQuestions(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editCorrect">Acertos</Label>
                <Input
                  id="editCorrect"
                  type="number"
                  min={0}
                  value={editCorrectAnswers || ''}
                  onChange={(e) => setEditCorrectAnswers(Number(e.target.value))}
                />
              </div>
            </div>

            {editTotalQuestions > 0 && (
              <div className="text-sm font-medium text-muted-foreground pt-2">
                Desempenho: <span className={getPerformanceColor((editCorrectAnswers / editTotalQuestions) * 100)}>
                  {((editCorrectAnswers / editTotalQuestions) * 100).toFixed(1)}%
                </span> ({editCorrectAnswers}/{editTotalQuestions})
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
