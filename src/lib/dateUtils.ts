/**
 * Date utilities for weekly calculations
 */

/**
 * Get the start of the current week (Monday 00:00:00)
 */
export function getWeekStart(date: Date = new Date()): Date {
    const d = new Date(date);
    const day = d.getDay();
    // If Sunday (0), go back 6 days. Otherwise go back to Monday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Get the end of the current week (Sunday 23:59:59)
 */
export function getWeekEnd(date: Date = new Date()): Date {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
}

/**
 * Check if a date string (YYYY-MM-DD) is within the current week
 */
export function isInCurrentWeek(dateStr: string): boolean {
    // Parse date string as local date (avoid timezone issues)
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);

    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    // Compare dates at midnight level
    const dateTime = date.getTime();
    const startTime = weekStart.getTime();
    const endTime = weekEnd.getTime();

    return dateTime >= startTime && dateTime <= endTime;
}

/**
 * Format week range for display (e.g., "13/02/2026 - 19/02/2026")
 */
export function formatWeekRange(date: Date = new Date()): string {
    const start = getWeekStart(date);
    const end = getWeekEnd(date);
    return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
}

/**
 * Get current date as YYYY-MM-DD string in LOCAL timezone
 * 
 * IMPORTANT: Use this instead of `new Date().toISOString().split('T')[0]`
 * which returns UTC date and causes timezone bugs (e.g., activity on Feb 16 saved as Feb 15)
 */
export function getLocalDateString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format a YYYY-MM-DD date string for display as DD/MM/YYYY
 * 
 * IMPORTANT: Use this instead of `new Date(dateStr).toLocaleDateString()`
 * which parses as UTC and can show wrong date due to timezone conversion
 * 
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Formatted string DD/MM/YYYY
 */
export function formatDateDisplay(dateStr: string): string {
    // Remove time part if present (e.g., "2026-02-16T00:00:00" -> "2026-02-16")
    const datePart = dateStr.split('T')[0];
    // Split and reverse: "2026-02-16" -> ["16", "02", "2026"] -> "16/02/2026"
    return datePart.split('-').reverse().join('/');
}
