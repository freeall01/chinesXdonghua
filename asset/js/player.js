/* =====================================
   chinesXdonghua - Video Player
===================================== */

(() => {
    "use strict";

    const video = document.getElementById("video");

    if (!video) return;

    const app = window.DonghuaApp;

    const message = document.getElementById("player-message");
    const status = document.getElementById("server-status");

    const playButton = document.getElementById("play-button");
    const muteButton = document.getElementById("mute-button");
    const speedButton = document.getElementById("speed-button");
    const fullscreenButton = document.getElementById("fullscreen-button");

    const progressContainer = document.getElementById("progress-container");
    const progressBar = document.getElementById("progress-bar");

    const currentTimeElement = document.getElementById("current-time");

    const params = new URLSearchParams(location.search);

    const animeId = Number(params.get("id"));
    let currentEpisode = Number(params.get("episode")) || 1;

    let anime = null;
    let sources = [];
    let currentSource = null;
    let currentServer = "auto";

    let historyTimer = null;
    let lastTap = 0;
    let currentSpeedIndex = 0;

    const speeds = [1, 1.25, 1.5, 1.75, 2];

    // ---------------------------------
    // UI Helpers
    // ---------------------------------

    function showMessage(text) {
        if (!message) return;

        message.textContent = text;
        message.classList.remove("hidden");
    }

    function hideMessage() {
        if (!message) return;

        message.classList.add("hidden");
    }

    function updateStatus(text) {
        if (status) {
            status.textContent = text;
        }
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds)) return "00:00";

        const minutes = Math.floor(seconds / 60);
        const remaining = Math.floor(seconds % 60);

        return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
    }

    // ---------------------------------
    // Playback Controls
    // ---------------------------------

    function togglePlay() {
        if (video.paused) {
            video.play().catch(() => {
                showMessage("Unable to play this video.");
            });
        } else {
            video.pause();
        }
    }

    function updatePlayButton() {
        if (!playButton) return;

        playButton.textContent = video.paused ? "▶" : "Ⅱ";
    }

    function toggleMute() {
        video.muted = !video.muted;

        if (muteButton) {
            muteButton.textContent = video.muted ? "🔇" : "🔊";
        }
    }

    function changeSpeed() {
        currentSpeedIndex++;

        if (currentSpeedIndex >= speeds.length) {
            currentSpeedIndex = 0;
        }

        const speed = speeds[currentSpeedIndex];

        video.playbackRate = speed;

        if (speedButton) {
            speedButton.textContent = `${speed}x`;
        }
    }

    function toggleFullscreen() {
        const container = document.querySelector(".video-container");

        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }

    // ---------------------------------
    // Seek Controls
    // ---------------------------------

    function seek(seconds) {
        if (!Number.isFinite(video.duration)) return;

        video.currentTime = Math.max(
            0,
            Math.min(video.duration, video.currentTime + seconds)
        );
    }

    function updateProgress() {
        if (!progressBar || !Number.isFinite(video.duration)) return;

        const percentage =
            (video.currentTime / video.duration) * 100;

        progressBar.style.width = `${percentage}%`;

        if (currentTimeElement) {
            currentTimeElement.textContent =
                `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
        }
    }

    function seekFromProgress(event) {
        if (!progressContainer || !Number.isFinite(video.duration)) return;

        const rect = progressContainer.getBoundingClientRect();

        const percentage = Math.max(
            0,
            Math.min(1, (event.clientX - rect.left) / rect.width)
        );

        video.currentTime = percentage * video.duration;
    }

    // ---------------------------------
    // Double Tap Seek
    // ---------------------------------

    function setupDoubleTap() {
        const leftZone = document.getElementById("seek-zone-left");
        const rightZone = document.getElementById("seek-zone-right");

        function handleTap(event, direction) {
            const now = Date.now();

            if (now - lastTap < 300) {
                seek(direction * 10);

                const indicator = document.getElementById(
                    direction < 0 ? "seek-left" : "seek-right"
                );

                if (indicator) {
                    indicator.classList.add("show");

                    setTimeout(() => {
                        indicator.classList.remove("show");
                    }, 500);
                }
            }

            lastTap = now;
        }

        leftZone?.addEventListener("touchend", event => {
            handleTap(event, -1);
        });

        rightZone?.addEventListener("touchend", event => {
            handleTap(event, 1);
        });

        leftZone?.addEventListener("dblclick", event => {
            event.preventDefault();
            seek(-10);
        });

        rightZone?.addEventListener("dblclick", event => {
            event.preventDefault();
            seek(10);
        });
    }

    // ---------------------------------
    // Watch History
    // ---------------------------------

    function saveProgress() {
        if (!anime || !app) return;

        app.saveHistory({
            id: anime.id,
            title: anime.title?.english ||
                   anime.title?.romaji ||
                   anime.title?.native ||
                   "Unknown Donghua",
            image: anime.coverImage?.large ||
                   anime.coverImage?.extraLarge ||
                   ""
        }, currentEpisode, video.currentTime || 0);
    }

    function startHistoryTimer() {
        clearInterval(historyTimer);

        historyTimer = setInterval(() => {
            if (!video.paused && !video.ended) {
                saveProgress();
            }
        }, 15000);
    }

    // ---------------------------------
    // Authorized Video Sources
    // ---------------------------------

    function setSources(sourceList) {
        sources = Array.isArray(sourceList)
            ? sourceList.filter(source => {
                return source &&
                    source.authorized === true &&
                    ["official", "backup"].includes(source.server) &&
                    typeof source.url === "string" &&
                    /^https?:\/\//i.test(source.url);
            })
            : [];

        return sources.length;
    }

    function getSources(server) {
        if (server === "auto") {
            return [
                ...sources.filter(source => source.server === "official"),
                ...sources.filter(source => source.server === "backup")
            ];
        }

        return sources.filter(source => source.server === server);
    }

    function loadSource(source) {
        if (!source) return;

        currentSource = source;

        hideMessage();

        updateStatus(`Connecting: ${source.server}`);

        video.src = source.url;
        video.load();

        video.play().catch(() => {
            // User may need to press Play manually.
        });
    }

    function selectServer(server) {
        currentServer = server;

        const availableSources = getSources(server);

        if (!availableSources.length) {
            showMessage("No authorized video source is configured for this server.");
            updateStatus("Source unavailable");
            return;
        }

        loadSource(availableSources[0]);
    }

    function fallbackServer() {
        if (!currentSource) return;

        const failedServer = currentSource.server;

        const backup = sources.find(source => {
            return source.server !== failedServer;
        });

        if (backup) {
            loadSource(backup);
        } else {
            showMessage("Video source unavailable. Please try again later.");
            updateStatus("Playback unavailable");
        }
    }

    // ---------------------------------
    // Server Buttons
    // ---------------------------------

    document.querySelectorAll("[data-server]").forEach(button => {
        button.addEventListener("click", () => {
            const server = button.dataset.server;

            if (!["auto", "official", "backup"].includes(server)) {
                return;
            }

            document.querySelectorAll("[data-server]").forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            selectServer(server);
        });
    });

    // ---------------------------------
    // Video Events
    // ---------------------------------

    video.addEventListener("loadedmetadata", () => {
        hideMessage();
        updateStatus("Video ready");
        updateProgress();
    });

    video.addEventListener("canplay", () => {
        updateStatus("Ready to play");
    });

    video.addEventListener("playing", () => {
        hideMessage();
        updateStatus("Playing");
        updatePlayButton();
    });

    video.addEventListener("pause", () => {
        updatePlayButton();
        saveProgress();
    });

    video.addEventListener("timeupdate", updateProgress);

    video.addEventListener("ended", () => {
        saveProgress();
        updateStatus("Episode completed");
    });

    video.addEventListener("error", fallbackServer);

    // ---------------------------------
    // Button Events
    // ---------------------------------

    playButton?.addEventListener("click", togglePlay);

    muteButton?.addEventListener("click", toggleMute);

    speedButton?.addEventListener("click", changeSpeed);

    fullscreenButton?.addEventListener("click", toggleFullscreen);

    progressContainer?.addEventListener("click", seekFromProgress);

    // ---------------------------------
    // Keyboard Controls
    // ---------------------------------

    document.addEventListener("keydown", event => {
        if (
            event.target.tagName === "INPUT" ||
            event.target.tagName === "TEXTAREA"
        ) return;

        switch (event.key) {
            case " ":
                event.preventDefault();
                togglePlay();
                break;

            case "ArrowRight":
                seek(10);
                break;

            case "ArrowLeft":
                seek(-10);
                break;

            case "m":
            case "M":
                toggleMute();
                break;

            case "f":
            case "F":
                toggleFullscreen();
                break;
        }
    });

    // ---------------------------------
    // Initialize
    // ---------------------------------

    async function init() {
        setupDoubleTap();

        startHistoryTimer();

        if (!animeId || !window.DonghuaAnime) {
            showMessage("Donghua information unavailable.");
            return;
        }

        try {
            anime = await window.DonghuaAnime.getAnimeDetails(animeId);

            updateStatus("Player initialized");

            /*
             * No video source is added automatically.
             * Add only authorized provider sources using setSources().
             */

            showMessage(
                "No authorized video source is connected yet."
            );

        } catch (error) {
            console.error(error);
            showMessage("Unable to load Donghua information.");
        }
    }

    window.DonghuaPlayer = {
        seek,
        togglePlay,
        toggleMute,
        changeSpeed,
        toggleFullscreen,
        setSources,
        selectServer,
        saveProgress
    };

    init();

})();
