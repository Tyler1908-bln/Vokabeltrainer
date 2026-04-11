export type Direction = "de-es" | "es-de";
export type Mode = "karteikarten" | "multiple-choice" | "schreiben" | "schwierige";

export interface VocabularyEntry {
  id: string;
  german: string;
  spanish: string;
  category: string;
  notes?: string;
  createdAt: string;
  lastReviewedAt?: string;
  correctCount: number;
  wrongCount: number;
}

export interface ProgressStats {
  streakDays: number;
  totalReviewed: number;
  lastStudyDate?: string;
}

export interface UserProfile {
  name: string;
  dailyGoal: number;
  soundEnabled: boolean;
  language: "de" | "es";
  brightness: number;
  textSize: "klein" | "normal" | "gross";
  themeMode: "hell" | "dunkel";
}

export interface AppState {
  entries: VocabularyEntry[];
  progress: ProgressStats;
  profile: UserProfile;
}
