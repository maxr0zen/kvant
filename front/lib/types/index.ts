export interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role?: "superuser" | "teacher" | "student";
}

/** Статус задания в треке для текущего пользователя */
export type LessonProgressStatus = "completed" | "started" | "not_started";

/** Прогресс по треку: для каждого task id — статус (лекции не учитываются) */
export type TrackProgress = Record<string, LessonProgressStatus>;

export interface Track {
  id: string;
  title: string;
  description: string;
  lessons: LessonRef[];
  order: number;
  /** Приходит с бэкенда при GET track по id (если пользователь авторизован) */
  progress?: TrackProgress;
}

export interface LessonRef {
  id: string;
  type: "lecture" | "task" | "puzzle" | "question";
  title: string;
  order: number;
}

/** Блок лекции: текст (с форматированием), изображение или код с пояснением и запуском */
export type LectureBlock =
  | { type: "text"; content: string }
  | { type: "image"; url: string; alt?: string }
  | { type: "code"; explanation: string; code: string; language?: string };

export interface Lecture {
  id: string;
  title: string;
  /** Новый формат: массив блоков. Для старых лекций может быть content. */
  blocks?: LectureBlock[];
  content?: string;
  trackId?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  starterCode: string;
  testCases: TestCase[];
  trackId?: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isPublic: boolean;
}

export interface TestRunResult {
  caseId: string;
  passed: boolean;
  actualOutput?: string;
  error?: string;
}

export interface SubmitResult {
  passed: boolean;
  results: TestRunResult[];
  message?: string;
}

// Puzzle-задачи (сборка кода из блоков)
export interface PuzzleBlock {
  id: string;
  code: string;
  order: string;
  indent: string;
}

export interface Puzzle {
  id: string;
  title: string;
  description: string;
  language: string;
  trackId?: string;
  blocks: PuzzleBlock[];
  solution: string;
}

export interface PuzzleCheckResult {
  passed: boolean;
  message: string;
}

// Вопросы (множественный/одиночный выбор)
export interface QuestionChoice {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  title: string;
  prompt: string;
  choices: QuestionChoice[];
  multiple: boolean; // true — можно выбрать несколько ответов
  trackId?: string;
}

export interface QuestionCheckResult {
  passed: boolean;
  message?: string;
}
