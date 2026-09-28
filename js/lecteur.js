const parametres = new URLSearchParams(window.location.search);

const idArtiste = parametres.get("artiste");
const idAlbum = parametres.get("album");

const artiste = artistes[idArtiste];

if (!artiste) {
    document.body.innerHTML = "<h1>Artiste introuvable</h1>";
    throw new Error("Artiste introuvable");
}

const album = artiste.albums.find(album => album.id === idAlbum);

if (!album) {
    document.body.innerHTML = "<h1>Album introuvable</h1>";
    throw new Error("Album introuvable");
}

const lienVersion = document.getElementById("lien-version");

if (idAlbum === "elle-est-moi") {

    lienVersion.textContent = "🎸 Écouter la version acoustique";
    lienVersion.href =
        "lecteur.html?artiste=gui7laum-ia&album=elle-est-moi-acoustique";

} else if (idAlbum === "elle-est-moi-acoustique") {

    lienVersion.textContent = "🎵 Écouter la version originale";
    lienVersion.href =
        "lecteur.html?artiste=gui7laum-ia&album=elle-est-moi";

}


/* =========================
   ELEMENTS
   ========================= */

const titreAlbum = document.getElementById("titre-album");
const artisteActuel = document.getElementById("artiste-actuel");
const morceauActuelElement = document.getElementById("morceau-actuel");

const pochette = document.getElementById("pochette");
const listeMorceaux = document.getElementById("liste-morceaux");

const audio = document.getElementById("audio");

const boutonLecturePause = document.getElementById("lecture-pause");
const boutonStop = document.getElementById("stop");
const boutonPrecedent = document.getElementById("precedent");
const boutonSuivant = document.getElementById("suivant");
const boutonAleatoire = document.getElementById("aleatoire");
const boutonRepetition = document.getElementById("repetition");
const boutonParolesActuelles =
    document.getElementById("paroles-actuelles");

const boutonTelechargerAlbum =
    document.getElementById("telecharger-album");

const barreProgression = document.querySelector(".barre-progression");
const progression = document.getElementById("progression");

const tempsActuel = document.getElementById("temps-actuel");
const dureeTotale = document.getElementById("duree-totale");

const volume = document.getElementById("volume");
const boutonMuet = document.getElementById("muet");


/* =========================
   VARIABLES
   ========================= */

let morceauActuel = -1;

let modeAleatoire = false;

let modeRepetition = "aucun";

let volumeAvantMuet = 1;

let angleDisque = 0;
let rotationEnCours = false;
let derniereRotation = null;
let animationDisque = null;

const CACHE_AUDIO_NAME = "gui7laum-audio-v1";


/* =========================
   ROTATION DU DISQUE
   ========================= */

function animerDisque(timestamp) {

    if (!rotationEnCours) {
        animationDisque = null;
        derniereRotation = null;
        return;
    }

    if (derniereRotation === null) {
        derniereRotation = timestamp;
    }

    const difference = timestamp - derniereRotation;

    angleDisque += difference * 0.045;

    if (angleDisque >= 360) {
        angleDisque -= 360;
    }

    pochette.style.transform = `rotate(${angleDisque}deg)`;

    derniereRotation = timestamp;

    animationDisque = requestAnimationFrame(animerDisque);
}


/* =========================
   INFORMATIONS DE BASE
   ========================= */

titreAlbum.textContent = album.titre;
artisteActuel.textContent = artiste.nom;

pochette.src = album.pochette;
pochette.alt = album.titre;

audio.volume = 1;


/* =========================
   DISPONIBILITE
   ========================= */

function estDisponible(morceau) {

    if (morceau.disponible) {
        return true;
    }

    if (!morceau.date) {
        return false;
    }

    const dateSortie = new Date(morceau.date + "T00:00:00");

    return new Date() >= dateSortie;
}


/* =========================
   TELECHARGEMENT HORS LIGNE
   ========================= */

async function estMorceauTelecharge(morceau) {

    try {

        const cache = await caches.open(CACHE_AUDIO_NAME);

        const reponse = await cache.match(morceau.fichier);

        return !!reponse;

    } catch (erreur) {

        console.error(
            "Impossible de vérifier le téléchargement :",
            erreur
        );

        return false;
    }
}


