/* =====================================
   chinesXdonghua - Core Application
===================================== */

(() => {
    "use strict";

    const STORAGE = {
        LIST: "donghuaList",
        HISTORY: "donghuaHistory",
        SETTINGS: "donghuaSettings"
    };

    // ---------------------------------
    // Storage Helpers
    // ---------------------------------

    function getData(key, fallback) {
        try {
            const data = localStorage.getItem(key);

            return data ? JSON.parse(data) : fallback;

        } catch (error) {
            console.error("Storage error:", error);
            return fallback;
        }
    }

    function saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;

        } catch (error) {
            console.error("Unable to save data:", error);
            return false;
        }
    }

    // ---------------------------------
    // My List
    // ---------------------------------

    function getMyList() {
        const list = getData(STORAGE.LIST, []);
        return Array.isArray(list) ? list : [];
    }

    function isInList(id) {
        return getMyList().some(item => item.id === Number(id));
    }

    function addToList(anime) {
        if (!anime?.id) return false;

        const list = getMyList();

        if (list.some(item => item.id === Number(anime.id))) {
            return false;
        }

        list.unshift({
            id: Number(anime.id),
            title: String(anime.title || "Unknown Donghua"),
            image: String(anime.image || ""),
            addedAt: Date.now()
        });

        saveData(STORAGE.LIST, list);

        emit("listUpdated", list);

        return true;
    }

    function removeFromList(id) {
        const list = getMyList().filter(
            item => item.id !== Number(id)
        );

        saveData(STORAGE.LIST, list);

        emit("listUpdated", list);
    }

    function clearMyList() {
        saveData(STORAGE.LIST, []);

        emit("listUpdated", []);
    }

    // ---------------------------------
    // Watch History
    // ---------------------------------

    function getHistory() {
        const history = getData(STORAGE.HISTORY, []);
        return Array.isArray(history) ? history : [];
    }

    function saveHistory(anime, episode = 1, position = 0) {
        if (!anime?.id) return false;

        const history = getHistory();

        const id = Number(anime.id);

        const existingIndex = history.findIndex(
            item => item.id === id
        );

        const record = {
            id,
            title: String(anime.title || "Unknown Donghua"),
            image: String(anime.image || ""),
            episode: Math.max(1, Number(episode) || 1),
            position: Math.max(0, Number(position) || 0),
            updatedAt: Date.now()
        };

        if (existingIndex !== -1) {
            history.splice(existingIndex, 1);
        }

        history.unshift(record);

        const limitedHistory = history.slice(0, 30);

        saveData(STORAGE.HISTORY, limitedHistory);

        emit("historyUpdated", limitedHistory);

        return true;
    }

    function removeHistory(id) {
        const history = getHistory().filter(
            item => item.id !== Number(id)
        );

        saveData(STORAGE.HISTORY, history);

        emit("historyUpdated", history);
    }

    function clearHistory() {
        saveData(STORAGE.HISTORY, []);

        emit("historyUpdated", []);
    }

    // ---------------------------------
    // Settings
    // ---------------------------------

    function getSettings() {
        return getData(STORAGE.SETTINGS, {
            autoplay: true,
            preferredServer: "auto",
            preferredSpeed: 1,
            notifications: false
        });
    }

    function updateSettings(newSettings) {
        const settings = {
            ...getSettings(),
            ...newSettings
        };

        saveData(STORAGE.SETTINGS, settings);

        emit("settingsUpdated", settings);

        return settings;
    }

    // ---------------------------------
    // Event System
    // ---------------------------------

    const events = {};

    function on(eventName, callback) {
        if (typeof callback !== "function") return;

        if (!events[eventName]) {
            events[eventName] = [];
        }

        events[eventName].push(callback);
    }

    function emit(eventName, data) {
        if (!events[eventName]) return;

        events[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(error);
            }
        });
    }

    // ---------------------------------
    // Common Helpers
    // ---------------------------------

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function formatTime(seconds) {
        seconds = Math.max(0, Number(seconds) || 0);

        const hours = Math.floor(seconds / 3600);

        const minutes = Math.floor((seconds % 3600) / 60);

        const remaining = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
        }

        return `${minutes}:${String(remaining).padStart(2, "0")}`;
    }

    function formatDate(timestamp) {
        return new Intl.DateTimeFormat("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(new Date(timestamp));
    }

    function updateListCount() {
        const countElement = document.getElementById("list-count");

        if (countElement) {
            countElement.textContent = getMyList().length;
        }
    }

    // ---------------------------------
    // Initialize
    // ---------------------------------

    function init() {
        updateListCount();

        on("listUpdated", updateListCount);
    }

    // ---------------------------------
    // Public Application API
    // ---------------------------------

    window.DonghuaApp = {
        getMyList,
        isInList,
        addToList,
        removeFromList,
        clearMyList,

        getHistory,
        saveHistory,
        removeHistory,
        clearHistory,

        getSettings,
        updateSettings,

        on,
        emit,

        escapeHTML,
        formatTime,
        formatDate,
        updateListCount,

        init
    };

    document.addEventListener("DOMContentLoaded", init);

})();
