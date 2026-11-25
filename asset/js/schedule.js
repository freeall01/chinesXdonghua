/* =====================================
   chinesXdonghua - Schedule System
   Data Source: AniList GraphQL API
===================================== */

const ScheduleAPI = "https://graphql.anilist.co";

const ScheduleQuery = `
query {
    Page(page: 1, perPage: 50) {
        media(
            type: ANIME
            countryOfOrigin: CN
            status: RELEASING
            sort: POPULARITY_DESC
            isAdult: false
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
            nextAiringEpisode {
                airingAt
                timeUntilAiring
                episode
            }
            averageScore
            seasonYear
        }
    }
}
`;


/* =====================================
   FETCH SCHEDULE
===================================== */

async function fetchSchedule() {

    try {

        const response = await fetch(ScheduleAPI, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },

            body: JSON.stringify({
                query: ScheduleQuery
            })

        });

        if (!response.ok) {
            throw new Error("API request failed");
        }

        const result = await response.json();

        return result.data.Page.media || [];

    } catch (error) {

        console.error("Schedule Error:", error);

        return [];

    }

}


/* =====================================
   HELPER FUNCTIONS
===================================== */

function scheduleTitle(anime) {

    return anime.title.english ||
           anime.title.romaji ||
           anime.title.native ||
           "Unknown Donghua";

}


function scheduleDate(timestamp) {

    return new Date(timestamp * 1000);

}


function formatScheduleDate(timestamp) {

    return scheduleDate(timestamp).toLocaleDateString("en-IN", {

        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Tokyo"

    });

}


function formatScheduleTime(timestamp, timezone) {

    return scheduleDate(timestamp).toLocaleTimeString("en-GB", {

        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: timezone

    });

}


function scheduleCountdown(timestamp) {

    const difference = timestamp - Math.floor(Date.now() / 1000);

    if (difference <= 0) {
        return "Release time reached";
    }

    const days = Math.floor(difference / 86400);
    const hours = Math.floor((difference % 86400) / 3600);
    const minutes = Math.floor((difference % 3600) / 60);
    const seconds = difference % 60;

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    }

    return `${hours}h ${minutes}m ${seconds}s`;

}


function scheduleEscape(text) {

    return String(text).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

}


/* =====================================
   CREATE ANIME CARD
===================================== */

function createScheduleCard(anime) {

    const title = scheduleEscape(scheduleTitle(anime));

    const image = anime.coverImage.extraLarge ||
                  anime.coverImage.large;

    const airing = anime.nextAiringEpisode;

    const score = anime.averageScore
        ? (anime.averageScore / 10).toFixed(1)
        : "N/A";

    const date = formatScheduleDate(airing.airingAt);

    const japanTime = formatScheduleTime(
        airing.airingAt,
        "Asia/Tokyo"
    );

    const indiaTime = formatScheduleTime(
        airing.airingAt,
        "Asia/Kolkata"
    );

    const countdown = scheduleCountdown(airing.airingAt);

    return `
        <article class="schedule-card rounded-xl overflow-hidden">

            <a href="anime.html?id=${anime.id}"
                class="block">

                <div class="relative overflow-hidden">

                    <img
                        src="${image}"
                        alt="${title}"
                        class="poster w-full"
                        loading="lazy"
                    >

                    <span class="absolute top-3 left-3 bg-brand text-white text-xs font-bold px-3 py-1 rounded-full">
                        EP ${airing.episode}
                    </span>

                </div>

                <div class="p-4">

                    <h3 class="font-bold text-sm leading-5 line-clamp-2">
                        ${title}
                    </h3>

                    <p class="text-xs text-gray-500 mt-2">
                        ⭐ ${score} / 10
                    </p>

                    <div class="mt-4 space-y-2">

                        <div class="flex justify-between text-xs">
                            <span class="text-gray-400">Date</span>
                            <span>${date}</span>
                        </div>

                        <div class="flex justify-between text-xs">
                            <span class="text-gray-400">🇯🇵 JST</span>
                            <span>${japanTime}</span>
                        </div>

                        <div class="flex justify-between text-xs">
                            <span class="text-gray-400">🇮🇳 IST</span>
                            <span>${indiaTime}</span>
                        </div>

                    </div>

                    <div class="mt-4 bg-brand/10 text-brand text-xs font-bold text-center rounded-lg p-3"
                        data-countdown="${airing.airingAt}">

                        ${countdown}

                    </div>

                </div>

            </a>

        </article>
    `;

}


/* =====================================
   CREATE UPCOMING CARD
===================================== */

