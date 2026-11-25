/* =====================================
   chinesXdonghua - Anime Details
===================================== */

(() => {
    "use strict";

    const API_URL = "https://graphql.anilist.co";

    const QUERY = `
        query ($id: Int) {
            Media(id: $id, type: ANIME) {
                id

                title {
                    romaji
                    english
                    native
                }

                description(asHtml: false)

                coverImage {
                    extraLarge
                    large
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

                studios(isMain: true) {
                    nodes {
                        name
                    }
                }

                nextAiringEpisode {
                    episode
                    airingAt
                    timeUntilAiring
                }
            }
        }
    `;

    function getAnimeId() {
        const params = new URLSearchParams(window.location.search);
        return Number(params.get("id"));
    }

    function getTitle(anime) {
        if (!anime || !anime.title) {
            return "Unknown Donghua";
        }

        return anime.title.english ||
               anime.title.romaji ||
               anime.title.native ||
               "Unknown Donghua";
    }

    function getImage(anime) {
        return anime.coverImage?.extraLarge ||
               anime.coverImage?.large ||
               "";
    }

    async function getAnimeDetails(id) {
        if (!id || !Number.isInteger(Number(id))) {
            throw new Error("Invalid Donghua ID.");
        }

        const response = await fetch(API_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },

            body: JSON.stringify({
                query: QUERY,
                variables: {
                    id: Number(id)
                }
            })
        });

        if (!response.ok) {
            throw new Error("AniList API request failed.");
        }

        const result = await response.json();

        if (result.errors) {
            throw new Error("Unable to load Donghua details.");
        }

        const anime = result.data?.Media;

        if (!anime) {
            throw new Error("Donghua not found.");
        }

        if (anime.countryOfOrigin !== "CN") {
            throw new Error("This website only supports Chinese Donghua.");
        }

        return anime;
    }

    function renderAnimeDetails(anime) {
        const container = document.getElementById("anime-details");

        if (!container) return;

        const title = getTitle(anime);
        const image = getImage(anime);

        const description = anime.description
            ? anime.description.replace(/<[^>]*>/g, " ")
            : "No description available.";

        const studios = anime.studios?.nodes
            ?.map(studio => studio.name)
            .join(", ") || "Unknown";

        const genres = anime.genres || [];

        const status = (anime.status || "UNKNOWN")
            .replaceAll("_", " ");

        const score = anime.averageScore
            ? `${anime.averageScore}%`
            : "N/A";

        const episodeCount = anime.episodes || "Unknown";

        container.innerHTML = `
            <div class="anime-detail-layout">

                <div class="anime-detail-poster">
                    <img
                        src="${DonghuaApp.escapeHTML(image)}"
                        alt="${DonghuaApp.escapeHTML(title)}"
                    >
                </div>

                <div class="anime-detail-content">

                    <span class="badge">
                        CHINESE DONGHUA
                    </span>

                    <h1>
                        ${DonghuaApp.escapeHTML(title)}
                    </h1>

                    <div class="anime-detail-meta">
                        <span>${DonghuaApp.escapeHTML(status)}</span>
                        <span>⭐ ${score}</span>
                        <span>${episodeCount} Episodes</span>
                        <span>${anime.seasonYear || "Unknown"}</span>
                    </div>

                    <p class="anime-description">
                        ${DonghuaApp.escapeHTML(description)}
                    </p>

                    <div class="anime-detail-info">
                        <p>
                            <strong>Format:</strong>
                            ${DonghuaApp.escapeHTML(anime.format || "Unknown")}
                        </p>

                        <p>
                            <strong>Studio:</strong>
                            ${DonghuaApp.escapeHTML(studios)}
                        </p>

                        <p>
                            <strong>Duration:</strong>
                            ${anime.duration || "Unknown"} minutes
                        </p>

                        <p>
                            <strong>Popularity:</strong>
                            ${anime.popularity || "Unknown"}
                        </p>
                    </div>

                    <div class="anime-genres">
                        ${genres.map(genre => `
                            <span class="genre-tag">
                                ${DonghuaApp.escapeHTML(genre)}
                            </span>
                        `).join("")}
                    </div>

                    <div class="anime-detail-buttons">

                        <button
                            class="btn btn-primary"
                            id="watch-now-button"
                        >
                            ▶ Watch Now
                        </button>

                        <button
                            class="btn btn-secondary"
                            id="add-list-button"
                        >
                            + My List
                        </button>

                    </div>

                </div>

            </div>
        `;

        const watchButton = document.getElementById("watch-now-button");

        watchButton?.addEventListener("click", () => {
            window.location.href = `watch.html?id=${anime.id}&episode=1`;
        });

        const listButton = document.getElementById("add-list-button");

        function updateListButton() {
            const saved = DonghuaApp.isInList(anime.id);

            listButton.textContent = saved
                ? "✓ Added to My List"
                : "+ My List";
        }

        listButton?.addEventListener("click", () => {
            if (DonghuaApp.isInList(anime.id)) {
                DonghuaApp.removeFromList(anime.id);
            } else {
                DonghuaApp.addToList({
                    id: anime.id,
                    title: title,
                    image: image
                });
            }

            updateListButton();
        });

        updateListButton();
    }

    async function loadAnimePage() {
        const container = document.getElementById("anime-details");

        if (!container) return;

        const id = getAnimeId();

        if (!id) {
            container.innerHTML = `
                <div class="empty-state">
                    <h2>Donghua Not Found</h2>
                    <p>Please select a Donghua from the homepage.</p>
                </div>
            `;
            return;
        }

        try {
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Loading Donghua details...</p>
                </div>
            `;

            const anime = await getAnimeDetails(id);

            renderAnimeDetails(anime);

        } catch (error) {
            console.error(error);

            container.innerHTML = `
                <div class="empty-state">
                    <h2>Unable to Load Donghua</h2>
                    <p>${DonghuaApp.escapeHTML(error.message)}</p>
                    <button
                        class="btn btn-primary"
                        onclick="location.reload()"
                    >
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    // Public API
    window.DonghuaAnime = {
        getAnimeDetails,
        getDetails: getAnimeDetails,
        renderAnimeDetails,
        loadAnimePage,
        getTitle,
        getImage
    };

    document.addEventListener("DOMContentLoaded", loadAnimePage);

})();
