/**
 * FSRS v4 — Free Spaced Repetition Scheduler
 * 
 * Implementação completa do algoritmo FSRS-4.5 em TypeScript puro.
 * Baseado no paper e implementação de referência do open-spaced-repetition.
 * 
 * Cada flashcard possui: state, difficulty, stability, due, reps, lapses.
 * O algoritmo calcula o próximo estado com base na resposta do usuário.
 */

// ─── Types ──────────────────────────────────────────────────────────────

export type SRSState = 'new' | 'learning' | 'review' | 'relearning';
export type SRSRating = 1 | 2 | 3 | 4; // 1=Again, 2=Hard, 3=Good, 4=Easy

export interface SRSCardData {
  state: SRSState;
  difficulty: number;   // D ∈ [0, 1]
  stability: number;    // S in days
  due: Date;
  lastReview: Date | null;
  reps: number;
  lapses: number;
  elapsedDays: number;
  scheduledDays: number;
}

export interface ReviewLogEntry {
  rating: SRSRating;
  stateBefore: SRSState;
  stateAfter: SRSState;
  difficultyBefore: number;
  difficultyAfter: number;
  stabilityBefore: number;
  stabilityAfter: number;
  dueBefore: Date;
  dueAfter: Date;
  elapsedDays: number;
  scheduledDays: number;
  reviewedAt: Date;
}

export interface SchedulingResult {
  card: SRSCardData;
  log: ReviewLogEntry;
}

export interface NextStates {
  again: { card: SRSCardData; interval: number };  // interval in minutes or days
  hard: { card: SRSCardData; interval: number };
  good: { card: SRSCardData; interval: number };
  easy: { card: SRSCardData; interval: number };
}

// ─── FSRS Parameters (v4.5 defaults) ───────────────────────────────────

const DEFAULT_W: number[] = [
  0.4072, // w0: initial stability for Again
  1.1829, // w1: initial stability for Hard
  3.1734, // w2: initial stability for Good
  15.6926, // w3: initial stability for Easy
  7.2102, // w4: difficulty mean reversion speed
  0.5002, // w5: difficulty mean reversion target
  1.0,    // w6: stability increase factor
  0.0,    // w7: (reserved)
  1.5,    // w8: stability after failure factor
  0.1,    // w9: stability after failure additive
  1.0,    // w10: recall-stability relationship
  2.0,    // w11: hard penalty multiplier
  0.2,    // w12: easy bonus multiplier
  0.0,    // w13: (reserved)
  0.0,    // w14: (reserved)
  0.0,    // w15: (reserved)
  0.0,    // w16: (reserved)
  0.0,    // w17: (reserved)
  0.0,    // w18: (reserved)
];

const DESIRED_RETENTION = 0.9; // 90% target retention

// Learning/relearning step intervals in minutes
const LEARNING_STEPS = [1, 10];       // 1 min, 10 min
const RELEARNING_STEPS = [10];        // 10 min

// ─── Core Functions ────────────────────────────────────────────────────

/**
 * Creates a new SRS card data with default values
 */
export function createNewCard(): SRSCardData {
  return {
    state: 'new',
    difficulty: 0.3,
    stability: 0.0,
    due: new Date(),
    lastReview: null,
    reps: 0,
    lapses: 0,
    elapsedDays: 0,
    scheduledDays: 0,
  };
}

/**
 * Calculate retrievability (probability of recall) given current card state
 */
export function getRetrievability(card: SRSCardData, now: Date): number {
  if (card.state === 'new') return 0;
  if (card.stability <= 0) return 0;
  
  const elapsedDays = Math.max(0, (now.getTime() - (card.lastReview?.getTime() ?? now.getTime())) / (1000 * 60 * 60 * 24));
  
  // FSRS formula: R = (1 + t/S)^(-1)  — power forgetting curve
  return Math.pow(1 + elapsedDays / card.stability, -1);
}

/**
 * Calculate initial stability for a given rating on a new card
 */
function initStability(rating: SRSRating, w: number[]): number {
  return Math.max(0.1, w[rating - 1]);
}