/* =========================
   MISE A JOUR DES PASTILLES
   ========================= */

async function mettreAJourPastillesTelechargement() {

    const boutons =
        document.querySelectorAll(
            ".bouton-telechargement"
        );

    for (const bouton of boutons) {

        const index = Number(bouton.dataset.index);

        const morceau = album.morceaux[index];

        if (!morceau) {
            continue;
        }

        const telecharge =
            await estMorceauTelecharge(morceau);

        if (telecharge) {

            bouton.textContent = "🟢";

            bouton.title =
                "Supprimer le téléchargement";

        } else {

            bouton.textContent = "⚪";

            bouton.title =
                "Télécharger pour écouter hors connexion";
        }
    }
}


/* =========================
   VERIFICATION ALBUM
   ========================= */

async function albumEstEntierementTelecharge() {

    const morceauxDisponibles =
        album.morceaux.filter(morceau =>
            estDisponible(morceau)
        );

    if (morceauxDisponibles.length === 0) {
        return false;
    }

    for (const morceau of morceauxDisponibles) {

        const telecharge =
            await estMorceauTelecharge(morceau);

        if (!telecharge) {
            return false;
        }
    }

    return true;
}


/* =========================
   MISE A JOUR BOUTON ALBUM
   ========================= */

async function mettreAJourBoutonAlbum() {

    if (!boutonTelechargerAlbum) {
        return;
    }

    const albumTelecharge =
        await albumEstEntierementTelecharge();

    if (albumTelecharge) {

        boutonTelechargerAlbum.textContent =
            "🟢 Album téléchargé";

        boutonTelechargerAlbum.title =
            "Supprimer le téléchargement de l'album";

        boutonTelechargerAlbum.classList.add(
            "album-telecharge"
        );

    } else {

        boutonTelechargerAlbum.textContent =
            "↓ Télécharger l'album";

        boutonTelechargerAlbum.title =
            "Télécharger les morceaux disponibles";

        boutonTelechargerAlbum.classList.remove(
            "album-telecharge"
        );
    }
}


/* =========================
   TELECHARGER UN MORCEAU
   ========================= */

async function telechargerMorceau(morceau, bouton) {

    if (!estDisponible(morceau)) {
        return;
    }

    bouton.disabled = true;
    bouton.textContent = "⏳";

    try {

        const reponse = await fetch(morceau.fichier);

        if (!reponse.ok) {
            throw new Error(
                "Impossible de télécharger le morceau"
            );
        }

        const cache =
            await caches.open(CACHE_AUDIO_NAME);

        await cache.put(
            morceau.fichier,
            reponse.clone()
        );

        bouton.textContent = "🟢";

        bouton.title =
            "Supprimer le téléchargement";

    } catch (erreur) {

        console.error(erreur);

        bouton.textContent = "⚪";

        bouton.title =
            "Télécharger pour écouter hors connexion";

        alert(
            "Impossible de télécharger ce morceau. Vérifie ta connexion Internet."
        );

    } finally {

        bouton.disabled = false;

        await mettreAJourBoutonAlbum();
    }
}


/* =========================
   SUPPRIMER UN MORCEAU
   ========================= */

async function supprimerTelechargement(morceau, bouton) {

    bouton.disabled = true;
    bouton.textContent = "⏳";

    try {

        const cache =
            await caches.open(CACHE_AUDIO_NAME);

        await cache.delete(morceau.fichier);

        bouton.textContent = "⚪";

        bouton.title =
            "Télécharger pour écouter hors connexion";

    } catch (erreur) {

        console.error(erreur);

        bouton.textContent = "🟢";

        bouton.title =
            "Supprimer le téléchargement";

    } finally {

        bouton.disabled = false;

        await mettreAJourBoutonAlbum();
    }
}


/* =========================
   CHANGER ETAT MORCEAU
   ========================= */

async function changerEtatTelechargement(
    morceau,
    bouton
) {

    const telecharge =
        await estMorceauTelecharge(morceau);

    if (telecharge) {

        await supprimerTelechargement(
            morceau,
            bouton
        );

    } else {

        await telechargerMorceau(
            morceau,
            bouton
        );
    }
}


/* =========================
   TELECHARGER / SUPPRIMER ALBUM
   ========================= */

