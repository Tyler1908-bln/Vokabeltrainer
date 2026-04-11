import type { Direction, VocabularyEntry } from "../types";

export function getPrompt(entry: VocabularyEntry, direction: Direction) {
  return direction === "de-es" ? entry.german : entry.spanish;
}

export function getSolution(entry: VocabularyEntry, direction: Direction) {
  return direction === "de-es" ? entry.spanish : entry.german;
}

export function normalizeAnswer(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isCorrectAnswer(
  entry: VocabularyEntry,
  direction: Direction,
  answer: string
) {
  return normalizeAnswer(answer) === normalizeAnswer(getSolution(entry, direction));
}

export function getDifficultEntries(entries: VocabularyEntry[]) {
  return entries
    .filter((entry) => entry.wrongCount > entry.correctCount)
    .sort((a, b) => b.wrongCount - a.wrongCount);
}

export function buildChoices(
  entries: VocabularyEntry[],
  correctEntry: VocabularyEntry,
  direction: Direction
) {
  const pool = entries.filter((entry) => entry.id !== correctEntry.id);
  const distractors = pool
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((entry) => getSolution(entry, direction));

  return [...distractors, getSolution(correctEntry, direction)].sort(
    () => Math.random() - 0.5
  );
}
