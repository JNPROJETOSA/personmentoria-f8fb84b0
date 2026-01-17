import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, PieChart, BookOpen, PenTool, Calendar, FileText, BrainCircuit, Menu, X, FileDown, Book, Sun, Moon, LogOut, Clock, CreditCard, Trophy, Heart, ScrollText, Smile, Timer, UserCircle, Shield, ChevronDown, ChevronRight, Stethoscope, PanelLeft } from 'lucide-react';
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
import FrozenAccountScreen from '@/components/FrozenAccountScreen';
import MindMaps from '@/components/MindMaps';
import { TabType, ClassItem, ExerciseLog, ExamLog, NotebookData, MedicalArea, ManualReviewLog, Goals, UserProgress, Flashcard, DreamBoardItem, EditorialData, BurnoutData, ExamModeData } from '@/lib/types';
import { MOCK_CLASSES_INITIAL, MOCK_EXERCISES_INITIAL, REVIEW_INTERVALS, XP_REWARDS, EDITORIAL_TEMPLATE } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useClasses } from '@/hooks/useClasses';
import { useExercises } from '@/hooks/useExercises';
import { useFlashcards } from '@/hooks/useFlashcards';
import { useFlashcardFolders } from '@/hooks/useFlashcardFolders';
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

// Fixed tab labels mapping
const TAB_LABELS: Record<TabType, string> = {
  dashboard: 'Painel',
  editorial: 'Edital',
  notebook: 'Caderno de Erros',
  analysis: 'Análise Geral',
  classes: 'Aulas',
  exercises: 'Exercícios',
  reviews: 'Revisões',
  exams: 'Provas na íntegra',
  reports: 'Relatório',
  pomodoro: 'Pomodoro',
  'exam-mode': 'Modo Prova',
  flashcards: 'Flashcards',
  'banca-analysis': 'Raio-X da Banca',
  'dream-board': 'Mural dos Sonhos',
  'xo-burnout': 'Xô Burnout',
  'ai-tutor': 'TUTOR REGIS',
  'mind-maps': 'Mapas Mentais',
  'profile-settings': 'Informações Pessoais',
  admin: 'Administrador'
};

