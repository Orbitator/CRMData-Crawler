# Unit-Test-Fälle

Die Anwendung enthält integrierte Tests unter **Diagnose & Tests**:

1. URL-Normalisierung entfernt `/openai/responses`, Query-Anteile und ungültige API-Versionen.
2. Eine fertige URL wird nicht doppelt erweitert.
3. Crawling erzeugt Tags, Evidence und Score.
4. CRM-Cluster werden berechnet.
5. API-Schlüssel werden nicht in Logeinträge übernommen.
6. Optionaler Azure-Live-Test mit tatsächlichem `fetch()`-Aufruf.

Der Live-Test kann bei einer direkt geöffneten `file://`-Datei wegen Browser-CORS mit `Failed to fetch` scheitern. In diesem Fall steht die effektive, bereits validierte URL im Log.