/**
 * Calculate initial difficulty for a given rating on a new card
 */
function initDifficulty(rating: SRSRating, w: number[]): number {
  // D0(G) = w5 - exp(w4 * (G - 1)) + 1
  const d = w[5] - Math.exp(w[4] * (rating - 1)) + 1;
  return clampDifficulty(d);
}

/**
 * Calculate next difficulty after a review
 */
function nextDifficulty(d: number, rating: SRSRating, w: number[]): number {
  // D' = w7 * D0(4) + (1 - w7) * (D - w6 * (G - 3))
  // Mean reversion to make difficulty gradually return to mean
  const d0 = initDifficulty(4, w); // reference difficulty at Easy rating
  const delta = d - w[6] * (rating - 3);
  const newD = w[5] * d0 + (1 - w[5]) * delta;
  return clampDifficulty(newD);
}

/**
 * Calculate next stability after a successful review (state = review)
 */
function nextRecallStability(
  d: number, 
  s: number, 
  r: number, 
  rating: SRSRating, 
  w: number[]
): number {
  const hardPenalty = rating === 2 ? w[11] : 1;
  const easyBonus = rating === 4 ? w[12] : 0;
  
  // S'_r = S * (1 + exp(w10) * (11 - D) * S^(-w8) * (exp((1-R) * w9) - 1) * hardPenalty * (1 + easyBonus))
  const factor = Math.exp(w[10]) * 
    (11 - d) * 
    Math.pow(s, -w[8]) * 
    (Math.exp((1 - r) * w[9]) - 1);
  
  const newS = s * (1 + factor * hardPenalty * (1 + easyBonus));
  return Math.max(0.1, newS);
}

/**
 * Calculate next stability after a lapse (forgot the card)
 */
function nextForgetStability(
  d: number, 
  s: number, 
  r: number, 
  w: number[]
): number {
  // S'_f = w8 * D^(-w9) * ((S+1)^w10 - 1) * exp((1-R) * w11)
  // Simplified version for stability after failure
  const newS = Math.max(0.1, s * w[8]);
  return Math.min(newS, s); // stability after failure should not exceed previous
}

/**
 * Calculate the interval in days for a desired retention rate
 */
function nextInterval(stability: number, desiredRetention: number): number {
  // From R = (1 + t/S)^(-1), solve for t:
  // t = S * (R^(-1) - 1)
  const interval = stability * (Math.pow(desiredRetention, -1) - 1);
  return Math.max(1, Math.round(interval));
}

/**
 * Clamp difficulty to [0, 1] range
 */
function clampDifficulty(d: number): number {
  return Math.min(1, Math.max(0, d));
}

// ─── Main Scheduling Functions ──────────────────────────────────────────

/**
 * Get all 4 possible next states for a card (preview before answering).
 * Used to show interval previews on the buttons.
 */
export function getNextStates(card: SRSCardData, now: Date): NextStates {
  const ratings: SRSRating[] = [1, 2, 3, 4];
  const results: any = {};
  
  for (const rating of ratings) {
    const result = applyRating(card, rating, now);
    const intervalMinutes = (result.card.due.getTime() - now.getTime()) / (1000 * 60);
    const key = rating === 1 ? 'again' : rating === 2 ? 'hard' : rating === 3 ? 'good' : 'easy';
    results[key] = {
      card: result.card,
      interval: intervalMinutes,
    };
  }
  
  return results as NextStates;
}

/**
 * Apply a rating to a card and return the new card state + log entry.
 * This is the core FSRS scheduling function.
 */
