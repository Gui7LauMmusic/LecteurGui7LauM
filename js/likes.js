const URL_SUPABASE = "https://xjtcrzletifayguttjvh.supabase.co";
const CLE_PUBLIABLE = "sb_publishable_eMENMP-lYFHy1JykmbAy8w_tkTrYlC2";

let clientLikes = null;
let utilisateurLikes = null;
const mesLikes = new Set();
const compteursLikes = new Map();

async function initialiserLikes() {
    try {
        if (!window.supabase?.createClient) {
            return false;
        }

        clientLikes = window.supabase.createClient(
            URL_SUPABASE,
            CLE_PUBLIABLE
        );

        let { data: { session }, error } =
            await clientLikes.auth.getSession();

        if (error) throw error;

        if (!session) {
            const resultat =
                await clientLikes.auth.signInAnonymously();

            if (resultat.error) throw resultat.error;
            session = resultat.data.session;
        }

        utilisateurLikes = session.user.id;

        const resultatChansons = await clientLikes
            .from("songs")
            .select("id, like_count");

        if (resultatChansons.error) {
            throw resultatChansons.error;
        }

        compteursLikes.clear();

        resultatChansons.data.forEach(chanson => {
            compteursLikes.set(chanson.id, chanson.like_count);
        });

        const resultatVotes = await clientLikes
            .rpc("get_my_song_votes");

        if (resultatVotes.error) throw resultatVotes.error;

        mesLikes.clear();

        resultatVotes.data.forEach(vote => {
            mesLikes.add(vote.song_id);
        });

        return true;
    } catch (erreur) {
        console.warn("Likes indisponibles :", erreur);
        return false;
    }
}

function obtenirLike(id) {
    return {
        compte: compteursLikes.get(id) ?? 0,
        actif: mesLikes.has(id)
    };
}

async function changerLike(id) {
    if (!clientLikes || !utilisateurLikes) {
        return null;
    }

    try {
        const resultat = await clientLikes.rpc(
            "toggle_song_vote",
            {
                p_song_id: id,
                p_voter_id: utilisateurLikes
            }
        );

        if (resultat.error) throw resultat.error;

        const vote = resultat.data[0];

        mesLikes.delete(id);

        if (vote.liked) {
            mesLikes.add(id);
        }

        compteursLikes.set(id, vote.like_count);

        return obtenirLike(id);
    } catch (erreur) {
        console.warn("Vote impossible :", erreur);
        return null;
    }
}