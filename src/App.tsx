import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type MouseEvent
} from "react";
import { buildEntry, loadState, saveState } from "./utils/storage";
import {
  buildChoices,
  getDifficultEntries,
  getPrompt,
  getSolution,
  isCorrectAnswer
} from "./utils/study";
import {
  correctVocabularyInput,
  isUsableVocabularyText
} from "./utils/vocabCorrection";
import type { AppState, Direction, Mode } from "./types";

type Tab =
  | "titel"
  | "start"
  | "uebersetzer"
  | "lernen"
  | "listen"
  | "scan";

type OcrWord = {
  text: string;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
};

type SettingsDraft = {
  name: string;
  language: "de" | "es";
  dailyGoal: string;
  brightness: string;
  textSize: "klein" | "normal" | "gross";
  themeMode: "hell" | "dunkel";
  soundEnabled: boolean;
};

const pageOrder: Tab[] = [
  "titel",
  "start",
  "uebersetzer",
  "lernen",
  "listen",
  "scan"
];

const modeLabels: Record<Mode, string> = {
  karteikarten: "Karteikarten",
  "multiple-choice": "Multiple Choice",
  schreiben: "Schreiben",
  schwierige: "Schwierige Wörter"
};

const directionLabels: Record<Direction, string> = {
  "de-es": "Deutsch -> Spanisch",
  "es-de": "Spanisch -> Deutsch"
};

