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

/** Прогресс по треку: lesson_id -> статус (task, puzzle, question) */
export type TrackProgress = Record<string, LessonProgressStatus>;

export interface Track {
  id: string;
  title: string;
  description: string;
  lessons: LessonRef[];
  order: number;
  /** Приходит с бэкенда при GET track по id (если пользователь авторизован) */
  progress?: TrackProgress;
  /** Группы, которым доступен трек. Пустой массив — доступен всем. */
  visibleGroupIds?: string[];
}

export interface LessonRef {
  id: string;
  type: "lecture" | "task" | "puzzle" | "question";
  title: string;
  order: number;
  /** Повышенная сложность (со звёздочкой) */
  hard?: boolean;
}

/** Вопрос на таймкоде видео */
export interface VideoPauseQuestion {
  id: string;
  title: string;
  prompt: string;
  choices: { id: string; text: string; is_correct?: boolean }[];
  multiple: boolean;
}

/** Точка паузы в видео */
export interface VideoPausePoint {
  id: string;
  timestamp: number; // секунды
  question: VideoPauseQuestion;
}

/** Блок лекции: текст, изображение, код, вопрос или видео */
export type LectureBlock =
  | { type: "text"; content: string }
  | { type: "image"; url: string; alt?: string }
  | { type: "code"; explanation: string; code: string; language?: string; stdin?: string }
  | {
      type: "question";
      id: string;
      title: string;
      prompt: string;
      choices: { id: string; text: string }[];
      multiple: boolean;
    }
  | {
      type: "video";
      id: string;
      url: string;
      pause_points?: VideoPausePoint[];
    };

export interface Lecture {
  id: string;
  title: string;
  /** Новый формат: массив блоков. Вопросы — inline как блоки. */
  blocks?: LectureBlock[];
  content?: string;
  trackId?: string;
  /** Группы, которым доступна лекция. Пустой массив — доступна всем. */
  visibleGroupIds?: string[];
  /** Может ли текущий пользователь редактировать (создатель или superuser) */
  canEdit?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  starterCode: string;
  testCases: TestCase[];
  trackId?: string;
  /** Повышенная сложность (со звёздочкой) */
  hard?: boolean;
  /** Группы, которым доступна задача. Пустой массив — доступна всем. */
  visibleGroupIds?: string[];
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
  /** Группы, которым доступен puzzle. Пустой массив — доступен всем. */
  visibleGroupIds?: string[];
}

export interface PuzzleCheckResult {
  passed: boolean;
  message: string;
}

// Вопросы (отдельные сущности в треке — множественный/одиночный выбор)
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
