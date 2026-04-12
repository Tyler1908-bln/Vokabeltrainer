import type { VocabularyEntry } from "../types";

type CorrectionResult = {
  german: string;
  spanish: string;
  category: string;
  changed: boolean;
};

const commonGermanCorrections: Record<string, string> = {
  schule: "die Schule",
  haus: "das Haus",
  freund: "der Freund"
};

const commonSpanishCorrections: Record<string, string> = {
  "la escuela": "la escuela",
  escuela: "la escuela",
  casa: "la casa",
  amigo: "el amigo",
  rapido: "rápido",
  oir: "oír"
};

export function correctVocabularyInput(
  input: { german: string; spanish: string; category: string },
  knownEntries: VocabularyEntry[]
): CorrectionResult {
  const german = correctWord(input.german, "german", knownEntries);
  const spanish = correctWord(input.spanish, "spanish", knownEntries);
  const category = correctCategory({ ...input, german, spanish }, knownEntries);

  return {
    german,
    spanish,
    category,
    changed:
      german !== input.german.trim() ||
      spanish !== input.spanish.trim() ||
      category !== input.category.trim()
  };
}

function correctWord(
  value: string,
  language: "german" | "spanish",
  knownEntries: VocabularyEntry[]
) {
  const cleaned = cleanText(value);
  const lower = cleaned.toLocaleLowerCase();
  const commonCorrections =
    language === "german" ? commonGermanCorrections : commonSpanishCorrections;

  if (commonCorrections[lower]) {
    return commonCorrections[lower];
  }

  const candidates = knownEntries
    .map((entry) => (language === "german" ? entry.german : entry.spanish))
    .filter((candidate): candidate is string => typeof candidate === "string");

  const exactCandidate = findExactKnownMatch(cleaned, candidates);
  if (exactCandidate) {
    return exactCandidate;
  }

  return findCloseMatch(cleaned, candidates) ?? cleaned;
}

export function inferVocabularyCategory(input: { german: string; spanish: string }) {
  const text = normalizeForCompare(`${input.german} ${input.spanish}`);

  if (matchesAny(text, ["essen", "trinken", "comer", "beber", "wasser", "agua", "brot", "pan"])) {
    return "Essen und Trinken";
  }

  if (matchesAny(text, ["schule", "klasse", "lernen", "studieren", "libro", "escuela", "clase", "estudiar"])) {
    return "Schule";
  }

  if (matchesAny(text, ["freund", "mensch", "familie", "madre", "padre", "amigo", "persona", "gente"])) {
    return "Menschen";
  }

  if (matchesAny(text, ["haus", "stadt", "reise", "gehen", "laufen", "venir", "volver", "ir", "casa", "ciudad", "viaje"])) {
    return "Orte und Reisen";
  }

  if (matchesAny(text, ["schnell", "langsam", "gross", "groß", "klein", "rapido", "rápido", "lento", "grande", "pequeno", "pequeño"])) {
    return "Adjektive";
  }

  if (matchesAny(text, ["montag", "tag", "woche", "heute", "lunes", "dia", "día", "semana", "hoy"])) {
    return "Zeit";
  }

  if (looksLikeVerb(input.german, input.spanish)) {
    return "Verben";
  }

  return "Alltag";
}

export function isUsefulCategory(value: string) {
  const cleaned = cleanText(value);

  if (!cleaned || cleaned.length > 36 || /[�ÃÂ]/.test(cleaned)) {
    return false;
  }

  const letters = [...cleaned].filter((char) => /\p{Letter}/u.test(char)).length;
  const symbols = [...cleaned].filter((char) => !/[\p{Letter}\s&-]/u.test(char)).length;

  return letters >= 3 && symbols <= 1;
}

export function isUsableVocabularyText(value: string) {
  const cleaned = cleanText(value);

  if (!cleaned || cleaned.length > 44 || /[�ÃÂ]/.test(cleaned)) {
    return false;
  }

  const letters = [...cleaned].filter((char) => /\p{Letter}/u.test(char)).length;
  return letters >= 2;
}

function correctCategory(
  input: { german: string; spanish: string; category: string },
  knownEntries: VocabularyEntry[]
) {
  const cleaned = cleanText(input.category);

  if (!isUsefulCategory(cleaned) || ["importiert", "gescannt"].includes(cleaned.toLocaleLowerCase())) {
    return inferVocabularyCategory(input);
  }

  const categories = [
    ...new Set(
      knownEntries
        .map((entry) => entry.category)
        .filter((category): category is string => typeof category === "string")
        .filter(isUsefulCategory)
    )
  ];
  return findCloseMatch(cleaned, categories) ?? titleCase(cleaned);
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((part) => (part ? part[0].toLocaleUpperCase() + part.slice(1) : part))
    .join(" ");
}

function findCloseMatch(value: string, candidates: string[]) {
  const normalizedValue = normalizeForCompare(value);

  if (normalizedValue.length < 4) {
    return null;
  }

  const narrowedCandidates = candidates
    .filter((candidate) => {
      const normalizedCandidate = normalizeForCompare(candidate);

      if (!normalizedCandidate || normalizedCandidate === normalizedValue) {
        return false;
      }

      return (
        normalizedCandidate[0] === normalizedValue[0] &&
        Math.abs(normalizedCandidate.length - normalizedValue.length) <= 2
      );
    })
    .slice(0, 80);

  let bestMatch: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  narrowedCandidates.forEach((candidate) => {
    const normalizedCandidate = normalizeForCompare(candidate);

    const distance = levenshteinDistance(normalizedValue, normalizedCandidate);
    const allowedDistance = normalizedValue.length >= 8 ? 2 : 1;

    if (distance <= allowedDistance && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = candidate;
    }
  });

  return bestMatch;
}

function findExactKnownMatch(value: string, candidates: string[]) {
  const normalizedValue = normalizeForCompare(value);

  return (
    candidates.find(
      (candidate) => normalizeForCompare(candidate) === normalizedValue
    ) ?? null
  );
}

function matchesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalizeForCompare(term)));
}

function looksLikeVerb(german: string, spanish: string) {
  const normalizedGerman = normalizeForCompare(german);
  const normalizedSpanish = normalizeForCompare(spanish);
  const germanLooksLikeInfinitive =
    /^[a-zäöüß]+(en|n)$/.test(normalizedGerman) &&
    !/^(der|die|das|ein|eine)\s/.test(normalizedGerman);
  const spanishLooksLikeInfinitive = /^[a-zñáéíóú]+(ar|er|ir)$/.test(normalizedSpanish);

  return germanLooksLikeInfinitive || spanishLooksLikeInfinitive;
}

function normalizeForCompare(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zäöüßñáéíóú ]/giu, "")
    .trim();
}

function levenshteinDistance(left: string, right: string) {
  const rows = left.length + 1;
  const columns = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(columns).fill(0));

  for (let row = 0; row < rows; row += 1) {
    matrix[row][0] = row;
  }

  for (let column = 0; column < columns; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost
      );
    }
  }

  return matrix[left.length][right.length];
}
