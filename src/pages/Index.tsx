import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, PieChart, BookOpen, PenTool, Calendar, FileText, BrainCircuit, Menu, X, FileDown, Book, Sun, Moon, LogOut, Clock, CreditCard, Trophy, Heart, ScrollText, Smile, Timer, UserCircle, Shield } from 'lucide-react';
import Dashboard from '@/components/Dashboard';
import Analysis from '@/components/Analysis';
import Classes from '@/components/Classes';
import Exercises from '@/components/Exercises';
import Reviews from '@/components/Reviews';
import Exams from '@/components/Exams';
import AIChat from '@/components/AIChat';
import Reports from '@/components/Reports';
import Notebook from '@/components/Notebook';
import Pomodoro from '@/components/Pomodoro';
import Flashcards from '@/components/Flashcards';
import BancaAnalysis from '@/components/BancaAnalysis';
import DreamBoard from '@/components/DreamBoard';
import Editorial from '@/components/Editorial';
import XoBurnout from '@/components/XoBurnout';
import ExamMode from '@/components/ExamMode';
import ProfileSettings from '@/components/ProfileSettings';
import AdminDashboard from '@/components/AdminDashboard';
import { TabType, ClassItem, ExerciseLog, ExamLog, NotebookData, MedicalArea, ManualReviewLog, Goals, UserProgress, Flashcard, DreamBoardItem, EditorialData, BurnoutData, ExamModeData } from '@/lib/types';
import { MOCK_CLASSES_INITIAL, MOCK_EXERCISES_INITIAL, REVIEW_INTERVALS, XP_REWARDS, EDITORIAL_TEMPLATE } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useClasses } from '@/hooks/useClasses';
import { useExercises } from '@/hooks/useExercises';
import { useFlashcards } from '@/hooks/useFlashcards';
import { useGoals } from '@/hooks/useGoals';
import { useDreamBoard } from '@/hooks/useDreamBoard';
import { useNotebook } from '@/hooks/useNotebook';
import { useExams } from '@/hooks/useExams';
import { useReviews } from '@/hooks/useReviews';
import { useEditorial } from '@/hooks/useEditorial';
import { useBurnout } from '@/hooks/useBurnout';
import { useExamMode } from '@/hooks/useExamMode';
import { useUserRole } from '@/hooks/useUserRole';
import { useAdminData } from '@/hooks/useAdminData';

