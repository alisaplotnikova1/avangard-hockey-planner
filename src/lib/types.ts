export type Role = 'head' | 'coach' | 'admin';

export type Team = '2013 А' | '2013 В' | '2014 А' | '2014 В' | '2015' | '2016' | '2017';

export const TEAMS: Team[] = ['2013 А', '2013 В', '2014 А', '2014 В', '2015', '2016', '2017'];

export const TRAINING_TYPES = ['На льду', 'ОФП/СФП'] as const;
export type TrainingType = typeof TRAINING_TYPES[number];

export const FOCI = [
  'Аэробная',
  'Скорость',
  'Скоростная выносливость',
  'Скоростно-силовая выносливость',
  'Силовая работа',
  'Взрывная сила',
  'Гибкость/Мобильность',
] as const;

export const SUBTYPES = [
  'Базовая',
  'Интервальная выше ПАНО',
  'Интервальная выше МПК',
  'На уровне ПАНО',
  'Локальная',
  'Концентрическая (быстрота)',
  'Концентрическая (старт)',
  'Эксцентрическая (смена направления)',
] as const;

export const LOADS = ['Низкий', 'Средний', 'Высокий', 'Максимальный'] as const;
export type Load = typeof LOADS[number];

export interface Profile {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  team: Team | null;
  can_manage_exercises: boolean;
  created_at: string;
}

export interface Training {
  id: string;
  team: Team;
  date: string;
  type: TrainingType;
  focus: string;
  subtype: string | null;
  duration: number;
  load: Load;
  note: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  team: Team;
  date: string;
  note: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  team: Team | null;
  image_url: string | null;
  video_url: string | null;
  youtube_url: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingExercise {
  training_id: string;
  exercise_id: string;
  position: number;
}