async function telechargerAlbum() {

    if (!boutonTelechargerAlbum) {
        return;
    }

    const albumTelecharge =
        await albumEstEntierementTelecharge();

    boutonTelechargerAlbum.disabled = true;

    if (albumTelecharge) {

        boutonTelechargerAlbum.textContent =
            "⏳ Suppression...";

        try {

            const cache =
                await caches.open(CACHE_AUDIO_NAME);

            const morceauxDisponibles =
                album.morceaux.filter(morceau =>
                    estDisponible(morceau)
                );

            for (const morceau of morceauxDisponibles) {

                await cache.delete(
                    morceau.fichier
                );
            }

            await mettreAJourPastillesTelechargement();

        } catch (erreur) {

            console.error(erreur);

            alert(
                "Impossible de supprimer le téléchargement de l'album."
            );
        }

    } else {

        boutonTelechargerAlbum.textContent =
            "⏳ Téléchargement...";

        try {

            const morceauxDisponibles =
                album.morceaux.filter(morceau =>
                    estDisponible(morceau)
                );

            const cache =
                await caches.open(CACHE_AUDIO_NAME);

            for (const morceau of morceauxDisponibles) {

                const dejaTelecharge =
                    await cache.match(
                        morceau.fichier
                    );

                if (dejaTelecharge) {
                    continue;
                }

                const reponse =
                    await fetch(morceau.fichier);

                if (!reponse.ok) {
                    throw new Error(
                        "Impossible de télécharger : " +
                        morceau.fichier
                    );
                }

                await cache.put(
                    morceau.fichier,
                    reponse.clone()
                );

                await mettreAJourPastillesTelechargement();
            }

        } catch (erreur) {

            console.error(erreur);

            alert(
                "Impossible de télécharger tout l’album. Vérifie ta connexion Internet."
            );
        }
    }

    boutonTelechargerAlbum.disabled = false;

    await mettreAJourPastillesTelechargement();
    await mettreAJourBoutonAlbum();
}


/* =========================
   AFFICHAGE DES MORCEAUX
   ========================= */

async function afficherMorceaux() {

    listeMorceaux.innerHTML = "";

    album.morceaux.forEach((morceau, index) => {

        const ligne = document.createElement("div");

        ligne.className = "morceau";

        if (estDisponible(morceau)) {

            ligne.classList.add("disponible");

            const duree = document.createElement("span");

            duree.className =
                "duree-morceau";

            ligne.innerHTML = `
                <span class="numero">${String(index + 1).padStart(2, "0")}.</span>
                <span class="titre">${morceau.titre}</span>
            `;

            ligne.appendChild(duree);

            const boutonTelechargement =
                document.createElement("button");

            boutonTelechargement.className =
                "bouton-telechargement";

            boutonTelechargement.dataset.index =
                index;

            boutonTelechargement.textContent =
                "⚪";

            boutonTelechargement.title =
                "Télécharger pour écouter hors connexion";

            boutonTelechargement.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    changerEtatTelechargement(
                        morceau,
                        boutonTelechargement
                    );
                }
            );

            ligne.appendChild(
                boutonTelechargement
            );

            ligne.addEventListener(
                "click",
                () => {
                    jouerMorceau(index);
                }
            );

        } else {

            ligne.classList.add("a-venir");

            const date =
                new Date(
                    morceau.date + "T00:00:00"
                );

            const dateFormatee =
                date.toLocaleDateString(
                    "fr-FR",
                    {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                    }
                );

            ligne.innerHTML = `
                <span class="numero">${String(index + 1).padStart(2, "0")}.</span>
                <span class="date-sortie">${dateFormatee}</span>
                <span class="cadenas">🔒</span>
            `;
        }

        listeMorceaux.appendChild(ligne);
    });

    await mettreAJourPastillesTelechargement();

    await mettreAJourBoutonAlbum();

    mettreAJourSelection();
}


/* =========================
   LECTURE D'UN MORCEAU
   ========================= */

