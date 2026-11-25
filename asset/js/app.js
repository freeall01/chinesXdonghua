/* =====================================
   chinesXdonghua - Main App System
   My List | Watch History | Settings
===================================== */

(function () {
    "use strict";

    const STORAGE = {
        list: "donghuaList",
        history: "donghuaHistory",
        settings: "donghuaSettings"
    };

    const events = {};

    // ---------- STORAGE SYSTEM ----------

    function getData(key, fallback = []) {
        try {
            const data = localStorage.getItem(key);

            if (!data) return fallback;

            return JSON.parse(data);

        } catch (error) {
            console.error("Storage Error:", error);
            return fallback;
        }
    }

    function saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;

        } catch (error) {
            console.error("Save Error:", error);
            return false;
        }
    }

    // ---------- EVENT SYSTEM ----------

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

    function on(eventName, callback) {
        if (typeof callback !== "function") return;

        if (!events[eventName]) {
            events[eventName] = [];
        }

        events[eventName].push(callback);
    }

    // ---------- MY LIST ----------

    function getMyList() {
        return getData(STORAGE.list, []);
    }

    function isInList(id) {
        return getMyList().some(
            anime => String(anime.id) === String(id)
        );
    }

    function addToList(anime) {
        if (!anime || !anime.id) return false;

        const list = getMyList();

        const exists = list.some(
            item => String(item.id) === String(anime.id)
        );

        if (exists) return false;

        const newAnime = {
            id: anime.id,
            title: anime.title || "Unknown Donghua",
            image: anime.image ||
                   anime.coverImage?.large ||
                   anime.coverImage?.medium ||
                   "",
            addedAt: Date.now()
        };

        list.unshift(newAnime);

        saveData(STORAGE.list, list);

        emit("listUpdated", list);

        updateListCount();

        return true;
    }

    function removeFromList(id) {
        const list = getMyList().filter(
            anime => String(anime.id) !== String(id)
        );

        saveData(STORAGE.list, list);

        emit("listUpdated", list);

        updateListCount();

        return true;
    }

    // ---------- WATCH HISTORY ----------

    function getHistory() {
        return getData(STORAGE.history, []);
    }

    function saveHistory(anime, episode = 1, position = 0) {
        if (!anime || !anime.id) return false;

        let history = getHistory();

        const existingIndex = history.findIndex(
            item => String(item.id) === String(anime.id)
        );

        const historyItem = {
            id: anime.id,
            title: anime.title || "Unknown Donghua",
            image: anime.image ||
                   anime.coverImage?.large ||
                   anime.coverImage?.medium ||
                   "",
            episode: Number(episode) || 1,
            position: Number(position) || 0,
            updatedAt: Date.now()
        };

        if (existingIndex !== -1) {
            history.splice(existingIndex, 1);
        }

        history.unshift(historyItem);

        // Keep latest 30 titles
        history = history.slice(0, 30);

        saveData(STORAGE.history, history);

        emit("historyUpdated", history);

        return true;
    }

    function removeHistory(id) {
        const history = getHistory().filter(
            anime => String(anime.id) !== String(id)
        );

        saveData(STORAGE.history, history);

        emit("historyUpdated", history);

        return true;
    }

    function clearHistory() {
        saveData(STORAGE.history, []);

        emit("historyUpdated", []);

        return true;
    }

    // ---------- SETTINGS ----------

    function getSettings() {
        return getData(STORAGE.settings, {
            autoplay: true,
            notifications: false,
            preferredServer: "auto",
            preferredQuality: "auto"
        });
    }

    function updateSettings(newSettings) {
        const settings = {
            ...getSettings(),
            ...newSettings
        };

        saveData(STORAGE.settings, settings);

        emit("settingsUpdated", settings);

        return settings;
    }

    // ---------- HELPERS ----------

    function updateListCount() {
        const count = getMyList().length;

        document.querySelectorAll("[data-list-count]").forEach(element => {
            element.textContent = count;
        });
    }

    function formatTime(seconds) {
        seconds = Math.max(0, Math.floor(Number(seconds) || 0));

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        if (hours > 0) {
            return (
                hours + ":" +
                String(minutes).padStart(2, "0") + ":" +
                String(remainingSeconds).padStart(2, "0")
            );
        }

        return (
            minutes + ":" +
            String(remainingSeconds).padStart(2, "0")
        );
    }

    function formatDate(timestamp) {
        if (!timestamp) return "";

        return new Date(timestamp).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];
        });
    }

    // ---------- INITIALIZATION ----------

    function init() {
        updateListCount();

        console.log("chinesXdonghua App Initialized");
    }

    document.addEventListener("DOMContentLoaded", init);

    // ---------- PUBLIC API ----------

    window.DonghuaApp = {
        getData,
        saveData,

        addToList,
        removeFromList,
        isInList,
        getMyList,

        saveHistory,
        getHistory,
        removeHistory,
        clearHistory,

        getSettings,
        updateSettings,

        on,
        emit,

        formatTime,
        formatDate,
        escapeHTML,

        init
    };

})();
