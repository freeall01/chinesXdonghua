/* =====================================
   chinesXdonghua
   Homepage Data System
   File: asset/js/home.js
===================================== */

const API = "https://graphql.anilist.co";

const QUERY = `
query ($sort: [MediaSort], $status: MediaStatus) {
    Page(page: 1, perPage: 15) {
        media(
            type: ANIME
            countryOfOrigin: "CN"
            sort: $sort
            status: $status
            isAdult: false
        ) {
            id

            title {
                romaji
                english
            }

            coverImage {
                extraLarge
                large
            }

            episodes
            status
            averageScore
            seasonYear
            format
        }
    }
}
`;

// Fetch Donghua from AniList
async function getDonghua(sort, status = null) {

    try {

        const response = await fetch(API, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },

            body: JSON.stringify({

                query: QUERY,

                variables: {
                    sort: [sort],
                    status: status
                }

            })

        });

        if (!response.ok) {
            throw new Error("AniList API Error");
        }

        const data = await response.json();

        return data.data?.Page?.media || [];

    } catch (error) {

        console.error("Donghua loading error:", error);

        return [];

    }

}


// Create Donghua Cards
function createCards(anime) {

    if (!anime || anime.length === 0) {

        return `
            <p class="text-gray-500">
                No Donghua available.
            </p>
        `;

    }

    return anime.map(item => {

        const title =
            item.title.english ||
            item.title.romaji ||
            "Unknown Donghua";

        const image =
            item.coverImage.extraLarge ||
            item.coverImage.large ||
            "";

        const score = item.averageScore
            ? (item.averageScore / 10).toFixed(1)
            : "N/A";

        return `

            <div
                class="card"
                onclick="openAnime(${item.id})"
                role="button"
                tabindex="0"
                onkeydown="if(event.key==='Enter')openAnime(${item.id})"
            >

                <img
                    src="${image}"
                    alt="Donghua Poster"
                    loading="lazy"
                >

                <h3 class="text-sm font-bold mt-2 line-clamp-2">
                    ${escapeTitle(title)}
                </h3>

                <p class="text-xs text-gray-400 mt-1">
                    ${item.seasonYear || "Unknown"}
                    ·
                    ${item.episodes || "?"} Episodes
                </p>

                <p class="text-xs text-orange-400 mt-1">
                    ⭐ ${score}
                </p>

            </div>

        `;

    }).join("");

}


// Escape anime title
function escapeTitle(text) {

    const element = document.createElement("span");

    element.textContent = text;

    return element.innerHTML;

}


// Open Anime Details
function openAnime(id) {

    window.location.href = "anime.html?id=" + id;

}


// Load Homepage Sections
async function loadHomepage() {

    const sections = [
        {
            id: "trending-list",
            sort: "TRENDING_DESC",
            status: null
        },

        {
            id: "ongoing-list",
            sort: "POPULARITY_DESC",
            status: "RELEASING"
        },

        {
            id: "completed-list",
            sort: "POPULARITY_DESC",
            status: "FINISHED"
        },

        {
            id: "latest-list",
            sort: "START_DATE_DESC",
            status: null
        }
    ];

    for (const section of sections) {

        const container =
            document.getElementById(section.id);

        if (!container) continue;

        const anime = await getDonghua(
            section.sort,
            section.status
        );

        container.innerHTML = createCards(anime);

    }

}


// Search Page
function searchAnime() {

    const name = prompt("Enter Donghua name:");

    if (name && name.trim()) {

        window.location.href =
            "search.html?q=" +
            encodeURIComponent(name.trim());

    }

}


// Start Homepage
document.addEventListener("DOMContentLoaded", () => {

    loadHomepage();

});
