import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, BookOpen, PenTool, FileText, Trophy, Target, TrendingUp,
  TrendingDown, Download, Calendar, BarChart3, PieChart as PieChartIcon, CalendarDays, Save, Settings,
  ChevronDown, ChevronRight, History, Bell, Trash2, Send, BrainCircuit
} from 'lucide-react';
import { WeeklyAgenda } from '@/components/WeeklyAgenda';
import { UserSummary } from '@/hooks/useAdminData';
import { useGoals } from '@/hooks/useGoals';
import { useNotifications, NotificationType } from '@/hooks/useNotifications';
import { useStudyStrategy } from '@/hooks/useStudyStrategy';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { MedicalArea, ExamLog, Flashcard, Goals } from '@/lib/types';
import { getPerformanceColor } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ensurePdfExtension, savePdf } from '@/lib/pdf-helpers';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { saveAs } from 'file-saver';
import { FlashcardDetailDialog } from '@/components/FlashcardDetailDialog';
import { AcademicHistorySection } from '@/components/admin/AcademicHistorySection';

interface AdminUserAnalysisProps {
  user: UserSummary;
  onBack: () => void;
}

interface UserFullData {
  exercises: any[];
  exams: any[];
  classes: any[];
  editorialProgress: any[];
  reviews: any[];
  flashcards: any[];
  burnoutCheckins: any[];
}

