/* =====================================
   chinesXdonghua - Release Schedule
===================================== */

(() => {
    "use strict";

    const API_URL = "https://graphql.anilist.co";

    const QUERY = `
        query ($page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                media(
                    type: ANIME,
                    countryOfOrigin: "CN",
                    isAdult: false,
                    status: RELEASING,
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
                    nextAiringEpisode {
                        episode
                        airingAt
                        timeUntilAiring
                    }
                }
            }
        }
    `;

    let todayReleases = [];
    let upcomingReleases = [];

    // ---------------------------------
    // Time Helpers
    // ---------------------------------

    function getJapanDate() {
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(new Date());
    }

    function getDateInJapan(timestamp) {
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(new Date(timestamp * 1000));
    }

    function formatTime(timestamp, timezone) {
        return new Intl.DateTimeFormat("en-IN", {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }).format(new Date(timestamp * 1000));
    }

    function formatDate(timestamp) {
        return new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Tokyo",
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(new Date(timestamp * 1000));
    }

    function getCountdown(timestamp) {
        const difference = timestamp * 1000 - Date.now();

        if (difference <= 0) {
            return "Released";
        }

        const days = Math.floor(difference / 86400000);

        const hours = Math.floor(
            (difference % 86400000) / 3600000
        );

        const minutes = Math.floor(
            (difference % 3600000) / 60000
        );

        const seconds = Math.floor(
            (difference % 60000) / 1000
        );

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        }

        return `${hours}h ${minutes}m ${seconds}s`;
    }

    // ---------------------------------
    // Title and Image
    // ---------------------------------

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

    function escapeHTML(value) {
        return window.DonghuaApp?.escapeHTML
            ? window.DonghuaApp.escapeHTML(value)
            : String(value ?? "").replace(/[&<>"']/g, char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[char]);
    }

    // ---------------------------------
    // API
    // ---------------------------------

    async function fetchSchedule() {
        const response = await fetch(API_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },

            body: JSON.stringify({
                query: QUERY,

                variables: {
                    page: 1,
                    perPage: 50
                }
            })
        });

        if (!response.ok) {
            throw new Error("Schedule API request failed.");
        }

        const result = await response.json();

        if (result.errors) {
            throw new Error("Unable to load release schedule.");
        }

        return result.data?.Page?.media || [];
    }

    // ---------------------------------
    // Separate Releases
    // ---------------------------------

    function organizeReleases(animeList) {
        const japanToday = getJapanDate();

        todayReleases = [];
        upcomingReleases = [];

        animeList.forEach(anime => {
            const airing = anime.nextAiringEpisode;

            if (!airing?.airingAt) return;

            const releaseDate = getDateInJapan(airing.airingAt);

            if (releaseDate === japanToday) {
                todayReleases.push(anime);
            } else if (airing.airingAt * 1000 > Date.now()) {
                upcomingReleases.push(anime);
            }
        });

        todayReleases.sort((a, b) =>
            a.nextAiringEpisode.airingAt -
            b.nextAiringEpisode.airingAt
        );

        upcomingReleases.sort((a, b) =>
            a.nextAiringEpisode.airingAt -
            b.nextAiringEpisode.airingAt
        );
    }

    // ---------------------------------
    // Release Card
    // ---------------------------------

    function createReleaseCard(anime) {
        const airing = anime.nextAiringEpisode;

        const title = getTitle(anime);
        const image = getImage(anime);

        const timestamp = airing.airingAt;

        const japanTime = formatTime(timestamp, "Asia/Tokyo");
        const indiaTime = formatTime(timestamp, "Asia/Kolkata");

        const date = formatDate(timestamp);

        const countdown = getCountdown(timestamp);

        return `
            <article class="anime-card schedule-card">

                <div class="anime-poster">

                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(title)}"
                        loading="lazy"
                        onerror="this.style.opacity='0'"
                    >

                    <span class="anime-badge">
                        EP ${airing.episode}
                    </span>

                </div>

                <div class="anime-card-info">

                    <h3>
                        ${escapeHTML(title)}
                    </h3>

                    <p class="release-date">
                        ${escapeHTML(date)}
                    </p>

                    <p>
                        🇯🇵 ${escapeHTML(japanTime)} JST
                    </p>

                    <p>
                        🇮🇳 ${escapeHTML(indiaTime)} IST
                    </p>

                    <div
                        class="release-countdown"
                        data-airing="${timestamp}"
                    >
                        ${escapeHTML(countdown)}
                    </div>

                    <button
                        class="btn btn-secondary schedule-details"
                        data-id="${anime.id}"
                    >
                        View Details
                    </button>

                </div>

            </article>
        `;
    }

    // ---------------------------------
    // Render Schedule
    // ---------------------------------

    function renderReleases(containerId, animeList) {
        const container = document.getElementById(containerId);

        if (!container) return;

        if (!animeList.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Releases Found</h3>
                    <p>No scheduled episodes were found for this period.</p>
                </div>
            `;

            return;
        }

        container.innerHTML = animeList
            .map(createReleaseCard)
            .join("");

        container.querySelectorAll(".schedule-details")
            .forEach(button => {
                button.addEventListener("click", () => {
                    window.location.href =
                        `anime.html?id=${button.dataset.id}`;
                });
            });
    }

    // ---------------------------------
    // Update Countdown
    // ---------------------------------

    function updateCountdowns() {
        document.querySelectorAll("[data-airing]")
            .forEach(element => {
                const timestamp = Number(element.dataset.airing);

                element.textContent = getCountdown(timestamp);
            });
    }

    // ---------------------------------
    // Live Clocks
    // ---------------------------------

    function updateClocks() {
        const now = new Date();

        const japanClock = document.getElementById("japan-clock");
        const indiaClock = document.getElementById("india-clock");

        const japanDate = document.getElementById("japan-date");
        const indiaDate = document.getElementById("india-date");

        if (japanClock) {
            japanClock.textContent =
                new Intl.DateTimeFormat("en-IN", {
                    timeZone: "Asia/Tokyo",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true
                }).format(now);
        }

        if (indiaClock) {
            indiaClock.textContent =
                new Intl.DateTimeFormat("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true
                }).format(now);
        }

        if (japanDate) {
            japanDate.textContent =
                new Intl.DateTimeFormat("en-IN", {
                    timeZone: "Asia/Tokyo",
                    dateStyle: "full"
                }).format(now);
        }

        if (indiaDate) {
            indiaDate.textContent =
                new Intl.DateTimeFormat("en-IN", {
                    timeZone: "Asia/Kolkata",
                    dateStyle: "full"
                }).format(now);
        }
    }

    // ---------------------------------
    // Load Schedule
    // ---------------------------------

    async function loadSchedule() {
        const todayContainer =
            document.getElementById("today-releases");

        const upcomingContainer =
            document.getElementById("upcoming-releases");

        if (todayContainer) {
            todayContainer.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Loading today's releases...</p>
                </div>
            `;
        }

        if (upcomingContainer) {
            upcomingContainer.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Loading upcoming episodes...</p>
                </div>
            `;
        }

        try {
            const animeList = await fetchSchedule();

            organizeReleases(animeList);

            renderReleases(
                "today-releases",
                todayReleases
            );

            renderReleases(
                "upcoming-releases",
                upcomingReleases
            );

            updateCountdowns();

        } catch (error) {
            console.error(error);

            [todayContainer, upcomingContainer].forEach(container => {
                if (container) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <p>Unable to load schedule.</p>
                            <button
                                class="btn btn-primary"
                                onclick="location.reload()"
                            >
                                Try Again
                            </button>
                        </div>
                    `;
                }
            });
        }
    }

    // ---------------------------------
    // Tabs
    // ---------------------------------

    function setupTabs() {
        const tabs = document.querySelectorAll("[data-tab]");

        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                const target = tab.dataset.tab;

                tabs.forEach(item => {
                    item.classList.remove("active");
                });

                tab.classList.add("active");

                document.querySelectorAll(".schedule-section")
                    .forEach(section => {
                        section.style.display =
                            section.id === target ? "block" : "none";
                    });
            });
        });
    }

    // ---------------------------------
    // Initialize
    // ---------------------------------

    function init() {
        updateClocks();

        setInterval(updateClocks, 1000);

        setInterval(updateCountdowns, 1000);

        setupTabs();

        if (document.getElementById("today-releases")) {
            loadSchedule();

            // Refresh schedule every 5 minutes.
            setInterval(loadSchedule, 300000);
        }
    }

    // ---------------------------------
    // Public API
    // ---------------------------------

    window.DonghuaSchedule = {
        loadSchedule,
        fetchSchedule,
        getCountdown,
        updateClocks,
        todayReleases: () => todayReleases,
        upcomingReleases: () => upcomingReleases
    };

    document.addEventListener("DOMContentLoaded", init);

})();
