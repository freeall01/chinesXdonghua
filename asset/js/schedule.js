/* =========================================
   chinesXdonghua
   AUTOMATIC RELEASE SCHEDULE
========================================= */

(function () {

"use strict";

const API = "https://graphql.anilist.co";

const IST = "Asia/Kolkata";
const JST = "Asia/Tokyo";

let scheduleData = [];


/* =========================================
   GRAPHQL QUERY
========================================= */

const QUERY = `

query ($page: Int) {

    Page(page: $page, perPage: 50) {

        media(
            type: ANIME,
            countryOfOrigin: "CN",
            status: RELEASING,
            isAdult: false,
            sort: UPDATED_AT_DESC
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

            nextAiringEpisode {

                airingAt

                timeUntilAiring

                episode

            }

            status

            seasonYear

        }

    }

}

`;


/* =========================================
   FETCH SCHEDULE
========================================= */

async function fetchSchedule(page = 1) {

    const response = await fetch(API, {

        method: "POST",

        headers: {

            "Content-Type": "application/json",

            "Accept": "application/json"

        },

        body: JSON.stringify({

            query: QUERY,

            variables: { page }

        })

    });


    if (!response.ok) {

        throw new Error("Schedule API unavailable.");

    }


    const result = await response.json();


    if (result.errors) {

        throw new Error(result.errors[0].message);

    }


    return result.data.Page.media;

}


/* =========================================
   FETCH ALL ONGOING SCHEDULE
========================================= */

async function loadSchedule() {

    try {

        const anime = await fetchSchedule(1);

        scheduleData = anime.filter(item =>

            item.nextAiringEpisode &&
            item.nextAiringEpisode.airingAt

        );

        scheduleData.sort((a, b) =>

            a.nextAiringEpisode.airingAt -
            b.nextAiringEpisode.airingAt

        );

        return scheduleData;

    }

    catch(error) {

        console.error(error);

        return [];

    }

}


/* =========================================
   TIME FORMATTER
========================================= */

function formatTime(timestamp, timezone) {

    return new Intl.DateTimeFormat("en-GB", {

        timeZone: timezone,

        hour: "2-digit",

        minute: "2-digit",

        hour12: false

    }).format(new Date(timestamp * 1000));

}


/* =========================================
   DATE FORMATTER
========================================= */

function formatDate(timestamp, timezone) {

    return new Intl.DateTimeFormat("en-GB", {

        timeZone: timezone,

        day: "2-digit",

        month: "short",

        year: "numeric"

    }).format(new Date(timestamp * 1000));

}


/* =========================================
   COUNTDOWN
========================================= */

function getCountdown(timestamp) {

    const difference =

        timestamp * 1000 - Date.now();


    if (difference <= 0) {

        return "Release time reached";

    }


    const days = Math.floor(

        difference / 86400000

    );


    const hours = Math.floor(

        difference % 86400000 / 3600000

    );


    const minutes = Math.floor(

        difference % 3600000 / 60000

    );


    if (days > 0) {

        return `${days}d ${hours}h ${minutes}m`;

    }


    if (hours > 0) {

        return `${hours}h ${minutes}m`;

    }


    return `${minutes} minutes`;

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
   CREATE SCHEDULE CARD
========================================= */

function createScheduleCard(anime) {

    const airing = anime.nextAiringEpisode;

    const title =

        anime.title.english ||

        anime.title.romaji ||

        anime.title.native ||

        "Unknown Donghua";


    const jst = formatTime(airing.airingAt, JST);

    const ist = formatTime(airing.airingAt, IST);


    const date = formatDate(

        airing.airingAt,

        IST

    );


    const countdown = getCountdown(

        airing.airingAt

    );


    const card = document.createElement("div");

    card.className =

        "bg-[#171923] border border-white/10 " +
        "rounded-xl overflow-hidden " +
        "flex gap-4 p-3";


    card.innerHTML = `

        <img

            src="${escapeHTML(anime.coverImage.large)}"

            alt="${escapeHTML(title)}"

            loading="lazy"

            class="w-24 h-32 object-cover rounded-lg"

        >


        <div class="flex-1 min-w-0">

            <h3 class="font-bold text-sm">

                ${escapeHTML(title)}

            </h3>


            <p class="text-orange-400 text-sm mt-2">

                Episode ${airing.episode}

            </p>


            <p class="text-gray-400 text-xs mt-2">

                🇯🇵 ${jst} JST

            </p>


            <p class="text-gray-400 text-xs mt-1">

                🇮🇳 ${ist} IST

            </p>


            <p class="text-gray-500 text-xs mt-1">

                ${date}

            </p>


            <p class="text-green-400 text-xs mt-3">

                ⏳ ${countdown}

            </p>

        </div>

    `;


    card.addEventListener("click", () => {

        location.href = "anime.html?id=" + anime.id;

    });


    return card;

}


/* =========================================
   RENDER SCHEDULE
========================================= */

function renderSchedule(containerId, animeList) {

    const container = document.getElementById(containerId);

    if (!container) return;


    container.innerHTML = "";


    if (!animeList.length) {

        container.innerHTML = `

            <p class="text-gray-500 py-8">

                No upcoming releases found.

            </p>

        `;

        return;

    }


    animeList.forEach(anime => {

        container.appendChild(

            createScheduleCard(anime)

        );

    });

}


/* =========================================
   FILTER TODAY'S RELEASES
========================================= */

function getTodayReleases() {

    const today = new Intl.DateTimeFormat(

        "en-CA",

        { timeZone: IST }

    ).format(new Date());


    return scheduleData.filter(anime => {

        const releaseDate = new Intl.DateTimeFormat(

            "en-CA",

            { timeZone: IST }

        ).format(

            new Date(
                anime.nextAiringEpisode.airingAt * 1000
            )

        );


        return releaseDate === today;

    });

}


/* =========================================
   LOAD TODAY
========================================= */

async function loadToday() {

    const anime = await loadSchedule();

    renderSchedule(

        "today-releases",

        getTodayReleases()

    );

}


/* =========================================
   LOAD UPCOMING
========================================= */

async function loadUpcoming() {

    const anime = await loadSchedule();

    renderSchedule(

        "upcoming-releases",

        anime.filter(item =>

            item.nextAiringEpisode.airingAt * 1000 >
            Date.now()

        )

    );

}


/* =========================================
   UPDATE COUNTDOWN
========================================= */

function updateCountdowns() {

    const cards = document.querySelectorAll(

        "[data-countdown]"

    );


    cards.forEach(card => {

        const timestamp = Number(

            card.dataset.countdown

        );


        card.textContent = getCountdown(timestamp);

    });

}


/* =========================================
   GLOBAL API
========================================= */

window.DonghuaSchedule = {

    fetchSchedule,

    loadSchedule,

    loadToday,

    loadUpcoming,

    getTodayReleases,

    formatTime,

    formatDate,

    getCountdown,

    renderSchedule,

    updateCountdowns

};


/* =========================================
   AUTO INITIALIZATION
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    if (document.getElementById("today-releases")) {

        loadToday();

    }


    if (document.getElementById("upcoming-releases")) {

        loadUpcoming();

    }

});


/* UPDATE COUNTDOWN EVERY MINUTE */

setInterval(updateCountdowns, 60000);


console.log("Donghua Schedule System Ready.");

})();
