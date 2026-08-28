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

## Daten

Die Browserdaten liegen in `localStorage`. API-Schlüssel werden nicht in Backup-Dateien und nicht im Logfile ausgegeben.

## Hinweis

Ein direkter Azure-Aufruf aus `file://` kann durch CORS blockiert werden. Das ist ein Browser-/Netzwerkproblem und wird getrennt von URL- oder HTTP-Fehlern protokolliert.