async function jouerMorceau(index) {

    const morceau = album.morceaux[index];

    if (!estDisponible(morceau)) {
        return;
    }

    rotationEnCours = false;
    angleDisque = 0;
    derniereRotation = null;

    pochette.style.transform =
        "rotate(0deg)";

    morceauActuel = index;

    morceauActuelElement.textContent =
        morceau.titre;

    boutonParolesActuelles.dataset.index =
        index;

    try {

        const cache =
            await caches.open(CACHE_AUDIO_NAME);

        const fichierEnCache =
            await cache.match(morceau.fichier);

        const horsLigne =
            !navigator.onLine;

        /*
         * Hors connexion :
         * seul un morceau réellement téléchargé
         * peut être lu.
         */

        if (horsLigne && !fichierEnCache) {

            alert(
                "Ce morceau n'est pas téléchargé pour une écoute hors connexion."
            );

            return;
        }


        if (fichierEnCache) {

            if (audio._urlLocale) {
                URL.revokeObjectURL(
                    audio._urlLocale
                );
            }

            const blob =
                await fichierEnCache.blob();

            audio._urlLocale =
                URL.createObjectURL(blob);

            audio.src =
                audio._urlLocale;

        } else {

            audio.src =
                morceau.fichier;
        }

        audio.load();

        await audio.play();

        mettreAJourSelection();

    } catch (erreur) {

        console.error(
            "Impossible de lire le morceau :",
            erreur
        );
    }
}

/* =========================
   SELECTION VISUELLE
   ========================= */

function mettreAJourSelection() {

    const lignes =
        document.querySelectorAll(".morceau");

    lignes.forEach((ligne, index) => {

        ligne.classList.toggle(
            "en-lecture",
            index === morceauActuel
        );
    });
}


/* =========================
   LECTURE / PAUSE
   ========================= */

boutonLecturePause.addEventListener(
    "click",
    () => {

        if (morceauActuel === -1) {

            let premierDisponible =
                album.morceaux.findIndex(
                    morceau =>
                        estDisponible(morceau)
                );

            if (premierDisponible !== -1) {
                jouerMorceau(
                    premierDisponible
                );
            }

            return;
        }

        if (audio.paused) {
            audio.play();
        } else {
            audio.pause();
        }
    }
);


/* =========================
   STOP
   ========================= */

boutonStop.addEventListener(
    "click",
    () => {

        audio.pause();

        audio.currentTime = 0;

        rotationEnCours = false;
        angleDisque = 0;
        derniereRotation = null;

        pochette.style.transform =
            "rotate(0deg)";

        mettreAJourProgression();
    }
);


/* =========================
   PRECEDENT
   ========================= */

boutonPrecedent.addEventListener(
    "click",
    () => {

        if (morceauActuel === -1) {
            return;
        }

        let index =
            morceauActuel - 1;

        if (modeAleatoire) {
            index = morceauAleatoire();
        }

        while (
            index >= 0 &&
            !estDisponible(
                album.morceaux[index]
            )
        ) {
            index--;
        }

        if (index >= 0) {
            jouerMorceau(index);
        }
    }
);


/* =========================
   SUIVANT
   ========================= */

boutonSuivant.addEventListener(
    "click",
    () => {
        jouerSuivant();
    }
);


function jouerSuivant() {

    if (morceauActuel === -1) {
        return;
    }

    let index;

    if (modeAleatoire) {

        index = morceauAleatoire();

    } else {

        index =
            morceauActuel + 1;

        while (
            index <
                album.morceaux.length &&
            !estDisponible(
                album.morceaux[index]
            )
        ) {
            index++;
        }
    }

    if (
        index <
        album.morceaux.length
    ) {

        jouerMorceau(index);

    } else if (
        modeRepetition === "liste"
    ) {

        const premierDisponible =
            album.morceaux.findIndex(
                morceau =>
                    estDisponible(morceau)
            );

        if (premierDisponible !== -1) {
            jouerMorceau(
                premierDisponible
            );
        }
    }
}


/* =========================
   ALEATOIRE
   ========================= */

boutonAleatoire.addEventListener(
    "click",
    () => {

        modeAleatoire =
            !modeAleatoire;

        boutonAleatoire.classList.toggle(
            "actif",
            modeAleatoire
        );

        boutonAleatoire.textContent =
            modeAleatoire
                ? "⤨"
                : "⇄";
    }
);


