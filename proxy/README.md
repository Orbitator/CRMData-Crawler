# Lokaler CORS-/Auth-Proxy

Die App läuft aus `file://` und kann externe Firmendaten-APIs (Implisense) und
Portale wegen **CORS** nicht direkt aufrufen (Symptom: „Failed to fetch").
Dieser kleine Proxy läuft **nur lokal** (`127.0.0.1`), setzt die CORS-Header,
**injiziert den API-Schlüssel serverseitig** (er bleibt damit aus dem Browser
heraus) und leitet die Anfrage an das Ziel weiter – aber nur an erlaubte Hosts.

## Voraussetzung
- **Node.js 18+** (`node --version`). Keine npm-Pakete nötig.

## Starten
Windows:
```
proxy\start-proxy.cmd
```
macOS/Linux:
```
IMPLISENSE_KEY=IMP-xxxx-xxxx-xxxx-xxxx node proxy/server.mjs
```
Der Schlüssel wird als Umgebungsvariable übergeben – **nicht** in Dateien
speichern/committen.

## In der App eintragen
Reiter **Quellen & Crawling**:
- **CORS-Proxy-Präfix:** `http://127.0.0.1:8787/proxy?url=`
- Reiter-Setup **Implisense-Anbindung:** Basis-URL/Pfade wie gehabt, **API-Schlüssel-Feld leer lassen** – der Proxy fügt `Authorization: Bearer <KEY>` selbst hinzu.

Danach „Verbindung testen" bzw. „Branche importieren"/Firmensuche nutzen.

## Konfiguration (Umgebungsvariablen)
| Variable | Default | Zweck |
|---|---|---|
| `PORT` | `8787` | Port des Proxys |
| `IMPLISENSE_KEY` | – | wird für `api.implisense.com` als Bearer-Token injiziert |
| `ALLOWED_HOSTS` | implisense + gängige Portale | Komma-Liste erlaubter Ziel-Hosts (Whitelist) |
| `ALLOW_HTTP` | – | `1` erlaubt zusätzlich `http://`-Ziele (z. B. interne Dienste) |

## Sicherheit
- Bindet nur an `127.0.0.1` (nicht von außen erreichbar).
- **Kein offener Proxy:** nur Hosts aus `ALLOWED_HOSTS` werden weitergeleitet.
- Der Schlüssel liegt nur in der Umgebungsvariable des Proxys, nicht im Browser/Repo.
- `/health` zeigt Status (ob ein Schlüssel gesetzt ist, erlaubte Hosts).

## Endpunkte
- `GET /health` – Status.
- `ALL /proxy?url=<ziel-url>` – leitet Methode/Body an die (erlaubte) Ziel-URL weiter,
  injiziert für Implisense den Schlüssel und antwortet mit CORS-Headern.
