# ALSO CRM Intelligence – gefixte vollständige lokale Anwendung

## Start

`index.html` direkt per Doppelklick öffnen. Es wird kein Webserver benötigt.

## Funktionen

- Dashboard
- Unternehmen hinzufügen, bearbeiten und löschen
- Tags, Branche, NACE, Priorität, Score, Umsatz und Notizen bearbeiten
- Einzelnes Crawling und Crawling aller Unternehmen
- Hersteller-, Technologie- und Geschäftsfeld-Tags
- Evidence und Confidence
- Raw Data Explorer
- Tag Explorer
- CRM Cluster
- Sales Intelligence
- Tender AI Context
- JSON-/CSV-Import
- Backup ohne API-Schlüssel
- Cluster- und JSONL-Export
- Azure OpenAI Setup mit Endpoint, Deployment, API-Version und API-Schlüssel
- echter Verbindungstest
- Azure-Analysepfad mit bidirektionaler Anfrage/Antwort-Struktur
- KI-gestützte Anreicherung: echtes Crawling der Quellen + strukturierte Extraktion (JSON) per Azure OpenAI, mit Keyword-Fallback
- Firmographics-Erfassung (Mitarbeiterzahl, Umsatz, Niederlassungen, Gründungsjahr, Rechtsform, Hauptsitz, Branche)
- Globale Quellen-/Portalkonfiguration (welche Portale gecrawlt werden)
- Unit Tests einschließlich Azure-Live-Test
- Diagnose-Logfile

## Azure-Konfiguration

Endpoint nur als Ressourcen-Host eingeben:

```text
https://oai-tender-analysis-poc-swedencentral.openai.azure.com
```

Deployment:

```text
GPT-5.6-luna-tender-analysis-poc
```

API-Version:

```text
2025-04-01-preview
```

Die Anwendung erzeugt ausschließlich:

```text
https://oai-tender-analysis-poc-swedencentral.openai.azure.com/openai/deployments/GPT-5.6-luna-tender-analysis-poc/chat/completions?api-version=2025-04-01-preview
```

Der URL-Builder ist idempotent: Wird versehentlich eine vollständige Request-URL als Endpoint eingegeben, wird sie auf den Host reduziert. Die Request-URL wird vor `fetch()` validiert. Doppelte Deployment-Pfade, doppelte Chat-Pfade und `/openai/responses` werden abgelehnt.

### Parameter-Fallback (behebt HTTP 400 bei neueren Modellen)

Neuere Reasoning-Deployments (z. B. GPT-5.x) lehnen `max_tokens` und eine abweichende
`temperature` ab und antworten mit HTTP 400. Der Azure-Aufruf versucht daher automatisch
bis zu vier Varianten des Request-Bodys:

1. `max_tokens` + `temperature`
2. `max_completion_tokens` + `temperature` (falls `max_tokens` abgelehnt wird)
3. `max_completion_tokens` ohne `temperature` (falls die Standard-Temperatur erzwungen wird)

Die Antwort wird aus `choices[0].message.content` gelesen. Ohne diesen Fallback schlug der
Verbindungstest mit den oben genannten Deployment-Werten zuvor immer fehl.

## Vertriebs-Profil (steuert die KI-Analyse)

Unter **Vertriebs-Profil** wird global festgelegt, nach welchem Vertriebs-Blickwinkel Unternehmen
bewertet werden. Ein Profil bündelt:

- **Persona & Leitfrage** (der Blickwinkel, mit dem die KI jedes Unternehmen betrachtet),
- **Use-Case-Kategorien**, nach denen gezielt gesucht wird,
- **Readiness-Dimensionen** (Ampel ja/teilweise/nein/unbekannt),
- **Compliance-Themen** (mit Belegkategorie),
- **Score-Gewichte** (gewichteter Fit-Score) und **A/B/C/D-Grenzen**.

Mitgeliefert sind zwei umschaltbare Startprofile:
- **IT-Distribution (ALSO)** – Modern Workplace, Cloud/Azure, Security, Managed Services …
- **Defence Additive Manufacturing** – Produktionshilfsmittel, Ersatzteile, Kleinserien, Supply-Chain-Resilienz …

So bedient **ein** Motor mehrere Vertriebsfelder – Profil umschalten genügt. Alles ist editierbar
(Persona, Listen, Gewichte, Bänder) und wird global in `state.settings.profiles` gespeichert.

### Was die KI-Analyse mit dem Profil liefert

