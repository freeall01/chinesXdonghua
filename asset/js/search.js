/* =========================================
   chinesXdonghua
   PREMIUM SEARCH ENGINE
========================================= */

(function () {

"use strict";

const API = "https://graphql.anilist.co";

let searchTimer = null;
let currentPage = 1;
let currentQuery = "";
let isLoading = false;


/* =========================================
   DOM ELEMENTS
========================================= */

const input =
document.getElementById("search-input");

const results =
document.getElementById("search-results");

const suggestions =
document.getElementById("search-suggestions");

const searchButton =
document.getElementById("search-btn");


/* =========================================
   GRAPHQL SEARCH QUERY
========================================= */

const SEARCH_QUERY = `

query (
    $search: String,
    $page: Int
) {

    Page(
        page: $page,
        perPage: 20
    ) {

        pageInfo {
            currentPage
            hasNextPage
            total
        }

        media(
            search: $search,
            type: ANIME,
            countryOfOrigin: "CN",
            isAdult: false,
            sort: SEARCH_MATCH
        ) {

            id

            title {
                english
                romaji
                native
            }

            coverImage {
                large
                extraLarge
            }

            episodes

            status

            seasonYear

            averageScore

            format

        }

    }

}

`;


/* =========================================
   API REQUEST
========================================= */

async function fetchResults(query, page = 1) {

    const response = await fetch(API, {

        method: "POST",

        headers: {

            "Content-Type": "application/json",

            "Accept": "application/json"

        },

        body: JSON.stringify({

            query: SEARCH_QUERY,

            variables: {

                search: query,

                page: page

            }

        })

    });


    if (!response.ok) {

        throw new Error("Search API unavailable.");

    }


    const data = await response.json();


    if (data.errors) {

        throw new Error(data.errors[0].message);

    }


    return data.data.Page;

}


/* =========================================
   ESCAPE HTML
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


/* =========================================
   SEARCH ANIME
========================================= */

async function searchAnime(query, page = 1) {

    if (!query || !query.trim()) {

        showMessage("Enter a Donghua name to search.");

        return;

    }


    if (isLoading) return;

    isLoading = true;

    currentQuery = query.trim();

    currentPage = page;


    if (results && page === 1) {

        results.innerHTML = `

        <div class="text-center py-12">

            <div class="text-4xl animate-pulse">
                🔍
            </div>

            <p class="text-gray-400 mt-4">
                Searching Chinese Donghua...
            </p>

        </div>

        `;

    }


    try {

        const response = await fetchResults(
            currentQuery,
            page
        );


        const animeList = response.media;


        if (page === 1 && animeList.length === 0) {

            showMessage("No Chinese Donghua found.");

            return;

        }


        displayResults(animeList, page);


        const moreButton =
        document.getElementById("load-more");


        if (moreButton) {

            moreButton.style.display =
            response.pageInfo.hasNextPage
            ? "block"
            : "none";

        }

    }

    catch(error) {

        console.error(error);

        showMessage(
            "Unable to search. Please try again."
        );

    }

    finally {

        isLoading = false;

    }

}


/* =========================================
   DISPLAY RESULTS
========================================= */

function displayResults(animeList, page) {

    if (!results) return;


    if (page === 1) {

        results.innerHTML = "";

    }


    if (!animeList.length && page === 1) {

        showMessage("No results found.");

        return;

    }


    animeList.forEach(anime => {

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


        const card = document.createElement("article");

        card.className =

        "bg-[#171923] rounded-xl overflow-hidden " +
        "border border-white/10 cursor-pointer " +
        "hover:border-orange-500 transition";


        card.innerHTML = `

        <img

            src="${escapeHTML(image)}"

            alt="${escapeHTML(title)}"

            loading="lazy"

            class="w-full aspect-[3/4] object-cover"

        >

        <div class="p-3">

            <h3 class="font-bold text-sm line-clamp-2">

                ${escapeHTML(title)}

            </h3>


            <div class="flex justify-between mt-3">

                <span class="text-orange-400 text-xs">

                    ${escapeHTML(status)}

                </span>

                <span class="text-gray-400 text-xs">

                    ${anime.seasonYear || "N/A"}

                </span>

            </div>


            <p class="text-gray-500 text-xs mt-2">

                ${anime.episodes || "?"} Episodes

                ·

                ${anime.averageScore
                    ? anime.averageScore / 10 + "/10"
                    : "Not Rated"}

            </p>

        </div>

        `;


        card.addEventListener("click", () => {

            location.href = "anime.html?id=" + anime.id;

        });


        results.appendChild(card);

    });

}


/* =========================================
   NO RESULTS / ERROR MESSAGE
========================================= */

function showMessage(message) {

    if (!results) return;


    results.innerHTML = `

    <div class="text-center py-16">

        <div class="text-5xl mb-4">
            🐉
        </div>

        <h3 class="text-lg font-bold">

            ${escapeHTML(message)}

        </h3>

        <p class="text-gray-500 text-sm mt-2">

            Discover your next favourite Donghua.

        </p>

    </div>

    `;

}


/* =========================================
   LIVE SEARCH
========================================= */

if (input) {

    input.addEventListener("input", () => {

        clearTimeout(searchTimer);

        const query = input.value.trim();


        if (suggestions) {

            suggestions.innerHTML = "";

        }


        if (query.length < 2) {

            return;

        }


        searchTimer = setTimeout(() => {

            searchAnime(query, 1);

        }, 600);

    });


    input.addEventListener("keydown", event => {

        if (event.key === "Enter") {

            clearTimeout(searchTimer);

            searchAnime(input.value, 1);

        }

    });

}


/* =========================================
   SEARCH BUTTON
========================================= */

if (searchButton) {

    searchButton.addEventListener("click", () => {

        if (input) {

            searchAnime(input.value, 1);

        }

    });

}


/* =========================================
   LOAD MORE
========================================= */

function loadMore() {

    if (!isLoading && currentQuery) {

        searchAnime(
            currentQuery,
            currentPage + 1
        );

    }

}


/* =========================================
   GLOBAL API
========================================= */

window.DonghuaSearch = {

    searchAnime,

    loadMore,

    fetchResults

};


/* =========================================
   INITIALIZATION
========================================= */

console.log(
    "chinesXdonghua Search Engine Ready."
);

})();
