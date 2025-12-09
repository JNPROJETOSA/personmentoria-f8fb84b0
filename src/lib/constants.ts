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

// Bancas/Instituições de Provas Médicas
export const EXAM_INSTITUTIONS = [
  'USP',
  'UNIFESP',
  'ENARE',
  'SUS-SP',
  'SUS-RJ',
  'SES-PE',
  'AMRIGS',
  'IAMSPE',
  'UNICAMP',
  'UFMG',
  'UFRJ',
  'Revalida',
  'Outra'
] as const;

// Template do Edital CNRM
export const EDITORIAL_TEMPLATE = {
  areas: [
    {
      id: 'pediatria',
      name: MedicalArea.PEDIATRIA,
      subareas: [
        {
          id: 'neo',
          name: 'Neonatologia',
          topics: [
            { id: 'neo-1', name: 'Reanimação Neonatal', status: 'not-started' },
            { id: 'neo-2', name: 'Icterícia Neonatal', status: 'not-started' },
            { id: 'neo-3', name: 'Teste do Pezinho', status: 'not-started' },
            { id: 'neo-4', name: 'Sepse Neonatal', status: 'not-started' },
          ]
        },
        {
          id: 'infecto-ped',
          name: 'Infectologia Pediátrica',
          topics: [
            { id: 'inf-1', name: 'Imunização', status: 'not-started' },
            { id: 'inf-2', name: 'Doenças Exantemáticas', status: 'not-started' },
            { id: 'inf-3', name: 'Pneumonias', status: 'not-started' },
          ]
        },
        {
          id: 'cresc',
          name: 'Crescimento e Desenvolvimento',
          topics: [
            { id: 'cresc-1', name: 'Marcos do Desenvolvimento', status: 'not-started' },
            { id: 'cresc-2', name: 'Aleitamento Materno', status: 'not-started' },
          ]
        }
      ]
    },
    {
      id: 'clinica',
      name: MedicalArea.CLINICA,
      subareas: [
        {
          id: 'cardio',
          name: 'Cardiologia',
          topics: [
            { id: 'card-1', name: 'Insuficiência Cardíaca', status: 'not-started' },
            { id: 'card-2', name: 'Hipertensão Arterial', status: 'not-started' },
            { id: 'card-3', name: 'Síndrome Coronariana Aguda', status: 'not-started' },
          ]
        },
        {
          id: 'pneumo',
          name: 'Pneumologia',
          topics: [
            { id: 'pneu-1', name: 'Asma', status: 'not-started' },
            { id: 'pneu-2', name: 'DPOC', status: 'not-started' },
            { id: 'pneu-3', name: 'Tuberculose', status: 'not-started' },
          ]
        },
        {
          id: 'endo',
          name: 'Endocrinologia',
          topics: [
            { id: 'endo-1', name: 'Diabetes Mellitus', status: 'not-started' },
            { id: 'endo-2', name: 'Tireoidopatias', status: 'not-started' },
          ]
        }
      ]
    },
    {
      id: 'cirurgia',
      name: MedicalArea.CIRURGIA,
      subareas: [
        {
          id: 'trauma',
          name: 'Trauma',
          topics: [
            { id: 'trauma-1', name: 'ATLS', status: 'not-started' },
            { id: 'trauma-2', name: 'Trauma Abdominal', status: 'not-started' },
            { id: 'trauma-3', name: 'Trauma Torácico', status: 'not-started' },
          ]
        },
        {
          id: 'abdomen',
          name: 'Cirurgia do Abdome',
          topics: [
            { id: 'abd-1', name: 'Abdome Agudo', status: 'not-started' },
            { id: 'abd-2', name: 'Apendicite', status: 'not-started' },
            { id: 'abd-3', name: 'Colecistite', status: 'not-started' },
          ]
        }
      ]
    },
    {
      id: 'go',
      name: MedicalArea.GO,
      subareas: [
        {
          id: 'obstetrica',
          name: 'Obstetrícia',
          topics: [
            { id: 'obs-1', name: 'Pré-Natal', status: 'not-started' },
            { id: 'obs-2', name: 'Trabalho de Parto', status: 'not-started' },
            { id: 'obs-3', name: 'Hipertensão na Gestação', status: 'not-started' },
          ]
        },
        {
          id: 'gineco',
          name: 'Ginecologia',
          topics: [
            { id: 'gin-1', name: 'Câncer de Colo', status: 'not-started' },
            { id: 'gin-2', name: 'Sangramento Uterino Anormal', status: 'not-started' },
          ]
        }
      ]
    },
    {
      id: 'preventiva',
      name: MedicalArea.PREVENTIVA,
      subareas: [
        {
          id: 'sus',
          name: 'SUS',
          topics: [
            { id: 'sus-1', name: 'Princípios e Diretrizes', status: 'not-started' },
            { id: 'sus-2', name: 'Atenção Primária', status: 'not-started' },
          ]
        },
        {
          id: 'epidemio',
          name: 'Epidemiologia',
          topics: [
            { id: 'epi-1', name: 'Indicadores de Saúde', status: 'not-started' },
            { id: 'epi-2', name: 'Vigilância Epidemiológica', status: 'not-started' },
          ]
        }
      ]
    }
  ]
};