function morceauAleatoire() {

    const morceauxDisponibles =
        album.morceaux
            .map(
                (morceau, index) => ({
                    morceau,
                    index
                })
            )
            .filter(
                element =>
                    estDisponible(
                        element.morceau
                    )
            );

    if (
        morceauxDisponibles.length === 0
    ) {
        return -1;
    }

    if (
        morceauxDisponibles.length === 1
    ) {
        return morceauxDisponibles[0].index;
    }

    let choix;

    do {

        choix =
            morceauxDisponibles[
                Math.floor(
                    Math.random() *
                    morceauxDisponibles.length
                )
            ].index;

    } while (
        choix === morceauActuel
    );

    return choix;
}


/* =========================
   REPETITION
   ========================= */

boutonRepetition.addEventListener(
    "click",
    () => {

        if (
            modeRepetition === "aucun"
        ) {

            modeRepetition = "titre";

            boutonRepetition.textContent =
                "↻¹";

            boutonRepetition.classList.remove(
                "repetition-liste"
            );

            boutonRepetition.classList.add(
                "actif"
            );

            boutonRepetition.title =
                "Répéter le titre";

        } else if (
            modeRepetition === "titre"
        ) {

            modeRepetition = "liste";

            boutonRepetition.textContent =
                "∞";

            boutonRepetition.classList.remove(
                "actif"
            );

            boutonRepetition.classList.add(
                "repetition-liste"
            );

            boutonRepetition.title =
                "Répéter l'album";

        } else {

            modeRepetition = "aucun";

            boutonRepetition.textContent =
                "↻";

            boutonRepetition.classList.remove(
                "actif"
            );

            boutonRepetition.classList.remove(
                "repetition-liste"
            );

            boutonRepetition.title =
                "Répétition désactivée";
        }
    }
);


/* =========================
   FIN DU MORCEAU
   ========================= */

audio.addEventListener(
    "ended",
    () => {

        if (
            modeRepetition === "titre"
        ) {

            audio.currentTime = 0;
            audio.play();

            return;
        }

        jouerSuivant();
    }
);


/* =========================
   PROGRESSION
   ========================= */

audio.addEventListener(
    "timeupdate",
    () => {
        mettreAJourProgression();
    }
);


function mettreAJourProgression() {

    if (!audio.duration) {
        return;
    }

    const pourcentage =
        (audio.currentTime /
            audio.duration) * 100;

    progression.style.width =
        pourcentage + "%";

    tempsActuel.textContent =
        formaterTemps(
            audio.currentTime
        );

    dureeTotale.textContent =
        formaterTemps(
            audio.duration
        );
}


function formaterTemps(secondes) {

    if (
        !secondes ||
        isNaN(secondes)
    ) {
        return "0:00";
    }

    const minutes =
        Math.floor(
            secondes / 60
        );

    const secondesRestantes =
        Math.floor(
            secondes % 60
        )
            .toString()
            .padStart(2, "0");

    return `${minutes}:${secondesRestantes}`;
}


/* =========================
   CLIC SUR LA BARRE
   ========================= */

barreProgression.addEventListener(
    "click",
    event => {

        if (!audio.duration) {
            return;
        }

        const rectangle =
            barreProgression
                .getBoundingClientRect();

        const position =
            (
                event.clientX -
                rectangle.left
            ) /
            rectangle.width;

        audio.currentTime =
            position *
            audio.duration;
    }
);


/* =========================
   VOLUME
   ========================= */

volume.addEventListener(
    "input",
    () => {

        audio.volume =
            volume.value;

        if (audio.volume > 0) {
            boutonMuet.textContent =
                "🔊";
        }
    }
);


/* =========================
   MUET
   ========================= */

boutonMuet.addEventListener(
    "click",
    () => {

        if (audio.muted) {

            audio.muted = false;

            audio.volume =
                volumeAvantMuet;

            volume.value =
                volumeAvantMuet;

            boutonMuet.textContent =
                "🔊";

        } else {

            volumeAvantMuet =
                audio.volume;

            audio.muted = true;

            volume.value = 0;

            boutonMuet.textContent =
                "🔇";
        }
    }
);


/* =========================
   CLIC SUR LE DISQUE
   ========================= */

const disque =
    document.querySelector(".disque");

