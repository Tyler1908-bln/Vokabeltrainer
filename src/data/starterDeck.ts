import type { VocabularyEntry } from "../types";

const now = new Date().toISOString();

function makeEntry(
  id: string,
  german: string,
  spanish: string,
  category: string,
  notes?: string
): VocabularyEntry {
  return {
    id,
    german,
    spanish,
    category,
    notes,
    createdAt: now,
    correctCount: 0,
    wrongCount: 0
  };
}

export const starterDeck: VocabularyEntry[] = [
  makeEntry("1", "das Haus", "la casa", "Alltag", "Grundwortschatz"),
  makeEntry("2", "essen", "comer", "Verben"),
  makeEntry("3", "die Schule", "la escuela", "Schule"),
  makeEntry("4", "schnell", "rápido", "Adjektive"),
  makeEntry("5", "der Freund", "el amigo", "Menschen"),

  makeEntry("verb-1", "dürfen", "poder", "Verben"),
  makeEntry("verb-2", "anfassen", "tocar", "Verben"),
  makeEntry("verb-3", "machen", "hacer", "Verben"),
  makeEntry("verb-4", "sprechen", "hablar", "Verben"),
  makeEntry("verb-5", "hören", "oír", "Verben"),
  makeEntry("verb-6", "mögen", "querer", "Verben"),
  makeEntry("verb-7", "lesen", "leer", "Verben"),
  makeEntry("verb-8", "gehen", "ir", "Verben"),
  makeEntry("verb-9", "bezahlen", "pagar", "Verben"),
  makeEntry("verb-10", "schreiben", "escribir", "Verben"),
  makeEntry("verb-11", "trinken", "beber", "Verben"),
  makeEntry("verb-12", "kochen", "cocinar", "Verben"),
  makeEntry("verb-13", "schwimmen", "nadar", "Verben"),
  makeEntry("verb-14", "haben", "tener", "Verben"),
  makeEntry("verb-15", "schlafen", "dormir", "Verben"),
  makeEntry("verb-16", "(an-)sehen", "ver", "Verben"),
  makeEntry("verb-17", "laufen", "caminar", "Verben"),
  makeEntry("verb-18", "rennen", "correr", "Verben"),
  makeEntry("verb-19", "finden", "encontrar", "Verben"),
  makeEntry("verb-20", "bleiben", "quedar", "Verben"),
  makeEntry("verb-21", "spielen", "jugar", "Verben"),
  makeEntry("verb-22", "weitermachen, befolgen", "seguir", "Verben"),
  makeEntry("verb-23", "lernen, studieren", "estudiar", "Verben"),
  makeEntry("verb-24", "wissen, Kenntnis", "saber", "Verben"),
  makeEntry("verb-25", "tragen, bringen", "llevar", "Verben"),
  makeEntry("verb-26", "zeigen, aufzeigen", "mostrar", "Verben"),
  makeEntry("verb-27", "kommen", "venir", "Verben"),
  makeEntry("verb-28", "wiegen", "pesar", "Verben"),
  makeEntry("verb-29", "schauen, betrachten", "mirar", "Verben"),
  makeEntry("verb-30", "helfen, unterstützen", "ayudar", "Verben"),
  makeEntry("verb-31", "steigen, herunterladen", "bajar", "Verben"),
  makeEntry("verb-32", "probieren, testen", "probar", "Verben"),
  makeEntry("verb-33", "vorführen, präsentieren", "presentar", "Verben"),
  makeEntry("verb-34", "(ab-)schließen, zumachen", "cerrar", "Verben"),
  makeEntry("verb-35", "sein", "estar", "Verben"),
  makeEntry("verb-36", "suchen", "buscar", "Verben"),
  makeEntry("verb-37", "erinnern", "recordar", "Verben"),
  makeEntry("verb-38", "auftauchen, erscheinen", "aparecer", "Verben"),
  makeEntry("verb-39", "besuchen, Besuch", "visitar", "Verben"),
  makeEntry("verb-40", "zurückkommen, wenden", "volver", "Verben"),
  makeEntry("verb-41", "akzeptieren, hinnehmen", "aceptar", "Verben"),
  makeEntry("verb-42", "geben, vergeben", "dar", "Verben"),
  makeEntry("verb-43", "nehmen, trinken", "tomar", "Verben"),
  makeEntry("verb-44", "denken, überlegen", "pensar", "Verben"),
  makeEntry("verb-45", "kennenlernen, treffen", "conocer", "Verben")
];
