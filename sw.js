const CACHE_NAME = "gui7laum-v1";

const FICHIERS_A_METTRE_EN_CACHE = [
    "./",
    "./index.html",
    "./artiste.html",
    "./lecteur.html",
    "./manifest.json",
    "./css/style.css",
    "./js/artistes.js",
    "./js/lecteur.js"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(FICHIERS_A_METTRE_EN_CACHE);
        })
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(reponse => {
            return reponse || fetch(event.request);
        })
    );
});