# Vocabito als kostenlose Handy-App mit Icon und Offline-Funktion

Diese Anleitung ist für den einfachsten kostenlosen Weg:

- Deine App läuft als Website
- Auf dem iPhone oder Android-Handy erscheint ein App-Icon
- Die App öffnet sich fast wie eine richtige App
- Nach dem ersten Laden ist vieles auch offline nutzbar
- Spätere Änderungen können automatisch online erscheinen

## Der beste Weg

Wir nutzen:

1. GitHub für deinen Projektstand
2. Vercel für den kostenlosen Link
3. Die Startbildschirm-Funktion von iPhone oder Android

## Was schon vorbereitet ist

Die App ist bereits als installierbare Web-App vorbereitet:

- App-Icons sind vorhanden
- Offline-Dateien werden mitgebaut
- Manifest und Service Worker sind eingerichtet

## Teil 1: GitHub einrichten

Wenn Git bei dir am PC Probleme macht, ist GitHub Desktop am einfachsten.

### 1. GitHub-Konto anlegen

Wenn du noch keines hast:

- Öffne: https://github.com/signup
- Konto erstellen

### 2. GitHub Desktop installieren

- Öffne: https://desktop.github.com/
- Installieren
- Mit deinem GitHub-Konto anmelden

### 3. Projekt in GitHub Desktop anlegen

- GitHub Desktop öffnen
- `File`
- `New repository`

Dann eintragen:

- `Name`: `vocabito`
- `Local path`: `C:\Users\kiese\Desktop\VS Code\Vokabeltrainer`

Dann:

- `Create repository`

### 4. Projekt zu GitHub hochladen

- In GitHub Desktop auf `Publish repository` klicken
- Öffentlich oder privat wählen
- `Publish repository`

Danach liegt dein Projekt auf GitHub.

## Teil 2: Kostenlosen Link bei Vercel erstellen

### 1. Vercel-Konto öffnen

- Öffne: https://vercel.com/
- Mit GitHub anmelden

### 2. GitHub-Projekt importieren

- In Vercel auf `Add New...`
- `Project`
- dein GitHub-Projekt `vocabito` auswählen

### 3. Build-Einstellungen prüfen

Vercel erkennt Vite meistens automatisch.

Falls du etwas manuell eintragen musst:

- `Framework Preset`: `Vite`
- `Build Command`: `npm run build`
- `Output Directory`: `dist`

Dann:

- `Deploy`

### 4. Link merken

Danach bekommst du einen festen Link, zum Beispiel:

`https://vocabito.vercel.app`

Das ist später dein App-Link fürs Handy.

## Teil 3: App auf dem iPhone speichern

Apple erklärt offiziell, dass man eine Website in Safari wie eine App zum Home-Bildschirm hinzufügen kann:

https://support.apple.com/en-euro/guide/iphone/iphea86e5236/ios

So geht es:

1. Den Vercel-Link in `Safari` öffnen
2. Auf `Teilen`
3. `Zum Home-Bildschirm`
4. `Als Web-App öffnen` aktiv lassen
5. `Hinzufügen`

Danach erscheint Vocabito als Icon auf dem iPhone.

## Teil 4: App auf Android speichern

Auf Android geht das in Chrome meistens über:

1. Link öffnen
2. Menü mit den drei Punkten
3. `App installieren` oder `Zum Startbildschirm hinzufügen`

Danach erscheint das Icon auf dem Handy.

## Teil 5: So kommen spätere Änderungen in die Handy-App

Das ist der wichtigste Teil.

Immer wenn hier etwas an der App geändert wurde:

### 1. Änderungen lokal prüfen

Im Projektordner:

`npm run build`

### 2. Änderungen zu GitHub hochladen

In GitHub Desktop:

- geänderte Dateien prüfen
- unten eine kurze Beschreibung eingeben
- `Commit to main`
- danach `Push origin`

### 3. Vercel aktualisiert automatisch

Wenn GitHub mit Vercel verbunden ist, startet Vercel nach jedem Push automatisch ein neues Deployment.

Vercel beschreibt automatische Deployments über Git hier:

https://vercel.com/docs/deployments/git

## Teil 6: So sieht das für dich im Alltag aus

Später ist dein Ablauf fast immer nur noch:

1. Ich ändere hier etwas an deiner App
2. Du öffnest GitHub Desktop
3. `Commit`
4. `Push`
5. Kurz warten
6. Handy-App öffnen

Wenn die neue Version nicht sofort sichtbar ist:

- App einmal komplett schließen
- neu öffnen
- oder im Browser die Seite neu laden

## Wichtiger Hinweis zur Offline-Funktion

Offline geht vieles, aber nicht alles.

Was meist offline geht:

- App öffnen, wenn sie schon einmal geladen wurde
- vorhandene Vokabeln
- lokale Einstellungen
- Lernen mit gespeicherten Karten

Was Internet brauchen kann:

- neu geladene Inhalte
- bestimmte Import- oder Online-Funktionen
- erste Installation

## Wenn du jetzt direkt loslegen willst

Die beste Reihenfolge ist:

1. GitHub Desktop installieren
2. Projekt veröffentlichen
3. Vercel verbinden
4. Link auf dem Handy öffnen
5. Icon auf den Startbildschirm legen

