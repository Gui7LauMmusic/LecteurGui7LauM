const CACHE_NAME = "gui7laum-v8";
// Ne pas changer ce nom : il contient les téléchargements hors ligne de l'utilisateur.
const CACHE_AUDIO_NAME = "gui7laum-audio-v1";

const FICHIERS_A_METTRE_EN_CACHE = [
    "./",
    "./index.html",
    "./artiste.html",
    "./lecteur.html",
    "./manifest.json",
    "./css/style.css",
    "./js/artistes.js",
    "./js/lecteur.js",
    "./js/likes.js",
    "./images/artistes/gui7laum/Profil.png",
    "./images/artistes/gui7laum-ia/Profil.png",
    "./images/pochettes/gui7laum-ia/Elle e(s)t moi.png",
    "./images/pochettes/gui7laum-ia/Elle e(s)t moi (version acoustique).png",
    "./images/icones/icon-192.png",
    "./images/icones/icon-512.png"
];

self.addEventListener("install", event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(FICHIERS_A_METTRE_EN_CACHE);
        // Force le nouveau Service Worker à écraser l'ancien immédiatement
        await self.skipWaiting(); 
    })());
});

self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const noms = await caches.keys();
        await Promise.all(noms
            .filter(nom => nom !== CACHE_NAME && nom !== CACHE_AUDIO_NAME)
            .map(nom => caches.delete(nom)));
        await self.clients.claim();
    })());
});

self.addEventListener("fetch", event => {
    const requete = event.request;
    if (requete.method !== "GET") return;

    const url = new URL(requete.url);
    if (url.origin !== self.location.origin) return;

    // Le cache audio est indépendant des versions du site et n'est jamais
    // supprimé pendant une mise à jour.
    if (url.pathname.toLowerCase().endsWith(".mp3")) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_AUDIO_NAME);
            const audioEnCache = await cache.match(requete, { ignoreSearch: true });
            if (audioEnCache) return audioEnCache;
            return fetch(requete);
        })());
        return;
    }

    // Réseau d'abord pour récupérer les fichiers récents, cache en secours
    // pour que les pages déjà visitées restent accessibles hors connexion.
    event.respondWith((async () => {
        try {
            const requeteFraiche = new Request(requete, { cache: "no-cache" });
            const reponse = await fetch(requeteFraiche);
            if (reponse.ok) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(requete, reponse.clone());
            }
            return reponse;
        } catch (erreur) {
            const reponseEnCache = await caches.match(requete, { ignoreSearch: true });
            if (reponseEnCache) return reponseEnCache;
            throw erreur;
        }
    })());
});
