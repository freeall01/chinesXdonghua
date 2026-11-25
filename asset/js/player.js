/* =====================================
   chinesXdonghua
   Advanced Player System
===================================== */

(function () {

    "use strict";

    const video = document.getElementById("video");

    if (!video) return;


    /* =====================================
       PLAYER STATE
    ===================================== */

    const state = {

        sources: [],

        currentSource: null,

        currentServer: "auto",

        currentEpisode: 1,

        isLoading: false,

        isPlaying: false,

        lastPosition: 0

    };


    /* =====================================
       ELEMENTS
    ===================================== */

    const statusElement =
        document.getElementById("server-status");

    const messageElement =
        document.getElementById("player-message");


    /* =====================================
       STATUS MESSAGE
    ===================================== */

    function setStatus(message) {

        if (statusElement) {
            statusElement.textContent = message;
        }

    }


    function showMessage(message) {

        if (!messageElement) return;

        messageElement.classList.remove("hidden");

        messageElement.innerHTML = `
            <div class="text-center">
                <p class="text-2xl mb-3">▶</p>
                <p class="text-sm text-gray-300">
                    ${escapeHTML(message)}
                </p>
            </div>
        `;

    }


    function escapeHTML(value) {

        return String(value).replace(/[&<>"']/g, char => ({

            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"

        })[char]);

    }


    /* =====================================
       REGISTER AUTHORIZED SOURCES
    ===================================== */

    function setSources(sources) {

        if (!Array.isArray(sources)) {

            console.error("Sources must be an array");

            return false;

        }

        state.sources = sources.filter(source => {

            return source &&
                   source.authorized === true &&
                   typeof source.url === "string" &&
                   source.url.trim() !== "" &&
                   ["auto", "official", "backup"].includes(source.server);

        });

        state.currentSource = null;

        if (!state.sources.length) {

            setStatus("No authorized video source available.");

            showMessage("No playable video source is currently available.");

            return false;

        }

        return true;

    }


    /* =====================================
       SOURCE VALIDATION
    ===================================== */

    function isValidSource(source) {

        if (!source || source.authorized !== true) {
            return false;
        }

        try {

            const url = new URL(source.url);

            return url.protocol === "https:" ||
                   url.protocol === "http:";

        } catch (error) {

            return false;

        }

    }


    /* =====================================
       SELECT SERVER
    ===================================== */

    function selectServer(server) {

        const buttons = document.querySelectorAll("[data-server]");

        buttons.forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.server === server
            );

        });

        state.currentServer = server;

        if (server === "auto") {

            playAuto();

            return;

        }

        const source = state.sources.find(item => {

            return item.server === server &&
                   isValidSource(item);

        });

        if (!source) {

            setStatus("This server has no available authorized source.");

            showMessage("No source available for this server.");

            return;

        }

        loadSource(source);

    }


    /* =====================================
       AUTO SERVER
    ===================================== */

    function playAuto() {

        const source = state.sources.find(item => {

            return item.server === "official" &&
                   isValidSource(item);

        }) || state.sources.find(item => {

            return item.server === "backup" &&
                   isValidSource(item);

        });

        if (!source) {

            setStatus("No authorized streaming source configured.");

            showMessage("Video playback is currently unavailable.");

            return false;

        }

        loadSource(source);

        return true;

    }


    /* =====================================
       LOAD VIDEO SOURCE
    ===================================== */

    function loadSource(source) {

        if (!isValidSource(source)) {

            setStatus("Invalid or unauthorized video source.");

            return false;

        }

        state.currentSource = source;

        state.isLoading = true;

        setStatus("Connecting to " + source.server + " server...");

        video.pause();

        video.src = source.url;

        video.load();

        return true;

    }


    /* =====================================
       SERVER BUTTON EVENTS
    ===================================== */

    function bindServerButtons() {

        document.querySelectorAll("[data-server]")
            .forEach(button => {

                button.addEventListener("click", () => {

                    selectServer(button.dataset.server);

                });

            });

    }


    /* =====================================
       VIDEO EVENTS
    ===================================== */

    video.addEventListener("loadedmetadata", () => {

        state.isLoading = false;

        state.lastPosition = 0;

        setStatus("Video source connected successfully.");

        showMessage("Press play to start watching.");

    });


    video.addEventListener("canplay", () => {

        state.isLoading = false;

        setStatus("Video ready to play.");

    });


    video.addEventListener("playing", () => {

        state.isPlaying = true;

        if (messageElement) {
            messageElement.classList.add("hidden");
        }

        setStatus("Playing from " + (state.currentSource?.server || "selected") + " server.");

    });


    video.addEventListener("pause", () => {

        state.isPlaying = false;

    });


    video.addEventListener("waiting", () => {

        setStatus("Buffering video...");

    });


    video.addEventListener("error", () => {

        state.isLoading = false;

        setStatus("Video source failed. Select another available server.");

        showMessage("Playback failed. Try another authorized source.");

        console.error("Video error:", video.error);

    });


    /* =====================================
       PLAY / PAUSE
    ===================================== */

    async function togglePlay() {

        if (video.paused) {

            if (!video.src) {

                showMessage("No video source available.");

                return;

            }

            try {

                await video.play();

            } catch (error) {

                setStatus("Unable to start playback.");

            }

        } else {

            video.pause();

        }

    }


    /* =====================================
       SEEK
    ===================================== */

    function seek(seconds) {

        if (!Number.isFinite(video.duration)) return;

        video.currentTime = Math.max(

            0,

            Math.min(
                video.duration,
                video.currentTime + seconds
            )

        );

    }


    /* =====================================
       PLAYBACK SPEED
    ===================================== */

    function setSpeed(speed) {

        const value = Number(speed);

        if (![0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].includes(value)) {
            return;
        }

        video.playbackRate = value;

    }


    /* =====================================
       VOLUME
    ===================================== */

    function setVolume(volume) {

        video.volume = Math.max(
            0,
            Math.min(1, Number(volume))
        );

    }


    function toggleMute() {

        video.muted = !video.muted;

        return video.muted;

    }


    /* =====================================
       FULLSCREEN
    ===================================== */

    async function fullscreen() {

        const container = document.querySelector(".player-container");

        if (!container) return;

        try {

            if (!document.fullscreenElement) {

                await container.requestFullscreen();

            } else {

                await document.exitFullscreen();

            }

        } catch (error) {

            console.error("Fullscreen error:", error);

        }

    }


    /* =====================================
       SAVE WATCH HISTORY
    ===================================== */

    function saveProgress() {

        if (!window.DonghuaApp) return;

        const params = new URLSearchParams(location.search);

        const id = Number(params.get("id"));

        if (!id || !state.currentSource) return;

        const title =
            document.getElementById("anime-title")?.textContent ||
            "Unknown Donghua";

        const image = "";

        DonghuaApp.saveHistory(

            {
                id: id,
                title: title,
                image: image
            },

            state.currentEpisode,

            video.currentTime || 0

        );

    }


    video.addEventListener("timeupdate", () => {

        if (
            video.currentTime > 0 &&
            Math.floor(video.currentTime) % 15 === 0
        ) {

            if (Math.floor(video.currentTime) !== state.lastPosition) {

                state.lastPosition = Math.floor(video.currentTime);

                saveProgress();

            }

        }

    });


    video.addEventListener("ended", () => {

        saveProgress();

        setStatus("Episode finished.");

    });


    /* =====================================
       PLAYER INITIALIZATION
    ===================================== */

    function init() {

        bindServerButtons();

        setStatus("Waiting for an authorized video source.");

        console.log("Donghua Player initialized.");

    }


    /* =====================================
       PUBLIC API
    ===================================== */

    window.DonghuaPlayer = {

        init: init,

        setSources: setSources,

        playAuto: playAuto,

        loadSource: loadSource,

        switchServer: selectServer,

        togglePlay: togglePlay,

        seek: seek,

        setSpeed: setSpeed,

        setVolume: setVolume,

        toggleMute: toggleMute,

        fullscreen: fullscreen,

        saveProgress: saveProgress,

        getState: () => ({ ...state })

    };


    /* =====================================
       START
    ===================================== */

    init();

})();
