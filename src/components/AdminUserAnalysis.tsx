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
  ChevronDown, ChevronRight, History
} from 'lucide-react';
import { WeeklyAgenda } from '@/components/WeeklyAgenda';
import { UserSummary } from '@/hooks/useAdminData';
import { useGoals } from '@/hooks/useGoals';
import { supabase } from '@/integrations/supabase/client';
import { MedicalArea, ExamLog } from '@/lib/types';
import { getPerformanceColor } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ensurePdfExtension, savePdf } from '@/lib/pdf-helpers';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { saveAs } from 'file-saver';

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
  const [editGoals, setEditGoals] = useState({
    weeklyQuestions: 50,
    targetAccuracy: 80,
    targetTopicsPerWeek: 5
  });
  const [savingGoals, setSavingGoals] = useState(false);

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
      accuracy: ex.total_questions > 0 ? (ex.correct_answers / ex.total_questions) * 100 : 0
    });

    return acc;
  }, {} as Record<string, any>);

  const topicData = Object.values(topicStats)
    .map((t: any) => ({
      ...t,
      // Sort history by date descending
      history: t.history.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
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
  const generatePDF = () => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const perryTeal: [number, number, number] = [13, 148, 136];
      const indigoHeader: [number, number, number] = [79, 70, 229];
      const slateHeader: [number, number, number] = [51, 65, 85];
      const royalBlueHeader: [number, number, number] = [37, 99, 235];
      const emeraldHeader: [number, number, number] = [16, 185, 129];

      const addFooter = () => {
        const pageCount = (pdf as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(150, 150, 150);
          pdf.text(
            `Gerado em ${new Date().toLocaleString('pt-BR')} via Mentoria Regisdência - Página ${i} de ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        }
      };

      // Header
      pdf.setFillColor(perryTeal[0], perryTeal[1], perryTeal[2]);
      pdf.rect(0, 0, pageWidth, 30, 'F');

      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Mentoria Regisdência - Relatório de Desempenho', pageWidth / 2, 12, { align: 'center' });

      pdf.setFontSize(14);
      pdf.text(`Aluno: ${user.name}`, pageWidth / 2, 21, { align: 'center' });

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(240, 240, 240);
      pdf.text(
        `Período: ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`,
        pageWidth / 2,
        24, // Adjusted Y position
        { align: 'center' }
      );
      pdf.text(
        `(Aulas Estudadas: ${classesStudied})`, // Added to PDF header
        pageWidth / 2,
        28,
        { align: 'center' }
      );

      let yPosition = 40;

      // Summary Card
      pdf.setFillColor(245, 247, 250);
      pdf.roundedRect(14, yPosition, pageWidth - 28, 40, 3, 3, 'F');
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(14, yPosition, pageWidth - 28, 40, 3, 3, 'S');

      const kpiX = 20;
      const kpiSpacing = 35; // Reduced spacing to fit 5 items

      // KPIs
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(100, 100, 100);

      pdf.text('QUESTÕES', kpiX, yPosition + 10);
      pdf.setFontSize(16);
      pdf.setTextColor(perryTeal[0], perryTeal[1], perryTeal[2]);
      pdf.text(totalQuestions.toString(), kpiX, yPosition + 22);

      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text('ACERTOS', kpiX + kpiSpacing, yPosition + 10);
      pdf.setFontSize(16);
      pdf.setTextColor(16, 185, 129);
      pdf.text(totalCorrect.toString(), kpiX + kpiSpacing, yPosition + 22);

      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text('APROVEITAMENTO', kpiX + kpiSpacing * 2, yPosition + 10);
      pdf.setFontSize(16);
      if (overallAccuracy >= 80) pdf.setTextColor(16, 185, 129);
      else if (overallAccuracy >= 60) pdf.setTextColor(245, 158, 11);
      else pdf.setTextColor(239, 68, 68);
      pdf.text(`${overallAccuracy.toFixed(1)}%`, kpiX + kpiSpacing * 2, yPosition + 22);

      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text('TEMAS', kpiX + kpiSpacing * 3, yPosition + 10);
      pdf.setFontSize(16);
      pdf.setTextColor(perryTeal[0], perryTeal[1], perryTeal[2]);
      pdf.text(uniqueTopics.toString(), kpiX + kpiSpacing * 3, yPosition + 22);

      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text('AULAS', kpiX + kpiSpacing * 4, yPosition + 10);
      pdf.setFontSize(16);
      pdf.setTextColor(royalBlueHeader[0], royalBlueHeader[1], royalBlueHeader[2]);
      pdf.text(classesStudied.toString(), kpiX + kpiSpacing * 4, yPosition + 22);


      // Gamification stats
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Nível: ${user.level}  |  XP: ${user.xp}  |  Sequência: ${user.streak} dias`, kpiX, yPosition + 35);

      yPosition += 50;

      // Performance by Area Table
      if (areaStats.length > 0) {
        autoTable(pdf, {
          startY: yPosition,
          head: [['Área Médica', 'Questões', 'Acertos', 'Erros', 'Aproveitamento']],
          body: areaStats.map(stat => [
            stat.area,
            stat.total.toString(),
            stat.correct.toString(),
            stat.errors.toString(),
            `${stat.accuracy.toFixed(1)}%`
          ]),
          theme: 'striped',
          headStyles: {
            fillColor: indigoHeader,
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center'
          },
          styles: { fontSize: 9, cellPadding: 4 },
          columnStyles: {
            0: { halign: 'left', fontStyle: 'bold' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'center', fontStyle: 'bold' }
          }
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 10;
      }

      // Topic Performance Table
      if (topicData.length > 0) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        autoTable(pdf, {
          startY: yPosition,
          head: [['#', 'Tema', 'Área', 'Questões', 'Acertos', 'Nota (%)']],
          body: topicData.slice(0, 30).map((t: any, idx: number) => [
            (idx + 1).toString(),
            t.topic,
            t.area,
            t.total.toString(),
            t.correct.toString(),
            `${t.accuracy}%`
          ]),
          theme: 'striped',
          headStyles: {
            fillColor: royalBlueHeader,
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center'
          },
          styles: { fontSize: 8, cellPadding: 3 },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'left' },
            2: { halign: 'left', cellWidth: 35 },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'center', cellWidth: 18 },
            5: { halign: 'center', fontStyle: 'bold', cellWidth: 20 }
          }
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 10;
      }

      // Exams Table with detailed breakdown
      if (filteredExams.length > 0) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        // Section title
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(slateHeader[0], slateHeader[1], slateHeader[2]);
        pdf.text('PROVAS E SIMULADOS REALIZADOS', 14, yPosition);
        yPosition += 8;

        // Loop through each exam and show details
        for (const exam of filteredExams) {
          if (yPosition > pageHeight - 80) {
            pdf.addPage();
            yPosition = 20;
          }

          const perf = exam.performance as any || {};
          const totalQ = perf.totalQuestions || 0;
          const totalC = perf.correctAnswers || 0;
          const areaDetails = perf.areaDetails || [];
          const acc = totalQ > 0 ? ((totalC / totalQ) * 100).toFixed(1) : '0';

          // Exam header card
          pdf.setFillColor(248, 250, 252);
          pdf.roundedRect(14, yPosition, pageWidth - 28, 18, 2, 2, 'F');
          pdf.setDrawColor(200, 200, 200);
          pdf.roundedRect(14, yPosition, pageWidth - 28, 18, 2, 2, 'S');

          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(30, 41, 59);
          pdf.text(exam.name, 18, yPosition + 7);

          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100, 116, 139);
          pdf.text(`${exam.institution} • ${new Date(exam.date).toLocaleDateString('pt-BR')}`, 18, yPosition + 14);

          // Score on the right
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          const accNum = parseFloat(acc);
          if (accNum >= 70) pdf.setTextColor(16, 185, 129);
          else if (accNum >= 50) pdf.setTextColor(245, 158, 11);
          else pdf.setTextColor(239, 68, 68);
          pdf.text(`${totalC}/${totalQ} (${acc}%)`, pageWidth - 18, yPosition + 10, { align: 'right' });

          yPosition += 22;

          // Area details table for this exam
          if (areaDetails.length > 0) {
            autoTable(pdf, {
              startY: yPosition,
              head: [['Área Médica', 'Acertos', 'Total', 'Aproveitamento']],
              body: areaDetails.map((ad: any) => {
                const areaAcc = ad.total > 0 ? ((ad.correct / ad.total) * 100).toFixed(1) : '0';
                return [
                  ad.area,
                  ad.correct.toString(),
                  ad.total.toString(),
                  `${areaAcc}%`
                ];
              }),
              theme: 'striped',
              headStyles: {
                fillColor: [100, 116, 139],
                textColor: 255,
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center'
              },
              styles: { fontSize: 8, cellPadding: 3 },
              columnStyles: {
                0: { halign: 'left', fontStyle: 'bold', cellWidth: 60 },
                1: { halign: 'center', cellWidth: 25 },
                2: { halign: 'center', cellWidth: 25 },
                3: { halign: 'center', fontStyle: 'bold', cellWidth: 30 }
              },
              margin: { left: 14, right: 14 }
            });
            yPosition = (pdf as any).lastAutoTable.finalY + 10;
          } else {
            yPosition += 5;
          }
        }
      }

      // Classes Table
      if (filteredClasses.filter(c => c.studied).length > 0) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        autoTable(pdf, {
          startY: yPosition,
          head: [['Data', 'Especialidade', 'Aula']],
          body: filteredClasses.filter(c => c.studied).map(cls => [
            new Date(cls.date).toLocaleDateString('pt-BR'),
            cls.specialty,
            cls.title
          ]),
          theme: 'striped',
          headStyles: {
            fillColor: emeraldHeader,
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center'
          },
          styles: { fontSize: 9, cellPadding: 4 },
          columnStyles: {
            0: { halign: 'center', cellWidth: 25 },
            1: { halign: 'left', cellWidth: 45 },
            2: { halign: 'left' }
          }
        });
      }

      addFooter();

      // Using FileSaver.js for cross-browser compatibility
      const fileName = `PERRYMED_${user.name.replace(/\s+/g, '_')}_${startDate}_a_${endDate}.pdf`;
      const blob = pdf.output('blob');
      saveAs(blob, fileName);

      toast({
        title: "Relatório gerado!",
        description: `Relatório de ${user.name} baixado com sucesso.`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o relatório.",
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

      {/* Tabs for detailed data */}
      <Tabs defaultValue="areas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="areas">Por Área</TabsTrigger>
          <TabsTrigger value="topics">Por Tema</TabsTrigger>
          <TabsTrigger value="exams">Provas</TabsTrigger>
          <TabsTrigger value="classes">Aulas</TabsTrigger>
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
      </Tabs>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Flashcards Criados</CardDescription>
            <CardTitle className="text-2xl">{data.flashcards.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revisões Agendadas</CardDescription>
            <CardTitle className="text-2xl">{data.reviews.filter(r => !r.completed).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tópicos Concluídos (Editorial)</CardDescription>
            <CardTitle className="text-2xl">{data.editorialProgress.filter(e => e.status === 'mastered').length}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default AdminUserAnalysis;
