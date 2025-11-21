import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns the performance color class based on accuracy percentage
 * Uses the PERRYMED color semaphore system
 * @param accuracy - Percentage from 0-100
 * @returns Tailwind class for text color
 */
export function getPerformanceColor(accuracy: number): string {
  if (accuracy >= 80) return 'text-performance-success'; // Emerald Green >80%
  if (accuracy >= 60) return 'text-performance-warning'; // Amber 60-79%
  return 'text-performance-danger'; // Red <60%
}

/**
 * Returns the performance badge classes (background + text)
 * @param accuracy - Percentage from 0-100
 * @returns Object with bg and text classes
 */
export function getPerformanceBadge(accuracy: number): { bg: string; text: string } {
  if (accuracy >= 80) return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
  if (accuracy >= 60) return { bg: 'bg-amber-100', text: 'text-amber-700' };
  return { bg: 'bg-red-100', text: 'text-red-700' };
}