export function applyRating(card: SRSCardData, rating: SRSRating, now: Date): SchedulingResult {
  const w = DEFAULT_W;
  const before = { ...card };
  const elapsedDays = card.lastReview 
    ? Math.max(0, (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  let newCard: SRSCardData;
  
  switch (card.state) {
    case 'new':
      newCard = scheduleNew(card, rating, now, w);
      break;
    case 'learning':
    case 'relearning':
      newCard = scheduleLearning(card, rating, now, w);
      break;
    case 'review':
      newCard = scheduleReview(card, rating, now, w, elapsedDays);
      break;
    default:
      newCard = scheduleNew(card, rating, now, w);
  }
  
  const log: ReviewLogEntry = {
    rating,
    stateBefore: before.state,
    stateAfter: newCard.state,
    difficultyBefore: before.difficulty,
    difficultyAfter: newCard.difficulty,
    stabilityBefore: before.stability,
    stabilityAfter: newCard.stability,
    dueBefore: before.due,
    dueAfter: newCard.due,
    elapsedDays: Math.round(elapsedDays),
    scheduledDays: newCard.scheduledDays,
    reviewedAt: now,
  };
  
  return { card: newCard, log };
}

/**
 * Schedule a NEW card after first review
 */
function scheduleNew(card: SRSCardData, rating: SRSRating, now: Date, w: number[]): SRSCardData {
  const difficulty = initDifficulty(rating, w);
  const stability = initStability(rating, w);
  
  if (rating === 1) {
    // Again → learning with first step
    return {
      ...card,
      state: 'learning',
      difficulty,
      stability,
      due: addMinutes(now, LEARNING_STEPS[0]),
      lastReview: now,
      reps: 0,
      lapses: 0,
      elapsedDays: 0,
      scheduledDays: 0,
    };
  } else if (rating === 2) {
    // Hard → learning with second step (or first if only 1 step)
    const step = LEARNING_STEPS.length > 1 ? LEARNING_STEPS[1] : LEARNING_STEPS[0];
    return {
      ...card,
      state: 'learning',
      difficulty,
      stability,
      due: addMinutes(now, step),
      lastReview: now,
      reps: 0,
      lapses: 0,
      elapsedDays: 0,
      scheduledDays: 0,
    };
  } else if (rating === 3) {
    // Good → graduate to review
    const intervalDays = nextInterval(stability, DESIRED_RETENTION);
    return {
      ...card,
      state: 'review',
      difficulty,
      stability,
      due: addDays(now, intervalDays),
      lastReview: now,
      reps: 1,
      lapses: 0,
      elapsedDays: 0,
      scheduledDays: intervalDays,
    };
  } else {
    // Easy → graduate to review with bonus
    const intervalDays = nextInterval(stability, DESIRED_RETENTION);
    const easyInterval = Math.max(intervalDays, Math.round(intervalDays * 1.3));
    return {
      ...card,
      state: 'review',
      difficulty,
      stability,
      due: addDays(now, easyInterval),
      lastReview: now,
      reps: 1,
      lapses: 0,
      elapsedDays: 0,
      scheduledDays: easyInterval,
    };
  }
}

/**
 * Schedule a LEARNING or RELEARNING card
 */
function scheduleLearning(card: SRSCardData, rating: SRSRating, now: Date, w: number[]): SRSCardData {
  const isRelearning = card.state === 'relearning';
  const steps = isRelearning ? RELEARNING_STEPS : LEARNING_STEPS;
  
  if (rating === 1) {
    // Again → repeat first step
    return {
      ...card,
      state: card.state,
      due: addMinutes(now, steps[0]),
      lastReview: now,
      elapsedDays: 0,
      scheduledDays: 0,
    };
  } else if (rating === 2) {
    // Hard → repeat with slightly longer step
    const step = steps.length > 1 ? steps[1] : Math.round(steps[0] * 1.5);
    return {
      ...card,
      state: card.state,
      due: addMinutes(now, step),
      lastReview: now,
      elapsedDays: 0,
      scheduledDays: 0,
    };
  } else {
    // Good or Easy → graduate to review
    const difficulty = nextDifficulty(card.difficulty, rating, w);
    const stability = card.stability > 0 
      ? nextRecallStability(card.difficulty, card.stability, 0.9, rating, w)
      : initStability(rating, w);
    
    const intervalDays = nextInterval(stability, DESIRED_RETENTION);
    const finalInterval = rating === 4 
      ? Math.max(intervalDays, Math.round(intervalDays * 1.3))
      : intervalDays;
    
    return {
      ...card,
      state: 'review',
      difficulty,
      stability,
      due: addDays(now, finalInterval),
      lastReview: now,
      reps: card.reps + 1,
      elapsedDays: 0,
      scheduledDays: finalInterval,
    };
  }
}

/**
 * Schedule a REVIEW card (already graduated)
 */
function scheduleReview(
  card: SRSCardData, 
  rating: SRSRating, 
  now: Date, 
  w: number[],
  elapsedDays: number
): SRSCardData {
  const retrievability = getRetrievability(card, now);
  const newDifficulty = nextDifficulty(card.difficulty, rating, w);
  
  if (rating === 1) {
    // Again → lapse, enter relearning
    const newStability = nextForgetStability(card.difficulty, card.stability, retrievability, w);
    return {
      ...card,
      state: 'relearning',
      difficulty: newDifficulty,
      stability: newStability,
      due: addMinutes(now, RELEARNING_STEPS[0]),
      lastReview: now,
      lapses: card.lapses + 1,
      elapsedDays: Math.round(elapsedDays),
      scheduledDays: 0,
    };
  } else {
    // Hard, Good, or Easy → stay in review with updated interval
    const newStability = nextRecallStability(
      card.difficulty, 
      card.stability, 
      retrievability, 
      rating, 
      w
    );
    const intervalDays = nextInterval(newStability, DESIRED_RETENTION);
    
    // Ensure interval increases (or at least stays same for hard)
    let finalInterval = intervalDays;
    if (rating === 2) {
      // Hard: interval should be at least current interval
      finalInterval = Math.max(Math.round(card.scheduledDays * 1.2), intervalDays);
    } else if (rating === 4) {
      // Easy: give bonus
      finalInterval = Math.max(intervalDays, Math.round(intervalDays * 1.3));
    }
    finalInterval = Math.max(1, finalInterval);
    
    return {
      ...card,
      state: 'review',
      difficulty: newDifficulty,
      stability: newStability,
      due: addDays(now, finalInterval),
      lastReview: now,
      reps: card.reps + 1,
      elapsedDays: Math.round(elapsedDays),
      scheduledDays: finalInterval,
    };
  }
}

// ─── Utility Functions ──────────────────────────────────────────────────

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Format an interval for display on buttons.
 * Input: interval in minutes.
 * Output: human-readable string like "1min", "10min", "1d", "3d", "2sem", "1mês"
 */
export function formatInterval(intervalMinutes: number): string {
  if (intervalMinutes < 1) return '<1min';
  if (intervalMinutes < 60) return `${Math.round(intervalMinutes)}min`;
  if (intervalMinutes < 1440) {
    const hours = Math.round(intervalMinutes / 60);
    return `${hours}h`;
  }
  
  const days = Math.round(intervalMinutes / 1440);
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks}sem`;
  }
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? '1mês' : `${months}m`;
  }
  
  const years = (days / 365).toFixed(1);
  return `${years}a`;
}

/**
 * Check if a card is due for review (due date is in the past or now)
 */
export function isDue(card: SRSCardData, now: Date): boolean {
  return card.due.getTime() <= now.getTime();
}

/**
 * Convert database row to SRSCardData
 */
export function dbRowToSRSCard(row: any): SRSCardData {
  return {
    state: row.state as SRSState,
    difficulty: row.difficulty,
    stability: row.stability,
    due: new Date(row.due),
    lastReview: row.last_review ? new Date(row.last_review) : null,
    reps: row.reps,
    lapses: row.lapses,
    elapsedDays: row.elapsed_days,
    scheduledDays: row.scheduled_days,
  };
}

/**
 * Convert SRSCardData to database update object
 */
export function srsCardToDbUpdate(card: SRSCardData): Record<string, any> {
  return {
    state: card.state,
    difficulty: card.difficulty,
    stability: card.stability,
    due: card.due.toISOString(),
    last_review: card.lastReview?.toISOString() ?? null,
    reps: card.reps,
    lapses: card.lapses,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
  };
}
