// Service worker: guarda o app no iPhone para abrir SEM INTERNET (no ônibus).
// Página: tenta a rede primeiro (para pegar versões novas) e, sem internet, usa a cópia salva.
const CACHE = "enem-v37";
const CORE = ["./", "./index.html", "./manifest.json", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png", "./favicon-32x32.png", "./vendor/pdf.min.mjs", "./vendor/pdf.worker.min.mjs", "./vendor/wasm/openjpeg.wasm", "./vendor/wasm/jbig2.wasm", "./vendor/wasm/qcms_bg.wasm"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)); }

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Banco de questões e PDFs das provas: o app já guarda no IndexedDB; aqui só passa direto pela rede.
  if (url.origin === location.origin && /\/(banco|provas)\//.test(url.pathname)) return;
  const isPage = req.mode === "navigate" || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname));
  if (isPage) {
    // a rede continua baixando mesmo se demorar: a versão nova fica salva para a próxima abertura
    const net = fetch(req, { cache: "no-store" }).then((res) => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copy)); } return res; });
    e.waitUntil(net.catch(() => {}));
    e.respondWith(
      Promise.race([net, timeout(8000)])
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./") || net))
    );
    return;
  }
  // Ícones, manifest e fontes: cópia salva primeiro; se não houver, busca e guarda.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => hit))
  );
});
