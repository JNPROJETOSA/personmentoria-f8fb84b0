export enum MedicalArea {
  PEDIATRIA = 'Pediatria',
  GO = 'Ginecologia e Obstetrícia',
  PREVENTIVA = 'Medicina Preventiva',
  CLINICA = 'Clínica Médica',
  CIRURGIA = 'Cirurgia'
}

export type TabType = 'dashboard' | 'analysis' | 'classes' | 'exercises' | 'reviews' | 'exams' | 'ai-tutor' | 'reports' | 'notebook';

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
  date: string;
  totalQuestions: number;
  correctAnswers: number;
  areas: MedicalArea[];
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

export interface User {
  email: string;
  name: string;
  password: string;
}