function createUpcomingCard(anime) {

    const title = scheduleEscape(scheduleTitle(anime));

    const airing = anime.nextAiringEpisode;

    const image = anime.coverImage.extraLarge ||
                  anime.coverImage.large;

    const date = formatScheduleDate(airing.airingAt);

    const japanTime = formatScheduleTime(
        airing.airingAt,
        "Asia/Tokyo"
    );

    const indiaTime = formatScheduleTime(
        airing.airingAt,
        "Asia/Kolkata"
    );

    return `
        <a href="anime.html?id=${anime.id}"
            class="schedule-card rounded-xl p-4 flex gap-4">

            <img
                src="${image}"
                alt="${title}"
                class="w-24 h-32 object-cover rounded-lg"
                loading="lazy"
            >

            <div class="flex-1 min-w-0">

                <h3 class="font-bold leading-5 line-clamp-2">
                    ${title}
                </h3>

                <p class="text-brand text-sm font-bold mt-3">
                    Episode ${airing.episode}
                </p>

                <p class="text-gray-400 text-xs mt-2">
                    ${date}
                </p>

                <p class="text-gray-300 text-xs mt-2">
                    🇯🇵 ${japanTime} JST
                </p>

                <p class="text-gray-300 text-xs mt-1">
                    🇮🇳 ${indiaTime} IST
                </p>

                <p class="text-brand text-xs mt-3 font-bold"
                    data-countdown="${airing.airingAt}">

                    ${scheduleCountdown(airing.airingAt)}

                </p>

            </div>

        </a>
    `;

}


/* =====================================
   RENDER TODAY RELEASES
===================================== */

function renderTodayReleases(animeList) {

    const container = document.getElementById("today-releases");

    if (!container) return;

    const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Tokyo"
    });

    const todayAnime = animeList.filter(anime => {

        if (!anime.nextAiringEpisode) return false;

        const releaseDate = new Date(
            anime.nextAiringEpisode.airingAt * 1000
        ).toLocaleDateString("en-CA", {
            timeZone: "Asia/Tokyo"
        });

        return releaseDate === today;

    });

    if (!todayAnime.length) {

        container.innerHTML = `
            <div class="col-span-full text-center py-12">

                <p class="text-4xl mb-3">📅</p>

                <h3 class="font-bold text-lg">
                    No Releases Found Today
                </h3>

                <p class="text-gray-500 text-sm mt-2">
                    Check the upcoming episodes below.
                </p>

            </div>
        `;

        return;

    }

    container.innerHTML = todayAnime
        .map(createScheduleCard)
        .join("");

}


/* =====================================
   RENDER UPCOMING RELEASES
===================================== */

function renderUpcomingReleases(animeList) {

    const container = document.getElementById("upcoming-releases");

    if (!container) return;

    const now = Math.floor(Date.now() / 1000);

    const upcoming = animeList

        .filter(anime =>
            anime.nextAiringEpisode &&
            anime.nextAiringEpisode.airingAt > now
        )

        .sort((a, b) =>
            a.nextAiringEpisode.airingAt -
            b.nextAiringEpisode.airingAt
        )

        .slice(0, 30);

    if (!upcoming.length) {

        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                No upcoming episodes available.
            </div>
        `;

        return;

    }

    container.innerHTML = upcoming
        .map(createUpcomingCard)
        .join("");

}


/* =====================================
   LIVE COUNTDOWN
===================================== */

function updateScheduleCountdowns() {

    document.querySelectorAll("[data-countdown]").forEach(element => {

        const timestamp = Number(element.dataset.countdown);

        element.textContent = scheduleCountdown(timestamp);

    });

}


/* =====================================
   MAIN SCHEDULE SYSTEM
===================================== */

async function loadSchedule() {

    const todayContainer = document.getElementById("today-releases");

    const upcomingContainer = document.getElementById("upcoming-releases");

    try {

        if (todayContainer) {
            todayContainer.innerHTML = `
                <div class="col-span-full text-center py-10 text-gray-400">
                    Loading releases...
                </div>
            `;
        }

        if (upcomingContainer) {
            upcomingContainer.innerHTML = `
                <div class="col-span-full text-center py-10 text-gray-400">
                    Loading upcoming episodes...
                </div>
            `;
        }

        const animeList = await fetchSchedule();

        renderTodayReleases(animeList);

        renderUpcomingReleases(animeList);

        updateScheduleCountdowns();

    } catch (error) {

        console.error(error);

        if (todayContainer) {
            todayContainer.innerHTML =
                `<p class="col-span-full text-center text-gray-500">Unable to load releases.</p>`;
        }

        if (upcomingContainer) {
            upcomingContainer.innerHTML =
                `<p class="col-span-full text-center text-gray-500">Unable to load upcoming episodes.</p>`;
        }

    }

}


/* =====================================
   GLOBAL OBJECT
===================================== */

window.DonghuaSchedule = {

    load: loadSchedule,

    refresh: loadSchedule,

    updateCountdowns: updateScheduleCountdowns

};


/* =====================================
   AUTO START
===================================== */

document.addEventListener("DOMContentLoaded", () => {

    if (
        document.getElementById("today-releases") ||
        document.getElementById("upcoming-releases")
    ) {

        loadSchedule();

        setInterval(updateScheduleCountdowns, 1000);

    }

});
