const CACHE_NAME = "gui7laum-v7";
const CACHE_AUDIO_NAME = "gui7laum-audio-v1";

const FICHIERS_A_METTRE_EN_CACHE = [
    "./",
    "./index.html",
    "./artiste.html",
    "./lecteur.html",
    "./manifest.json",
    "./css/style.css",
    "./js/artistes.js",
    "./js/lecteur.js"
    "./js/likes.js"
];


// =========================
// INSTALLATION
// =========================

self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(FICHIERS_A_METTRE_EN_CACHE);
        })
    );

    self.skipWaiting();
});


// =========================
// ACTIVATION
// =========================

self.addEventListener("activate", event => {

    event.waitUntil(
        Promise.all([
            self.clients.claim(),

            caches.keys().then(noms => {
                return Promise.all(
                    noms
                        .filter(nom =>
                            nom !== CACHE_NAME &&
                            nom !== CACHE_AUDIO_NAME
                        )
                        .map(nom => caches.delete(nom))
                );
            })
        ])
    );
});


// =========================
// REQUÊTES
// =========================

self.addEventListener("fetch", event => {

    const requete = event.request;

    if (requete.method !== "GET") {
        return;
    }

    const url = new URL(requete.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    const estAudio = url.pathname.endsWith(".mp3");

    // Les MP3 téléchargés restent prioritaires.
    if (estAudio) {

        event.respondWith(
            caches.open(CACHE_AUDIO_NAME).then(async cache => {

                const audioEnCache = await cache.match(requete);

                if (audioEnCache) {
                    return audioEnCache;
                }

                return fetch(requete);
            })
        );

        return;
    }

    // Pour les fichiers du site :
    // réseau en priorité, cache en secours.
    event.respondWith(
        (async () => {

            try {

                const requeteFraiche = new Request(requete, {
    cache: "no-cache"
});
const reponse = await fetch(requeteFraiche);

                if (reponse.ok) {

                    const cache = await caches.open(CACHE_NAME);

                    await cache.put(
                        requete,
                        reponse.clone()
                    );
                }

                return reponse;

            } catch (erreur) {

                const reponseEnCache = await caches.match(
                    requete,
                    { ignoreSearch: true }
                );

                if (reponseEnCache) {
                    return reponseEnCache;
                }

                throw erreur;
            }

        })()
    );

});