disque.addEventListener(
    "click",
    () => {

        if (morceauActuel === -1) {

            const premierDisponible =
                album.morceaux.findIndex(
                    morceau =>
                        estDisponible(morceau)
                );

            if (premierDisponible !== -1) {
                jouerMorceau(
                    premierDisponible
                );
            }

            return;
        }

        if (audio.paused) {
            audio.play();
        } else {
            audio.pause();
        }
    }
);


/* =========================
   ETAT LECTURE / PAUSE
   ========================= */

audio.addEventListener(
    "play",
    () => {

        boutonLecturePause.textContent =
            "⏸";

        boutonLecturePause.title =
            "Pause";

        rotationEnCours = true;

        if (!animationDisque) {

            animationDisque =
                requestAnimationFrame(
                    animerDisque
                );
        }
    }
);


audio.addEventListener(
    "pause",
    () => {

        boutonLecturePause.textContent =
            "▶";

        boutonLecturePause.title =
            "Lecture";

        rotationEnCours = false;
    }
);


/* =========================
   DUREE DU MORCEAU
   ========================= */

audio.addEventListener(
    "loadedmetadata",
    () => {

        dureeTotale.textContent =
            formaterTemps(
                audio.duration
            );
    }
);


function chargerDureesDesMorceaux() {

    const lignes =
        document.querySelectorAll(
            ".morceau.disponible"
        );

    album.morceaux.forEach(
        (morceau, index) => {

            if (!estDisponible(morceau)) {
                return;
            }

            const ligne =
                lignes[
                    album.morceaux
                        .slice(
                            0,
                            index + 1
                        )
                        .filter(
                            m =>
                                estDisponible(m)
                        )
                        .length - 1
                ];

            if (!ligne) {
                return;
            }

            const audioTemporaire =
                new Audio();

            audioTemporaire.src =
                morceau.fichier;

            audioTemporaire.addEventListener(
                "loadedmetadata",
                () => {

                    const duree =
                        ligne.querySelector(
                            ".duree-morceau"
                        );

                    if (duree) {

                        duree.textContent =
                            formaterTemps(
                                audioTemporaire.duration
                            );
                    }
                }
            );
        }
    );
}


/* =========================
   PAROLES
   ========================= */

const fenetreParoles =
    document.getElementById(
        "fenetre-paroles"
    );

const titreParoles =
    document.getElementById(
        "titre-paroles"
    );

const texteParoles =
    document.getElementById(
        "texte-paroles"
    );

const fermerParoles =
    document.getElementById(
        "fermer-paroles"
    );


boutonParolesActuelles.addEventListener(
    "click",
    async () => {

        const index =
            morceauActuel;

        if (index === -1) {
            return;
        }

        const morceau =
            album.morceaux[index];

        let nomFichier =
            morceau.titre;

        if (
            idAlbum ===
            "elle-est-moi-acoustique"
        ) {

            nomFichier +=
                " (version acoustique)";
        }

        const chemin =
            `paroles/${idArtiste}/${album.titre}/${String(index + 1).padStart(2, "0")} - ${nomFichier}.txt`;

        try {

            const reponse =
                await fetch(chemin);

            if (!reponse.ok) {

                throw new Error(
                    "Fichier de paroles introuvable"
                );
            }

            const paroles =
                await reponse.text();

            titreParoles.textContent =
                morceau.titre;

            texteParoles.textContent =
                paroles;

            fenetreParoles.classList.add(
                "ouverte"
            );

        } catch (erreur) {

            console.error(erreur);

            texteParoles.textContent =
                "Impossible de charger les paroles.";

            fenetreParoles.classList.add(
                "ouverte"
            );
        }
    }
);


fermerParoles.addEventListener(
    "click",
    () => {

        fenetreParoles.classList.remove(
            "ouverte"
        );
    }
);


fenetreParoles.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            fenetreParoles
        ) {

            fenetreParoles.classList.remove(
                "ouverte"
            );
        }
    }
);


/* =========================
   BOUTON ALBUM
   ========================= */

if (boutonTelechargerAlbum) {

    boutonTelechargerAlbum.addEventListener(
        "click",
        telechargerAlbum
    );
}


/* =========================
   INITIALISATION
   ========================= */

async function initialiserLecteur() {

    await afficherMorceaux();

    chargerDureesDesMorceaux();
}

initialiserLecteur();