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
- Anzahl Niederlassungen/Standorte
- Gründungsjahr, Rechtsform, Hauptsitz (Ort/Land) und Branche

Leere CRM-Stammfelder (Mitarbeiterklasse, Rechtsform, Ort, Land, Branche, Umsatz) werden dabei
aus den Firmographics ergänzt; bereits vorhandene Werte bleiben unberührt. Mitarbeiterzahl,
Niederlassungen und Gründungsjahr lassen sich im Bearbeiten-Dialog auch manuell pflegen.

Nach `KI-Analyse` erscheint über der Tabelle ein **Auswertungs-Panel**: eine umgangssprachliche
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