const AuthenticatedApp = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile(user?.id);
  
  // Cloud database hooks
  const { classes, addClass, updateClass, deleteClass } = useClasses(user?.id);
  const { exercises, addExercise, deleteExercise } = useExercises(user?.id);
  const { flashcards, addFlashcard, deleteFlashcard } = useFlashcards(user?.id);
  const { goals, updateGoals } = useGoals(user?.id);
  const { items: dreamBoardItems, addItem: addDreamItem, deleteItem: deleteDreamItem } = useDreamBoard(user?.id);
  const { notebookData, updateNotebook } = useNotebook(user?.id);
  const { exams, addExam, deleteExam } = useExams(user?.id);
  const { reviews: manualReviews, addReview } = useReviews(user?.id);
  const { editorials, selectedEditorialId, setSelectedEditorialId, editorialData, updateTopicStatus, setEditorialData, createEditorial, deleteEditorial, renameEditorial } = useEditorial(user?.id);
  const { burnoutData, addCheckIn: addBurnoutCheckIn, setBurnoutData, loading: burnoutLoading } = useBurnout(user?.id);
  const { examModeData, addSession: addExamSession, updateMantra, setExamModeData, loading: examModeLoading } = useExamMode(user?.id);
  
  // Admin hooks
  const { isAdmin, loading: roleLoading } = useUserRole(user?.id);
  const { users: adminUsers, loading: adminLoading } = useAdminData(isAdmin);

  // UserProgress from profile
  const userProgress: UserProgress = {
    xp: profile?.xp || 0,
    level: profile?.level || 1,
    streak: profile?.streak || 0,
    lastStudyDate: profile?.last_study_date || null,
    totalActivities: (exercises.length + exams.length + classes.filter(c => c.studied).length) || 0
  };

  // Update profile in cloud when exercises, exams, or classes change
  useEffect(() => {
    if (!profile || !user?.id) return;

    const today = new Date().toISOString().split('T')[0];
    const totalActivities = exercises.length + exams.length + classes.filter(c => c.studied).length;
    
    // Calculate XP using RPG system rewards
    const exerciseXP = exercises.length * XP_REWARDS.EXERCISE;
    const classXP = classes.filter(c => c.studied).length * XP_REWARDS.CLASS;
    const examXP = exams.length * XP_REWARDS.EXAM;
    const totalXP = exerciseXP + classXP + examXP;

    // Update streak
    let newStreak = profile.streak;
    if (profile.last_study_date) {
      const lastDate = new Date(profile.last_study_date);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = exercises.some(ex => ex.date === today) || exams.some(ex => ex.date === today) ? 1 : 0;
      }
    } else if (exercises.length > 0 || exams.length > 0) {
      newStreak = 1;
    }

    const hasActivityToday = exercises.some(ex => ex.date === today) || exams.some(ex => ex.date === today);

    updateProfile({
      xp: totalXP,
      level: Math.floor(totalXP / 100) + 1,
      streak: newStreak,
      last_study_date: hasActivityToday ? today : profile.last_study_date
    });
  }, [exercises.length, exams.length, classes.filter(c => c.studied).length]);

  const pendingReviews = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const reviews: any[] = [];
    const topicPriorityMap = new Map();
    classes.forEach(c => {
      if (c.title) topicPriorityMap.set(c.title.toLowerCase(), c.priority);
    });

    exercises.forEach(ex => {
      const exTime = new Date(ex.date).getTime();
      const accuracy = (ex.correctAnswers / ex.totalQuestions) * 100;

      REVIEW_INTERVALS.forEach(interval => {
        const reviewTime = exTime + (interval * 24 * 60 * 60 * 1000);
        const reviewDateStr = new Date(reviewTime).toISOString().split('T')[0];
        
        if (reviewDateStr <= today) {
          const hasRecentExercise = exercises.some(e => e.topic === ex.topic && e.date >= reviewDateStr && e.id !== ex.id);
          const hasManualReview = manualReviews.some(m => m.topic === ex.topic && m.date >= reviewDateStr);

          if (!hasRecentExercise && !hasManualReview && !reviews.some(r => r.topic === ex.topic)) {
            reviews.push({
              topic: ex.topic,
              area: ex.area,
              dueDate: reviewDateStr,
              originalDate: ex.date,
              accuracy,
              dayInterval: interval,
              priority: (topicPriorityMap.get(ex.topic.toLowerCase()) || 2) as 1|2|3
            });
          }
        }
      });
    });
    
    return reviews.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [exercises, manualReviews, classes]);

  const handleMarkReviewed = (topic: string) => {
    addReview(topic);
  };

  // Auto-complete reviews when new exercises are added for a topic with pending review
  const handleAutoCompleteReview = (topic: string) => {
    const hasPendingReview = pendingReviews.some(
      r => r.topic.toLowerCase() === topic.toLowerCase()
    );
    if (hasPendingReview) {
      addReview(topic);
    }
  };

  const handleAddXP = (xp: number) => {
    if (profile) {
      updateProfile({
        xp: profile.xp + xp
      });
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabType);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard exercises={exercises} classes={classes} pendingReviews={pendingReviews} goals={goals} setGoals={updateGoals} userProgress={userProgress} />;
      case 'analysis': return <Analysis exercises={exercises} />;
      case 'classes': return <Classes classes={classes} addClass={addClass} updateClass={updateClass} deleteClass={deleteClass} />;
      case 'exercises': return <Exercises exercises={exercises} addExercise={addExercise} deleteExercise={deleteExercise} classes={classes} onAutoCompleteReview={handleAutoCompleteReview} />;
      case 'reviews': return <Reviews reviews={pendingReviews} onMarkReviewed={handleMarkReviewed} manualReviews={manualReviews} />;
      case 'exams': return <Exams exams={exams} addExam={addExam} deleteExam={deleteExam} addXP={handleAddXP} />;
      case 'ai-tutor': return <AIChat exercises={exercises} classes={classes} />;
      case 'reports': return <Reports exercises={exercises} classes={classes} exams={exams} />;
      case 'notebook': return <Notebook data={notebookData} onUpdate={updateNotebook} />;
      case 'pomodoro': return <Pomodoro />;
      case 'flashcards': return <Flashcards flashcards={flashcards} addFlashcard={addFlashcard} deleteFlashcard={deleteFlashcard} />;
      case 'banca-analysis': return <BancaAnalysis exams={exams} />;
      case 'dream-board': return <DreamBoard items={dreamBoardItems} addItem={addDreamItem} deleteItem={deleteDreamItem} />;
      case 'editorial': return <Editorial data={editorialData} setData={setEditorialData} updateTopicStatus={updateTopicStatus} onAddXP={handleAddXP} onTabChange={handleTabChange} editorials={editorials} selectedEditorialId={selectedEditorialId} setSelectedEditorialId={setSelectedEditorialId} createEditorial={createEditorial} deleteEditorial={deleteEditorial} renameEditorial={renameEditorial} />;
      case 'xo-burnout': return burnoutLoading ? <div className="text-center py-8">Carregando...</div> : <XoBurnout data={burnoutData} addCheckIn={addBurnoutCheckIn} />;
      case 'exam-mode': return examModeLoading ? <div className="text-center py-8">Carregando...</div> : <ExamMode data={examModeData} addSession={addExamSession} updateMantra={updateMantra} />;
      case 'profile-settings': return <ProfileSettings profile={profile} updateProfile={updateProfile} userEmail={user?.email} />;
      case 'admin': return <AdminDashboard users={adminUsers} loading={adminLoading} />;
      default: return <Dashboard exercises={exercises} classes={classes} pendingReviews={pendingReviews} goals={goals} setGoals={updateGoals} userProgress={userProgress} />;
    }
  };

  const NavItem = ({ id, label, icon: Icon }: { id: TabType; label: string; icon: any }) => (
    <button 
      onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
      className={`flex items-center w-full gap-3 px-4 py-3 rounded-lg transition-all ${
        activeTab === id 
          ? 'bg-primary text-primary-foreground shadow-md font-medium' 
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex w-full">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BrainCircuit size={32} className="text-primary" strokeWidth={2.5} />
            <h1 className="text-xl font-extrabold">PERSON<span className="text-primary"> MENTORIA</span></h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem id="dashboard" label="Painel" icon={LayoutDashboard} />
          <NavItem id="editorial" label="Edital" icon={ScrollText} />
          <NavItem id="notebook" label="Caderno de Erros" icon={Book} />
          <NavItem id="analysis" label="Análise Geral" icon={PieChart} />
          <NavItem id="classes" label="Aulas" icon={BookOpen} />
          <NavItem id="exercises" label="Exercícios" icon={PenTool} />
          <NavItem id="reviews" label="Revisões" icon={Calendar} />
          <NavItem id="exams" label="Provas Antigas" icon={FileText} />
          <NavItem id="reports" label="Relatório" icon={FileDown} />
          
          <div className="my-4 border-t pt-4">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase mb-2">Ferramentas</p>
            <NavItem id="pomodoro" label="Pomodoro" icon={Clock} />
            <NavItem id="exam-mode" label="Modo Prova" icon={Timer} />
            <NavItem id="flashcards" label="Flashcards" icon={CreditCard} />
            <NavItem id="banca-analysis" label="Raio-X da Banca" icon={Trophy} />
            <NavItem id="dream-board" label="Mural dos Sonhos" icon={Heart} />
            <NavItem id="xo-burnout" label="Xô Burnout" icon={Smile} />
          </div>
          
          <div className="my-4 border-t pt-4">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase mb-2">Assistente</p>
            <NavItem id="ai-tutor" label="TUTOR PERSON" icon={BrainCircuit} />
          </div>

          <div className="my-4 border-t pt-4">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase mb-2">Conta</p>
            <NavItem id="profile-settings" label="Informações Pessoais" icon={UserCircle} />
            {isAdmin && (
              <NavItem id="admin" label="Administrador" icon={Shield} />
            )}
          </div>
        </nav>

        <div className="p-4 border-t space-y-2">
          <Button variant="outline" className="w-full" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
            {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </Button>
          <Button variant="outline" className="w-full" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1">
        <header className="bg-card border-b p-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu size={24} />
          </button>
          <h2 className="text-xl font-bold capitalize hidden md:block">
            {activeTab.replace('-', ' ')}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Bem-vindo,</span>{' '}
              <span className="font-semibold">{profile?.name || 'Estudante'}</span>
            </div>
          </div>
        </header>

        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <AuthenticatedApp />;
}
