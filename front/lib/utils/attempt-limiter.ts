/**
 * Manages failed attempt tracking for assignments with a 1-hour cooldown.
 * Stores data in localStorage as JSON: { assignmentId: { count: number; expiresAt: timestamp } }
 */

const STORAGE_KEY = "kavnt_failed_attempts";
const ATTEMPT_LIMIT = 3; // Max 3 failed attempts
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

interface AttemptRecord {
  count: number;
  expiresAt: number;
}

interface AttemptData {
  [assignmentId: string]: AttemptRecord;
}

/**
 * Get all attempt records from localStorage.
 */
function getAllAttempts(): AttemptData {
  try {
    if (typeof window === "undefined") return {};
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.warn("Failed to read attempt limiter from localStorage:", e);
    return {};
  }
}

/**
 * Save attempt records to localStorage.
 */
function saveAttempts(data: AttemptData): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save attempt limiter to localStorage:", e);
  }
}

/**
 * Check if an assignment has exceeded the attempt limit.
 */
export function isAttemptLimitExceeded(assignmentId: string): boolean {
  const data = getAllAttempts();
  const record = data[assignmentId];

  if (!record) return false;

  // Check if the cooldown has expired
  if (Date.now() >= record.expiresAt) {
    // Cooldown expired, remove the record
    delete data[assignmentId];
    saveAttempts(data);
    return false;
  }

  return record.count >= ATTEMPT_LIMIT;
}

/**
 * Record a failed attempt for an assignment.
 */
export function recordFailedAttempt(assignmentId: string): void {
  const data = getAllAttempts();
  const record = data[assignmentId];

  if (!record || Date.now() >= record.expiresAt) {
    // New record or cooldown expired
    data[assignmentId] = {
      count: 1,
      expiresAt: Date.now() + COOLDOWN_MS,
    };
  } else {
    // Increment existing record
    record.count += 1;
  }

  saveAttempts(data);
}

/**
 * Get remaining attempts for an assignment.
 */
export function getRemainingAttempts(assignmentId: string): number {
  const data = getAllAttempts();
  const record = data[assignmentId];

  if (!record) return ATTEMPT_LIMIT;

  if (Date.now() >= record.expiresAt) {
    delete data[assignmentId];
    saveAttempts(data);
    return ATTEMPT_LIMIT;
  }

  return Math.max(0, ATTEMPT_LIMIT - record.count);
}

/**
 * Get the time remaining until the cooldown expires (in minutes).
 */
export function getCooldownMinutesRemaining(assignmentId: string): number {
  const data = getAllAttempts();
  const record = data[assignmentId];

  if (!record) return 0;

  if (Date.now() >= record.expiresAt) {
    delete data[assignmentId];
    saveAttempts(data);
    return 0;
  }

  const remainingMs = record.expiresAt - Date.now();
  return Math.ceil(remainingMs / 60000);
}

/**
 * Reset attempts for an assignment (use for testing or admin).
 */
export function resetAttempts(assignmentId: string): void {
  const data = getAllAttempts();
  delete data[assignmentId];
  saveAttempts(data);
}