const AuthenticatedApp = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile(user?.id);

  // Cloud database hooks
  const { classes, addClass, updateClass, deleteClass } = useClasses(user?.id);
  const { exercises, addExercise, deleteExercise } = useExercises(user?.id);
  const { flashcards, addFlashcard, deleteFlashcard, updateFlashcard } = useFlashcards(user?.id);
  const { folders, addFolder, updateFolder, deleteFolder } = useFlashcardFolders(user?.id);
  const { goals, updateGoals } = useGoals(user?.id);
  const { items: dreamBoardItems, addItem: addDreamItem, deleteItem: deleteDreamItem } = useDreamBoard(user?.id);
  const { notebookData, updateNotebook } = useNotebook(user?.id);
  const { exams, addExam, deleteExam } = useExams(user?.id);
  const { reviews: manualReviews, addReview } = useReviews(user?.id);
  const { editorials, selectedEditorialId, setSelectedEditorialId, editorialData, updateTopicStatus, setEditorialData, createEditorial, deleteEditorial, renameEditorial, deleteSubarea, renameSubarea, deleteTopic, renameTopic } = useEditorial(user?.id);
  const { burnoutData, addCheckIn: addBurnoutCheckIn, setBurnoutData, loading: burnoutLoading } = useBurnout(user?.id);
  const { examModeData, addSession: addExamSession, updateMantra, setExamModeData, loading: examModeLoading } = useExamMode(user?.id);

  // Admin hooks
  const { isAdmin, loading: roleLoading } = useUserRole(user?.id);
  const { users: adminUsers, loading: adminLoading, toggleFreezeUser } = useAdminData(isAdmin);

  // Check if user is frozen
  const isFrozen = profile?.frozen || false;

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
    const reviewMap = new Map<string, any>();
    const topicPriorityMap = new Map<string, number>();

    // 1. Map priorities and initial study dates from Classes
    classes.forEach(c => {
      if (c.title) {
        const topicNorm = c.title.toLowerCase();
        topicPriorityMap.set(topicNorm, c.priority);

        if (c.studied && c.date) {
          // Initializing with class study date
          reviewMap.set(topicNorm, {
            topic: c.title,
            area: c.area,
            lastDate: c.date,
            accuracy: 0, // No accuracy for just reading
            priority: c.priority
          });
        }
      }
    });

    // 2. Update with Exercises (take latest date)
    exercises.forEach(ex => {
      const topicNorm = ex.topic.toLowerCase();
      const existing = reviewMap.get(topicNorm);

      // If exercise is more recent than what we have, update it
      if (!existing || ex.date > existing.lastDate) {
        const accuracy = (ex.correctAnswers / ex.totalQuestions) * 100;
        reviewMap.set(topicNorm, {
          topic: ex.topic,
          area: ex.area,
          lastDate: ex.date,
          accuracy: accuracy,
          priority: topicPriorityMap.get(topicNorm) || 2
        });
      }
    });

    // 3. Generate Reviews based on "lastDate"
    const reviews: any[] = [];

    reviewMap.forEach((data) => {
      const lastTime = new Date(data.lastDate).getTime();
      let earliestDue: any = null;

      // Check intervals in order (1, 7, 14, 30)
      // We want to find the *first* interval that is due and not yet done
      for (const interval of REVIEW_INTERVALS) {
        const reviewTime = lastTime + (interval * 24 * 60 * 60 * 1000);
        const reviewDateStr = new Date(reviewTime).toISOString().split('T')[0];

        // Only care if it's due today or in the past
        if (reviewDateStr <= today) {
          // Check if there is ANY interaction (Exercise OR Manual Review) AFTER the due date
          const hasRecentInteraction =
            // Has exercise after due date?
            exercises.some(e => e.topic.toLowerCase() === data.topic.toLowerCase() && e.date >= reviewDateStr && e.date > data.lastDate) ||
            // Has manual review after due date?
            manualReviews.some(m => m.topic.toLowerCase() === data.topic.toLowerCase() && m.date >= reviewDateStr) ||
            // Is the current "lastDate" itself after the due date?
            data.lastDate >= reviewDateStr;

          if (!hasRecentInteraction) {
            // FOUND IT! This is a pending review.
            // Since we iterate 1 -> 30, the first one we find is naturally the "oldest" logical step (D1 before D7).
            earliestDue = {
              topic: data.topic,
              area: data.area,
              dueDate: reviewDateStr,
              originalDate: data.lastDate,
              accuracy: data.accuracy,
              dayInterval: interval,
              priority: (data.priority || 2) as 1 | 2 | 3
            };

            // Stop looking for further intervals for this topic.
            // We only show the "next step" that needs to be done.
            break;
          }
        }
      }

      if (earliestDue) {
        reviews.push(earliestDue);
      }
    });

    return reviews.sort((a, b) => {
      // Sort by Priority (High to Low), then by Due Date (Oldest to Newest)
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
      case 'mind-maps': return <MindMaps userId={user?.id} />;
      case 'flashcards': return <Flashcards flashcards={flashcards} folders={folders} addFlashcard={addFlashcard} deleteFlashcard={deleteFlashcard} updateFlashcard={updateFlashcard} addFolder={addFolder} updateFolder={updateFolder} deleteFolder={deleteFolder} />;
      case 'banca-analysis': return <BancaAnalysis exams={exams} />;
      case 'dream-board': return <DreamBoard items={dreamBoardItems} addItem={addDreamItem} deleteItem={deleteDreamItem} />;
      case 'editorial': return <Editorial data={editorialData} setData={setEditorialData} updateTopicStatus={updateTopicStatus} onAddXP={handleAddXP} onTabChange={handleTabChange} editorials={editorials} selectedEditorialId={selectedEditorialId} setSelectedEditorialId={setSelectedEditorialId} createEditorial={createEditorial} deleteEditorial={deleteEditorial} renameEditorial={renameEditorial} deleteSubarea={deleteSubarea} renameSubarea={renameSubarea} deleteTopic={deleteTopic} renameTopic={renameTopic} />;
      case 'xo-burnout': return burnoutLoading ? <div className="text-center py-8">Carregando...</div> : <XoBurnout data={burnoutData} addCheckIn={addBurnoutCheckIn} />;
      case 'exam-mode': return examModeLoading ? <div className="text-center py-8">Carregando...</div> : <ExamMode data={examModeData} addSession={addExamSession} updateMantra={updateMantra} />;
      case 'profile-settings': return <ProfileSettings profile={profile} updateProfile={updateProfile} userEmail={user?.email} />;
      case 'admin': return <AdminDashboard users={adminUsers} loading={adminLoading} toggleFreezeUser={toggleFreezeUser} />;
      default: return <Dashboard exercises={exercises} classes={classes} pendingReviews={pendingReviews} goals={goals} setGoals={updateGoals} userProgress={userProgress} />;
    }
  };

  const NavItem = ({ id, label, icon: Icon }: { id: TabType; label: string; icon: any }) => (
    <button
      onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
      className={`flex items-center w-full gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === id
        ? 'bg-primary text-primary-foreground shadow-md font-medium'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
    >
      <Icon size={20} />
      <span>{TAB_LABELS[id] || label}</span>
    </button>
  );

  // Show frozen account screen if user is frozen
  if (isFrozen) {
    return <FrozenAccountScreen userName={profile?.name || 'Estudante'} onSignOut={signOut} />;
  }

  return (
    <div className="min-h-screen flex w-full relative">
      {/* Overlay for mobile and desktop when drawer is open */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Drawer Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col transition-transform duration-300 shadow-xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="p-6 border-b flex justify-between items-center bg-card">
          <div className="flex items-center gap-3">
            <BrainCircuit size={36} className="text-primary min-w-[36px]" strokeWidth={2.5} />
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-none tracking-tight">Mentoria</span>
              <span className="text-xl font-extrabold leading-none text-primary tracking-tight">Regisdência</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem id="dashboard" label="Painel" icon={LayoutDashboard} />
          <NavItem id="exercises" label="Exercícios" icon={PenTool} />
          <NavItem id="classes" label="Aulas" icon={BookOpen} />
          <NavItem id="reviews" label="Revisões" icon={Calendar} />
          <NavItem id="notebook" label="Caderno de Erros" icon={Book} />
          <NavItem id="analysis" label="Análise Geral" icon={PieChart} />
          <NavItem id="editorial" label="Edital" icon={ScrollText} />
          <NavItem id="exams" label="Provas na íntegra" icon={FileText} />
          <NavItem id="reports" label="Relatório" icon={FileDown} />

          <div className="my-2 border-t pt-2">
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="flex items-center w-full gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all font-medium"
            >
              <Stethoscope size={20} />
              <span className="flex-1 text-left">FERRAMENTAS</span>
              {toolsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {toolsOpen && (
              <div className="pl-4 space-y-1 mt-1 animate-in slide-in-from-top-2 duration-200">
                <NavItem id="pomodoro" label="Pomodoro" icon={Clock} />
                <NavItem id="mind-maps" label="Mapas Mentais" icon={BrainCircuit} />
                <NavItem id="exam-mode" label="Modo Prova" icon={Timer} />
                <NavItem id="flashcards" label="Flashcards" icon={CreditCard} />
                <NavItem id="banca-analysis" label="Raio-X da Banca" icon={Trophy} />
                <NavItem id="dream-board" label="Mural dos Sonhos" icon={Heart} />
                <NavItem id="xo-burnout" label="Xô Burnout" icon={Smile} />
              </div>
            )}
          </div>

          <div className="my-4 border-t pt-4">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase mb-2">Assistente</p>
            <NavItem id="ai-tutor" label="TUTOR REGIS" icon={BrainCircuit} />
          </div>

          <div className="my-4 border-t pt-4">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase mb-2">Conta</p>
            <NavItem id="profile-settings" label="Informações Pessoais" icon={UserCircle} />
            {isAdmin && (
              <NavItem id="admin" label="Administrador" icon={Shield} />
            )}

            <div className="pt-2 space-y-2">
              <Button variant="ghost" className="w-full justify-start px-4 gap-3 font-normal text-muted-foreground hover:text-accent-foreground" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start px-4 gap-3 font-normal text-muted-foreground hover:text-accent-foreground" onClick={signOut}>
                <LogOut size={20} />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </nav>
      </aside>

      <main className="flex-1 min-w-0 transition-all duration-300">
        <header className="bg-card border-b p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="mr-4 text-primary hover:text-primary/80 transition-colors"
          >
            <Menu size={28} />
          </button>

          <h2 className="text-xl font-bold uppercase md:block hidden text-primary">
            {TAB_LABELS[activeTab]}
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
