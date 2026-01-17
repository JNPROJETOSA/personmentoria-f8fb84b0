export enum MedicalArea {
  PEDIATRIA = 'Pediatria',
  GO = 'Ginecologia e Obstetrícia',
  PREVENTIVA = 'Medicina Preventiva',
  CLINICA = 'Clínica Médica',
  CIRURGIA = 'Cirurgia'
}

export type TabType = 'dashboard' | 'analysis' | 'classes' | 'exercises' | 'reviews' | 'exams' | 'ai-tutor' | 'reports' | 'notebook' | 'pomodoro' | 'flashcards' | 'banca-analysis' | 'dream-board' | 'editorial' | 'xo-burnout' | 'exam-mode' | 'profile-settings' | 'admin' | 'mind-maps';

export interface Flashcard {
  id: string;
  area: MedicalArea;
  front: string;
  back: string;
  folderId: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  lastReviewed: string | null;
  nextReview: string | null;
  reviewCount: number;
}

export interface DreamBoardItem {
  id: string;
  type: 'image' | 'note';
  content: string; // URL for image, text for note
  title?: string;
  color?: string; // Hex code or preset
  fontColor?: string; // Hex code or preset
  fontSize?: 'small' | 'medium' | 'large';
  isAutoFit?: boolean;
  createdAt: string;
}

export interface UserProgress {
  xp: number;
  level: number;
  streak: number;
  lastStudyDate: string | null;
  totalActivities: number;
}

export interface ClassItem {
  id: string;
  title: string;
  area: MedicalArea;
  date: string;
  studied: boolean;
  priority: 1 | 2 | 3; // 1 = High, 2 = Medium, 3 = Low
}

export interface ExerciseLog {
  id: string;
  date: string;
  area: MedicalArea;
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
}

export interface ExamLog {
  id: string;
  name: string;
  institution: string;
  date: string;
  totalQuestions: number;
  correctAnswers: number;
  areas: MedicalArea[];
  areaDetails?: {
    area: MedicalArea;
    correct: number;
    total: number;
  }[];
}

export interface ReviewItem {
  topic: string;
  area: MedicalArea;
  dueDate: string;
  originalDate: string;
  accuracy: number;
  dayInterval: number;
  priority: 1 | 2 | 3;
}

export interface ManualReviewLog {
  id: string;
  topic: string;
  date: string;
}

export interface NotebookData {
  [MedicalArea.PEDIATRIA]: string;
  [MedicalArea.GO]: string;
  [MedicalArea.PREVENTIVA]: string;
  [MedicalArea.CLINICA]: string;
  [MedicalArea.CIRURGIA]: string;
}

export interface Goals {
  weeklyQuestions: number;
  targetAccuracy: number;
  targetTopicsPerWeek: number;
}

export enum TopicStatus {
  NOT_STARTED = 'not-started',
  THEORY_SEEN = 'theory-seen',
  MATERIALS_DONE = 'materials-done',
  MASTERED = 'mastered'
}

export interface EditorialTopic {
  id: string;
  name: string;
  status: TopicStatus;
}

export interface EditorialSubarea {
  id: string;
  name: string;
  topics: EditorialTopic[];
}

export interface EditorialArea {
  id: string;
  name: MedicalArea;
  subareas: EditorialSubarea[];
}

export interface EditorialData {
  areas: EditorialArea[];
}

export type BurnoutLevel = 'green' | 'yellow' | 'red';

export interface CheckInEntry {
  id: string;
  date: string;
  time: string;
  feeling: number; // 1-5
  energy: number; // 1-5
  mood: number; // 1-5
  sleep: 'great' | 'ok' | 'bad';
  stress: boolean;
  studyPerformance: 'yes' | 'partially' | 'no';
  notes?: string;
  level: BurnoutLevel;
}

export interface BurnoutData {
  checkIns: CheckInEntry[];
}

export type AmbientSound = 'silence' | 'exam-room' | 'white-noise' | 'rain' | 'library' | 'auditorium';

export interface ExamPhase {
  name: string;
  duration: number; // minutes
}

export interface DistractionMark {
  timestamp: number; // seconds from start
  type: 'mental-pause' | 'distraction';
}

export interface ExamSessionConfig {
  totalTime: number; // minutes
  phases: ExamPhase[];
  ambientSound: AmbientSound;
  soundAlerts: boolean;
  fullscreen: boolean;
  resistanceMode: boolean;
  mantra?: string;
}

export interface PostSessionEmotions {
  anxiety: number; // 1-5
  focus: number; // 1-5
  mentalFatigue: number; // 1-5
  overallFeeling: string;
}

export interface ExamSession {
  id: string;
  date: string;
  config: ExamSessionConfig;
  distractions: DistractionMark[];
  emotions?: PostSessionEmotions;
  diary?: string;
  strategy?: string;
  completed: boolean;
  actualDuration: number; // minutes
}

export interface ExamModeData {
  sessions: ExamSession[];
  mantra: string;
}
