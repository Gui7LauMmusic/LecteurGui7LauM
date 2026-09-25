const CACHE_NAME = "gui7laum-v2";

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

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(noms => {
            return Promise.all(
                noms
                    .filter(nom => nom !== CACHE_NAME)
                    .map(nom => caches.delete(nom))
            );
        })
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request, {
            ignoreSearch: true
        }).then(reponse => {
            return reponse || fetch(event.request);
        })
    );
});