const TopicRow = ({ topic, index }: { topic: any, index: number }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell className="w-10">
          {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </TableCell>
        <TableCell className="text-muted-foreground w-12 text-center">{index + 1}</TableCell>
        <TableCell className="font-medium">{topic.topic}</TableCell>
        <TableCell className="text-muted-foreground">{topic.area}</TableCell>
        <TableCell className="text-center">{topic.total}</TableCell>
        <TableCell className="text-center text-green-600">{topic.correct}</TableCell>
        <TableCell className="text-center text-red-500">{topic.errors}</TableCell>
        <TableCell className="text-center">
          <Badge variant={topic.accuracy >= 70 ? 'default' : topic.accuracy >= 50 ? 'secondary' : 'destructive'}>
            {topic.accuracy}%
          </Badge>
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={8} className="p-4">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm animate-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">Histórico de Evolução - {topic.topic}</h4>
              </div>
              <div className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-0 bg-muted/50">
                      <TableHead>Data</TableHead>
                      <TableHead>Nome do Bloco</TableHead>
                      <TableHead className="text-center">Questões</TableHead>
                      <TableHead className="text-center">Acertos</TableHead>
                      <TableHead className="text-center">Erros</TableHead>
                      <TableHead className="text-center">Aproveitamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topic.history.map((log: any, idx: number) => (
                      <TableRow key={idx} className="border-b-0">
                        <TableCell className="py-2">{new Date(log.date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="py-2 font-medium">{log.blockName || 'Bloco de Exercícios'}</TableCell>
                        <TableCell className="text-center py-2">{log.total}</TableCell>
                        <TableCell className="text-center text-green-600 py-2">{log.correct}</TableCell>
                        <TableCell className="text-center text-red-500 py-2">{log.total - log.correct}</TableCell>
                        <TableCell className="text-center py-2">
                          <span className={`font-semibold ${getPerformanceColor(log.accuracy)}`}>
                            {log.accuracy.toFixed(0)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

const AdminUserAnalysis = ({ user, onBack }: AdminUserAnalysisProps) => {
  const [data, setData] = useState<UserFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Goals management for admin
  const { goals, loading: goalsLoading, updateGoals } = useGoals(user.user_id, true);
  // Permissions State
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const isMentor = currentUserRole === 'mentor';
  const isAdmin = currentUserRole === 'admin';

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Based on previous RLS policies, profiles.id matches auth.uid() and has a 'role' column.
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (data) {
          // @ts-ignore
          setCurrentUserRole(data.role);
        }
      }
    };
    fetchUserRole();
  }, []);

  const [editGoals, setEditGoals] = useState<Goals>({
    weeklyQuestions: 50,
    targetAccuracy: 80,
    targetTopicsPerWeek: 5
  });
  const [savingGoals, setSavingGoals] = useState(false);

  // Notifications Management
  const { notifications, loading: notificationsLoading, sendNotification, deleteNotification } = useNotifications(user.user_id);
  const [newNotificationMsg, setNewNotificationMsg] = useState('');
  const [newNotificationTitle, setNewNotificationTitle] = useState('');
  const [newNotificationType, setNewNotificationType] = useState<NotificationType>('Aviso');
  const [sendingNotification, setSendingNotification] = useState(false);

  const handleSendNotification = async () => {
    if (!newNotificationMsg.trim()) return;
    setSendingNotification(true);
    const success = await sendNotification(newNotificationMsg, newNotificationTitle, newNotificationType);
    if (success) {
      setNewNotificationMsg('');
      setNewNotificationTitle('');
      setNewNotificationType('Aviso');
    }
    setSendingNotification(false);
  };

  // Study Strategy Management
  const { strategy, loading: strategyLoading, saveStrategy } = useStudyStrategy(user.user_id);
  const [macroStrategy, setMacroStrategy] = useState('');
  const [microStrategy, setMicroStrategy] = useState('');
  const [savingStrategy, setSavingStrategy] = useState(false);

  useEffect(() => {
    if (strategy) {
      setMacroStrategy(strategy.macro_strategy || '');
      setMicroStrategy(strategy.micro_strategy || '');
    }
  }, [strategy]);

  const handleSaveStrategy = async () => {
    setSavingStrategy(true);
    await saveStrategy(macroStrategy, microStrategy);
    setSavingStrategy(false);
  };

  // Flashcard Viewer States
  const [selectedFlashcard, setSelectedFlashcard] = useState<Flashcard | null>(null);
  const [flashcardDialogOpen, setFlashcardDialogOpen] = useState(false);
  const [flashcardSearch, setFlashcardSearch] = useState('');
  const [flashcardAreaFilter, setFlashcardAreaFilter] = useState<'all' | MedicalArea>('all');

  // Sync editGoals when goals are loaded
  useEffect(() => {
    if (!goalsLoading) {
      setEditGoals({
        weeklyQuestions: goals.weeklyQuestions,
        targetAccuracy: goals.targetAccuracy,
        targetTopicsPerWeek: goals.targetTopicsPerWeek
      });
    }
  }, [goals, goalsLoading]);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const [exercisesRes, examsRes, classesRes, editorialRes, reviewsRes, flashcardsRes, burnoutRes] = await Promise.all([
          supabase.from('exercises').select('*').eq('user_id', user.user_id).order('date', { ascending: false }),
          supabase.from('exams').select('*').eq('user_id', user.user_id).order('date', { ascending: false }),
          supabase.from('classes').select('*').eq('user_id', user.user_id).order('date', { ascending: false }),
          supabase.from('editorial_progress').select('*').eq('user_id', user.user_id),
          supabase.from('reviews').select('*').eq('user_id', user.user_id).order('date', { ascending: false }),
          supabase.from('flashcards').select('*').eq('user_id', user.user_id),
          supabase.from('burnout_checkins').select('*').eq('user_id', user.user_id).order('date', { ascending: false })
        ]);

        setData({
          exercises: exercisesRes.data || [],
          exams: examsRes.data || [],
          classes: classesRes.data || [],
          editorialProgress: editorialRes.data || [],
          reviews: reviewsRes.data || [],
          flashcards: flashcardsRes.data || [],
          burnoutCheckins: burnoutRes.data || []
        });
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user.user_id]);

  // Handle saving goals
  const handleSaveGoals = async () => {
    setSavingGoals(true);
    const success = await updateGoals(editGoals);
    setSavingGoals(false);

    if (success) {
      toast({
        title: "Metas atualizadas!",
        description: `As metas de ${user.name} foram salvas com sucesso.`,
      });
    } else {
      toast({
        title: "Erro ao salvar metas",
        description: "Não foi possível atualizar as metas do aluno.",
        variant: "destructive"
      });
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter by date range
  const filteredExercises = data.exercises.filter(ex => {
    const date = new Date(ex.date);
    return date >= new Date(startDate) && date <= new Date(endDate);
  });

  const filteredExams = data.exams.filter(exam => {
    const date = new Date(exam.date);
    return date >= new Date(startDate) && date <= new Date(endDate);
  });

  const filteredClasses = data.classes.filter(cls => {
    const date = new Date(cls.date);
    return date >= new Date(startDate) && date <= new Date(endDate);
  });

  // Calculate statistics
  const totalQuestions = filteredExercises.reduce((sum, ex) => sum + ex.total_questions, 0);
  const totalCorrect = filteredExercises.reduce((sum, ex) => sum + ex.correct_answers, 0);
  const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  const uniqueTopics = new Set(filteredExercises.map(ex => ex.topic)).size;
  const classesStudied = filteredClasses.filter(c => c.studied).length;

  // Additional indicators - Flashcards created in period
  const flashcardsCreated = data.flashcards.filter(fc => {
    const createdDate = new Date(fc.created_at);
    return createdDate >= new Date(startDate) && createdDate <= new Date(endDate);
  }).length;

  // Additional indicators - Reviews scheduled in period
  const scheduledReviews = data.reviews.filter(rev => {
    const dueDate = new Date(rev.due_date);
    return dueDate >= new Date(startDate) && dueDate <= new Date(endDate);
  }).length;

  // Performance by area
  const areaStats = Object.values(MedicalArea).map(area => {
    const areaExercises = filteredExercises.filter(ex => ex.specialty === area);
    const total = areaExercises.reduce((sum, ex) => sum + ex.total_questions, 0);
    const correct = areaExercises.reduce((sum, ex) => sum + ex.correct_answers, 0);
    return {
      area,
      total,
      correct,
      errors: total - correct,
      accuracy: total > 0 ? (correct / total) * 100 : 0
    };
  }).filter(a => a.total > 0).sort((a, b) => a.accuracy - b.accuracy);

  // Topic performance
  const topicStats = filteredExercises.reduce((acc, ex) => {
    const key = `${ex.specialty}|${ex.topic}`;
    if (!acc[key]) {
      acc[key] = {
        topic: ex.topic,
        area: ex.specialty,
        total: 0,
        correct: 0,
        lastPractice: ex.date,
        history: []
      };
    }
    acc[key].total += ex.total_questions;
    acc[key].correct += ex.correct_answers;
    if (ex.date > acc[key].lastPractice) acc[key].lastPractice = ex.date;

    // Add to history
    acc[key].history.push({
      date: ex.date,
      total: ex.total_questions,
      correct: ex.correct_answers,
      accuracy: ex.total_questions > 0 ? (ex.correct_answers / ex.total_questions) * 100 : 0,
      blockName: ex.block_name
    });

    return acc;
  }, {} as Record<string, any>);

  const topicData = Object.values(topicStats)
    .map((t: any) => ({
      ...t,
      // Sort history by date ascending
      history: t.history.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      accuracy: Math.round((t.total > 0 ? t.correct / t.total : 0) * 100),
      errors: t.total - t.correct
    }))
    .sort((a: any, b: any) => a.accuracy - b.accuracy);

  // Pie chart data
  const pieData = [
    { name: 'Acertos', value: totalCorrect, color: 'hsl(var(--medical-preventiva))' },
    { name: 'Erros', value: totalQuestions - totalCorrect, color: 'hsl(var(--destructive))' }
  ];

  // Generate PDF Report
  const generatePDF = async () => {
    try {
      const { PdfService } = await import('@/lib/pdf-service');
      const pdf = new PdfService();

      await pdf.initialize('Mentoria Regisdência - Relatório de Desempenho');

      // Subtitle with Student Name and Period
      pdf.addSubtitle(`Aluno: ${user.name} • Período: ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`);

      // Add extra info line manually
      pdf.addTextAt(pdf.getContentWidth() / 2 + pdf.getMargin(), 50, `(Aulas Estudadas: ${classesStudied})`, 10, { align: 'center', color: [100, 100, 100] });
      pdf.moveY(10); // Adjust for the extra line

      // --- KPI Grid ---
      const startY = pdf.getCurrentY();
      const margin = pdf.getMargin();
      const contentWidth = pdf.getContentWidth();
      const gap = 5;
      const cardWidth = (contentWidth - (gap * 4)) / 5;

      // KPI 1: Questões
      pdf.drawCard(margin, startY, cardWidth, 35, 'Questões');
      pdf.addMetricAt(margin + (cardWidth / 2), startY + 15, '', totalQuestions.toString(), 'center');

      // KPI 2: Acertos
      pdf.drawCard(margin + cardWidth + gap, startY, cardWidth, 35, 'Acertos');
      pdf.addMetricAt(margin + cardWidth + gap + (cardWidth / 2), startY + 15, '', totalCorrect.toString(), 'center');

      // KPI 3: Aproveitamento
      pdf.drawCard(margin + (cardWidth * 2) + (gap * 2), startY, cardWidth, 35, 'Nota (%)');
      let accColor: [number, number, number] = [60, 60, 60];
      if (overallAccuracy >= 80) accColor = [16, 185, 129];
      else if (overallAccuracy >= 60) accColor = [245, 158, 11];
      else accColor = [239, 68, 68];

      pdf.addTextAt(margin + (cardWidth * 2) + (gap * 2) + (cardWidth / 2), startY + 20, `${overallAccuracy.toFixed(1)}%`, 14, {
        align: 'center',
        bold: true,
        color: accColor
      });

      // KPI 4: Temas
      pdf.drawCard(margin + (cardWidth * 3) + (gap * 3), startY, cardWidth, 35, 'Temas');
      pdf.addMetricAt(margin + (cardWidth * 3) + (gap * 3) + (cardWidth / 2), startY + 15, '', uniqueTopics.toString(), 'center');

      // KPI 5: Aulas
      pdf.drawCard(margin + (cardWidth * 4) + (gap * 4), startY, cardWidth, 35, 'Aulas');
      pdf.addMetricAt(margin + (cardWidth * 4) + (gap * 4) + (cardWidth / 2), startY + 15, '', classesStudied.toString(), 'center');

      pdf.moveY(45);

      // Gamification Info
      // Use addTextAt for center alignment
      pdf.addTextAt(margin + (contentWidth / 2), pdf.getCurrentY(), `Nível: ${user.level}  |  XP: ${user.xp}  |  Sequência: ${user.streak} dias`, 10, { align: 'center', color: [100, 100, 100] });
      pdf.moveY(10);

      // --- Performance by Area ---
      if (areaStats.length > 0) {
        pdf.addSection('Desempenho por Grande Área');
        pdf.addTable(
          ['Área Médica', 'Questões', 'Acertos', 'Erros', 'Aproveitamento'],
          areaStats.map(stat => [
            stat.area,
            stat.total.toString(),
            stat.correct.toString(),
            stat.errors.toString(),
            `${stat.accuracy.toFixed(1)}%`
          ]),
          {
            columnStyles: {
              0: { halign: 'left', fontStyle: 'bold' },
              1: { halign: 'center' },
              2: { halign: 'center' },
              3: { halign: 'center' },
              4: { halign: 'center', fontStyle: 'bold' }
            }
          }
        );
      }

      // --- Topic Performance ---
      if (topicData.length > 0) {
        pdf.addSection('Desempenho Detalhado por Tema (Top 30)');
        pdf.addTable(
          ['#', 'Tema', 'Área', 'Questões', 'Acertos', 'Nota (%)'],
          topicData.slice(0, 30).map((t: any, idx: number) => [
            (idx + 1).toString(),
            t.topic,
            t.area,
            t.total.toString(),
            t.correct.toString(),
            `${t.accuracy}%`
          ]),
          {
            columnStyles: {
              0: { halign: 'center', cellWidth: 15 },
              1: { halign: 'left' },
              2: { halign: 'left', cellWidth: 40 },
              3: { halign: 'center' },
              4: { halign: 'center' },
              5: { halign: 'center', fontStyle: 'bold' }
            },
            didDrawCell: (data: any) => {
              if (data.column.index === 5 && data.section === 'body') {
                const val = parseFloat(data.cell.raw.replace('%', ''));
                if (val >= 80) data.cell.styles.textColor = [16, 185, 129];
                else if (val >= 50) data.cell.styles.textColor = [245, 158, 11];
                else data.cell.styles.textColor = [239, 68, 68];
              }
            }
          }
        );
      }

      // --- Exams ---
      if (filteredExams.length > 0) {
        pdf.addSection('Provas e Simulados Realizados');

        for (const exam of filteredExams) {
          const perf = exam.performance as any || {};
          const totalQ = perf.totalQuestions || 0;
          const totalC = perf.correctAnswers || 0;
          const areaDetails = perf.areaDetails || [];
          const acc = totalQ > 0 ? ((totalC / totalQ) * 100).toFixed(1) : '0';

          // Ensure space for exam block (approx 40 height)
          pdf.ensureSpace(40);

          const startY = pdf.getCurrentY();

          pdf.addText(`${exam.name}`, 12, [30, 41, 59], { bold: true });
          pdf.addText(`${exam.institution} • ${new Date(exam.date).toLocaleDateString('pt-BR')}`, 10, [100, 116, 139]);

          // Right aligned score (manual calculation of X)
          const scoreText = `${totalC}/${totalQ} (${acc}%)`;
          const pageWidth = pdf.getDoc().internal.pageSize.getWidth();
          pdf.addTextAt(pageWidth - margin - 20, startY + 5, scoreText, 12, { bold: true, align: 'right', color: parseFloat(acc) >= 70 ? [16, 185, 129] : [239, 68, 68] });

          pdf.moveY(5);

          if (areaDetails.length > 0) {
            pdf.addTable(
              ['Área Médica', 'Acertos', 'Total', 'Aproveitamento'],
              areaDetails.map((ad: any) => [
                ad.area,
                ad.correct.toString(),
                ad.total.toString(),
                `${(ad.total > 0 ? ((ad.correct / ad.total) * 100).toFixed(1) : '0')}%`
              ]),
              {
                theme: 'grid', // Cleaner for nested tables
                headStyles: { fillColor: [100, 116, 139], fontSize: 9 },
                styles: { fontSize: 8 },
                margin: { left: margin + 5, right: margin + 5 } // Indent table
              }
            );
            pdf.moveY(5);
          } else {
            pdf.moveY(5);
          }
        }
      }

      // --- Classes ---
      const studiedClassesList = filteredClasses.filter(c => c.studied);
      if (studiedClassesList.length > 0) {
        pdf.addSection('Aulas Teóricas Concluídas');
        pdf.addTable(
          ['Data', 'Especialidade', 'Aula'],
          studiedClassesList.map(cls => [
            new Date(cls.date).toLocaleDateString('pt-BR'),
            cls.specialty,
            cls.title
          ]),
          {
            columnStyles: {
              0: { halign: 'center', cellWidth: 30 },
              1: { halign: 'left', cellWidth: 50 },
              2: { halign: 'left' }
            }
          }
        );
      }

      const fileName = `PERRYMED_${user.name.replace(/\s+/g, '_')}_${startDate}_a_${endDate}`;
      pdf.save(fileName);

      toast({
        title: "Relatório gerado!",
        description: `Relatório de ${user.name} baixado com sucesso.`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: `Não foi possível gerar o relatório. Erro: ${error}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <p className="text-muted-foreground">Análise detalhada de desempenho</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            Nível {user.level}
          </Badge>
          <Badge variant="outline" className="text-sm">
            {user.xp} XP
          </Badge>
          {user.streak > 0 && (
            <Badge className="text-sm bg-orange-500">
              🔥 {user.streak} dias
            </Badge>
          )}
        </div>
      </div>

      {/* Profile Details Card */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Ano da Prova
              </span>
              <p className="font-semibold text-lg">{user.exam_year || 'Não definido'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4" />
                Especialidade Alvo
              </span>
              <p className="font-semibold text-lg">{user.target_specialty || 'Não definida'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Instituições Alvo
              </span>
              <div className="flex flex-wrap gap-2">
                {user.target_institutions && user.target_institutions.length > 0 ? (
                  user.target_institutions.map((inst, idx) => (
                    <Badge key={idx} variant="secondary" className="px-2 py-0.5">
                      {inst}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground italic">Nenhuma definida</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Filter & Export */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Filtrar Período
              </CardTitle>
              <CardDescription>Selecione o período para análise</CardDescription>
            </div>
            <Button onClick={generatePDF} className="gap-2">
              <Download className="w-4 h-4" />
              Gerar PDF do Aluno
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Questões</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <PenTool className="w-6 h-6 text-primary" />
              {totalQuestions}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Acertos</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2 text-green-500">
              <Target className="w-6 h-6" />
              {totalCorrect}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Taxa de Acerto</CardDescription>
            <CardTitle className={`text-3xl ${getPerformanceColor(overallAccuracy)}`}>
              {overallAccuracy.toFixed(1)}%
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Temas Estudados</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-500" />
              {uniqueTopics}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aulas Estudadas</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              {classesStudied}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Flashcards Criados</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-500" />
              {flashcardsCreated}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revisões Agendadas</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-indigo-500" />
              {scheduledReviews}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              Proporção Acertos x Erros
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalQuestions > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados para o período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart by Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Desempenho por Área
            </CardTitle>
          </CardHeader>
          <CardContent>
            {areaStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={areaStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="area" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados para o período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goals Management Section */}
      <Card className="border-2 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-500" />
            Metas do Aluno
          </CardTitle>
          <CardDescription>
            Defina as metas semanais do aluno. Essas metas aparecerão no dashboard do mentorado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weeklyQuestions">Questões por Semana</Label>
              <Input
                id="weeklyQuestions"
                type="number"
                min={0}
                value={editGoals.weeklyQuestions}
                onChange={(e) => setEditGoals({ ...editGoals, weeklyQuestions: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetAccuracy">Meta de Acerto (%)</Label>
              <Input
                id="targetAccuracy"
                type="number"
                min={0}
                max={100}
                value={editGoals.targetAccuracy}
                onChange={(e) => setEditGoals({ ...editGoals, targetAccuracy: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetTopics">Temas por Semana</Label>
              <Input
                id="targetTopics"
                type="number"
                min={0}
                value={editGoals.targetTopicsPerWeek}
                onChange={(e) => setEditGoals({ ...editGoals, targetTopicsPerWeek: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <Button onClick={handleSaveGoals} disabled={savingGoals} className="gap-2">
            <Save className="w-4 h-4" />
            {savingGoals ? 'Salvando...' : 'Salvar Metas'}
          </Button>
        </CardContent>
      </Card>

      {/* Mentor Agenda Section */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Agenda do Aluno
          </CardTitle>
          <CardDescription>
            Gerencie a agenda semanal do aluno. As alterações ficam visíveis no dashboard do mentorado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WeeklyAgenda userId={user.user_id} isAdminView={true} />
        </CardContent>
      </Card>

      {/* Study Strategy Section */}
      <Card className="border-2 border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-500" />
            Estratégia de Estudos
          </CardTitle>
          <CardDescription>
            Defina a estratégia macro e micro para o aluno. O aluno apenas visualiza.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {strategyLoading ? (
            <div className="text-center py-4 text-muted-foreground">Carregando estratégia...</div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Estratégia Macro (Longo Prazo)</Label>
                <div className="relative">
                  <Textarea
                    value={macroStrategy}
                    onChange={e => setMacroStrategy(e.target.value)}
                    placeholder="Defina a visão geral, objetivos principais e metodologia..."
                    rows={5}
                    disabled={isMentor}
                    className={isMentor ? "opacity-70 bg-muted" : ""}
                  />
                  {isMentor && (
                    <div className="absolute top-2 right-2 text-xs bg-muted px-2 py-1 rounded border text-muted-foreground flex items-center gap-1">
                      <Target className="w-3 h-3" /> Apenas Leitura (Mentor)
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isMentor ? "Mentores podem visualizar, mas apenas Administradores editam a Macro Estratégia." : "Visível para o aluno na Home."}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Estratégia Micro (Curto Prazo / Ciclo Atual)</Label>
                <Textarea
                  value={microStrategy}
                  onChange={e => setMicroStrategy(e.target.value)}
                  placeholder="Detalhes do ciclo atual, focos da semana, ajustes pontuais..."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">Visível para o aluno na Home.</p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveStrategy} disabled={savingStrategy} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {savingStrategy ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</span> : <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Salvar Estratégia</span>}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Academic History Section - Admin Only */}
      {isAdmin && (
        <AcademicHistorySection
          studentUserId={user.user_id}
          studentName={user.name}
        />
      )}

      {/* Manual Notifications Section */}
      <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            Notificações Manuais
          </CardTitle>
          <CardDescription>
            Envie avisos diretos para o aluno. O aluno verá um alerta na página inicial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isAdmin ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed text-sm">
              <div className="flex justify-center mb-2">
                <Bell className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p>Funcionalidade restrita a Administradores.</p>
              <p className="text-xs">Entre em contato com um administrador para enviar notificações.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 border p-4 rounded-lg bg-card/50">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Send className="w-4 h-4" /> Nova Notificação
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Título (Opcional)</Label>
                    <Input
                      value={newNotificationTitle}
                      onChange={e => setNewNotificationTitle(e.target.value)}
                      placeholder="Ex: Lembrete de Renovação"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={newNotificationType} onValueChange={(v) => setNewNotificationType(v as NotificationType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aviso">Aviso</SelectItem>
                        <SelectItem value="Assinatura">Assinatura</SelectItem>
                        <SelectItem value="Material">Material</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    value={newNotificationMsg}
                    onChange={e => setNewNotificationMsg(e.target.value)}
                    placeholder="Digite a mensagem para o aluno..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSendNotification} disabled={sendingNotification || !newNotificationMsg.trim()}>
                    {sendingNotification ? 'Enviando...' : 'Enviar Notificação'}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Notificações Ativas ({notifications.length})</h4>
                {notificationsLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Carregando...</div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    Nenhuma notificação ativa para este aluno.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map(notification => (
                      <div key={notification.id} className="flex items-start justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{notification.type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(notification.created_at).toLocaleString('pt-BR')}
                            </span>
                            {notification.read && <Badge variant="secondary" className="text-xs">Lida</Badge>}
                          </div>
                          {notification.title && <p className="font-semibold text-sm">{notification.title}</p>}
                          <p className="text-sm text-foreground/80">{notification.message}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tabs for detailed data */}
      <Tabs defaultValue="areas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="areas">Por Área</TabsTrigger>
          <TabsTrigger value="topics">Por Tema</TabsTrigger>
          <TabsTrigger value="exams">Provas</TabsTrigger>
          <TabsTrigger value="classes">Aulas</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="reviews">Revisões</TabsTrigger>
        </TabsList>

        {/* Performance by Area */}
        <TabsContent value="areas">
          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Área Médica</CardTitle>
              <CardDescription>Ordenado da pior para a melhor performance</CardDescription>
            </CardHeader>
            <CardContent>
              {areaStats.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Área</TableHead>
                      <TableHead className="text-center">Questões</TableHead>
                      <TableHead className="text-center">Acertos</TableHead>
                      <TableHead className="text-center">Erros</TableHead>
                      <TableHead className="text-center">Aproveitamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {areaStats.map((stat) => (
                      <TableRow key={stat.area}>
                        <TableCell className="font-medium">{stat.area}</TableCell>
                        <TableCell className="text-center">{stat.total}</TableCell>
                        <TableCell className="text-center text-green-600">{stat.correct}</TableCell>
                        <TableCell className="text-center text-red-500">{stat.errors}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={stat.accuracy >= 70 ? 'default' : stat.accuracy >= 50 ? 'secondary' : 'destructive'}>
                            {stat.accuracy.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum exercício no período</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance by Topic */}
        <TabsContent value="topics">
          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Tema</CardTitle>
              <CardDescription>Ordenado do pior para o melhor (foco nas áreas de atenção)</CardDescription>
            </CardHeader>
            <CardContent>
              {topicData.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Tema</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead className="text-center">Questões</TableHead>
                        <TableHead className="text-center">Acertos</TableHead>
                        <TableHead className="text-center">Erros</TableHead>
                        <TableHead className="text-center">Nota</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topicData.map((topic: any, idx: number) => (
                        <TopicRow key={`${topic.area}-${topic.topic}`} topic={topic} index={idx} />
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum tema registrado no período</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exams */}
        <TabsContent value="exams">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Provas Realizadas
              </CardTitle>
              <CardDescription>Histórico completo de simulados e provas</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredExams.length > 0 ? (
                <Accordion type="single" collapsible className="space-y-2">
                  {filteredExams.map((exam) => {
                    const perf = exam.performance as any || {};
                    const totalQ = perf.totalQuestions || 0;
                    const totalC = perf.correctAnswers || 0;
                    const areaDetails = perf.areaDetails || [];
                    const examAcc = totalQ > 0 ? (totalC / totalQ) * 100 : 0;

                    return (
                      <AccordionItem key={exam.id} value={exam.id} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="text-left">
                              <p className="font-semibold">{exam.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {exam.institution} • {new Date(exam.date).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            {totalQ > 0 && (
                              <Badge variant={examAcc >= 70 ? 'default' : examAcc >= 50 ? 'secondary' : 'destructive'}>
                                {totalC}/{totalQ} ({examAcc.toFixed(1)}%)
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {areaDetails.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                              {areaDetails.map((ad: any, idx: number) => (
                                <div key={`${ad.area}-${idx}`} className="p-3 bg-muted rounded-lg">
                                  <p className="font-medium text-sm">{ad.area}</p>
                                  <p className="text-lg font-bold">
                                    {ad.correct || 0}/{ad.total || 0}
                                    <span className="text-sm font-normal text-muted-foreground ml-1">
                                      ({(ad.total || 0) > 0 ? (((ad.correct || 0) / (ad.total || 1)) * 100).toFixed(0) : 0}%)
                                    </span>
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="pt-2">
                              <p className="text-muted-foreground text-sm">
                                Total: {totalC}/{totalQ} questões ({totalQ > 0 ? examAcc.toFixed(1) : 0}%)
                              </p>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma prova no período selecionado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Classes */}
        <TabsContent value="classes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Aulas Cadastradas
              </CardTitle>
              <CardDescription>
                {filteredClasses.filter(c => c.studied).length} estudadas de {filteredClasses.length} total
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredClasses.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {filteredClasses.map((cls) => (
                      <div key={cls.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{cls.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {cls.specialty} • {new Date(cls.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant={cls.studied ? 'default' : 'secondary'}>
                          {cls.studied ? 'Estudada' : 'Pendente'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma aula no período</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flashcards Tab - Enhanced with Full Viewing */}
        <TabsContent value="flashcards">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Flashcards do Aluno
              </CardTitle>
              <CardDescription>
                Total: {data.flashcards.length} flashcards criados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="🔍 Buscar por texto (frente ou verso)..."
                    value={flashcardSearch}
                    onChange={(e) => setFlashcardSearch(e.target.value)}
                  />
                </div>
                <Select value={flashcardAreaFilter} onValueChange={(v) => setFlashcardAreaFilter(v as any)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Áreas</SelectItem>
                    {Object.values(MedicalArea).map(area => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(flashcardSearch || flashcardAreaFilter !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFlashcardSearch('');
                      setFlashcardAreaFilter('all');
                    }}
                  >
                    Limpar Filtros
                  </Button>
                )}
              </div>

              {/* Flashcards Table */}
              {(() => {
                // Filter flashcards
                const filteredFlashcards = data.flashcards.filter(fc => {
                  // Search filter
                  const searchLower = flashcardSearch.toLowerCase();
                  const matchesSearch = !flashcardSearch ||
                    fc.front.toLowerCase().includes(searchLower) ||
                    fc.back.toLowerCase().includes(searchLower);

                  // Area filter
                  const matchesArea = flashcardAreaFilter === 'all' || fc.area === flashcardAreaFilter;

                  return matchesSearch && matchesArea;
                });

                return filteredFlashcards.length > 0 ? (
                  <ScrollArea className="h-[450px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Área</TableHead>
                          <TableHead>Frente (preview)</TableHead>
                          <TableHead>Verso (preview)</TableHead>
                          <TableHead className="text-center w-[130px]">Criado em</TableHead>
                          <TableHead className="text-center w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFlashcards.map((fc) => (
                          <TableRow key={fc.id} className="hover:bg-muted/50">
                            <TableCell>
                              <Badge variant="outline">{fc.area}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[250px]">
                              <div className="flex items-center gap-2">
                                <p className="truncate">{fc.front}</p>
                                {fc.front_image_url && (
                                  <Badge variant="secondary" className="text-xs shrink-0">
                                    📷
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[250px]">
                              <div className="flex items-center gap-2">
                                <p className="truncate">{fc.back}</p>
                                {fc.answer_image_url && (
                                  <Badge variant="secondary" className="text-xs shrink-0">
                                    📷
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {new Date(fc.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedFlashcard(fc);
                                  setFlashcardDialogOpen(true);
                                }}
                                className="gap-2"
                              >
                                👁️ Ver
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">
                      {flashcardSearch || flashcardAreaFilter !== 'all'
                        ? 'Nenhum flashcard encontrado com os filtros aplicados'
                        : 'Nenhum flashcard criado ainda'}
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Revisões Agendadas no Período
              </CardTitle>
              <CardDescription>
                {scheduledReviews} revisões agendadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scheduledReviews > 0 ? (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tópico</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead className="text-center">Data de Revisão</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Prioridade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.reviews
                        .filter(rev => {
                          const dueDate = new Date(rev.due_date);
                          return dueDate >= new Date(startDate) && dueDate <= new Date(endDate);
                        })
                        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                        .map((rev) => (
                          <TableRow key={rev.id}>
                            <TableCell className="font-medium">{rev.topic}</TableCell>
                            <TableCell>{rev.area}</TableCell>
                            <TableCell className="text-center">
                              {new Date(rev.due_date).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={rev.status === 'completed' ? 'default' : 'secondary'}>
                                {rev.status === 'completed' ? 'Concluída' : 'Pendente'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={rev.priority === 1 ? 'destructive' : rev.priority === 2 ? 'secondary' : 'outline'}>
                                {rev.priority === 1 ? 'Alta' : rev.priority === 2 ? 'Média' : 'Baixa'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma revisão agendada no período</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Flashcard Detail Dialog */}
      <FlashcardDetailDialog
        flashcard={selectedFlashcard}
        open={flashcardDialogOpen}
        onClose={() => {
          setFlashcardDialogOpen(false);
          setSelectedFlashcard(null);
        }}
      />
    </div>
  );
};

export default AdminUserAnalysis;
