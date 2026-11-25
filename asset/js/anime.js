/* =========================================
   chinesXdonghua
   AUTOMATIC DONGHUA DISCOVERY ENGINE
========================================= */

(function () {

"use strict";

const API_URL = "https://graphql.anilist.co";

const CACHE_TIME = 15 * 60 * 1000;

const cache = new Map();


/* =========================================
   GRAPHQL QUERY
========================================= */

const DONGHUA_QUERY = `

query (
    $page: Int,
    $perPage: Int,
    $sort: [MediaSort],
    $status: MediaStatus,
    $search: String
) {

    Page(
        page: $page,
        perPage: $perPage
    ) {

        pageInfo {
            currentPage
            hasNextPage
            total
        }

        media(
            type: ANIME,
            countryOfOrigin: "CN",
            isAdult: false,
            sort: $sort,
            status: $status,
            search: $search
        ) {

            id

            title {
                english
                romaji
                native
            }

            description(asHtml: false)

            coverImage {
                large
                extraLarge
            }

            bannerImage

            episodes

            status

            format

            genres

            averageScore

            popularity

            season

            seasonYear

            startDate {
                year
                month
                day
            }

            updatedAt

        }

    }

}

`;


/* =========================================
   API REQUEST
========================================= */

async function requestAPI(variables = {}) {

    const cacheKey = JSON.stringify(variables);

    const cached = cache.get(cacheKey);

    if (
        cached &&
        Date.now() - cached.time < CACHE_TIME
    ) {

        return cached.data;

    }


    const response = await fetch(API_URL, {

        method: "POST",

        headers: {

            "Content-Type": "application/json",

            "Accept": "application/json"

        },

        body: JSON.stringify({

            query: DONGHUA_QUERY,

            variables: {

                page: 1,

                perPage: 20,

                ...variables

            }

        })

    });


    if (!response.ok) {

        throw new Error(
            "AniList API Error: " + response.status
        );

    }


    const result = await response.json();


    if (result.errors) {

        throw new Error(
            result.errors[0].message
        );

    }


    const data = result.data.Page;


    cache.set(cacheKey, {

        time: Date.now(),

        data

    });


    return data;

}


/* =========================================
   GET TRENDING DONGHUA
========================================= */

async function getTrending(page = 1) {

    const result = await requestAPI({

        page,

        perPage: 20,

        sort: ["TRENDING_DESC"]

    });

    return result.media;

}


/* =========================================
   GET POPULAR DONGHUA
========================================= */

async function getPopular(page = 1) {

    const result = await requestAPI({

        page,

        perPage: 20,

        sort: ["POPULARITY_DESC"]

    });

    return result.media;

}


/* =========================================
   GET ONGOING DONGHUA
========================================= */

async function getOngoing(page = 1) {

    const result = await requestAPI({

        page,

        perPage: 20,

        sort: ["POPULARITY_DESC"],

        status: "RELEASING"

    });

    return result.media;

}


/* =========================================
   GET COMPLETED DONGHUA
========================================= */

async function getCompleted(page = 1) {

    const result = await requestAPI({

        page,

        perPage: 20,

        sort: ["POPULARITY_DESC"],

        status: "FINISHED"

    });

    return result.media;

}


/* =========================================
   GET LATEST DONGHUA
========================================= */

async function getLatest(page = 1) {

    const result = await requestAPI({

        page,

        perPage: 20,

        sort: ["START_DATE_DESC"]

    });

    return result.media;

}


/* =========================================
   SEARCH DONGHUA
========================================= */

async function searchDonghua(keyword, page = 1) {

    if (!keyword || !keyword.trim()) {

        return [];

    }

    const result = await requestAPI({

        page,

        perPage: 20,

        search: keyword.trim(),

        sort: ["SEARCH_MATCH"]

    });

    return result.media;

}


/* =========================================
   GET ANIME DETAILS
========================================= */

async function getAnimeDetails(id) {

    const response = await fetch(API_URL, {

        method: "POST",

        headers: {

            "Content-Type": "application/json",

            "Accept": "application/json"

        },

        body: JSON.stringify({

            query: `

            query ($id: Int) {

                Media(
                    id: $id,
                    type: ANIME,
                    countryOfOrigin: "CN",
                    isAdult: false
                ) {

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
                    }

                    bannerImage

                    episodes

                    status

                    genres

                    averageScore

                    format

                    season

                    seasonYear

                    studios(isMain: true) {
                        nodes {
                            name
                        }
                    }

                }

            }

            `,

            variables: {

                id: Number(id)

            }

        })

    });


    if (!response.ok) {

        throw new Error("Unable to load anime.");

    }


    const result = await response.json();

    const anime = result.data?.Media;


    if (!anime) {

        return null;

    }


    return anime;

}


/* =========================================
   CREATE ANIME CARD
========================================= */

function createCard(anime) {

    const card = document.createElement("div");

    card.className = "card donghua-card";

    const title =

        anime.title.english ||

        anime.title.romaji ||

        anime.title.native ||

        "Unknown Donghua";


    const image =

        anime.coverImage.extraLarge ||

        anime.coverImage.large;


    const status =

        anime.status === "RELEASING"

        ? "ONGOING"

        : anime.status === "FINISHED"

        ? "COMPLETED"

        : anime.status;


    card.innerHTML = `

        <div class="relative">

            <img
                src="${escapeAttribute(image)}"
                alt="${escapeAttribute(title)}"
                loading="lazy"
                style="width:100%;height:215px;object-fit:cover;border-radius:10px;"
            >

            <span class="badge absolute top-2 left-2">

                ${escapeHTML(status)}

            </span>

        </div>


        <h3 class="text-sm font-bold mt-2">

            ${escapeHTML(title)}

        </h3>


        <p class="text-xs text-gray-400 mt-1">

            ${anime.seasonYear || "Unknown Year"}

            ·

            ${anime.episodes || "?"} Episodes

        </p>

    `;


    card.addEventListener("click", () => {

        window.location.href =

            "anime.html?id=" + anime.id;

    });


    return card;

}


/* =========================================
   SECURITY HELPERS
========================================= */

function escapeHTML(value) {

    return String(value ?? "").replace(

        /[&<>"']/g,

        char => ({

            "&": "&amp;",

            "<": "&lt;",

            ">": "&gt;",

            '"': "&quot;",

            "'": "&#39;"

        })[char]

    );

}


function escapeAttribute(value) {

    return escapeHTML(value);

}


/* =========================================
   RENDER ANIME LIST
========================================= */

function renderList(containerId, animeList) {

    const container =

        document.getElementById(containerId);


    if (!container) {

        console.warn(
            "Container not found:",
            containerId
        );

        return;

    }


    container.innerHTML = "";


    if (!animeList.length) {

        container.textContent =
            "No Donghua found.";

        return;

    }


    animeList.forEach(anime => {

        container.appendChild(
            createCard(anime)
        );

    });

}


/* =========================================
   AUTOMATIC HOMEPAGE DISCOVERY
========================================= */

async function loadDiscovery() {

    const sections = [

        {

            id: "trending-list",

            fetch: getTrending

        },

        {

            id: "ongoing-list",

            fetch: getOngoing

        },

        {

            id: "completed-list",

            fetch: getCompleted

        },

        {

            id: "latest-list",

            fetch: getLatest

        }

    ];


    for (const section of sections) {

        const container =

            document.getElementById(section.id);


        if (!container) continue;


        try {

            const anime = await section.fetch();

            renderList(section.id, anime);

        }

        catch(error) {

            console.error(error);

            container.textContent =
                "Unable to load Donghua.";

        }

    }

}


/* =========================================
   GLOBAL API
========================================= */

window.DonghuaAPI = {

    getTrending,

    getPopular,

    getOngoing,

    getCompleted,

    getLatest,

    searchDonghua,

    getAnimeDetails,

    createCard,

    renderList,

    loadDiscovery

};


/* =========================================
   AUTO INITIALIZATION
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    if (document.getElementById("trending-list")) {

        loadDiscovery();

    }

});


})();
