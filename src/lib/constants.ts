import { MedicalArea } from './types';

export const AREA_COLORS: Record<MedicalArea, string> = {
  [MedicalArea.PEDIATRIA]: '#3B82F6', // Blue
  [MedicalArea.GO]: '#EC4899', // Pink
  [MedicalArea.PREVENTIVA]: '#10B981', // Emerald
  [MedicalArea.CLINICA]: '#F59E0B', // Amber
  [MedicalArea.CIRURGIA]: '#6366F1', // Indigo
};

export const REVIEW_INTERVALS = [1, 7, 14, 30];

// Código de segurança para novos cadastros
export const REGISTRATION_CODE = 'PERRY2024';

export const MOCK_CLASSES_INITIAL = [
  { id: '1', title: 'Calendário Vacinal', area: MedicalArea.PEDIATRIA, date: '2024-05-01', studied: true, priority: 1 },
  { id: '2', title: 'Pré-Natal de Baixo Risco', area: MedicalArea.GO, date: '2024-05-02', studied: true, priority: 2 },
  { id: '3', title: 'SUS - Princípios e Diretrizes', area: MedicalArea.PREVENTIVA, date: '2024-05-03', studied: false, priority: 3 },
];

export const MOCK_EXERCISES_INITIAL = [
  { id: '1', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], area: MedicalArea.PEDIATRIA, topic: 'Imunização', totalQuestions: 20, correctAnswers: 15 },
  { id: '2', date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], area: MedicalArea.GO, topic: 'Sangramento Primeira Metade', totalQuestions: 10, correctAnswers: 8 },
  { id: '3', date: new Date().toISOString().split('T')[0], area: MedicalArea.CIRURGIA, topic: 'Trauma Abdominal', totalQuestions: 15, correctAnswers: 10 },
];

// Sistema de Gamificação PerryMed RPG
export const XP_REWARDS = {
  EXERCISE: 10,         // Registrar bloco de exercícios
  REVIEW: 5,            // Revisão espaçada
  CLASS: 50,            // Cadastrar aula estudada
  EXAM: 100,            // Registrar prova na íntegra
};

export const RPG_LEVELS = [
  { level: 1, name: 'Interno', minXP: 0, emoji: '' },
  { level: 2, name: 'R1 Focado', minXP: 500, emoji: '' },
  { level: 3, name: 'R2 Experiente', minXP: 1500, emoji: '' },
  { level: 4, name: 'R3 Especialista', minXP: 3000, emoji: '' },
  { level: 5, name: 'Chefe de Plantão', minXP: 5000, emoji: '' },
  { level: 6, name: 'Staff Respeitado', minXP: 8000, emoji: '' },
  { level: 7, name: 'Lenda da Medicina', minXP: 12000, emoji: '' },
];