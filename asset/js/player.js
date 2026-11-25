/* =====================================
   chinesXdonghua
   Smart Streaming Engine
===================================== */

(function () {

"use strict";

const DonghuaPlayer = {

    video: null,
    sources: [],
    currentSource: null,
    currentIndex: 0,

    settings: {
        autoServer: true,
        rememberPosition: true,
        defaultSpeed: 1,
        autoNext: true
    },

    callbacks: {},

    /* INITIALIZE */

    init(options = {}) {

        this.video = document.getElementById("video");

        if (!this.video) {
            console.warn("Video element not found.");
            return;
        }

        this.settings = {
            ...this.settings,
            ...options
        };

        this.bindEvents();

        console.log("DonghuaPlayer initialized.");

    },


    /* REGISTER VIDEO SOURCES */

    setSources(sources = []) {

        this.sources = sources.filter(source => {

            return source &&
                   source.name &&
                   source.url &&
                   source.authorized === true;

        });

        this.currentIndex = 0;

        if (this.settings.autoServer) {
            this.playAuto();
        }

    },


    /* SERVER AVAILABILITY */

    async checkSource(source) {

        if (!source || !source.url) {
            return false;
        }

        if (typeof source.check === "function") {

            try {
                return await source.check();
            } catch {
                return false;
            }

        }

        return true;

    },


    /* AUTO SERVER */

    async playAuto() {

        if (!this.sources.length) {

            this.notify(
                "No authorized streaming source available."
            );

            return false;

        }

        for (let i = 0; i < this.sources.length; i++) {

            const source = this.sources[i];

            const available = await this.checkSource(source);

            if (!available) continue;

            const success = await this.loadSource(source, i);

            if (success) return true;

        }

        this.notify("All available servers failed.");

        return false;

    },


    /* LOAD SOURCE */

    loadSource(source, index) {

        return new Promise(resolve => {

            if (!this.video || !source) {
                resolve(false);
                return;
            }

            const video = this.video;

            const previousTime = video.currentTime || 0;

            const wasPlaying = !video.paused;

            const savedPosition = this.getSavedPosition();

            const startTime = this.settings.rememberPosition
                ? Math.max(previousTime, savedPosition)
                : 0;

            this.currentSource = source;

            this.currentIndex = index;

            this.updateServerUI(source.name);

            this.notify("Connecting to " + source.name);

            let finished = false;

            const cleanup = () => {

                video.removeEventListener("loadedmetadata", success);
                video.removeEventListener("error", failure);

            };

            const success = async () => {

                if (finished) return;

                finished = true;

                cleanup();

                video.currentTime = Math.min(
                    startTime,
                    Number.isFinite(video.duration)
                        ? video.duration
                        : startTime
                );

                if (wasPlaying) {

                    try {
                        await video.play();
                    } catch {}
                }

                this.notify("Connected: " + source.name);

                this.emit("sourceChanged", source);

                resolve(true);

            };

            const failure = () => {

                if (finished) return;

                finished = true;

                cleanup();

                this.notify("Server unavailable: " + source.name);

                resolve(false);

            };

            video.addEventListener("loadedmetadata", success);

            video.addEventListener("error", failure);

            video.src = source.url;

            video.load();

            setTimeout(() => {

                if (finished) return;

                finished = true;

                cleanup();

                resolve(false);

            }, 15000);

        });

    },


    /* MANUAL SERVER SWITCH */

    async switchServer(index) {

        if (!this.sources[index]) {
            return false;
        }

        const source = this.sources[index];

        const available = await this.checkSource(source);

        if (!available) {

            this.notify("This server is unavailable.");

            return false;

        }

        const success = await this.loadSource(source, index);

        if (!success) {

            this.notify("Unable to connect to selected server.");

        }

        return success;

    },


    /* FALLBACK */

    async fallback() {

        if (!this.sources.length) return;

        const nextIndex = this.sources.findIndex(
            (source, index) =>
                index > this.currentIndex
        );

        if (nextIndex !== -1) {

            await this.switchServer(nextIndex);

        } else if (this.settings.autoServer) {

            await this.playAuto();

        }

    },


    /* DOUBLE TAP SEEK */

    seek(seconds) {

        if (!this.video) return;

        if (!Number.isFinite(this.video.duration)) return;

        this.video.currentTime = Math.max(
            0,
            Math.min(
                this.video.duration,
                this.video.currentTime + seconds
            )
        );

        this.emit("seek", seconds);

    },


    /* PLAY / PAUSE */

    togglePlay() {

        if (!this.video) return;

        if (this.video.paused) {

            this.video.play().catch(() => {});

        } else {

            this.video.pause();

        }

    },


    /* PLAYBACK SPEED */

    setSpeed(speed) {

        if (!this.video) return;

        const value = Number(speed);

        if (value >= 0.25 && value <= 4) {

            this.video.playbackRate = value;

        }

    },


    /* VOLUME */

    setVolume(value) {

        if (!this.video) return;

        this.video.volume = Math.max(
            0,
            Math.min(1, Number(value))
        );

    },


    /* MUTE */

    toggleMute() {

        if (!this.video) return;

        this.video.muted = !this.video.muted;

        return this.video.muted;

    },


    /* FULLSCREEN */

    async fullscreen() {

        const player = document.getElementById("player-area");

        if (!player) return;

        try {

            if (!document.fullscreenElement) {

                await player.requestFullscreen();

            } else {

                await document.exitFullscreen();

            }

        } catch (error) {

            console.error(error);

        }

    },


    /* SAVE POSITION */

    savePosition() {

        if (!this.video) return;

        if (!this.settings.rememberPosition) return;

        if (!this.currentSource) return;

        const key = this.getPositionKey();

        localStorage.setItem(key, JSON.stringify({

            time: this.video.currentTime || 0,

            updatedAt: Date.now()

        }));

    },


    /* GET POSITION */

    getSavedPosition() {

        const key = this.getPositionKey();

        try {

            const data = JSON.parse(
                localStorage.getItem(key)
            );

            return data?.time || 0;

        } catch {

            return 0;

        }

    },


    getPositionKey() {

        const params = new URLSearchParams(location.search);

        return "chinesxdonghua_position_" +
            (params.get("id") || "unknown") +
            "_" +
            (params.get("ep") || "1");

    },


    /* SERVER UI */

    updateServerUI(name) {

        document.querySelectorAll(".server-btn").forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.server === name
            );

        });

    },


    /* EVENTS */

    bindEvents() {

        this.video.addEventListener("error", () => {

            if (this.settings.autoServer) {

                this.fallback();

            }

        });

        this.video.addEventListener("timeupdate", () => {

            this.savePosition();

        });

        this.video.addEventListener("ended", () => {

            this.emit("ended");

        });

    },


    /* CALLBACK SYSTEM */

    on(event, callback) {

        if (!this.callbacks[event]) {

            this.callbacks[event] = [];

        }

        this.callbacks[event].push(callback);

    },


    emit(event, data) {

        (this.callbacks[event] || []).forEach(callback => {

            callback(data);

        });

    },


    /* MESSAGE */

    notify(message) {

        console.log("[DonghuaPlayer]", message);

        const status = document.getElementById("server-status");

        if (status) {

            status.textContent = message;

        }

    }

};


/* GLOBAL ACCESS */

window.DonghuaPlayer = DonghuaPlayer;

})();