function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [tab, setTab] = useState<Tab>("titel");
  const [mode, setMode] = useState<Mode>("karteikarten");
  const [direction, setDirection] = useState<Direction>("de-es");
  const [selectedCategory, setSelectedCategory] = useState<string>("Alle");
  const [selectedListCategory, setSelectedListCategory] = useState<string>("");
  const [editingEntryId, setEditingEntryId] = useState<string>("");
  const [translatorText, setTranslatorText] = useState("");
  const [translatorDirection, setTranslatorDirection] = useState<Direction>("de-es");
  const [translatorResult, setTranslatorResult] = useState("");
  const [translatorBusy, setTranslatorBusy] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [scanFileName, setScanFileName] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [profileName, setProfileName] = useState(state.profile.name);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft | null>(null);
  const [newEntryGerman, setNewEntryGerman] = useState("");
  const [newEntrySpanish, setNewEntrySpanish] = useState("");
  const [newEntryCategory, setNewEntryCategory] = useState("");
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const categories = useMemo(
    () => ["Alle", ...new Set(state.entries.map((entry) => entry.category))],
    [state.entries]
  );

  const visibleEntries = useMemo(() => {
    const filtered =
      selectedCategory === "Alle"
        ? state.entries
        : state.entries.filter((entry) => entry.category === selectedCategory);

    return mode === "schwierige" ? getDifficultEntries(filtered) : filtered;
  }, [mode, selectedCategory, state.entries]);

  const currentEntry = visibleEntries[cardIndex] ?? null;

  const selectedListEntries = useMemo(
    () =>
      selectedListCategory
        ? state.entries.filter((entry) => entry.category === selectedListCategory)
        : [],
    [selectedListCategory, state.entries]
  );

  const choices = useMemo(() => {
    if (!currentEntry || mode !== "multiple-choice") {
      return [];
    }
    return buildChoices(visibleEntries, currentEntry, direction);
  }, [currentEntry, direction, mode, visibleEntries]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    setProfileName(state.profile.name);
  }, [state.profile.name]);

  useEffect(() => {
    if (!settingsOpen) {
      setSettingsDraft(null);
      return;
    }

    setSettingsDraft({
      name: state.profile.name,
      language: state.profile.language,
      dailyGoal: String(state.profile.dailyGoal),
      brightness: String(state.profile.brightness),
      textSize: state.profile.textSize,
      themeMode: state.profile.themeMode,
      soundEnabled: state.profile.soundEnabled
    });
  }, [settingsOpen, state.profile]);

  useEffect(() => {
    setCardIndex(0);
    setShowAnswer(false);
    setTypedAnswer("");
    setFeedback("");
  }, [selectedCategory, mode, direction]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () =>
      window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  function updateEntryResult(entryId: string, correct: boolean) {
    const today = new Date().toISOString().slice(0, 10);

    setState((current) => {
      const lastDay = current.progress.lastStudyDate;
      const streak =
        lastDay === today
          ? current.progress.streakDays
          : isYesterday(lastDay, today)
            ? current.progress.streakDays + 1
            : 1;

      return {
        ...current,
        entries: current.entries.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                correctCount: entry.correctCount + (correct ? 1 : 0),
                wrongCount: entry.wrongCount + (correct ? 0 : 1),
                lastReviewedAt: new Date().toISOString()
              }
            : entry
        ),
        progress: {
          streakDays: streak,
          totalReviewed: current.progress.totalReviewed + 1,
          lastStudyDate: today
        }
      };
    });
  }

  function handleNextCard() {
    setShowAnswer(false);
    setTypedAnswer("");
    setFeedback("");
    setCardIndex((value) => {
      if (!visibleEntries.length) {
        return 0;
      }
      return value + 1 >= visibleEntries.length ? 0 : value + 1;
    });
  }

  function handleChoice(choice: string) {
    if (!currentEntry) {
      return;
    }

    const correct = choice === getSolution(currentEntry, direction);
    updateEntryResult(currentEntry.id, correct);
    setFeedback(
      correct
        ? "Richtig! Sehr gut."
        : `Noch nicht. Richtig wäre: ${getSolution(currentEntry, direction)}`
    );
  }

  function handleTypedSubmit() {
    if (!currentEntry || !typedAnswer.trim()) {
      return;
    }

    const correct = isCorrectAnswer(currentEntry, direction, typedAnswer);
    updateEntryResult(currentEntry.id, correct);
    setFeedback(
      correct
        ? "Perfekt geschrieben."
        : `Fast. Richtige Antwort: ${getSolution(currentEntry, direction)}`
    );
  }

  function handleFlashcardResult(correct: boolean) {
    if (!currentEntry) {
      return;
    }

    updateEntryResult(currentEntry.id, correct);
    handleNextCard();
  }

  async function translateVocabulary() {
    const query = translatorText.trim();

    if (!query) {
      setTranslatorResult("Bitte gib zuerst ein Wort ein.");
      return;
    }

    const normalizedQuery = normalizeSearchText(query);
    const matches = state.entries.filter((entry) => {
      const source =
        translatorDirection === "de-es" ? entry.german : entry.spanish;
      return normalizeSearchText(source).includes(normalizedQuery);
    });

    if (!matches.length) {
      setTranslatorBusy(true);
      setTranslatorResult("Online-Übersetzung wird gesucht...");

      try {
        const langpair = translatorDirection === "de-es" ? "de|es" : "es|de";
        const response = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
            query
          )}&langpair=${langpair}`
        );

        if (!response.ok) {
          throw new Error("translation-failed");
        }

        const data = (await response.json()) as {
          responseData?: { translatedText?: string };
        };
        const translatedText = data.responseData?.translatedText?.trim();

        if (!translatedText) {
          throw new Error("translation-empty");
        }

        setTranslatorResult(`${query} → ${translatedText}\nOnline übersetzt`);
      } catch {
        setTranslatorResult(
          "Keine passende Übersetzung gefunden. Prüfe bitte deine Internetverbindung."
        );
      } finally {
        setTranslatorBusy(false);
      }
      return;
    }

    setTranslatorResult(
      matches
        .slice(0, 6)
        .map((entry) =>
          translatorDirection === "de-es"
            ? `${entry.german} → ${entry.spanish}`
            : `${entry.spanish} → ${entry.german}`
        )
        .join("\n")
    );
  }

  function insertSpanishLetter(letter: string) {
    setTypedAnswer((current) => `${current}${letter}`);
  }

  function insertTranslatorLetter(letter: string) {
    setTranslatorText((current) => `${current}${letter}`);
  }

  function handleAddEntry(formData: FormData) {
    try {
      const german = String(formData.get("german") ?? "");
      const spanish = String(formData.get("spanish") ?? "");
      const category = String(formData.get("category") ?? "");

      if (!german.trim() || !spanish.trim() || !category.trim()) {
        setFeedback("Bitte Deutsch, Spanisch und Kategorie ausfüllen.");
        return false;
      }

      const correction = correctVocabularyInput({ german, spanish, category }, state.entries);
      const duplicateExists = state.entries.some(
        (entry) =>
          normalizeSearchText(entry.german) === normalizeSearchText(correction.german) &&
          normalizeSearchText(entry.spanish) === normalizeSearchText(correction.spanish) &&
          normalizeSearchText(entry.category) === normalizeSearchText(correction.category)
      );

      if (duplicateExists) {
        setFeedback("Diese Vokabel gibt es in dieser Kategorie schon.");
        return false;
      }

      setState((current) => ({
        ...current,
        entries: [...current.entries, buildEntry(correction)]
      }));
      setNewEntryGerman("");
      setNewEntrySpanish("");
      setNewEntryCategory("");
      setFeedback(
        correction.changed
          ? "KI hat die Vokabel geprüft und korrigiert."
          : "Vokabel gespeichert."
      );
      return true;
    } catch {
      setFeedback("Die Vokabel konnte nicht gespeichert werden. Bitte versuche es nochmal.");
      return false;
    }
  }

  function deleteEntry(entryId: string) {
    setState((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== entryId)
    }));
    setFeedback("Vokabel gelöscht.");
  }

  function updateEntry(entryId: string, formData: FormData) {
    try {
      const german = String(formData.get("german") ?? "").trim();
      const spanish = String(formData.get("spanish") ?? "").trim();
      const category = String(formData.get("category") ?? "").trim();

      if (!german || !spanish || !category) {
        setFeedback("Bitte Deutsch, Spanisch und Kategorie ausfüllen.");
        return;
      }

      const correction = correctVocabularyInput({ german, spanish, category }, state.entries);
      const duplicateExists = state.entries.some(
        (entry) =>
          entry.id !== entryId &&
          normalizeSearchText(entry.german) === normalizeSearchText(correction.german) &&
          normalizeSearchText(entry.spanish) === normalizeSearchText(correction.spanish) &&
          normalizeSearchText(entry.category) === normalizeSearchText(correction.category)
      );

      if (duplicateExists) {
        setFeedback("Diese Vokabel gibt es in dieser Kategorie schon.");
        return;
      }

      setState((current) => ({
        ...current,
        entries: current.entries.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                german: correction.german,
                spanish: correction.spanish,
                category: correction.category
              }
            : entry
        )
      }));
      setSelectedListCategory(correction.category);
      setEditingEntryId("");
      setFeedback(
        correction.changed
          ? "KI hat die Änderung geprüft und korrigiert."
          : "Vokabel geändert."
      );
    } catch {
      setFeedback("Die Änderung konnte nicht gespeichert werden. Bitte versuche es nochmal.");
    }
  }

  function handleSaveProfileDraft() {
    if (!settingsDraft) {
      return;
    }

    const name = settingsDraft.name.trim();
    const dailyGoal = Number(settingsDraft.dailyGoal ?? 10);
    const brightnessValue = Number(settingsDraft.brightness ?? state.profile.brightness);
    const soundEnabled = settingsDraft.soundEnabled;
    const language = settingsDraft.language === "es" ? "es" : "de";
    const brightness = Number.isFinite(brightnessValue)
      ? Math.min(130, Math.max(70, brightnessValue))
      : state.profile.brightness;
    const textSize = settingsDraft.textSize;
    const themeMode = settingsDraft.themeMode;

    setState((current) => ({
      ...current,
      profile: {
        ...current.profile,
        name,
        dailyGoal: Number.isFinite(dailyGoal) && dailyGoal > 0 ? dailyGoal : 10,
        soundEnabled,
        language,
        brightness,
        textSize,
        themeMode
      }
    }));
    setFeedback("Es wurde alles gespeichert.");
    setSettingsOpen(false);
  }

  function handleSaveProfile(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const dailyGoal = Number(formData.get("dailyGoal") ?? 10);
    const soundEnabled = formData.get("soundEnabled") === "on";

    setState((current) => ({
      ...current,
      profile: {
        ...current.profile,
        name,
        dailyGoal: Number.isFinite(dailyGoal) && dailyGoal > 0 ? dailyGoal : 10,
        soundEnabled
      }
    }));
    setFeedback("Es wurde alles gespeichert.");
  }

  function isLikelyImportedPair(german: string, spanish: string) {
    const normalizedGerman = normalizeSearchText(german);
    const normalizedSpanish = normalizeSearchText(spanish);
    const germanStopwords = new Set(["und", "oder", "aber", "mit", "ohne", "nur"]);
    const spanishStopwords = new Set(["y", "o", "pero", "con", "sin", "solo"]);

    if (
      !normalizedGerman ||
      !normalizedSpanish ||
      normalizedGerman === normalizedSpanish ||
      normalizedGerman.includes(normalizedSpanish) ||
      normalizedSpanish.includes(normalizedGerman)
    ) {
      return false;
    }

    if (germanStopwords.has(normalizedSpanish) || spanishStopwords.has(normalizedGerman)) {
      return false;
    }

    return true;
  }

  function exportBackup() {
    const backup = {
      app: "spanisch-vokabeltrainer",
      version: 1,
      exportedAt: new Date().toISOString(),
      state
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `vokabeltrainer-backup-${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedback("Backup-Datei gespeichert.");
  }
  function openBackupImport() {
    backupInputRef.current?.click();
  }
  function handleBackupImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? "{}")) as {
          state?: AppState;
        };
        if (!parsed.state?.entries || !parsed.state?.progress || !parsed.state?.profile) {
          throw new Error("invalid-backup");
        }
        setState(parsed.state);
        setProfileName(parsed.state.profile.name);
        setFeedback("Backup erfolgreich geladen.");
        setSettingsOpen(false);
      } catch {
        setFeedback("Die Backup-Datei konnte nicht geladen werden.");
      } finally {
        event.target.value = "";
      }
    };
    reader.onerror = () => {
      setFeedback("Die Backup-Datei konnte nicht geladen werden.");
      event.target.value = "";
    };
    reader.readAsText(file, "utf-8");
  }
  function parseVocabularyText(text: string) {
    let currentCategory = "Importiert";
    let columnOrder: "de-es" | "es-de" = "de-es";

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const parsedLines = lines
      .map((line) => {
        const cleanedLine = line
          .replace(/^\d+[.)]\s*/, "")
          .replace(/\s{2,}/g, " ")
          .trim();

        const headerLine = cleanedLine.toLocaleLowerCase().replace(/\s+/g, "");
        const spanishHeaderIndex = headerLine.search(/spanisch|spanisc|espanol|español/);
        const germanHeaderIndex = headerLine.search(/deutsch|deutsc/);

        if (spanishHeaderIndex >= 0 && germanHeaderIndex >= 0) {
          columnOrder = spanishHeaderIndex < germanHeaderIndex ? "es-de" : "de-es";
          currentCategory = "Essen und Trinken";
          return null;
        }

        const isCategoryLine =
          !/[;:\-\u2013\u2014\t,]/.test(cleanedLine) &&
          !/\s+(der|die|das|den|dem|ein|eine)\s+/i.test(cleanedLine) &&
          cleanedLine.length <= 36 &&
          cleanedLine.split(" ").length <= 4;

        if (isCategoryLine) {
          currentCategory = cleanedLine;
          return null;
        }

        const separatedParts = cleanedLine
          .split(/\s*(?:-|–|—|;|:|\t|,)\s*/)
          .map((part) => part.trim());

        if (separatedParts.length >= 2) {
          const [first, second] = separatedParts;
          const german = columnOrder === "es-de" ? second : first;
          const spanish = columnOrder === "es-de" ? first : second;

          return german && spanish
            ? {
                german: cleanVocabularyCell(german),
                spanish: cleanVocabularyCell(spanish),
                category: currentCategory
              }
            : null;
        }

        const twoColumnMatch = cleanedLine.match(
          /^(.+?)\s+((?:der|die|das|den|dem|ein|eine)\s+.+)$/i
        );

        if (twoColumnMatch) {
          const [, spanish, german] = twoColumnMatch;
          if (!isLikelySpanishCell(spanish) || !isLikelyGermanText(german)) {
            return null;
          }

          return {
            german: cleanVocabularyCell(german),
            spanish: cleanVocabularyCell(spanish),
            category: currentCategory
          };
        }

        return null;
      })
      .filter(
        (line) =>
          line &&
          isUsableVocabularyText(line.german) &&
          isUsableVocabularyText(line.spanish)
      )
      .filter(
        (line): line is { german: string; spanish: string; category: string } =>
          Boolean(line)
      );

    if (parsedLines.length) {
      return parsedLines;
    }

    return parseVocabularyTableCells(lines);
  }

  function cleanVocabularyCell(value: string) {
    return value
      .replace(/\s+/g, " ")
      .replace(/\bd\s*e\s*r\b/gi, "der")
      .replace(/\bd\s*i\s*e\b/gi, "die")
      .replace(/\bd\s*a\s*s\b/gi, "das")
      .replace(/\be\s*l\b/gi, "el")
      .replace(/\bl\s*a\b/gi, "la")
      .replace(/\bl\s*o\s*s\b/gi, "los")
      .replace(/\bl\s*a\s*s\b/gi, "las")
      .replace(/\b(der|die|das|den|dem|ein|eine)\s+([A-ZÄÖÜ])\s+([a-zäöüß]{2,})/g, "$1 $2$3")
      .replace(/\b(el|la|los|las)\s+([a-záéíóúñ])\s+([a-záéíóúñ]{2,})/gi, "$1 $2$3")
      .trim();
  }

  function parseVocabularyTableCells(lines: string[]) {
    const cells = lines
      .map((line) =>
        cleanVocabularyCell(
          line
            .replace(/^\d+[.)]\s*/, "")
            .replace(/[|]/g, " ")
            .replace(/\s{2,}/g, " ")
        )
      )
      .filter((line) => {
        const normalized = line.toLocaleLowerCase().replace(/\s+/g, "");
        return (
          line &&
          !/^(spanisch|spanisc|deutsch|deutsc|espanol|español)$/.test(normalized)
        );
      });

    const spanishCells = cells.filter(isLikelySpanishCell);
    const germanCells = cells.filter(isLikelyGermanCell);

    const zippedPairs =
      spanishCells.length >= 2 && germanCells.length >= 2
        ? spanishCells
            .slice(0, Math.min(spanishCells.length, germanCells.length))
            .map((spanish, index) => ({
              german: germanCells[index],
              spanish,
              category: "Essen und Trinken"
            }))
        : [];

    const alternatingPairs: Array<{ german: string; spanish: string; category: string }> = [];

    cells.forEach((cell, index) => {
      if (!isLikelySpanishCell(cell)) {
        return;
      }

      const german = cells.slice(index + 1, index + 4).find(isLikelyGermanCell);

      if (german) {
        alternatingPairs.push({
          german,
          spanish: cell,
          category: "Essen und Trinken"
        });
      }
    });

    const bestPairs =
      alternatingPairs.length > zippedPairs.length ? alternatingPairs : zippedPairs;

    return bestPairs.filter(
      (line) =>
        isUsableVocabularyText(line.german) &&
        isUsableVocabularyText(line.spanish)
    );
  }

  function isLikelySpanishCell(value: string) {
    return /^(el|la|los|las)\s+[a-záéíóúñü]+/i.test(value);
  }

  function isLikelyGermanCell(value: string) {
    return /^(der|die|das|den|dem|ein|eine)\s+[a-zäöüßA-ZÄÖÜ]+/i.test(value);
  }

  function isLikelyGermanText(value: string) {
    return (
      isLikelyGermanCell(value) ||
      /^[a-zäöüß]+(?:en|ern|eln|ig|lich)?$/i.test(value.trim())
    );
  }

  function parseVocabularyOcrPage(page: unknown) {
    const words = collectOcrWords(page);

    if (!words.length) {
      return [];
    }

    const minX = Math.min(...words.map((word) => word.bbox.x0));
    const maxX = Math.max(...words.map((word) => word.bbox.x1));
    const midpoint = minX + (maxX - minX) / 2;
    const rows = groupOcrWordsByRows(words);

    const pairs = rows
      .map((row) => {
        const sortedWords = [...row].sort((left, right) => left.bbox.x0 - right.bbox.x0);
        const rowText = cleanVocabularyCell(sortedWords.map((word) => word.text).join(" "));
        const normalizedRowText = rowText.toLocaleLowerCase().replace(/\s+/g, "");

        if (
          /spanisch|spanisc|deutsch|deutsc|espanol|español/.test(normalizedRowText)
        ) {
          return null;
        }

        const rowMatch = rowText.match(
          /^(.+?)\s+((?:der|die|das|den|dem|ein|eine)\s+.+)$/i
        );

        if (rowMatch) {
          const [, spanish, german] = rowMatch;
          return {
            german: cleanVocabularyCell(german),
            spanish: cleanVocabularyCell(spanish),
            category: "Essen und Trinken"
          };
        }

        const leftText = cleanVocabularyCell(
          sortedWords
            .filter((word) => (word.bbox.x0 + word.bbox.x1) / 2 < midpoint)
            .map((word) => word.text)
            .join(" ")
        );
        const rightText = cleanVocabularyCell(
          sortedWords
            .filter((word) => (word.bbox.x0 + word.bbox.x1) / 2 >= midpoint)
            .map((word) => word.text)
            .join(" ")
        );

        if (isLikelySpanishCell(leftText) && isLikelyGermanCell(rightText)) {
          return {
            german: rightText,
            spanish: leftText,
            category: "Essen und Trinken"
          };
        }

        if (isLikelyGermanCell(leftText) && isLikelySpanishCell(rightText)) {
          return {
            german: leftText,
            spanish: rightText,
            category: "Essen und Trinken"
          };
        }

        return null;
      })
      .filter(
        (line): line is { german: string; spanish: string; category: string } =>
          line !== null &&
          isUsableVocabularyText(line.german) &&
          isUsableVocabularyText(line.spanish)
      );

    const seen = new Set<string>();
    return pairs.filter((pair) => {
      const key = `${pair.german.toLocaleLowerCase()}::${pair.spanish.toLocaleLowerCase()}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  function collectOcrWords(page: unknown): OcrWord[] {
    const blocks = (page as { blocks?: Array<{
      paragraphs?: Array<{
        lines?: Array<{
          words?: OcrWord[];
        }>;
      }>;
    }> })?.blocks;

    if (!Array.isArray(blocks)) {
      return [];
    }

    return blocks.flatMap((block) =>
      (block.paragraphs ?? []).flatMap((paragraph) =>
        (paragraph.lines ?? []).flatMap((line) =>
          (line.words ?? []).filter(
            (word) =>
              word.text?.trim() &&
              Number.isFinite(word.bbox?.x0) &&
              Number.isFinite(word.bbox?.y0) &&
              Number.isFinite(word.bbox?.x1) &&
              Number.isFinite(word.bbox?.y1)
          )
        )
      )
    );
  }

  function groupOcrWordsByRows(words: OcrWord[]) {
    const rows: OcrWord[][] = [];
    const sortedWords = [...words].sort((left, right) => {
      const leftY = (left.bbox.y0 + left.bbox.y1) / 2;
      const rightY = (right.bbox.y0 + right.bbox.y1) / 2;
      return leftY - rightY;
    });

    sortedWords.forEach((word) => {
      const wordY = (word.bbox.y0 + word.bbox.y1) / 2;
      const row = rows.find((currentRow) => {
        const rowY =
          currentRow.reduce(
            (sum, currentWord) => sum + (currentWord.bbox.y0 + currentWord.bbox.y1) / 2,
            0
          ) / currentRow.length;
        return Math.abs(rowY - wordY) <= 24;
      });

      if (row) {
        row.push(word);
      } else {
        rows.push([word]);
      }
    });

    return rows;
  }

  function dedupeVocabularyPairs(
    lines: Array<{ german: string; spanish: string; category: string }>
  ) {
    const seen = new Set<string>();

    return lines.filter((line) => {
      const key = `${line.german.trim().toLocaleLowerCase()}::${line.spanish
        .trim()
        .toLocaleLowerCase()}::${line.category.trim().toLocaleLowerCase()}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  async function preprocessImageForOcr(file: File) {
    if (typeof createImageBitmap !== "function") {
      throw new Error("image-bitmap-unavailable");
    }

    const imageBitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const scale = imageBitmap.width < 1400 ? 2 : 1.4;

    canvas.width = Math.round(imageBitmap.width * scale);
    canvas.height = Math.round(imageBitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) {
      imageBitmap.close();
      throw new Error("ocr-canvas-unavailable");
    }

    context.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;

    for (let index = 0; index < data.length; index += 4) {
      const luminance = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
      const boosted = luminance > 180 ? 255 : luminance < 135 ? 0 : Math.min(255, luminance * 1.15);
      data[index] = boosted;
      data[index + 1] = boosted;
      data[index + 2] = boosted;
    }

    context.putImageData(imageData, 0, 0);
    imageBitmap.close();

    return canvas.toDataURL("image/png");
  }

  function collectVocabularyCandidates(result: {
    text: string;
    blocks?: unknown;
  }) {
    return dedupeVocabularyPairs([
      ...parseVocabularyText(result.text),
      ...parseVocabularyOcrPage(result)
    ]);
  }

  async function recognizeImageVocabulary(file: File) {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("deu+spa");

    try {
      const preprocessedImage = await preprocessImageForOcr(file);
      const attempts: Array<{ source: File | string; psm: string }> = [
        { source: file, psm: "6" },
        { source: preprocessedImage, psm: "4" },
        { source: preprocessedImage, psm: "11" }
      ];

      const collectedPairs: Array<{ german: string; spanish: string; category: string }> = [];

      for (const attempt of attempts) {
        await worker.setParameters({
          preserve_interword_spaces: "1",
          tessedit_pageseg_mode: attempt.psm as never
        });

        const result = await worker.recognize(attempt.source, {}, { blocks: true, text: true });
        collectedPairs.push(...collectVocabularyCandidates(result.data));
      }

      return dedupeVocabularyPairs(collectedPairs);
    } finally {
      await worker.terminate();
    }
  }

  async function handleScanFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setScanBusy(true);
    setScanFileName(file.name);
    setFeedback("Datei wird gelesen...");

    try {
      if (file.type.startsWith("image/")) {
        setFeedback("Foto wird erkannt. Das kann kurz dauern...");
        let imageParsedLines: Array<{ german: string; spanish: string; category: string }> = [];

        try {
          imageParsedLines = await recognizeImageVocabulary(file);
        } catch {
          const { createWorker } = await import("tesseract.js");
          const worker = await createWorker("deu+spa");

          try {
            await worker.setParameters({
              preserve_interword_spaces: "1",
              tessedit_pageseg_mode: "6" as never
            });

            const result = await worker.recognize(file, {}, { blocks: true, text: true });
            imageParsedLines = collectVocabularyCandidates(result.data);
          } finally {
            await worker.terminate();
          }
        }

        if (!imageParsedLines.length) {
          setFeedback("Ich konnte keine Vokabelpaare im Foto finden.");
          return;
        }

        const { correctedCount, insertedCount } = addImportedEntries(imageParsedLines);

        if (!insertedCount) {
          setFeedback("Es wurden keine neuen Vokabeln importiert.");
          return;
        }

        setFeedback(
          `${insertedCount} Wörter automatisch aus dem Foto übernommen. ${
            correctedCount ? `KI hat ${correctedCount} davon korrigiert.` : ""
          }`
        );
        return;
      }

      const fileText = await file.text();
      const parsedLines = parseVocabularyText(fileText);

      if (!parsedLines.length) {
        setFeedback("Ich konnte keine Vokabelpaare finden. Nutze zum Beispiel: Haus - la casa");
        return;
      }

      const { correctedCount, insertedCount } = addImportedEntries(parsedLines);

      if (!insertedCount) {
        setFeedback("Es wurden keine neuen Vokabeln importiert.");
        return;
      }

      setFeedback(
        `${insertedCount} Wörter automatisch übernommen. ${
          correctedCount ? `KI hat ${correctedCount} davon korrigiert.` : ""
        }`
      );
    } catch {
      setFeedback("Die Datei konnte nicht gelesen werden.");
    } finally {
      setScanBusy(false);
      event.target.value = "";
    }
  }

  function addImportedEntries(
    parsedLines: Array<{ german: string; spanish: string; category: string }>
  ) {
    let correctedCount = 0;
    let insertedCount = 0;
    const seen = new Set<string>();
    const validLines = parsedLines.filter((line) => {
      if (
        !isUsableVocabularyText(line.german) ||
        !isUsableVocabularyText(line.spanish) ||
        !isLikelyImportedPair(line.german, line.spanish)
      ) {
        return false;
      }

      const key = `${line.german.trim().toLocaleLowerCase()}::${line.spanish
        .trim()
        .toLocaleLowerCase()}::${line.category.trim().toLocaleLowerCase()}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
    const knownEntries = [...state.entries];
    const importedEntries = validLines.flatMap((line) => {
      const correction = correctVocabularyInput(line, knownEntries);

      if (correction.changed) {
        correctedCount += 1;
      }

      if (
        !isLikelyImportedPair(correction.german, correction.spanish) ||
        knownEntries.some(
          (entry) =>
            normalizeSearchText(entry.german) === normalizeSearchText(correction.german) &&
            normalizeSearchText(entry.spanish) === normalizeSearchText(correction.spanish) &&
            normalizeSearchText(entry.category) === normalizeSearchText(correction.category)
        )
      ) {
        return [];
      }

      const newEntry = buildEntry({
        german: correction.german,
        spanish: correction.spanish,
        category: correction.category || "Importiert"
      });

      knownEntries.push(newEntry);
      insertedCount += 1;
      return [newEntry];
    });

    if (!importedEntries.length) {
      return {
        correctedCount,
        insertedCount
      };
    }

    setState((current) => ({
      ...current,
      entries: [...current.entries, ...importedEntries]
    }));

    return {
      correctedCount,
      insertedCount
    };
  }

  async function handleInstall() {
    const deferred = installPrompt as Event & {
      prompt?: () => Promise<void>;
      userChoice?: Promise<{ outcome: string }>;
    };

    if (!deferred?.prompt) {
      return;
    }

    await deferred.prompt();
    await deferred.userChoice;
    setInstallPrompt(null);
  }

  function playButtonSound() {
    if (!state.profile.soundEnabled) {
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextConstructor) {
      return;
    }

    const audioContext =
      audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = audioContext;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(720, now);
    oscillator.frequency.exponentialRampToValueAtTime(520, now + 0.09);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.12);
  }

  function handleButtonClickSound(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;

    if (target instanceof Element && target.closest("button")) {
      playButtonSound();
    }
  }

  function goToNextPage() {
    setTab((currentTab) => {
      const currentIndex = pageOrder.indexOf(currentTab);
      const nextIndex = currentIndex + 1 >= pageOrder.length ? 0 : currentIndex + 1;
      return pageOrder[nextIndex];
    });
  }

  function goToPreviousPage() {
    setTab((currentTab) => {
      const currentIndex = pageOrder.indexOf(currentTab);
      const previousIndex = currentIndex - 1 < 0 ? pageOrder.length - 1 : currentIndex - 1;
      return pageOrder[previousIndex];
    });
  }

  function goBackFromCurrentPage() {
    if (tab === "uebersetzer" || tab === "lernen" || tab === "listen" || tab === "scan") {
      setTab("start");
      return;
    }

    goToPreviousPage();
  }

  const currentPageNumber = pageOrder.indexOf(tab) + 1;
  const userScale =
    state.profile.textSize === "klein"
      ? 0.92
      : state.profile.textSize === "gross"
        ? 1.12
        : 1;
  const appStyle = {
    "--app-brightness": `${state.profile.brightness}%`,
    "--app-font-scale":
      state.profile.textSize === "klein"
        ? "0.92rem"
        : state.profile.textSize === "gross"
          ? "1.14rem"
          : "1rem",
    "--app-zoom": String(userScale)
  } as CSSProperties;

  if (!state.profile.name) {
    return (
      <div
        className="app-shell welcome-screen-shell"
        style={appStyle}
        onClickCapture={handleButtonClickSound}
      >
        <div className="app-zoom-layer">
          <main className="welcome-screen">
            <section className="panel welcome-panel welcome-panel-full">
              <div className="section-head">
                <p className="eyebrow">Willkommen</p>
                <h1>Bitte gib deinen Namen ein</h1>
                <p>
                  Danach geht es direkt weiter zu deinem persönlichen Vokabeltrainer.
                </p>
              </div>

              <form
                className="welcome-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSaveProfile(new FormData(event.currentTarget));
                  setTab("titel");
                }}
              >
                <label className="field">
                  <span>Dein Name</span>
                  <input
                    name="name"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    placeholder="zum Beispiel: Mia"
                  />
                </label>
                <input type="hidden" name="dailyGoal" value={state.profile.dailyGoal} />
                <input
                  type="hidden"
                  name="soundEnabled"
                  value={state.profile.soundEnabled ? "on" : ""}
                />
                <button className="primary-button" type="submit">
                  Weiter
                </button>
              </form>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`app-shell ${state.profile.themeMode === "dunkel" ? "theme-dark" : "theme-light"}`}
      style={appStyle}
      onClickCapture={handleButtonClickSound}
    >
      <div className="app-zoom-layer">
      <div className="floating-flags" aria-hidden="true">
        <span className="flag flag-a"></span>
        <span className="flag flag-b"></span>
        <span className="flag flag-c"></span>
        <span className="flag flag-d"></span>
        <span className="flag flag-e"></span>
        <span className="flag flag-f"></span>
        <span className="flag flag-g"></span>
        <span className="flag flag-h"></span>
        <span className="flag flag-i"></span>
        <span className="flag flag-j"></span>
        <span className="flag flag-k"></span>
        <span className="flag flag-l"></span>
        <span className="flag flag-m"></span>
        <span className="flag flag-n"></span>
        <span className="flag flag-o"></span>
        <span className="flag flag-p"></span>
        <span className="flag flag-q"></span>
        <span className="flag flag-r"></span>
        <span className="flag flag-s"></span>
        <span className="flag flag-t"></span>
        <span className="flag flag-u"></span>
        <span className="flag flag-v"></span>
        <span className="flag flag-w"></span>
        <span className="flag flag-x"></span>
        <span className="flag flag-y"></span>
        <span className="flag flag-z"></span>
        <span className="flag flag-aa"></span>
        <span className="flag flag-ab"></span>
        <span className="flag flag-ac"></span>
        <span className="flag flag-ad"></span>
        <span className="flag flag-ae"></span>
        <span className="flag flag-af"></span>
        <span className="flag flag-ag"></span>
        <span className="flag flag-ah"></span>
        <span className="flag flag-ai"></span>
        <span className="flag flag-aj"></span>
        <span className="flag flag-ak"></span>
        <span className="flag flag-al"></span>
        <span className="flag flag-am"></span>
        <span className="flag flag-an"></span>
        <span className="flag flag-ao"></span>
        <span className="flag flag-ap"></span>
        <span className="flag flag-aq"></span>
        <span className="flag flag-ar"></span>
        <span className="flag flag-as"></span>
        <span className="flag flag-at"></span>
        <span className="flag flag-au"></span>
        <span className="flag flag-av"></span>
        <span className="flag flag-aw"></span>
        <span className="flag flag-ax"></span>
        <span className="flag flag-ay"></span>
        <span className="flag flag-az"></span>
        <span className="flag flag-ba"></span>
        <span className="flag flag-bb"></span>
        <span className="motivation motivation-a">¡Vamos!</span>
        <span className="motivation motivation-b">Du schaffst das</span>
        <span className="motivation motivation-c">Schritt für Schritt</span>
        <span className="motivation motivation-d">Jede Karte zählt</span>
        <span className="motivation motivation-e">Ein bisschen Spanisch jeden Tag</span>
        <span className="motivation motivation-f">Weiter so</span>
        <span className="motivation motivation-g">Lernen macht stark</span>
        <span className="motivation motivation-h">Heute ist dein Tag</span>
        <span className="motivation motivation-i">Kleine Schritte, großer Erfolg</span>
        <span className="motivation motivation-j">Spanisch kann Spaß machen</span>
        <span className="motivation motivation-k">Bleib dran</span>
        <span className="motivation motivation-l">Du wirst immer besser</span>
        <span className="motivation motivation-m">Ein Wort mehr als gestern</span>
        <span className="motivation motivation-n">Los geht's</span>
        <span className="motivation motivation-o">Üben lohnt sich</span>
        <span className="motivation motivation-p">Du bist auf Kurs</span>
        <span className="motivation motivation-q">Weiterlernen lohnt sich</span>
        <span className="motivation motivation-r">Heute lernst du leicht</span>
        <span className="motivation motivation-s">Spanisch Schritt für Schritt</span>
        <span className="motivation motivation-t">Du kommst voran</span>
        <span className="motivation motivation-u">Noch eine Seite</span>
        <span className="motivation motivation-v">Jeden Tag ein bisschen besser</span>
        <span className="motivation motivation-w">Dranbleiben zahlt sich aus</span>
        <span className="motivation motivation-x">Du kannst das</span>
        <span className="motivation motivation-y">Lernen mit Energie</span>
        <span className="motivation motivation-z">Heute lernst du stark</span>
        <span className="motivation motivation-aa">Weiter geht's</span>
        <span className="motivation motivation-ab">Spanisch steht dir</span>
        <span className="motivation motivation-ac">Ein Klick nach vorn</span>
        <span className="motivation motivation-ad">Du sammelst Wissen</span>
        <span className="motivation motivation-ae">Sehr gut unterwegs</span>
        <span className="motivation motivation-af">Bleib im Flow</span>
        <span className="motivation motivation-ag">Wort für Wort besser</span>
        <span className="motivation motivation-ah">Heute klappt's</span>
        <span className="motivation motivation-ai">Du lernst schnell</span>
        <span className="motivation motivation-aj">Stark gemacht</span>
        <span className="motivation motivation-ak">Spanisch lebt</span>
        <span className="motivation motivation-al">Du kommst ans Ziel</span>
        <span className="motivation motivation-am">Mit jedem Klick weiter</span>
        <span className="motivation motivation-an">Lernen macht mutig</span>
        <span className="motivation motivation-ao">Volle Energie</span>
        <span className="motivation motivation-ap">Du bist bereit</span>
        <span className="motivation motivation-aq">Schön weiterlernen</span>
        <span className="motivation motivation-ar">Spanisch jeden Tag</span>
        <span className="motivation motivation-as">Du bleibst dran</span>
      </div>

      {tab === "titel" ? (
        <header className="hero">
          <img className="hero-logo" src="/vocabito-logo.svg" alt="Vocabito" />
          <div>
            <p className="eyebrow">Spanisch lernen</p>
            <h1>
              {state.profile.name
                ? `Vokabeltrainer von ${state.profile.name}`
                : "Dein Vokabeltrainer für Handy und Tablet"}
            </h1>
          </div>

          <div className="hero-badges">
            <span>{state.entries.length} Wörter</span>
            <span>{state.progress.streakDays} Tage Serie</span>
            <span>Offline bereit</span>
          </div>

          {installPrompt ? (
            <button className="primary-button" onClick={handleInstall}>
              App installieren
            </button>
          ) : null}

          <div className="page-footer">
            <p>Seite {currentPageNumber} von {pageOrder.length}</p>
            <button className="primary-button" onClick={goToNextPage}>
              Weiter
            </button>
            <button className="secondary-button" onClick={goBackFromCurrentPage}>
              Zurück
            </button>
          </div>
        </header>
      ) : null}

      {tab === "start" ? (
        <main className="content-grid">
          <section className="panel single-panel">
            <div className="section-head">
              <h2>Startseite</h2>
              <p>Hier beginnt dein persönlicher Vokabeltrainer.</p>
            </div>

            <div className="menu-grid">
              <button className="menu-card" onClick={() => setTab("lernen")}>
                <strong>Lernen</strong>
                <span>Karteikarten, Schreiben und Multiple Choice üben</span>
              </button>
              <button className="menu-card" onClick={() => setTab("uebersetzer")}>
                <strong>Übersetzer</strong>
                <span>Wörter schnell auf Deutsch oder Spanisch übersetzen</span>
              </button>
              <button className="menu-card" onClick={() => setTab("listen")}>
                <strong>Listen</strong>
                <span>Vokabeln und Kategorien anlegen oder bearbeiten</span>
              </button>
              <button className="menu-card" onClick={() => setTab("scan")}>
                <strong>Scan</strong>
                <span>Dateien oder Fotos automatisch einpflegen</span>
              </button>
              <button className="menu-card" onClick={() => setSettingsOpen(true)}>
                <strong>Einstellungen</strong>
                <span>Name, Sprache, Design und Töne anpassen</span>
              </button>
            </div>

            <div className="page-footer">
              <p>Seite {currentPageNumber} von {pageOrder.length}</p>
              <button className="primary-button" onClick={goToNextPage}>
                Weiter
              </button>
              <button className="secondary-button" onClick={goBackFromCurrentPage}>
                Zurück
              </button>
            </div>
          </section>
        </main>
      ) : null}

      {tab === "uebersetzer" ? (
        <main className="content-grid">
          <section className="panel single-panel translator-panel">
            <div className="section-head">
              <h2>Spanisch-Deutsch Übersetzer</h2>
            </div>

            <div className="translator-toolbar">
              <div className="chip-row">
                <button
                  className={translatorDirection === "de-es" ? "chip active" : "chip"}
                  onClick={() => {
                    setTranslatorDirection("de-es");
                    setTranslatorResult("");
                  }}
                >
                  Deutsch → Spanisch
                </button>
                <button
                  className={translatorDirection === "es-de" ? "chip active" : "chip"}
                  onClick={() => {
                    setTranslatorDirection("es-de");
                    setTranslatorResult("");
                  }}
                >
                  Spanisch → Deutsch
                </button>
              </div>

              <button
                className="letter-button translator-letter-button"
                type="button"
                onClick={() => insertTranslatorLetter("ñ")}
                aria-label="ñ in das Übersetzer-Feld einfügen"
              >
                ñ
              </button>
            </div>

            <label className="field">
              <span>Wort eingeben</span>
              <input
                value={translatorText}
                onChange={(event) => setTranslatorText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    translateVocabulary();
                  }
                }}
                placeholder={
                  translatorDirection === "de-es"
                    ? "zum Beispiel: Haus"
                    : "zum Beispiel: casa"
                }
              />
            </label>

            <button className="primary-button" onClick={translateVocabulary}>
              {translatorBusy ? "Übersetze..." : "Übersetzen"}
            </button>

            {translatorResult ? (
              <div className="translator-result">
                <span>Ergebnis</span>
                <pre>{translatorResult}</pre>
              </div>
            ) : null}

            <div className="page-footer">
              <p>Seite {currentPageNumber} von {pageOrder.length}</p>
              <button className="primary-button" onClick={goToNextPage}>
                Weiter
              </button>
              <button className="secondary-button" onClick={goBackFromCurrentPage}>
                Zurück
              </button>
            </div>
          </section>
        </main>
      ) : null}

      {tab === "lernen" ? (
        <main className="content-grid">
          <section className="panel controls-panel">
            <div className="chip-row">
              {(Object.keys(modeLabels) as Mode[]).map((item) => (
                <button
                  key={item}
                  className={item === mode ? "chip active" : "chip"}
                  onClick={() => setMode(item)}
                >
                  {modeLabels[item]}
                </button>
              ))}
            </div>

            <div className="chip-row">
              {(Object.keys(directionLabels) as Direction[]).map((item) => (
                <button
                  key={item}
                  className={item === direction ? "chip active" : "chip"}
                  onClick={() => setDirection(item)}
                >
                  {directionLabels[item]}
                </button>
              ))}
            </div>

            <label className="field">
              <span className="sr-only">Kategorie</span>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="panel study-panel">
            {!currentEntry ? (
              <div className="empty-state">
                <h2>Noch keine passenden Vokabeln</h2>
                <p>Lege zuerst neue Kategorien oder Wörter an.</p>
              </div>
            ) : (
              <>
                <button
                  className="card study-card-button"
                  type="button"
                  onClick={() => setShowAnswer(true)}
                >
                  <p className="prompt-label">Aufgabe</p>
                  <h3>{getPrompt(currentEntry, direction)}</h3>
                  {showAnswer || mode !== "karteikarten" ? (
                    <p className="answer-text">
                      {getSolution(currentEntry, direction)}
                    </p>
                  ) : (
                    <p className="answer-placeholder">Tippe auf Antwort zeigen</p>
                  )}
                </button>

                {mode === "karteikarten" ? (
                  <div className="action-row">
                    <button
                      className="danger-button"
                      onClick={() => handleFlashcardResult(false)}
                    >
                      War schwer
                    </button>
                    <button
                      className="primary-button"
                      onClick={() => handleFlashcardResult(true)}
                    >
                      Konnte ich
                    </button>
                  </div>
                ) : null}

                {mode === "multiple-choice" ? (
                  <div className="choice-grid">
                    {choices.map((choice) => (
                      <button
                        key={choice}
                        className="choice-button"
                        onClick={() => handleChoice(choice)}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                ) : null}

                {mode === "schreiben" ? (
                  <div className="answer-form">
                    <div className="answer-input-row">
                      <input
                        value={typedAnswer}
                        onChange={(event) => setTypedAnswer(event.target.value)}
                        placeholder="Antwort eintippen"
                      />
                      <button
                        className="letter-button"
                        type="button"
                        onClick={() => insertSpanishLetter("ñ")}
                      >
                        ñ
                      </button>
                    </div>
                    <button className="primary-button" onClick={handleTypedSubmit}>
                      Prüfen
                    </button>
                  </div>
                ) : null}

                {feedback ? <p className="feedback">{feedback}</p> : null}

                <div className="panel-actions">
                  <button className="link-button" onClick={handleNextCard}>
                    Weiter
                  </button>
                </div>

                <div className="page-footer">
                  <p>Seite {currentPageNumber} von {pageOrder.length}</p>
                  <button className="primary-button" onClick={goToNextPage}>
                    Weiter
                  </button>
                  <button className="secondary-button" onClick={goBackFromCurrentPage}>
                    Zurück
                  </button>
                </div>
              </>
            )}
          </section>
        </main>
      ) : null}

      {tab === "listen" ? (
        <main className="content-grid">
          <section className="panel">
            <div className="section-head">
              <h2>Neue Vokabel</h2>
            </div>

            <form
              className="stack"
              onSubmit={(event) => {
                event.preventDefault();
                handleAddEntry(new FormData(event.currentTarget));
              }}
            >
              <label className="field">
                <span>Deutsch</span>
                <input
                  name="german"
                  placeholder="zum Beispiel: das Fenster"
                  value={newEntryGerman}
                  onChange={(event) => setNewEntryGerman(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Spanisch</span>
                <input
                  name="spanish"
                  placeholder="zum Beispiel: la ventana"
                  value={newEntrySpanish}
                  onChange={(event) => setNewEntrySpanish(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Kategorie</span>
                <input
                  name="category"
                  placeholder="zum Beispiel: Schule"
                  value={newEntryCategory}
                  onChange={(event) => setNewEntryCategory(event.target.value)}
                />
              </label>
              <button className="primary-button" type="submit">
                Speichern
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="category-list category-list-compact">
              {categories
                .filter((category) => category !== "Alle")
                .map((category) => (
                  <button
                    key={category}
                    className={`category-card category-button ${
                      selectedListCategory === category ? "active" : ""
                    }`}
                    type="button"
                    onClick={() => setSelectedListCategory(category)}
                  >
                    <h3>{category}</h3>
                    <p>
                      {
                        state.entries.filter((entry) => entry.category === category)
                          .length
                      }{" "}
                      Wörter
                    </p>
                  </button>
                ))}
            </div>

            {selectedListCategory ? (
              <div className="category-vocab-panel">
                <div className="section-head">
                  <h3>{selectedListCategory}</h3>
                  <p>{selectedListEntries.length} Vokabeln in dieser Kategorie</p>
                </div>

                <div className="vocab-list">
                  {selectedListEntries.map((entry) => (
                    <article key={entry.id} className="vocab-row">
                      {editingEntryId === entry.id ? (
                        <form
                          className="edit-vocab-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            updateEntry(entry.id, new FormData(event.currentTarget));
                          }}
                        >
                          <label className="field">
                            <span>Deutsch</span>
                            <input name="german" defaultValue={entry.german} />
                          </label>
                          <label className="field">
                            <span>Spanisch</span>
                            <input name="spanish" defaultValue={entry.spanish} />
                          </label>
                          <label className="field">
                            <span>Kategorie</span>
                            <input name="category" defaultValue={entry.category} />
                          </label>
                          <div className="edit-vocab-actions">
                            <button className="primary-button" type="submit">
                              Speichern
                            </button>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => setEditingEntryId("")}
                            >
                              Abbrechen
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div>
                          <strong>{entry.german}</strong>
                          <p>{entry.spanish}</p>
                        </div>
                      )}
                      <button
                        className="delete-vocab-button"
                        type="button"
                        aria-label={`${entry.german} löschen`}
                        onClick={() => deleteEntry(entry.id)}
                      >
                        🗑
                      </button>
                      <button
                        className="edit-vocab-button"
                        type="button"
                        aria-label={`${entry.german} bearbeiten`}
                        onClick={() => setEditingEntryId(entry.id)}
                      >
                        ⚙
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="page-footer">
              <p>Seite {currentPageNumber} von {pageOrder.length}</p>
              <button className="primary-button" onClick={goToNextPage}>
                Weiter
              </button>
              <button className="secondary-button" onClick={goBackFromCurrentPage}>
                Zurück
              </button>
            </div>
          </section>
        </main>
      ) : null}

      {tab === "scan" ? (
        <main className="content-grid">
          <section className="panel">
            <div className="section-head">
              <h2>Kamera-Scan vorbereiten</h2>
              <p>
                Der Bereich ist für gedruckte Vokabellisten vorbereitet. Schon jetzt
                kannst du erkannte Zeilen einfügen und direkt in dein Training holen.
              </p>
            </div>

            <label className="field">
              <span>Datei oder Foto auswählen</span>
              <input
                type="file"
                accept="image/*,.txt,.csv"
                onChange={handleScanFile}
                disabled={scanBusy}
              />
            </label>

            {scanFileName ? (
              <p className="file-hint">Ausgewählt: {scanFileName}</p>
            ) : null}

            {feedback ? <p className="feedback">{feedback}</p> : null}

            <div className="page-footer">
              <p>Seite {currentPageNumber} von {pageOrder.length}</p>
              <button className="primary-button" onClick={goToNextPage}>
                Weiter
              </button>
              <button className="secondary-button" onClick={goBackFromCurrentPage}>
                Zurück
              </button>
            </div>
          </section>
        </main>
      ) : null}

            {settingsOpen ? (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <section
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2>Einstellungen</h2>
                <p>Name, Sprache und Anzeige anpassen.</p>
              </div>
              <button
                className="close-button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Fenster schließen"
              >
                ×
              </button>
            </div>

            <form
              className="stack"
              onSubmit={(event) => {
                event.preventDefault();
                handleSaveProfileDraft();
              }}
            >
              <label className="field">
                <span>Name ändern</span>
                <input
                  name="name"
                  value={settingsDraft?.name ?? ""}
                  onChange={(event) =>
                    setSettingsDraft((current) =>
                      current ? { ...current, name: event.target.value } : current
                    )
                  }
                  placeholder="Dein Name"
                />
              </label>

              <label className="field">
                <span>Sprache ändern</span>
                <select
                  name="language"
                  value={settingsDraft?.language ?? state.profile.language}
                  onChange={(event) =>
                    setSettingsDraft((current) =>
                      current
                        ? {
                            ...current,
                            language: event.target.value === "es" ? "es" : "de"
                          }
                        : current
                    )
                  }
                >
                  <option value="de">Deutsch</option>
                  <option value="es">Spanisch</option>
                </select>
              </label>

              <label className="field">
                <span>Tagesziel</span>
                <input
                  name="dailyGoal"
                  type="number"
                  min="1"
                  max="100"
                  value={settingsDraft?.dailyGoal ?? String(state.profile.dailyGoal)}
                  onChange={(event) =>
                    setSettingsDraft((current) =>
                      current ? { ...current, dailyGoal: event.target.value } : current
                    )
                  }
                />
              </label>

              <label className="field">
                <span>Helligkeit</span>
                <input
                  name="brightness"
                  type="range"
                  min="70"
                  max="130"
                  value={settingsDraft?.brightness ?? String(state.profile.brightness)}
                  onChange={(event) =>
                    setSettingsDraft((current) =>
                      current ? { ...current, brightness: event.target.value } : current
                    )
                  }
                />
              </label>

              <div className="field">
                <span>Textgröße ändern</span>
                <div className="theme-button-row">
                  <label className="theme-choice">
                    <input
                      type="radio"
                      name="textSize"
                      value="klein"
                      checked={settingsDraft?.textSize === "klein"}
                      onChange={() =>
                        setSettingsDraft((current) =>
                          current ? { ...current, textSize: "klein" } : current
                        )
                      }
                    />
                    <span>Klein</span>
                  </label>
                  <label className="theme-choice">
                    <input
                      type="radio"
                      name="textSize"
                      value="normal"
                      checked={settingsDraft?.textSize === "normal"}
                      onChange={() =>
                        setSettingsDraft((current) =>
                          current ? { ...current, textSize: "normal" } : current
                        )
                      }
                    />
                    <span>Normal</span>
                  </label>
                  <label className="theme-choice">
                    <input
                      type="radio"
                      name="textSize"
                      value="gross"
                      checked={settingsDraft?.textSize === "gross"}
                      onChange={() =>
                        setSettingsDraft((current) =>
                          current ? { ...current, textSize: "gross" } : current
                        )
                      }
                    />
                    <span>Groß</span>
                  </label>
                </div>
              </div>

              <div className="field">
                <span>Design</span>
                <div className="theme-button-row">
                  <label className="theme-choice">
                    <input
                      type="radio"
                      name="themeMode"
                      value="hell"
                      checked={settingsDraft?.themeMode === "hell"}
                      onChange={() =>
                        setSettingsDraft((current) =>
                          current ? { ...current, themeMode: "hell" } : current
                        )
                      }
                    />
                    <span>Hell</span>
                  </label>
                  <label className="theme-choice">
                    <input
                      type="radio"
                      name="themeMode"
                      value="dunkel"
                      checked={settingsDraft?.themeMode === "dunkel"}
                      onChange={() =>
                        setSettingsDraft((current) =>
                          current ? { ...current, themeMode: "dunkel" } : current
                        )
                      }
                    />
                    <span>Dunkel</span>
                  </label>
                </div>
              </div>

              <label className="toggle-field">
                <input
                  name="soundEnabled"
                  type="checkbox"
                  checked={settingsDraft?.soundEnabled ?? state.profile.soundEnabled}
                  onChange={() =>
                    setSettingsDraft((current) =>
                      current
                        ? { ...current, soundEnabled: !current.soundEnabled }
                        : current
                    )
                  }
                />
                <span>Töne einschalten</span>
              </label>

              <div className="settings-actions">
                <button className="primary-button" type="submit">
                  Einstellungen speichern
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      </div>
    </div>
  );
}

function isYesterday(lastStudyDate: string | undefined, today: string) {
  if (!lastStudyDate) {
    return false;
  }

  const [lastYear, lastMonth, lastDay] = lastStudyDate.split("-").map(Number);
  const [year, month, day] = today.split("-").map(Number);
  const last = Date.UTC(lastYear, lastMonth - 1, lastDay);
  const current = Date.UTC(year, month - 1, day);
  return current - last === 24 * 60 * 60 * 1000;
}

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/^(der|die|das|el|la|los|las|un|una)\s+/i, "")
    .trim();
}

export default App;

