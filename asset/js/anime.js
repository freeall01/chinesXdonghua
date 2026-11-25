/* =====================================
   chinesXdonghua
   Anime Details System
===================================== */

const AnimeAPI = "https://graphql.anilist.co";


/* =====================================
   GRAPHQL QUERY
===================================== */

const AnimeDetailsQuery = `
query ($id: Int) {

    Media(id: $id, type: ANIME) {

        id

        title {
            english
            romaji
            native
        }

        description(asHtml: false)

        coverImage {
            extraLarge
            large
            color
        }

        bannerImage

        episodes

        duration

        status

        averageScore

        popularity

        season

        seasonYear

        format

        genres

        countryOfOrigin

        studios {
            nodes {
                name
            }
        }

        nextAiringEpisode {
            episode
            airingAt
        }
    }
}
`;


/* =====================================
   API REQUEST
===================================== */

async function getAnimeDetails(id) {

    try {

        const response = await fetch(AnimeAPI, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },

            body: JSON.stringify({

                query: AnimeDetailsQuery,

                variables: {
                    id: Number(id)
                }

            })

        });

        if (!response.ok) {
            throw new Error("Unable to fetch anime");
        }

        const result = await response.json();

        const anime = result.data.Media;

        if (!anime || anime.countryOfOrigin !== "CN") {
            throw new Error("Chinese Donghua not found");
        }

        return anime;

    } catch (error) {

        console.error("Anime Details Error:", error);

        return null;

    }

}


/* =====================================
   TITLE
===================================== */

function getAnimeTitle(anime) {

    return anime.title.english ||
           anime.title.romaji ||
           anime.title.native ||
           "Unknown Donghua";

}


/* =====================================
   ESCAPE HTML
===================================== */

function animeEscape(value) {

    return String(value || "").replace(/[&<>"']/g, char => ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"

    })[char]);

}


/* =====================================
   DESCRIPTION
===================================== */

function cleanDescription(description) {

    const div = document.createElement("div");

    div.innerHTML = description || "";

    return div.textContent || div.innerText || "";

}


/* =====================================
   STATUS
===================================== */

function formatAnimeStatus(status) {

    const statuses = {

        RELEASING: "Ongoing",

        FINISHED: "Completed",

        NOT_YET_RELEASED: "Upcoming",

        CANCELLED: "Cancelled",

        HIATUS: "On Hiatus"

    };

    return statuses[status] || status;

}


/* =====================================
   RENDER DETAILS
===================================== */

