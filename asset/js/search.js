/* =====================================
   chinesXdonghua - Search System
===================================== */

(() => {
    "use strict";

    const API_URL = "https://graphql.anilist.co";

    const input = document.getElementById("search-input");
    const resultsContainer = document.getElementById("search-results");
    const suggestionsContainer = document.getElementById("search-suggestions");

    const searchButton = document.getElementById("search-btn");
    const loadMoreButton = document.getElementById("load-more");

    const resultsTitle = document.getElementById("results-title");
    const resultsCount = document.getElementById("results-count");

    let currentSearch = "";
    let currentPage = 1;
    let hasMore = false;
    let isLoading = false;
    let searchTimer = null;

    const PER_PAGE = 20;

    // ---------------------------------
    // GraphQL Query
    // ---------------------------------

    const SEARCH_QUERY = `
        query ($search: String, $page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                pageInfo {
                    hasNextPage
                }

                media(
                    search: $search,
                    type: ANIME,
                    countryOfOrigin: "CN",
                    isAdult: false,
                    sort: POPULARITY_DESC
                ) {
                    id

                    title {
                        english
                        romaji
                        native
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
    // API Search
    // ---------------------------------

    async function searchDonghua(query, page = 1) {
        const response = await fetch(API_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },

            body: JSON.stringify({
                query: SEARCH_QUERY,

                variables: {
                    search: query,
                    page: page,
                    perPage: PER_PAGE
                }
            })
        });

        if (!response.ok) {
            throw new Error("Search request failed.");
        }

        const result = await response.json();

        if (result.errors) {
            throw new Error("Unable to search Donghua.");
        }

        return result.data.Page;
    }

    // ---------------------------------
    // Search Card
    // ---------------------------------

    function createSearchCard(anime) {
        const title = getTitle(anime);

        const image = getImage(anime);

        const status = anime.status
            ? anime.status.replaceAll("_", " ")
            : "UNKNOWN";

        return `
            <article
                class="anime-card search-card"
                data-id="${anime.id}"
                tabindex="0"
                role="link"
            >

                <div class="anime-poster">

                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(title)}"
                        loading="lazy"
                        onerror="this.style.opacity='0'"
                    >

                    <span class="anime-score">
                        ⭐ ${anime.averageScore || "N/A"}
                    </span>

                </div>

                <div class="anime-card-info">

                    <h3>
                        ${escapeHTML(title)}
                    </h3>

                    <p>
                        ${escapeHTML(status)}
                        • ${anime.episodes || "?"} Episodes
                    </p>

                </div>

            </article>
        `;
    }

    // ---------------------------------
    // Render Results
    // ---------------------------------

    function renderResults(animeList, append = false) {
        if (!resultsContainer) return;

        if (!append && animeList.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No Donghua Found</h3>
                    <p>Try another anime name.</p>
                </div>
            `;

            return;
        }

        const html = animeList.map(createSearchCard).join("");

        if (append) {
            resultsContainer.insertAdjacentHTML("beforeend", html);
        } else {
            resultsContainer.innerHTML = html;
        }

        resultsContainer.querySelectorAll(".search-card").forEach(card => {
            if (card.dataset.listenerAdded) return;

            card.dataset.listenerAdded = "true";

            function openDetails() {
                window.location.href =
                    `anime.html?id=${card.dataset.id}`;
            }

            card.addEventListener("click", openDetails);

            card.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openDetails();
                }
            });
        });
    }

    // ---------------------------------
    // Loading
    // ---------------------------------

    function showLoading() {
        if (!resultsContainer) return;

        resultsContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Searching Donghua...</p>
            </div>
        `;
    }

    // ---------------------------------
    // Main Search
    // ---------------------------------

    async function performSearch(query, page = 1) {
        query = query.trim();

        if (!query || isLoading) return;

        if (page === 1) {
            currentSearch = query;
            currentPage = 1;

            showLoading();

            if (resultsTitle) {
                resultsTitle.textContent = `Results for "${query}"`;
            }
        }

        isLoading = true;

        if (loadMoreButton) {
            loadMoreButton.disabled = true;
            loadMoreButton.textContent = "Loading...";
        }

        try {
            const data = await searchDonghua(query, page);

            const animeList = data.media || [];

            renderResults(animeList, page > 1);

            hasMore = data.pageInfo.hasNextPage;

            currentPage = page;

            if (resultsCount) {
                const total = resultsContainer
                    ? resultsContainer.querySelectorAll(".search-card").length
                    : animeList.length;

                resultsCount.textContent = `${total} Donghua found`;
            }

        } catch (error) {
            console.error(error);

            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>Search failed. Please try again.</p>
                        <button
                            class="btn btn-primary"
                            onclick="location.reload()"
                        >
                            Retry
                        </button>
                    </div>
                `;
            }

        } finally {
            isLoading = false;

            if (loadMoreButton) {
                loadMoreButton.disabled = false;
                loadMoreButton.textContent = "Load More";
                loadMoreButton.style.display =
                    hasMore ? "block" : "none";
            }
        }
    }

    // ---------------------------------
    // Suggestions
    // ---------------------------------

    function hideSuggestions() {
        if (!suggestionsContainer) return;

        suggestionsContainer.innerHTML = "";
        suggestionsContainer.classList.remove("active");
    }

    function showSuggestions(query) {
        if (!suggestionsContainer) return;

        const suggestions = [
            query,
            `${query} Season 2`,
            `${query} Donghua`
        ];

        suggestionsContainer.innerHTML = suggestions.map(item => `
            <button
                type="button"
                class="suggestion-item"
                data-search="${escapeHTML(item)}"
            >
                🔍 ${escapeHTML(item)}
            </button>
        `).join("");

        suggestionsContainer.classList.add("active");

        suggestionsContainer.querySelectorAll("[data-search]")
            .forEach(button => {
                button.addEventListener("click", () => {
                    const value = button.dataset.search;

                    input.value = value;

                    hideSuggestions();

                    performSearch(value);
                });
            });
    }

    // ---------------------------------
    // Events
    // ---------------------------------

    searchButton?.addEventListener("click", () => {
        hideSuggestions();

        performSearch(input.value);
    });

    input?.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            hideSuggestions();

            performSearch(input.value);
        }

        if (event.key === "Escape") {
            hideSuggestions();
        }
    });

    input?.addEventListener("input", () => {
        clearTimeout(searchTimer);

        const query = input.value.trim();

        if (query.length < 2) {
            hideSuggestions();
            return;
        }

        searchTimer = setTimeout(() => {
            showSuggestions(query);
        }, 400);
    });

    loadMoreButton?.addEventListener("click", () => {
        if (hasMore && !isLoading) {
            performSearch(currentSearch, currentPage + 1);
        }
    });

    document.addEventListener("click", event => {
        if (
            suggestionsContainer &&
            !suggestionsContainer.contains(event.target) &&
            event.target !== input
        ) {
            hideSuggestions();
        }
    });

    // ---------------------------------
    // URL Search
    // ---------------------------------

    function loadURLSearch() {
        const params = new URLSearchParams(location.search);

        const query = params.get("q");

        if (query && input) {
            input.value = query;
            performSearch(query);
        }
    }

    // ---------------------------------
    // Public API
    // ---------------------------------

    window.DonghuaSearch = {
        searchDonghua,
        performSearch,
        hideSuggestions
    };

    document.addEventListener("DOMContentLoaded", loadURLSearch);

})();
