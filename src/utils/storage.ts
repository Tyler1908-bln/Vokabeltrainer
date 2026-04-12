import { starterDeck } from "../data/starterDeck";
import type { AppState, VocabularyEntry } from "../types";
import {
  inferVocabularyCategory,
  isUsableVocabularyText,
  isUsefulCategory
} from "./vocabCorrection";

const STORAGE_KEY = "spanisch-vokabeltrainer-state";
let pendingWrite: ReturnType<typeof setTimeout> | null = null;

const defaultState: AppState = {
  entries: starterDeck,
  progress: {
    streakDays: 0,
    totalReviewed: 0
  },
  profile: {
    name: "",
    dailyGoal: 10,
    soundEnabled: true,
    language: "de",
    brightness: 100,
    textSize: "normal",
    themeMode: "hell"
  }
};

function safeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function hasBrokenEncoding(value: string) {
  return /[�ÃÂ]/.test(value);
}

function hasEnoughReadableLetters(value: string) {
  const letters = [...value].filter((char) => /\p{Letter}/u.test(char)).length;
  const symbols = [...value].filter((char) => !/[\p{Letter}\s.,;:()&'/-]/u.test(char)).length;

  return letters >= 2 && symbols <= Math.max(2, Math.floor(letters / 2));
}

function createEntryId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const randomPart = Math.random().toString(36).slice(2);
  return `entry-${Date.now()}-${randomPart}`;
}

function normalizeEntry(entry: Partial<VocabularyEntry>): VocabularyEntry | null {
  const german = safeText(entry.german);
  const spanish = safeText(entry.spanish);
  const category = safeText(entry.category);

  if (
    !isUsableVocabularyText(german) ||
    !isUsableVocabularyText(spanish) ||
    hasBrokenEncoding(`${german} ${spanish} ${category}`) ||
    !hasEnoughReadableLetters(german) ||
    !hasEnoughReadableLetters(spanish)
  ) {
    return null;
  }

  const cleanedCategory =
    category && !hasBrokenEncoding(category) && isUsefulCategory(category)
      ? category
      : inferVocabularyCategory({ german, spanish });

  return {
    id: safeText(entry.id) || createEntryId(),
    german,
    spanish,
    category: cleanedCategory,
    notes: safeText(entry.notes) || undefined,
    createdAt: safeText(entry.createdAt) || new Date().toISOString(),
    lastReviewedAt: safeText(entry.lastReviewedAt) || undefined,
    correctCount: Number.isFinite(entry.correctCount) ? Number(entry.correctCount) : 0,
    wrongCount: Number.isFinite(entry.wrongCount) ? Number(entry.wrongCount) : 0
  };
}

function mergeStarterEntries(entries: VocabularyEntry[]) {
  const cleanedEntries = entries
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is VocabularyEntry => Boolean(entry))
    .map((entry) => ({
      ...entry,
      category: isUsefulCategory(entry.category)
        ? entry.category
        : inferVocabularyCategory(entry)
    }));

  const existingKeys = new Set(
    cleanedEntries.map(
      (entry) =>
        `${entry.german.trim().toLocaleLowerCase()}::${entry.spanish
          .trim()
          .toLocaleLowerCase()}::${entry.category.trim().toLocaleLowerCase()}`
    )
  );

  const missingStarterEntries = starterDeck.filter((entry) => {
    const key = `${entry.german.trim().toLocaleLowerCase()}::${entry.spanish
      .trim()
      .toLocaleLowerCase()}::${entry.category.trim().toLocaleLowerCase()}`;
    return !existingKeys.has(key);
  });

  return [...cleanedEntries, ...missingStarterEntries];
}

export function loadState(): AppState {
  let raw: string | null = null;

  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return defaultState;
  }

  if (!raw) {
    return defaultState;
  }

  try {
    const parsed = JSON.parse(raw) as AppState & {
      profile?: AppState["profile"] & { backgroundImage?: string };
    };
    const { backgroundImage: _backgroundImage, ...profile } = parsed.profile ?? {};

    const state = {
      entries: parsed.entries?.length ? mergeStarterEntries(parsed.entries) : starterDeck,
      progress: parsed.progress ?? defaultState.progress,
      profile: {
        ...defaultState.profile,
        ...profile
      }
    };

    saveState(state);
    return state;
  } catch {
    return defaultState;
  }
}

export function saveState(state: AppState) {
  const write = () => {
    pendingWrite = null;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Manche Handy-Browser blockieren lokalen Speicher. Die App soll trotzdem weiterlaufen.
    }
  };

  if (pendingWrite !== null) {
    clearTimeout(pendingWrite);
  }

  if (
    typeof globalThis !== "undefined" &&
    "requestIdleCallback" in globalThis &&
    typeof globalThis.requestIdleCallback === "function"
  ) {
    globalThis.requestIdleCallback(write, { timeout: 500 });
    return;
  }

  pendingWrite = globalThis.setTimeout(write, 80);
}

export function buildEntry(input: {
  german: string;
  spanish: string;
  category: string;
  notes?: string;
}): VocabularyEntry {
  return {
    id: createEntryId(),
    german: input.german.trim(),
    spanish: input.spanish.trim(),
    category: input.category.trim(),
    notes: input.notes?.trim(),
    createdAt: new Date().toISOString(),
    correctCount: 0,
    wrongCount: 0
  };
}
