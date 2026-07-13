import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  History,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  PenTool,
  FileText,
  Calendar,
  Save,
  X,
  Filter,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { MedicalArea } from '@/lib/types';
import { EXAM_INSTITUTIONS } from '@/lib/constants';
import { getPerformanceColor } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  useAcademicHistory,
  ActivityType,
  AdminRecord,
  AdminExercise,
  AdminExam,
  AdminClass,
  AdminReview,
} from '@/hooks/useAcademicHistory';

// ── Props ──
interface AcademicHistorySectionProps {
  studentUserId: string;
  studentName: string;
  isStudentView?: boolean;
}

// ── Activity type labels & icons ──
const ACTIVITY_LABELS: Record<ActivityType, string> = {
  exercise: 'Exercício / Questões',
  exam: 'Prova / Simulado',
  class: 'Aula',
  review: 'Revisão',
};

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  exercise: <PenTool className="w-4 h-4" />,
  exam: <FileText className="w-4 h-4" />,
  class: <BookOpen className="w-4 h-4" />,
  review: <Calendar className="w-4 h-4" />,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  exercise: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  exam: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  class: 'bg-green-500/10 text-green-700 border-green-500/30',
  review: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
};

// ── Component ──
export function AcademicHistorySection({ studentUserId, studentName, isStudentView = false }: AcademicHistorySectionProps) {
  const history = useAcademicHistory(studentUserId);

  // ── UI State ──
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: ActivityType; id: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Form State ──
  const [activityType, setActivityType] = useState<ActivityType>('exercise');

  // Exercise form
  const [exDate, setExDate] = useState('');
  const [exArea, setExArea] = useState<string>(MedicalArea.CLINICA);
  const [exTopic, setExTopic] = useState('');
  const [exTotal, setExTotal] = useState<number>(0);
  const [exCorrect, setExCorrect] = useState<number>(0);

  // Exam form
  const [examName, setExamName] = useState('');
  const [examInstitution, setExamInstitution] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examAreas, setExamAreas] = useState<MedicalArea[]>([]);
  const [examAreaInputs, setExamAreaInputs] = useState<Record<string, { correct: number; total: number }>>({});

  // Class form
  const [clsTitle, setClsTitle] = useState('');
  const [clsArea, setClsArea] = useState<string>(MedicalArea.CLINICA);
  const [clsDate, setClsDate] = useState('');
  const [clsStudied, setClsStudied] = useState(true);
  const [clsPriority, setClsPriority] = useState<number>(2);

  // Review form
  const [revTopic, setRevTopic] = useState('');
  const [revDate, setRevDate] = useState('');
  const [revCompleted, setRevCompleted] = useState(true);
  const [revPriority, setRevPriority] = useState<number>(2);
  const [revArea, setRevArea] = useState<string>(MedicalArea.CLINICA);

  // ── Student classes and topic input modes ──
  const [studentClasses, setStudentClasses] = useState<any[]>([]);

  // Exercise topic input mode
  const [exTopicInputMode, setExTopicInputMode] = useState<'manual' | 'class'>('manual');
  const [exSelectedClassId, setExSelectedClassId] = useState<string>('');

  // Review topic input mode
  const [revTopicInputMode, setRevTopicInputMode] = useState<'manual' | 'class'>('manual');
  const [revSelectedClassId, setRevSelectedClassId] = useState<string>('');

  // ── Edit State ──
  const [editRecord, setEditRecord] = useState<AdminRecord | null>(null);

  // ── Filters ──
  const [filterType, setFilterType] = useState<'all' | ActivityType>('all');
  const [filterArea, setFilterArea] = useState<'all' | string>('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // Fetch student classes when studentUserId changes or history.classes updates
  useEffect(() => {
    const fetchStudentClasses = async () => {
      if (!studentUserId) return;
      const { data, error } = await supabase
        .from('classes')
        .select('id, title, specialty, studied')
        .eq('user_id', studentUserId);
      if (error) {
        console.error('Error fetching student classes:', error);
      } else {
        setStudentClasses(data || []);
      }
    };
    fetchStudentClasses();
  }, [studentUserId, history.classes]);

  // Filter classes by selected area for exercises
  const filteredExClasses = useMemo(() => {
    return studentClasses.filter(c => c.specialty === exArea);
  }, [studentClasses, exArea]);

  // When exercise area changes, reset class selection
  useEffect(() => {
    setExSelectedClassId('');
    if (exTopicInputMode === 'class') {
      setExTopic('');
    }
  }, [exArea, exTopicInputMode]);

  // When exercise class is selected, update topic
  useEffect(() => {
    if (exSelectedClassId && exTopicInputMode === 'class') {
      const selectedClass = studentClasses.find(c => c.id === exSelectedClassId);
      if (selectedClass) {
        setExTopic(selectedClass.title);
      }
    }
  }, [exSelectedClassId, studentClasses, exTopicInputMode]);

  // Filter classes by selected area for reviews
  const filteredRevClasses = useMemo(() => {
    return studentClasses.filter(c => c.specialty === revArea);
  }, [studentClasses, revArea]);

  // When review area changes, reset class selection
  useEffect(() => {
    setRevSelectedClassId('');
    if (revTopicInputMode === 'class') {
      setRevTopic('');
    }
  }, [revArea, revTopicInputMode]);

  // When review class is selected, update topic
  useEffect(() => {
    if (revSelectedClassId && revTopicInputMode === 'class') {
      const selectedClass = studentClasses.find(c => c.id === revSelectedClassId);
      if (selectedClass) {
        setRevTopic(selectedClass.title);
      }
    }
  }, [revSelectedClassId, studentClasses, revTopicInputMode]);

  // ── Helpers ──

  const resetForm = () => {
    setExDate('');
    setExArea(MedicalArea.CLINICA);
    setExTopic('');
    setExTotal(0);
    setExCorrect(0);
    setExTopicInputMode('manual');
    setExSelectedClassId('');
    setExamName('');
    setExamInstitution('');
    setExamDate('');
    setExamAreas([]);
    setExamAreaInputs({});
    setClsTitle('');
    setClsArea(MedicalArea.CLINICA);
    setClsDate('');
    setClsStudied(true);
    setClsPriority(2);
    setRevTopic('');
    setRevDate('');
    setRevCompleted(true);
    setRevPriority(2);
    setRevTopicInputMode('manual');
    setRevSelectedClassId('');
    setRevArea(MedicalArea.CLINICA);
  };

  const openAddForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditDialog = (record: AdminRecord) => {
    setEditRecord(record);
    // Pre-fill form based on type
    if (record.type === 'exercise') {
      const d = record.data as AdminExercise;
      setActivityType('exercise');
      setExDate(d.date);
      setExArea(d.area);
      setExTopic(d.topic);
      setExTotal(d.totalQuestions);
      setExCorrect(d.correctAnswers);
      setExTopicInputMode('manual');
      setExSelectedClassId('');
    } else if (record.type === 'exam') {
      const d = record.data as AdminExam;
      setActivityType('exam');
      setExamName(d.name);
      setExamInstitution(d.institution);
      setExamDate(d.date);
      const perf = d.performance;
      setExamAreas(perf.areas as MedicalArea[]);
      const inputs: Record<string, { correct: number; total: number }> = {};
      (perf.areaDetails || []).forEach((ad) => {
        inputs[ad.area] = { correct: ad.correct, total: ad.total };
      });
      setExamAreaInputs(inputs);
    } else if (record.type === 'class') {
      const d = record.data as AdminClass;
      setActivityType('class');
      setClsTitle(d.title);
      setClsArea(d.area);
      setClsDate(d.date);
      setClsStudied(d.studied);
      setClsPriority(d.priority);
    } else if (record.type === 'review') {
      const d = record.data as AdminReview;
      setActivityType('review');
      setRevTopic(d.topic);
      setRevDate(d.date);
      setRevCompleted(d.completed);
      setRevPriority(d.priority);
      setRevArea(d.area || MedicalArea.CLINICA);
      setRevTopicInputMode('manual');
      setRevSelectedClassId('');
    }
    setIsEditDialogOpen(true);
  };

  // ── Save Handlers ──

  const handleSave = async () => {
    setSaving(true);
    let success = false;

    try {
      if (activityType === 'exercise') {
        if (!exDate) {
          toast({ title: 'Campo obrigatório', description: 'Informe a data de realização.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        if (!exTopic.trim()) {
          toast({ title: 'Campo obrigatório', description: 'Informe o tópico.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        if (exTotal < 1) {
          toast({ title: 'Valor inválido', description: 'Informe o total de questões.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        if (exCorrect > exTotal) {
          toast({ title: 'Valor inconsistente', description: 'Acertos não podem ser maiores que o total.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        success = await history.addExercise({
          date: exDate,
          area: exArea,
          topic: exTopic,
          totalQuestions: exTotal,
          correctAnswers: exCorrect,
        });
      } else if (activityType === 'exam') {
        if (!examDate) {
          toast({ title: 'Campo obrigatório', description: 'Informe a data de realização.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        if (!examName.trim()) {
          toast({ title: 'Campo obrigatório', description: 'Informe o nome da prova.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        if (!examInstitution.trim()) {
          toast({ title: 'Campo obrigatório', description: 'Informe a instituição.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        const areaDetails = examAreas.map((area) => ({
          area,
          correct: examAreaInputs[area]?.correct || 0,
          total: examAreaInputs[area]?.total || 0,
        }));
        const totalQ = areaDetails.reduce((s, a) => s + a.total, 0);
        const totalC = areaDetails.reduce((s, a) => s + a.correct, 0);
        success = await history.addExam({
          name: examName,
          institution: examInstitution,
          date: examDate,
          totalQuestions: totalQ,
          correctAnswers: totalC,
          areas: examAreas,
          areaDetails,
        });
      } else if (activityType === 'class') {
        if (!clsDate) {
          toast({ title: 'Campo obrigatório', description: 'Informe a data.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        if (!clsTitle.trim()) {
          toast({ title: 'Campo obrigatório', description: 'Informe o título da aula.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        success = await history.addClass({
          title: clsTitle,
          area: clsArea,
          date: clsDate,
          studied: clsStudied,
          priority: clsPriority,
        });
      } else if (activityType === 'review') {
        if (!revDate) {
          toast({ title: 'Campo obrigatório', description: 'Informe a data de realização.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        if (!revTopic.trim()) {
          toast({ title: 'Campo obrigatório', description: 'Informe o tópico da revisão.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        success = await history.addReview({
          topic: revTopic,
          date: revDate,
          completed: revCompleted,
          priority: revPriority,
          area: revArea,
          dueDate: revDate,
        });
      }

      if (success) {
        toast({ title: 'Registro adicionado!', description: `Atividade cadastrada para ${studentName}.` });
        resetForm();
        setIsFormOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editRecord) return;
    setSaving(true);

    try {
      let success = false;

      if (editRecord.type === 'exercise') {
        if (!exDate) {
          toast({ title: 'Campo obrigatório', description: 'Informe a data de realização.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        success = await history.updateExercise(editRecord.data.id, {
          date: exDate,
          area: exArea,
          topic: exTopic,
          totalQuestions: exTotal,
          correctAnswers: exCorrect,
        });
      } else if (editRecord.type === 'exam') {
        if (!examDate) {
          toast({ title: 'Campo obrigatório', description: 'Informe a data de realização.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        const areaDetails = examAreas.map((area) => ({
          area,
          correct: examAreaInputs[area]?.correct || 0,
          total: examAreaInputs[area]?.total || 0,
        }));
        const totalQ = areaDetails.reduce((s, a) => s + a.total, 0);
        const totalC = areaDetails.reduce((s, a) => s + a.correct, 0);
        success = await history.updateExam(editRecord.data.id, {
          name: examName,
          institution: examInstitution,
          date: examDate,
          performance: { totalQuestions: totalQ, correctAnswers: totalC, areas: examAreas, areaDetails },
        });
      } else if (editRecord.type === 'class') {
        if (!clsDate) {
          toast({ title: 'Campo obrigatório', description: 'Informe a data.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        success = await history.updateClass(editRecord.data.id, {
          title: clsTitle,
          area: clsArea,
          date: clsDate,
          studied: clsStudied,
          priority: clsPriority,
        });
      } else if (editRecord.type === 'review') {
        if (!revDate) {
          toast({ title: 'Campo obrigatório', description: 'Informe a data de realização.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        success = await history.updateReview(editRecord.data.id, {
          topic: revTopic,
          date: revDate,
          completed: revCompleted,
          priority: revPriority,
          area: revArea,
          dueDate: revDate,
        });
      }

      if (success) {
        toast({ title: 'Registro atualizado!', description: 'As alterações foram salvas.' });
        setIsEditDialogOpen(false);
        setEditRecord(null);
        resetForm();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    let success = false;

    if (deleteTarget.type === 'exercise') success = await history.deleteExercise(deleteTarget.id);
    else if (deleteTarget.type === 'exam') success = await history.deleteExam(deleteTarget.id);
    else if (deleteTarget.type === 'class') success = await history.deleteClass(deleteTarget.id);
    else if (deleteTarget.type === 'review') success = await history.deleteReview(deleteTarget.id);

    if (success) {
      toast({ title: 'Registro excluído', description: 'O registro foi removido do histórico e das estatísticas.' });
    }
    setDeleteTarget(null);
  };

  // Exam area toggle
  const toggleExamArea = (area: MedicalArea) => {
    if (examAreas.includes(area)) {
      setExamAreas(examAreas.filter((a) => a !== area));
      const newInputs = { ...examAreaInputs };
      delete newInputs[area];
      setExamAreaInputs(newInputs);
    } else {
      setExamAreas([...examAreas, area]);
      setExamAreaInputs({ ...examAreaInputs, [area]: { correct: 0, total: 0 } });
    }
  };

  // ── Filtered records ──
  const filteredRecords = useMemo(() => {
    return history.allRecords.filter((record) => {
      // Type filter
      if (filterType !== 'all' && record.type !== filterType) return false;

      // Area filter
      if (filterArea !== 'all') {
        let area = '';
        if (record.type === 'exercise') area = (record.data as AdminExercise).area;
        else if (record.type === 'class') area = (record.data as AdminClass).area;
        // exams and reviews don't have single area, skip
        if (area && area !== filterArea) return false;
      }

      // Date filter
      const date = record.data.date || '';
      if (filterDateStart && date < filterDateStart) return false;
      if (filterDateEnd && date > filterDateEnd) return false;

      return true;
    });
  }, [history.allRecords, filterType, filterArea, filterDateStart, filterDateEnd]);

  const hasFilters = filterType !== 'all' || filterArea !== 'all' || filterDateStart || filterDateEnd;

  // ── Render Form Fields ──
  const renderFormFields = () => {
    switch (activityType) {
      case 'exercise':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Realização</Label>
                <Input type="date" value={exDate} onChange={(e) => setExDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Área / Disciplina</Label>
                <Select value={exArea} onValueChange={setExArea}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(MedicalArea).map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tópico / Assunto</Label>
              <div className="space-y-3">
                <RadioGroup
                  value={exTopicInputMode}
                  onValueChange={(v) => {
                    setExTopicInputMode(v as 'manual' | 'class');
                    if (v === 'manual') {
                      setExSelectedClassId('');
                      setExTopic('');
                    }
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual" id="ex-manual" />
                    <Label htmlFor="ex-manual" className="cursor-pointer text-sm font-normal">Digite manualmente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="class" id="ex-class" />
                    <Label htmlFor="ex-class" className="cursor-pointer text-sm font-normal">Selecionar de uma aula</Label>
                  </div>
                </RadioGroup>

                {exTopicInputMode === 'manual' ? (
                  <Input
                    placeholder="Ex: Hipertensão Arterial"
                    value={exTopic}
                    onChange={(e) => setExTopic(e.target.value)}
                  />
                ) : (
                  <Select
                    value={exSelectedClassId}
                    onValueChange={setExSelectedClassId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        filteredExClasses.length === 0
                          ? "Nenhuma aula nesta área"
                          : "Selecione uma aula"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredExClasses.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhuma aula em {exArea}
                        </SelectItem>
                      ) : (
                        filteredExClasses.map(cls => (
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
                <Label>Total de Questões</Label>
                <Input type="number" min={1} value={exTotal || ''} onChange={(e) => setExTotal(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Acertos</Label>
                <Input type="number" min={0} value={exCorrect || ''} onChange={(e) => setExCorrect(Number(e.target.value))} />
              </div>
            </div>
            {exTotal > 0 && (
              <div className="text-sm text-muted-foreground">
                Desempenho: <span className={`font-semibold ${getPerformanceColor((exCorrect / exTotal) * 100)}`}>
                  {((exCorrect / exTotal) * 100).toFixed(1)}%
                </span> ({exCorrect}/{exTotal})
              </div>
            )}
          </div>
        );

      case 'exam':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Prova</Label>
                <Input placeholder="Ex: ENARE 2023" value={examName} onChange={(e) => setExamName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Instituição / Banca</Label>
                <Select value={examInstitution} onValueChange={setExamInstitution}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {EXAM_INSTITUTIONS.map((inst) => (
                      <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data de Realização</Label>
              <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Áreas da Prova</Label>
              <div className="flex flex-wrap gap-2">
                {Object.values(MedicalArea).map((area) => (
                  <div key={area} className="flex items-center space-x-2">
                    <Checkbox
                      id={`exam-area-${area}`}
                      checked={examAreas.includes(area)}
                      onCheckedChange={() => toggleExamArea(area)}
                    />
                    <label htmlFor={`exam-area-${area}`} className="text-sm cursor-pointer">{area}</label>
                  </div>
                ))}
              </div>
            </div>
            {examAreas.length > 0 && (
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                <p className="text-sm font-medium">Detalhamento por Área</p>
                {examAreas.map((area) => (
                  <div key={area} className="grid grid-cols-3 gap-3 items-center">
                    <span className="text-sm font-medium">{area}</span>
                    <div className="space-y-1">
                      <Label className="text-xs">Acertos</Label>
                      <Input
                        type="number"
                        min={0}
                        value={examAreaInputs[area]?.correct || ''}
                        onChange={(e) =>
                          setExamAreaInputs({
                            ...examAreaInputs,
                            [area]: { ...examAreaInputs[area], correct: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Total</Label>
                      <Input
                        type="number"
                        min={0}
                        value={examAreaInputs[area]?.total || ''}
                        onChange={(e) =>
                          setExamAreaInputs({
                            ...examAreaInputs,
                            [area]: { ...examAreaInputs[area], total: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
                {(() => {
                  const totalQ = Object.values(examAreaInputs).reduce((s, a) => s + a.total, 0);
                  const totalC = Object.values(examAreaInputs).reduce((s, a) => s + a.correct, 0);
                  return totalQ > 0 ? (
                    <div className="text-sm pt-2 border-t">
                      Total: <span className={`font-semibold ${getPerformanceColor((totalC / totalQ) * 100)}`}>
                        {totalC}/{totalQ} ({((totalC / totalQ) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        );

      case 'class':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título da Aula</Label>
              <Input placeholder="Ex: Calendário Vacinal" value={clsTitle} onChange={(e) => setClsTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área / Disciplina</Label>
                <Select value={clsArea} onValueChange={setClsArea}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(MedicalArea).map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={clsDate} onChange={(e) => setClsDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={String(clsPriority)} onValueChange={(v) => setClsPriority(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Alta</SelectItem>
                    <SelectItem value="2">Média</SelectItem>
                    <SelectItem value="3">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="cls-studied"
                    checked={clsStudied}
                    onCheckedChange={(checked) => setClsStudied(checked as boolean)}
                  />
                  <label htmlFor="cls-studied" className="text-sm cursor-pointer">
                    Já foi estudada
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Realização</Label>
                <Input type="date" value={revDate} onChange={(e) => setRevDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Área / Disciplina</Label>
                <Select value={revArea} onValueChange={setRevArea}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(MedicalArea).map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tópico / Assunto</Label>
              <div className="space-y-3">
                <RadioGroup
                  value={revTopicInputMode}
                  onValueChange={(v) => {
                    setRevTopicInputMode(v as 'manual' | 'class');
                    if (v === 'manual') {
                      setRevSelectedClassId('');
                      setRevTopic('');
                    }
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual" id="rev-manual" />
                    <Label htmlFor="rev-manual" className="cursor-pointer text-sm font-normal">Digite manualmente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="class" id="rev-class" />
                    <Label htmlFor="rev-class" className="cursor-pointer text-sm font-normal">Selecionar de uma aula</Label>
                  </div>
                </RadioGroup>

                {revTopicInputMode === 'manual' ? (
                  <Input
                    placeholder="Ex: Insuficiência Cardíaca"
                    value={revTopic}
                    onChange={(e) => setRevTopic(e.target.value)}
                  />
                ) : (
                  <Select
                    value={revSelectedClassId}
                    onValueChange={setRevSelectedClassId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        filteredRevClasses.length === 0
                          ? "Nenhuma aula nesta área"
                          : "Selecione uma aula"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredRevClasses.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhuma aula em {revArea}
                        </SelectItem>
                      ) : (
                        filteredRevClasses.map(cls => (
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={String(revPriority)} onValueChange={(v) => setRevPriority(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Alta</SelectItem>
                    <SelectItem value="2">Média</SelectItem>
                    <SelectItem value="3">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="rev-completed"
                    checked={revCompleted}
                    onCheckedChange={(checked) => setRevCompleted(checked as boolean)}
                  />
                  <label htmlFor="rev-completed" className="text-sm cursor-pointer">
                    Revisão já concluída
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  // ── Record display helpers ──
  const getRecordSummary = (record: AdminRecord): string => {
    switch (record.type) {
      case 'exercise': {
        const d = record.data as AdminExercise;
        return `${d.topic} — ${d.correctAnswers}/${d.totalQuestions} (${((d.correctAnswers / d.totalQuestions) * 100).toFixed(0)}%)`;
      }
      case 'exam': {
        const d = record.data as AdminExam;
        const perf = d.performance;
        return `${d.name} — ${d.institution} (${perf.correctAnswers}/${perf.totalQuestions})`;
      }
      case 'class': {
        const d = record.data as AdminClass;
        return `${d.title} — ${d.studied ? 'Estudada' : 'Pendente'}`;
      }
      case 'review': {
        const d = record.data as AdminReview;
        return `${d.topic} — ${d.completed ? 'Concluída' : 'Pendente'}`;
      }
    }
  };

  const getRecordArea = (record: AdminRecord): string => {
    switch (record.type) {
      case 'exercise': return (record.data as AdminExercise).area;
      case 'class': return (record.data as AdminClass).area;
      case 'exam': return (record.data as AdminExam).institution;
      case 'review': return '—';
    }
  };

  const getRecordDate = (record: AdminRecord): string => {
    return record.data.date || '';
  };

  // ── RENDER ──
  return (
    <Card className="border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-500" />
          {isStudentView ? 'Cadastrar Histórico Anterior' : 'Histórico Acadêmico Anterior'}
        </CardTitle>
        <CardDescription>
          {isStudentView
            ? 'Cadastre retroativamente suas atividades acadêmicas realizadas antes de ingressar na plataforma. Seus registros integrarão automaticamente seus painéis e estatísticas.'
            : <>Cadastre retroativamente atividades realizadas por <strong>{studentName}</strong> antes da entrada na plataforma. Os registros serão integrados automaticamente ao progresso, gráficos e estatísticas.</>}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Add button ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="w-4 h-4" />
            <span>{history.allRecords.length} registro(s) {isStudentView ? 'cadastrado(s)' : 'administrativo(s)'}</span>
          </div>
          <Button onClick={openAddForm} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4" />
            Adicionar Registro
          </Button>
        </div>

        {/* ── Add Form (inline collapsible) ── */}
        {isFormOpen && (
          <div className="border-2 border-emerald-500/30 rounded-lg p-5 bg-card/80 space-y-5 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Novo Registro Retroativo
              </h4>
              <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Student confirmation badge */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-sm">
                {isStudentView
                  ? 'Este registro será adicionado ao seu histórico acadêmico anterior.'
                  : <>Este registro será adicionado ao aluno <strong className="text-emerald-700">{studentName}</strong></>}
              </span>
            </div>

            {/* Activity type selector */}
            <div className="space-y-2">
              <Label>Tipo de Atividade</Label>
              <Select value={activityType} onValueChange={(v) => setActivityType(v as ActivityType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ACTIVITY_LABELS) as [ActivityType, string][]).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        {ACTIVITY_ICONS[key]}
                        {label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic form fields */}
            {renderFormFields()}

            {/* Save button */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar Registro'}
              </Button>
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        {history.allRecords.length > 0 && (
          <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-muted/20">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              Filtros
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(Object.entries(ACTIVITY_LABELS) as [ActivityType, string][]).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Área</Label>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.values(MedicalArea).map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" className="w-[140px] h-8 text-xs" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" className="w-[140px] h-8 text-xs" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} />
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setFilterType('all');
                  setFilterArea('all');
                  setFilterDateStart('');
                  setFilterDateEnd('');
                }}
              >
                Limpar
              </Button>
            )}
          </div>
        )}

        {/* ── Records Table ── */}
        {history.loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2" />
            Carregando histórico...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{hasFilters ? 'Nenhum registro encontrado com os filtros aplicados.' : isStudentView ? 'Nenhum registro cadastrado ainda.' : 'Nenhum registro administrativo cadastrado.'}</p>
            {!hasFilters && (
              <p className="text-sm mt-1">
                {isStudentView ? 'Clique em "Adicionar Registro" para cadastrar seu histórico.' : 'Clique em "Adicionar Registro" para cadastrar o histórico do aluno.'}
              </p>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px]">Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead className="text-center w-[110px]">Data</TableHead>
                  <TableHead className="text-center w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={`${record.type}-${record.data.id}`} className="hover:bg-muted/50">
                    <TableCell>
                      <Badge variant="outline" className={`${ACTIVITY_COLORS[record.type]} text-xs`}>
                        <span className="flex items-center gap-1.5">
                          {ACTIVITY_ICONS[record.type]}
                          {ACTIVITY_LABELS[record.type]}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="truncate text-sm">{getRecordSummary(record)}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{getRecordArea(record)}</TableCell>
                    <TableCell className="text-center text-sm">
                      {getRecordDate(record) ? new Date(getRecordDate(record)).toLocaleDateString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const isCreatedByAdmin = record.data.adminInsertedBy && record.data.adminInsertedBy !== studentUserId;
                        return (
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(record)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget({ type: record.type, id: record.data.id })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            {isStudentView && isCreatedByAdmin && (
                              <Badge variant="outline" className="bg-amber-500/5 text-amber-600 border-amber-500/20 text-[9px] font-normal px-1 py-0 h-5" title="Adicionado pelo Administrador">
                                Admin
                              </Badge>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>

      {/* ── Edit Dialog ── */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) { setIsEditDialogOpen(false); setEditRecord(null); resetForm(); }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              Editar Registro
            </DialogTitle>
            <DialogDescription>
              {isStudentView
                ? 'Alterações serão refletidas no seu progresso e estatísticas.'
                : <>Alterações serão refletidas no progresso e estatísticas de <strong>{studentName}</strong>.</>}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {renderFormFields()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditRecord(null); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Registro</AlertDialogTitle>
            <AlertDialogDescription>
              {isStudentView
                ? 'Esta ação removerá o registro do histórico e seus efeitos serão removidos do seu progresso, gráficos e estatísticas. Esta ação não pode ser desfeita.'
                : <>Esta ação removerá o registro do histórico e seus efeitos serão removidos do progresso, gráficos e estatísticas de <strong>{studentName}</strong>. Esta ação não pode ser desfeita.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
