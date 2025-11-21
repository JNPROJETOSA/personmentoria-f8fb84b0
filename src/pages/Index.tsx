import { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, PieChart, BookOpen, PenTool, Calendar, FileText, BrainCircuit, Menu, X, FileDown, Book, Sun, Moon, LogOut, Clock, CreditCard, Trophy, Heart } from 'lucide-react';
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
import Login from '@/components/Login';
import { TabType, ClassItem, ExerciseLog, ExamLog, NotebookData, MedicalArea, ManualReviewLog, Goals, User, UserProgress, Flashcard, DreamBoardItem } from '@/lib/types';
import { MOCK_CLASSES_INITIAL, MOCK_EXERCISES_INITIAL, REVIEW_INTERVALS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

const AuthenticatedApp = ({ user, onLogout }: { user: User; onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  
  const storagePrefix = `perry_${user.email}_`;

  const [classes, setClasses] = useState<ClassItem[]>(() => {
    const saved = localStorage.getItem(storagePrefix + 'classes');
    const parsed = saved ? JSON.parse(saved) : MOCK_CLASSES_INITIAL;
    return parsed.map((c: any) => ({ ...c, priority: c.priority || 2 }));
  });

  const [exercises, setExercises] = useState<ExerciseLog[]>(() => {
    const saved = localStorage.getItem(storagePrefix + 'exercises');
    return saved ? JSON.parse(saved) : MOCK_EXERCISES_INITIAL;
  });

  const [exams, setExams] = useState<ExamLog[]>(() => {
    const saved = localStorage.getItem(storagePrefix + 'exams');
    return saved ? JSON.parse(saved) : [];
  });

  const [notebookData, setNotebookData] = useState<NotebookData>(() => {
    const saved = localStorage.getItem(storagePrefix + 'notebook');
    return saved ? JSON.parse(saved) : {
      [MedicalArea.PEDIATRIA]: '',
      [MedicalArea.GO]: '',
      [MedicalArea.PREVENTIVA]: '',
      [MedicalArea.CLINICA]: '',
      [MedicalArea.CIRURGIA]: ''
    };
  });

  const [manualReviews, setManualReviews] = useState<ManualReviewLog[]>(() => {
    const saved = localStorage.getItem(storagePrefix + 'manual_reviews');
    return saved ? JSON.parse(saved) : [];
  });

  const [goals, setGoals] = useState<Goals>(() => {
    const saved = localStorage.getItem(storagePrefix + 'goals');
    return saved ? JSON.parse(saved) : {
      weeklyQuestions: 50,
      targetAccuracy: 80,
      targetTopicsPerWeek: 5
    };
  });

  const [userProgress, setUserProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem(storagePrefix + 'user_progress');
    return saved ? JSON.parse(saved) : {
      xp: 0,
      level: 1,
      streak: 0,
      lastStudyDate: null,
      totalActivities: 0
    };
  });

  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => {
    const saved = localStorage.getItem(storagePrefix + 'flashcards');
    return saved ? JSON.parse(saved) : [];
  });

  const [dreamBoardItems, setDreamBoardItems] = useState<DreamBoardItem[]>(() => {
    const saved = localStorage.getItem(storagePrefix + 'dream_board');
    return saved ? JSON.parse(saved) : [];
  });

  // Update XP and streak when exercises, exams, or classes change
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const totalActivities = exercises.length + exams.length + classes.filter(c => c.studied).length;
    
    // Calculate XP: 5 XP per question answered, 10 XP per class, 20 XP per exam
    const exerciseXP = exercises.reduce((sum, ex) => sum + ex.totalQuestions * 5, 0);
    const classXP = classes.filter(c => c.studied).length * 10;
    const examXP = exams.length * 20;
    const totalXP = exerciseXP + classXP + examXP;

    // Update streak
    let newStreak = userProgress.streak;
    if (userProgress.lastStudyDate) {
      const lastDate = new Date(userProgress.lastStudyDate);
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

    setUserProgress({
      xp: totalXP,
      level: Math.floor(totalXP / 100) + 1,
      streak: newStreak,
      lastStudyDate: hasActivityToday ? today : userProgress.lastStudyDate,
      totalActivities
    });
  }, [exercises, exams, classes]);

  useEffect(() => { localStorage.setItem(storagePrefix + 'classes', JSON.stringify(classes)); }, [classes]);
  useEffect(() => { localStorage.setItem(storagePrefix + 'exercises', JSON.stringify(exercises)); }, [exercises]);
  useEffect(() => { localStorage.setItem(storagePrefix + 'exams', JSON.stringify(exams)); }, [exams]);
  useEffect(() => { localStorage.setItem(storagePrefix + 'notebook', JSON.stringify(notebookData)); }, [notebookData]);
  useEffect(() => { localStorage.setItem(storagePrefix + 'manual_reviews', JSON.stringify(manualReviews)); }, [manualReviews]);
  useEffect(() => { localStorage.setItem(storagePrefix + 'goals', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem(storagePrefix + 'user_progress', JSON.stringify(userProgress)); }, [userProgress]);
  useEffect(() => { localStorage.setItem(storagePrefix + 'flashcards', JSON.stringify(flashcards)); }, [flashcards]);
  useEffect(() => { localStorage.setItem(storagePrefix + 'dream_board', JSON.stringify(dreamBoardItems)); }, [dreamBoardItems]);

  const handleMarkReviewed = (topic: string) => {
    const log: ManualReviewLog = {
      id: Date.now().toString(),
      topic,
      date: new Date().toISOString().split('T')[0]
    };
    setManualReviews(prev => [...prev, log]);
  };

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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard exercises={exercises} classes={classes} pendingReviews={pendingReviews} goals={goals} setGoals={setGoals} userProgress={userProgress} />;
      case 'analysis': return <Analysis exercises={exercises} />;
      case 'classes': return <Classes classes={classes} setClasses={setClasses} />;
      case 'exercises': return <Exercises exercises={exercises} setExercises={setExercises} />;
      case 'reviews': return <Reviews reviews={pendingReviews} onMarkReviewed={handleMarkReviewed} manualReviews={manualReviews} />;
      case 'exams': return <Exams exams={exams} setExams={setExams} />;
      case 'ai-tutor': return <AIChat exercises={exercises} classes={classes} />;
      case 'reports': return <Reports exercises={exercises} classes={classes} exams={exams} />;
      case 'notebook': return <Notebook data={notebookData} setData={setNotebookData} />;
      case 'pomodoro': return <Pomodoro />;
      case 'flashcards': return <Flashcards flashcards={flashcards} setFlashcards={setFlashcards} />;
      case 'banca-analysis': return <BancaAnalysis exams={exams} />;
      case 'dream-board': return <DreamBoard items={dreamBoardItems} setItems={setDreamBoardItems} />;
      default: return <Dashboard exercises={exercises} classes={classes} pendingReviews={pendingReviews} goals={goals} setGoals={setGoals} userProgress={userProgress} />;
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
            <h1 className="text-xl font-extrabold">PERRY<span className="text-primary">MED</span></h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
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
            <NavItem id="flashcards" label="Flashcards" icon={CreditCard} />
            <NavItem id="banca-analysis" label="Raio-X da Banca" icon={Trophy} />
            <NavItem id="dream-board" label="Mural dos Sonhos" icon={Heart} />
          </div>
          
          <div className="my-4 border-t pt-4">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase mb-2">Assistente</p>
            <NavItem id="ai-tutor" label="Tutor PERRY" icon={BrainCircuit} />
          </div>
        </nav>

        <div className="p-4 border-t space-y-2">
          <Button variant="outline" className="w-full" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
            {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </Button>
          <Button variant="outline" className="w-full" onClick={onLogout}>
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
              <span className="font-semibold">{user.name}</span>
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
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('perry_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
    localStorage.setItem('perry_current_user', JSON.stringify(loggedUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('perry_current_user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return <AuthenticatedApp user={user} onLogout={handleLogout} />;
}