Nach **KI-Analyse** zeigt das Panel zusätzlich:
- **Gewichteter Fit-Score** (0–100) mit **A/B/C/D-Account**-Einordnung und Aufschlüsselung der Treiber,
- **Supply-Chain-Rolle** (OEM/Tier-1/2/3 …),
- **Use Cases** je mit Beleg und **Belegkategorie** (nachgewiesen / wahrscheinlich relevant / zu prüfen / nicht bekannt),
- **Readiness**-Ampeln je Dimension,
- **Buying Center** (relevante Funktionen + Interessen),
- **Compliance**-Themen mit Belegkategorie,
- Zusammenfassung getrennt nach **Fakten / Hypothesen / Prüfpunkte / Nicht bekannt**.

Ohne funktionierende Azure-Verbindung greift der Keyword-Fallback; der Fit-Score wird dann aus einer
lokalen Heuristik über dieselben Profil-Gewichte gebildet (im Panel als „Heuristik" gekennzeichnet).

## Export der Analyse

Auf der Seite **Unternehmen** exportieren zwei Buttons die angereicherten Daten für den Vertrieb:

- **Export CSV** – eine Zeile pro Unternehmen mit Stammdaten (Größe, Mitarbeiter, Umsatz,
  Niederlassungen, Länder, Hauptsitz …), **Fit-Score + A/B/C/D-Band**, Supply-Chain-Rolle,
  Use Cases (mit Belegkategorie), Buying Center, Compliance, Tags und Zusammenfassung – direkt
  für Excel/CRM.
- **Export JSONL** – ein JSON-Objekt pro Unternehmen mit der vollständigen Struktur (inkl.
  Readiness-Ampeln, Evidence und Fakten/Hypothesen/Prüfpunkte) – ideal als Übergabe an
  nachgelagerte Systeme oder Embeddings.

## Globale Lernschleife (Rückkanal)

Korrekturen fließen global zurück und verbessern künftige Analysen – auch bei **neuen**
Unternehmen. Im KI-Auswertungs-Panel gibt es dafür einen Lern-Bereich:

- **Regel lernen** – ein freier Hinweis (z. B. „reine Handelsfirmen niedriger werten"), der in
  den KI-Prompt einfließt.
- **Normalisierung lernen** – ein Rohbegriff → Kanon-Tag (z. B. `o365 → Microsoft 365`); wirkt
  im KI-Prompt **und** in der lokalen Keyword-Heuristik.
- **Als Fehltreffer** – ein Signal, das kein starker Indikator ist; wird künftig unterdrückt.
- **Als Positivbeispiel** – übernimmt das aktuelle Unternehmen als Muster und leitet daraus eine
  Regel ab.

Alles wird global in `state.settings.learn` gespeichert und ist unter **Vertriebs-Profil →
Gelerntes (global)** einsehbar und löschbar. So kumuliert die Qualität über alle Unternehmen und
Profile hinweg – ganz im Sinne der globalen Lernschleife.

### Qualitäts-Gate für gelernte Regeln

Bevor eine gelernte Regel aktiv wird, prüft ein Gate drei Kriterien:

- **Spezifität** – z. B. Normalisierungs-Begriff mindestens 3 Zeichen, kein generisches Stichwort;
  Ziel muss ein bekannter Kanon-Tag sein; Regeltext ausreichend lang.
- **Negativ-Korpus** – Gegenbeispiele (Text ≠ Tags) unter „Gelerntes (global)" pflegbar; eine
  Normalisierung, die einem Gegenbeispiel ein verbotenes Tag geben würde, wird abgelehnt.
- **Dublette / Precision-Guard** – bereits vorhandene Regeln werden nicht doppelt aktiviert; ein
  Fehltreffer-Tag, das ein Positivbeispiel benötigt, wird blockiert (schützt die Precision).

Nicht bestandene Regeln landen mit Begründung in **„wartet auf Freigabe"** und können dort
gezielt **„Trotzdem aktivieren"** oder **„Verwerfen"** werden.

## KI-Anreicherung (Kernfunktion)

Neben dem lokalen Keyword-Crawling (`Crawlen`) gibt es jetzt eine **echte KI-Analyse**
(`KI-Analyse` pro Unternehmen bzw. `KI: Alle analysieren`):

1. **Crawling:** Für jedes Unternehmen werden die unter **Quellen & Crawling** aktivierten
   Portale abgerufen (die Firmen-Website direkt, Portale per URL-Vorlage mit `{q}` =
   Firmenname). Der HTML-Inhalt wird zu reinem Text reduziert.
2. **KI-Extraktion:** Der gesammelte Text plus die CRM-Felder gehen an das Azure-OpenAI-Deployment.
   Das Modell liefert **strukturiertes JSON** (`response_format: json_object`, mit Fallback) mit
   Herstellern, Technologien, Geschäftsfeldern, NACE-Code, Kaufsignalen und **Evidence**
   (Textbeleg + Quelle + Confidence). Hersteller/Technologien/Geschäftsfelder werden auf die
   erlaubte Kanon-Liste der App eingeschränkt, damit Cluster und Scoring konsistent bleiben.
3. **Fallback:** Ist Azure nicht erreichbar (z. B. 401) oder die Antwort unbrauchbar, greift
   automatisch das bisherige Keyword-Crawling – es geht nie etwas verloren, und der Grund steht
   im Logbuch.

Optional lässt sich pro Unternehmen im Bearbeiten-Dialog ein **Website-/Quelltext** einfügen –
nützlich, wenn automatisches Crawling per CORS blockiert wird.

### Firmographics (alle vertriebsrelevanten Daten)

Die KI-Analyse gleicht nicht nur die vorgegebenen Tags ab, sondern erfasst aus dem Quelltext
**alle vertriebsrelevanten Firmendaten** in `firmographics`:

- Mitarbeiterzahl und Unternehmensgröße (Größenklasse)
- Jahresumsatz (z. B. „45 Mio. EUR" – wird automatisch in eine Zahl geparst und fließt in den
  Opportunity-Score ein)
- Anzahl Niederlassungen/Standorte und **in welchen Ländern** (location_countries)
- Gründungsjahr, Rechtsform, Hauptsitz (Ort/Land) und Branche

Im KI-Auswertungs-Fenster erscheint **immer** ein Datenblatt **„Gewonnene Stammdaten"**
(Unternehmensgröße, Mitarbeiterzahl, Umsatz, Niederlassungen, Länder, Hauptsitz, Rechtsform,
Gründungsjahr, Branche, NACE). Fehlende Werte stehen als „unbekannt"; vorhandene CRM-Stammdaten
werden dort auch ohne KI angezeigt. Ist noch gar nichts bekannt, weist ein Hinweis auf die
Azure-Verbindung (401?) bzw. fehlenden Quelltext hin.

Leere CRM-Stammfelder (Mitarbeiterklasse, Rechtsform, Ort, Land, Branche, Umsatz) werden dabei
aus den Firmographics ergänzt; bereits vorhandene Werte bleiben unberührt. Mitarbeiterzahl,
Niederlassungen und Gründungsjahr lassen sich im Bearbeiten-Dialog auch manuell pflegen.

Nach `KI-Analyse` klappt die Auswertung **direkt in der Liste unter der Unternehmenszeile** auf –
kein separates Popup. Über den Button **„▾ Auswertung"** in der Zeile lässt sie sich jederzeit
**ein-/ausklappen**, „Einklappen" schließt sie, „KI-Analyse aktualisieren" berechnet neu. Die
Auswertung bleibt am Unternehmen gespeichert. Darin: eine umgangssprachliche
Einschätzung, wie hoch das ermittelte Potenzial **bezogen auf die hinterlegten Suchbegriffe** ist
(inkl. Score, Priorität und der Liste der ausgewerteten Suchbegriffe). Liefert die KI keine
Einschätzung (oder greift der Keyword-Fallback), wird der Text lokal aus Score/Tags erzeugt.

## Quellen & Crawling (global)

Unter **Quellen & Crawling** wird **global** festgelegt, welche Portale gecrawlt werden – die
Einstellung gilt für alle Unternehmen und neue Ausschreibungen. Voreingestellt sind:

| Portal | Standard aktiv |
|---|---|
| Firmen-Website | ja (nutzt `website_url`) |
| Northdata | ja |
| OpenCorporates | ja |
| unternehmensregister.de | ja |
| bundesanzeiger.de | ja |
| CompanyHouse | nein (Login/Abo) |
| Firmenwissen | nein (Login/Abo) |
| Evidat | nein (Login/Abo) |
| Genios Firmen | nein (Login/Abo) |
| Dealfront (Echobot/Leadfeeder) | nein (Login/Abo) |

Portale lassen sich aktivieren/deaktivieren, umbenennen, ergänzen und entfernen. Platzhalter in
URL-Vorlagen: `{q}` = Firmenname, `{domain}` = Website-Domain. Die vorbelegten URLs zeigen jeweils
auf die **frei zugängliche (Freemium-)Suche** des Portals (z. B. Firmenwissen-Kurzprofile,
Bundesanzeiger-Freitextsuche, OpenCorporates-Websuche) – editierbar, falls sich ein Endpunkt ändert.

### Unterseiten-Crawling

Für die **Firmen-Website** wird nicht nur die Startseite gelesen, sondern es werden auch
**relevante Unterseiten** verfolgt (Impressum, Über uns, Kontakt, Standorte, Karriere, **Presse/News**).
Ist die hinterlegte URL selbst eine **Übersichts-/Listenseite** (z. B. eine Pressemitteilungs-Übersicht),
folgt der Crawler den **verlinkten Einzelseiten** (einzelne Meldungen) – begrenzt (bounded), gleiche
Domain, mit Budget gegen zu viele Abrufe. So werden vertriebsrelevante Infos (neue Standorte,
Umsatz, Mitarbeiterzahlen) gefunden, die nur auf Unterseiten stehen.

### Geschätzte Stammdaten

Liegt kein Quelltext vor (z. B. weil CORS das Crawling blockiert), darf die KI **bekannte
Firmendaten aus ihrem Wissen** ergänzen (nur bei erkennbar bekannten Unternehmen) und markiert
diese im Datenblatt mit **„(geschätzt)"**. Tags, Evidence und Compliance bleiben streng belegpflichtig.

### CORS / echtes Crawling

Direkte Abrufe fremder Portale aus `file://` blockiert der Browser meist per CORS. Zwei Auswege:

- Den Browser mit `--disable-web-security --allow-file-access-from-files` aus einem isolierten
  Profil starten (nur für diese lokale Nutzung), **oder**
- unter **Quellen & Crawling** ein **CORS-Proxy-Präfix** hinterlegen, an das die Ziel-URL
  angehängt wird. Der Proxy sieht die abgerufenen URLs – nur vertrauenswürdige Proxys nutzen.

Portale hinter Login/Abo (CompanyHouse, Firmenwissen, Evidat, Genios, Dealfront) liefern ohne
gültige Session ohnehin keinen Inhalt; sie sind daher vorkonfiguriert, aber deaktiviert.

## Diagnose-Logbuch

Die App führt ein Logbuch, das bei Problemen (z. B. Azure-Fehlern) alles Nötige zur Analyse
festhält – **ohne den API-Schlüssel**.

- **Persistenz:** Das Log liegt in `localStorage` (`also-crm-intelligence-log`, letzte 500 Zeilen)
  und übersteht einen Reload. So geht nach einem fehlgeschlagenen Test nichts verloren.
- **Erfasst wird u. a.:** vorbereitete Request-URL, Parameter-Fallback-Schritte, erfolgreiche
  Aufrufe, HTTP-Fehler mit Status/Detail und Azure-Kontext (Endpoint-Host, Deployment,
  API-Version, ob ein Schlüssel gesetzt ist und dessen **Länge** – nie der Schlüssel selbst),
  Netzwerk-/CORS-Fehler sowie unerwartete JavaScript-Fehler (`window_error`,
  `unhandled_rejection`).
- **Herunterladen:** Button **„Logfile herunterladen"** auf der Azure-Seite und unter
  **Diagnose & Tests**. Die Datei beginnt mit einem Kopfblock (Zeitpunkt, Protokoll,
  UserAgent, maskierter Azure-Kontext) und ist damit ohne Rückfragen auswertbar.
- **Weitergeben:** Bei einem Problem einfach das heruntergeladene
  `also-diagnostics-<Zeitstempel>.log` schicken – es enthält keine Geheimnisse.

### HTTP 401 richtig deuten

`Azure HTTP 401: … invalid subscription key or wrong API endpoint` bedeutet, dass die
Anfrage Azure erreicht, die Authentifizierung aber scheitert. Ursachen:

1. Falscher oder abgelaufener **API-Schlüssel**.
2. **Endpoint/Region passt nicht zum Schlüssel** – der Schlüssel muss zur Azure-OpenAI-Ressource
   des eingetragenen Endpoints gehören (Schlüssel und Endpoint aus **derselben** Ressource
   in „Keys and Endpoint" kopieren).

## Daten

Die Browserdaten liegen in `localStorage`. API-Schlüssel werden nicht in Backup-Dateien und nicht im Logfile ausgegeben.

## Hinweis

Ein direkter Azure-Aufruf aus `file://` kann durch CORS blockiert werden. Das ist ein Browser-/Netzwerkproblem und wird getrennt von URL- oder HTTP-Fehlern protokolliert.