function renderAnimeDetails(anime) {

    const title = animeEscape(getAnimeTitle(anime));

    const description = animeEscape(
        cleanDescription(anime.description)
    );

    const poster = anime.coverImage.extraLarge ||
                   anime.coverImage.large;

    const banner = anime.bannerImage || poster;

    const score = anime.averageScore
        ? (anime.averageScore / 10).toFixed(1)
        : "N/A";

    const studios = anime.studios.nodes
        .map(studio => animeEscape(studio.name))
        .join(", ") || "Unknown";

    const genres = anime.genres.map(genre => {

        return `
            <span class="bg-white/10 px-3 py-2 rounded-full text-xs">
                ${animeEscape(genre)}
            </span>
        `;

    }).join("");

    const container = document.getElementById("anime-details");

    if (!container) return;

    container.innerHTML = `

        <section class="relative">

            <div class="absolute inset-0">

                <img
                    src="${banner}"
                    class="w-full h-full object-cover opacity-20"
                    alt=""
                >

                <div class="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/70 to-transparent">
                </div>

            </div>

            <div class="relative max-w-7xl mx-auto px-4 py-12">

                <div class="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">

                    <div>

                        <img
                            src="${poster}"
                            alt="${title}"
                            class="w-full rounded-2xl shadow-2xl"
                        >

                        <button
                            id="add-list-btn"
                            class="w-full bg-brand hover:bg-orange-600 py-3 rounded-xl font-bold mt-5">

                            + Add to My List

                        </button>

                    </div>


                    <div class="flex flex-col justify-center">

                        <p class="text-brand font-bold text-xs tracking-widest mb-3">
                            CHINESE DONGHUA
                        </p>

                        <h1 class="text-3xl md:text-5xl font-black mb-5">
                            ${title}
                        </h1>

                        <div class="flex flex-wrap gap-3 mb-5 text-sm">

                            <span class="bg-white/10 px-3 py-2 rounded-lg">
                                ⭐ ${score}
                            </span>

                            <span class="bg-white/10 px-3 py-2 rounded-lg">
                                ${animeEscape(formatAnimeStatus(anime.status))}
                            </span>

                            <span class="bg-white/10 px-3 py-2 rounded-lg">
                                ${anime.episodes || "?"} Episodes
                            </span>

                            <span class="bg-white/10 px-3 py-2 rounded-lg">
                                ${anime.seasonYear || "Unknown Year"}
                            </span>

                        </div>


                        <div class="flex flex-wrap gap-2 mb-6">
                            ${genres}
                        </div>


                        <h2 class="text-xl font-bold mb-3">
                            Synopsis
                        </h2>

                        <p class="text-gray-300 leading-7 text-sm">
                            ${description || "No description available."}
                        </p>


                        <div class="grid grid-cols-2 gap-4 mt-7">

                            <div>
                                <p class="text-gray-500 text-xs">
                                    FORMAT
                                </p>

                                <p class="font-semibold mt-1">
                                    ${animeEscape(anime.format || "Unknown")}
                                </p>
                            </div>

                            <div>
                                <p class="text-gray-500 text-xs">
                                    STUDIO
                                </p>

                                <p class="font-semibold mt-1">
                                    ${studios}
                                </p>
                            </div>

                        </div>


                        <button
                            id="watch-now-btn"
                            class="bg-brand hover:bg-orange-600 rounded-xl py-4 px-8 font-bold mt-8 w-full md:w-fit">

                            ▶ Watch Now

                        </button>

                    </div>

                </div>

            </div>

        </section>

    `;


    /* =====================================
       MY LIST BUTTON
    ===================================== */

    const listButton = document.getElementById("add-list-btn");

    if (window.DonghuaApp) {

        const saved = DonghuaApp.isInList(anime.id);

        if (saved) {
            listButton.textContent = "✓ Added to My List";
        }

        listButton.addEventListener("click", () => {

            if (DonghuaApp.isInList(anime.id)) {

                DonghuaApp.removeFromList(anime.id);

                listButton.textContent = "+ Add to My List";

            } else {

                DonghuaApp.addToList({

                    id: anime.id,

                    title: getAnimeTitle(anime),

                    image: poster

                });

                listButton.textContent = "✓ Added to My List";

            }

        });

    }


    /* =====================================
       WATCH BUTTON
    ===================================== */

    document.getElementById("watch-now-btn")
        .addEventListener("click", () => {

            window.location.href =
                `watch.html?id=${anime.id}&episode=1`;

        });

}


/* =====================================
   LOAD ANIME PAGE
===================================== */

async function loadAnimePage() {

    const params = new URLSearchParams(window.location.search);

    const id = params.get("id");

    const container = document.getElementById("anime-details");

    if (!id || !/^\d+$/.test(id)) {

        if (container) {
            container.innerHTML = `
                <div class="text-center py-20">
                    <h2 class="text-2xl font-bold">
                        Invalid Donghua ID
                    </h2>
                    <a href="index.html" class="text-brand mt-4 inline-block">
                        Go Home
                    </a>
                </div>
            `;
        }

        return;

    }

    if (container) {
        container.innerHTML = `
            <div class="text-center py-24 text-gray-400">
                Loading Donghua Details...
            </div>
        `;
    }

    const anime = await getAnimeDetails(id);

    if (!anime) {

        if (container) {
            container.innerHTML = `
                <div class="text-center py-20">
                    <h2 class="text-2xl font-bold">
                        Donghua Not Found
                    </h2>
                    <p class="text-gray-500 mt-3">
                        Please try another title.
                    </p>
                </div>
            `;
        }

        return;

    }

    renderAnimeDetails(anime);

}


/* =====================================
   GLOBAL OBJECT
===================================== */

window.DonghuaAnime = {

    getDetails: getAnimeDetails,

    load: loadAnimePage,

    render: renderAnimeDetails

};


/* =====================================
   AUTO START
===================================== */

document.addEventListener("DOMContentLoaded", () => {

    if (document.getElementById("anime-details")) {
        loadAnimePage();
    }

});
