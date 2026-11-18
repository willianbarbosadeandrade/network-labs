// Guarda os arquivos do app no aparelho para ele abrir sem internet.
// Ao mudar qualquer arquivo, suba a versão para o navegador baixar de novo.
const CACHE = "base-clara-v1.3";

const FILES = [
  "./",
  "./index.html",
  "./css/estilos.css",
  "./js/conversao.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icones/favicon.svg",
  "./icones/icone-192.png",
  "./icones/icone-512.png",
  "./icones/icone-maskable-512.png",
  "./icones/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Primeiro o cache (rápido e offline); se não tiver, busca na rede.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || fetch(event.request))
  );
});
