import { startOfWeek, addDays, getISOWeek, getISOWeekYear } from "date-fns";

export function getWeekMonday(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function getWeekMeta(monday: Date) {
  return {
    weekStart: monday,
    weekNumber: getISOWeek(monday),
    year: getISOWeekYear(monday),
  };
}

/**
 * Dinner rotation: 7 days, 3 people. Round-robin within the week.
 * Person at rotation[offset] gets Mon/Thu/Sun (3 days),
 * next gets Tue/Fri (2 days), next gets Wed/Sat (2 days).
 */
export function getDinnerAssignments(
  rotation: string[],
  offset: number
): string[] {
  const n = rotation.length;
  return Array.from({ length: 7 }, (_, dayIndex) => {
    const personIndex = (offset + dayIndex) % n;
    return rotation[personIndex];
  });
}

/**
 * Lunch rotation: same daily round-robin.
 * Mon=P[offset], Tue=P[offset+1], Wed=P[offset+2], Thu=P[offset], etc.
 */
export function getLunchAssignments(
  rotation: string[],
  offset: number
): string[] {
  const n = rotation.length;
  return Array.from({ length: 7 }, (_, dayIndex) => {
    const personIndex = (offset + dayIndex) % n;
    return rotation[personIndex];
  });
}

/** Grocery: 1 person per week. rotation[offset % length] */
export function getGroceryAssignment(
  rotation: string[],
  offset: number
): string {
  return rotation[offset % rotation.length];
}

/** Chores: 1 person per chore per week. Each chore has its own rotation array. */
export function getChoreAssignment(
  choreRotation: string[],
  offset: number
): string {
  return choreRotation[offset % choreRotation.length];
}

/** Format a Date as YYYY-MM-DD for Supabase date columns */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
