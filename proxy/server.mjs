// Lokaler CORS-/Auth-Proxy für ALSO CRM Intelligence.
//
// Zweck: Die App läuft aus file:// und kann externe Firmendaten-APIs
// (Implisense) und Portale wegen CORS nicht direkt aufrufen. Dieser kleine
// Proxy läuft NUR lokal (127.0.0.1), setzt die CORS-Header, injiziert den
// API-Schlüssel serverseitig (bleibt aus dem Browser heraus) und leitet die
// Anfrage an das Ziel weiter – aber nur an erlaubte Hosts.
//
// Start:   IMPLISENSE_KEY=IMP-xxxx node proxy/server.mjs
//          (Windows: proxy\start-proxy.cmd)
// In der App unter „Quellen & Crawling" als CORS-Proxy-Präfix eintragen:
//          http://127.0.0.1:8787/proxy?url=
//
// Kein npm-Paket nötig (Node 18+ mit global fetch).
import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const KEY = process.env.IMPLISENSE_KEY || '';
const ALLOWED = (process.env.ALLOWED_HOSTS ||
  'api.implisense.com,www.northdata.de,northdata.de,opencorporates.com,www.unternehmensregister.de,www.bundesanzeiger.de'
).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

// Pro Host: welcher Auth-Header serverseitig injiziert wird (Schlüssel bleibt lokal).
function authFor(host) {
  if (host === 'api.implisense.com' && KEY) return { name: 'Authorization', value: 'Bearer ' + KEY };
  return null;
}

function cors(res, status, body, type) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization,content-type',
    'Access-Control-Max-Age': '600',
    'Content-Type': type || 'application/json; charset=utf-8'
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return cors(res, 204, '');
  const u = new URL(req.url, 'http://127.0.0.1');
  if (u.pathname === '/health') return cors(res, 200, JSON.stringify({ ok: true, key: !!KEY, allowed: ALLOWED }));
  if (u.pathname !== '/proxy') return cors(res, 404, JSON.stringify({ error: 'not found' }));

  const target = u.searchParams.get('url');
  if (!target) return cors(res, 400, JSON.stringify({ error: 'url fehlt' }));
  let t;
  try { t = new URL(target); } catch { return cors(res, 400, JSON.stringify({ error: 'ungültige url' })); }
  const httpOk = process.env.ALLOW_HTTP === '1' && t.protocol === 'http:';
  if (t.protocol !== 'https:' && !httpOk) return cors(res, 400, JSON.stringify({ error: 'nur https (ALLOW_HTTP=1 für http)' }));
  if (!ALLOWED.includes(t.host.toLowerCase()))
    return cors(res, 403, JSON.stringify({ error: 'Host nicht erlaubt: ' + t.host, hint: 'ALLOWED_HOSTS setzen' }));

  // Body für POST/PUT einsammeln.
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  const headers = { 'Accept': 'application/json' };
  const ct = req.headers['content-type']; if (ct) headers['Content-Type'] = ct;
  const a = authFor(t.host.toLowerCase());
  if (a) headers[a.name] = a.value;                      // serverseitig injiziert
  else if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization']; // sonst durchreichen

  try {
    const r = await fetch(target, {
      method: req.method, headers,
      body: (req.method === 'GET' || req.method === 'HEAD') ? undefined : body,
      redirect: 'follow'
    });
    const txt = await r.text();
    cors(res, r.status, txt, r.headers.get('content-type') || 'application/json; charset=utf-8');
  } catch (e) {
    cors(res, 502, JSON.stringify({ error: 'Weiterleitung fehlgeschlagen', detail: String(e && e.message || e) }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('CRM-Proxy läuft auf http://127.0.0.1:' + PORT);
  console.log('  CORS-Proxy-Präfix in der App:  http://127.0.0.1:' + PORT + '/proxy?url=');
  console.log('  Implisense-Schlüssel gesetzt:  ' + (KEY ? 'ja' : 'NEIN (IMPLISENSE_KEY setzen)'));
  console.log('  Erlaubte Hosts: ' + ALLOWED.join(', '));
});
