/* =====================================
   chinesXdonghua - Homepage
===================================== */

(() => {
    "use strict";

    const API_URL = "https://graphql.anilist.co";

    const QUERY = `
        query (
            $page: Int,
            $perPage: Int,
            $sort: [MediaSort],
            $status: MediaStatus
        ) {
            Page(
                page: $page,
                perPage: $perPage
            ) {
                media(
                    type: ANIME,
                    countryOfOrigin: "CN",
                    isAdult: false,
                    sort: $sort,
                    status: $status
                ) {
                    id

                    title {
                        romaji
                        english
                        native
                    }

                    coverImage {
                        extraLarge
                        large
                    }

                    bannerImage

                    episodes
                    status
                    averageScore
                    popularity
                    seasonYear
                    format

                    nextAiringEpisode {
                        episode
                        airingAt
                    }
                }
            }
        }
    `;

    // ---------------------------------
    // Helpers
    // ---------------------------------

    function escapeHTML(value) {
        if (window.DonghuaApp?.escapeHTML) {
            return window.DonghuaApp.escapeHTML(value);
        }

        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function getTitle(anime) {
        return anime.title?.english ||
               anime.title?.romaji ||
               anime.title?.native ||
               "Unknown Donghua";
    }

    function getImage(anime) {
        return anime.coverImage?.extraLarge ||
               anime.coverImage?.large ||
               "";
    }

    // ---------------------------------
    // API Request
    // ---------------------------------

    async function fetchDonghua(sort, status = null) {
        const variables = {
            page: 1,
            perPage: 20,
            sort: [sort]
        };

        if (status) {
            variables.status = status;
        }

        const response = await fetch(API_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },

            body: JSON.stringify({
                query: QUERY,
                variables
            })
        });

        if (!response.ok) {
            throw new Error("AniList API request failed.");
        }

        const result = await response.json();

        if (result.errors) {
            throw new Error("Unable to fetch Donghua.");
        }

        return result.data?.Page?.media || [];
    }

    // ---------------------------------
    // Loading UI
    // ---------------------------------

    function showLoading(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Discovering Donghua...</p>
            </div>
        `;
    }

    function showError(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <p>Unable to load Donghua.</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    Try Again
                </button>
            </div>
        `;
    }

    // ---------------------------------
    // Donghua Card
    // ---------------------------------

    function createCard(anime) {
        const title = getTitle(anime);
        const image = getImage(anime);

        const score = anime.averageScore
            ? `${anime.averageScore}%`
            : "N/A";

        const episode = anime.nextAiringEpisode
            ? `EP ${anime.nextAiringEpisode.episode}`
            : anime.episodes
                ? `${anime.episodes} Episodes`
                : "Episodes TBA";

        const status = anime.status === "RELEASING"
            ? "ONGOING"
            : anime.status === "FINISHED"
                ? "COMPLETED"
                : "UPCOMING";

        return `
            <article
                class="anime-card"
                data-anime-id="${anime.id}"
                tabindex="0"
                role="link"
                aria-label="View ${escapeHTML(title)}"
            >

                <div class="anime-poster">

                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(title)}"
                        loading="lazy"
                        onerror="this.style.opacity='0'"
                    >

                    <span class="anime-badge">
                        ${status}
                    </span>

                    <span class="anime-score">
                        ⭐ ${score}
                    </span>

                </div>

                <div class="anime-card-info">

                    <h3>
                        ${escapeHTML(title)}
                    </h3>

                    <p>
                        ${escapeHTML(episode)}
                    </p>

                </div>

            </article>
        `;
    }

    // ---------------------------------
    // Render Cards
    // ---------------------------------

    function renderCards(container, animeList) {
        if (!container) return;

        if (!animeList.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No Donghua found.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = animeList
            .map(createCard)
            .join("");

        container.querySelectorAll(".anime-card").forEach(card => {
            function openAnime() {
                const id = card.dataset.animeId;

                window.location.href = `anime.html?id=${id}`;
            }

            card.addEventListener("click", openAnime);

            card.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openAnime();
                }
            });
        });
    }

    // ---------------------------------
    // Load Sections
    // ---------------------------------

    async function loadSection(id, sort, status = null) {
        const container = document.getElementById(id);

        if (!container) return;

        showLoading(container);

        try {
            const animeList = await fetchDonghua(sort, status);

            renderCards(container, animeList);

        } catch (error) {
            console.error(`Error loading ${id}:`, error);

            showError(container);
        }
    }

    // ---------------------------------
    // Homepage
    // ---------------------------------

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

        await Promise.all(
            sections.map(section => {
                return loadSection(
                    section.id,
                    section.sort,
                    section.status
                );
            })
        );
    }

    // ---------------------------------
    // Public API
    // ---------------------------------

    window.DonghuaHome = {
        loadHomepage,
        fetchDonghua,
        createCard,
        renderCards
    };

    document.addEventListener("DOMContentLoaded", () => {
        if (document.getElementById("trending-list")) {
            loadHomepage();
        }
    });

})();
