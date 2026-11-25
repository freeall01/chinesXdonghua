/* =========================================
   chinesXdonghua
   Main Application Controller
   File: asset/js/app.js
========================================= */

(function () {
    "use strict";

    const STORAGE = {
        list: "donghuaList",
        history: "donghuaHistory",
        settings: "donghuaSettings"
    };

    const App = {

        // Get data from Local Storage
        getData(key, fallback = []) {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : fallback;
            } catch (error) {
                console.error("Storage error:", error);
                return fallback;
            }
        },

        // Save data to Local Storage
        saveData(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (error) {
                console.error("Unable to save data:", error);
                return false;
            }
        },

        // Add anime to My List
        addToList(anime) {
            if (!anime || !anime.id) return false;

            const list = this.getData(STORAGE.list);

            const exists = list.some(
                item => String(item.id) === String(anime.id)
            );

            if (exists) return false;

            list.push({
                id: anime.id,
                title: anime.title || "Unknown Donghua",
                image: anime.image || "",
                addedAt: Date.now()
            });

            this.saveData(STORAGE.list, list);

            this.emit("listUpdated", list);

            return true;
        },

        // Remove anime from My List
        removeFromList(id) {
            const list = this.getData(STORAGE.list);

            const updated = list.filter(
                item => String(item.id) !== String(id)
            );

            this.saveData(STORAGE.list, updated);

            this.emit("listUpdated", updated);

            return updated;
        },

        // Check if anime is in My List
        isInList(id) {
            const list = this.getData(STORAGE.list);

            return list.some(
                item => String(item.id) === String(id)
            );
        },

        // Get My List
        getMyList() {
            return this.getData(STORAGE.list);
        },

        // Save watching history
        saveHistory(anime, episode = 1, position = 0) {
            if (!anime || !anime.id) return false;

            let history = this.getData(STORAGE.history);

            history = history.filter(
                item => String(item.id) !== String(anime.id)
            );

            history.unshift({
                id: anime.id,
                title: anime.title || "Unknown Donghua",
                image: anime.image || "",
                episode: episode,
                position: position,
                updatedAt: Date.now()
            });

            // Keep latest 30 entries
            history = history.slice(0, 30);

            this.saveData(STORAGE.history, history);

            this.emit("historyUpdated", history);

            return true;
        },

        // Get watching history
        getHistory() {
            return this.getData(STORAGE.history);
        },

        // Remove history
        removeHistory(id) {
            const history = this.getData(STORAGE.history);

            const updated = history.filter(
                item => String(item.id) !== String(id)
            );

            this.saveData(STORAGE.history, updated);

            this.emit("historyUpdated", updated);

            return updated;
        },

        // Clear all history
        clearHistory() {
            localStorage.removeItem(STORAGE.history);
            this.emit("historyUpdated", []);
        },

        // Save settings
        saveSettings(settings) {
            const current = this.getData(STORAGE.settings, {});

            this.saveData(STORAGE.settings, {
                ...current,
                ...settings
            });
        },

        // Get settings
        getSettings() {
            return this.getData(STORAGE.settings, {});
        },

        // Event system
        events: {},

        on(event, callback) {
            if (!this.events[event]) {
                this.events[event] = [];
            }

            this.events[event].push(callback);
        },

        emit(event, data) {
            (this.events[event] || []).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(error);
                }
            });
        },

        // Format duration
        formatTime(seconds) {
            seconds = Math.max(0, Math.floor(Number(seconds) || 0));

            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const remaining = seconds % 60;

            if (hours > 0) {
                return `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
            }

            return `${minutes}:${String(remaining).padStart(2, "0")}`;
        },

        // Format date
        formatDate(timestamp) {
            return new Date(timestamp).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
            });
        },

        // Create safe HTML text
        escapeHTML(value) {
            return String(value ?? "").replace(/[&<>"']/g, char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            })[char]);
        },

        // Initialize application
        init() {
            console.log("chinesXdonghua App Initialized");

            this.updateListCount();
            
            this.on("listUpdated", () => {
                this.updateListCount();
            });
        },

        // Update favourite count
        updateListCount() {
            const count = this.getMyList().length;

            document.querySelectorAll("[data-list-count]")
                .forEach(element => {
                    element.textContent = count;
                });
        }
    };

    // Global access
    window.DonghuaApp = App;

    // Start application
    document.addEventListener("DOMContentLoaded", () => {
        App.init();
    });

})();
