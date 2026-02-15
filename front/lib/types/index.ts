export interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role?: "superuser" | "teacher" | "student";
}

/** Статус задания в треке для текущего пользователя */
export type LessonProgressStatus = "completed" | "completed_late" | "started" | "not_started";

/** Прогресс по треку: lesson_id -> статус */
export type TrackProgress = Record<string, LessonProgressStatus>;

/** Просрочка в секундах для уроков со статусом completed_late */
export type TrackProgressLate = Record<string, number>;

export interface Track {
  id: string;
  title: string;
  description: string;
  lessons: LessonRef[];
  order: number;
  /** Приходит с бэкенда при GET track по id (если пользователь авторизован) */
  progress?: TrackProgress;
  /** Просрочка в секундах для completed_late */
  progressLate?: TrackProgressLate;
  /** Группы, которым доступен трек. Пустой массив — доступен всем. */
  visibleGroupIds?: string[];
  /** Создатель или superuser может удалить трек */
  canEdit?: boolean;
}

export interface LessonRef {
  id: string;
  type: "lecture" | "task" | "puzzle" | "question" | "survey";
  title: string;
  order: number;
  /** Повышенная сложность (со звёздочкой) */
  hard?: boolean;
  /** Temporary assignment: available from (ISO datetime) */
  available_from?: string | null;
  /** Temporary assignment: available until (ISO datetime) */
  available_until?: string | null;
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
      /** Подсказки к вопросу (открываются по порядку) */
      hints?: string[];
    }
  | {
      type: "video";
      id: string;
      /** Исходная ссылка (страница VK/Rutube или прямая). В редакторе хранится только она. */
      url: string;
      /** Прямая ссылка для воспроизведения (mp4/m3u8), подставляется бэкендом при просмотре. */
      direct_url?: string;
      /** Формат прямой ссылки: "mp4" | "m3u8" */
      video_format?: string;
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
  /** Временное задание: доступно с (ISO) */
  availableFrom?: string | null;
  /** Временное задание: доступно до (ISO) */
  availableUntil?: string | null;
  /** Подсказки к лекции */
  hints?: string[];
  /** Ограничение попыток (ответы на вопросы). null — без ограничения */
  maxAttempts?: number | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  starterCode: string;
  /** Язык программирования (python, javascript, cpp) */
  language?: string;
  testCases: TestCase[];
  trackId?: string;
  /** Повышенная сложность (со звёздочкой) */
  hard?: boolean;
  /** Группы, которым доступна задача. Пустой массив — доступна всем. */
  visibleGroupIds?: string[];
  /** Подсказки по порядку */
  hints?: string[];
  /** Временное задание: доступно с (ISO datetime) */
  availableFrom?: string | null;
  /** Временное задание: доступно до (ISO datetime) */
  availableUntil?: string | null;
  /** Ограничение попыток (null = неограниченно) */
  maxAttempts?: number | null;
  /** Использовано попыток (для текущего пользователя, только при GET) */
  attemptsUsed?: number | null;
  /** Может ли текущий пользователь редактировать/удалять (создатель или superuser) */
  canEdit?: boolean;
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
  hints?: string[];
  availableFrom?: string | null;
  availableUntil?: string | null;
  maxAttempts?: number | null;
  attemptsUsed?: number | null;
  canEdit?: boolean;
}

export interface PuzzleCheckResult {
  passed: boolean;
  message: string;
}

// Вопросы (отдельные сущности в треке — множественный/одиночный выбор)
export interface QuestionChoice {
  id: string;
  text: string;
  /** Только при can_edit (для редактора) */
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  title: string;
  prompt: string;
  choices: QuestionChoice[];
  multiple: boolean; // true — можно выбрать несколько ответов
  trackId?: string;
  hints?: string[];
  availableFrom?: string | null;
  availableUntil?: string | null;
  maxAttempts?: number | null;
  attemptsUsed?: number | null;
  canEdit?: boolean;
}

export interface QuestionCheckResult {
  passed: boolean;
  message?: string;
}

/** Опрос — свободная форма ответа. Ответ виден преподавателю/админу. */
export interface Survey {
  id: string;
  title: string;
  prompt: string;
  trackId?: string;
  visibleGroupIds?: string[];
  availableFrom?: string | null;
  availableUntil?: string | null;
  canEdit?: boolean;
  /** Ответ текущего пользователя (если уже отправлял) */
  myResponse?: string | null;
  /** Преподаватель или админ — может видеть все ответы на странице опроса */
  isTeacherOrAdmin?: boolean;
}
