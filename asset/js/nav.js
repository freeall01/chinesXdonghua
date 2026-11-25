/* chinesXdonghua - nav.js
   Shared helpers used by anime, search, schedule and my-list pages:
   navbar, footer, AniList request helper, card builder and My List storage. */

(function () {
  "use strict";

  var API = "https://graphql.anilist.co";
  var LIST_KEY = "cx_mylist";

  var NAV_ITEMS = [
    { label: "Home", href: "index.html" },
    { label: "Search", href: "search.html" },
    { label: "Schedule", href: "schedule.html" },
    { label: "My List", href: "my-list.html" }
  ];

  /* ---------- helpers ---------- */

  function esc(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function stripHtml(text) {
    return String(text || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "");
  }

  function titleOf(media) {
    return (media.title && (media.title.english || media.title.romaji)) || "Unknown Donghua";
  }

  /* Sends a GraphQL request to AniList. Throws an Error if it fails. */
  async function gql(query, variables) {
    var response = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ query: query, variables: variables || {} })
    });

    var json = await response.json();

    if (!response.ok || !json.data) {
      throw new Error("AniList request failed");
    }
    return json.data;
  }

  function cardHtml(media) {
    var title = esc(titleOf(media));
    return (
      '<a href="anime.html?id=' + media.id + '" class="card block">' +
      '<img src="' + esc(media.coverImage.large) + '" alt="' + title + '" loading="lazy">' +
      '<h3 class="text-sm font-bold mt-2 line-clamp-2">' + title + "</h3>" +
      '<p class="text-xs text-gray-400 mt-1">' +
      esc(media.seasonYear || "TBA") + " · " + esc(media.episodes || "?") + " Episodes" +
      "</p></a>"
    );
  }

  function skeletons(count) {
    var html = "";
    for (var i = 0; i < count; i++) html += '<div class="skeleton"></div>';
    return html;
  }

  /* ---------- My List (stored only in this browser) ---------- */

  function getList() {
    try {
      var data = JSON.parse(localStorage.getItem(LIST_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function saveList(list) {
    try {
      localStorage.setItem(LIST_KEY, JSON.stringify(list));
    } catch (e) {
      /* storage blocked, ignore */
    }
  }

  function inList(id) {
    return getList().some(function (item) { return item.id === id; });
  }

  /* Adds or removes an item. Returns true if it is now in the list. */
  function toggleList(item) {
    var list = getList();
    var index = list.findIndex(function (entry) { return entry.id === item.id; });

    if (index >= 0) {
      list.splice(index, 1);
      saveList(list);
      return false;
    }
    list.unshift(item);
    saveList(list);
    return true;
  }

  /* ---------- navbar and footer ---------- */

  function currentPage() {
    return location.pathname.split("/").pop() || "index.html";
  }

  function renderNav() {
    var mount = document.getElementById("navbar");
    if (!mount) return;

    var page = currentPage();
    var links = NAV_ITEMS.map(function (item) {
      var active = item.href === page ? " active" : "";
      return '<a href="' + item.href + '" class="nav-link' + active + '">' + item.label + "</a>";
    }).join("");

    mount.innerHTML =
      '<header class="site-header sticky top-0 z-50 border-b border-white/10">' +
      '<div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">' +
      '<a href="index.html" class="logo text-xl">chinesX<span class="text-white">donghua</span></a>' +
      '<nav class="hidden md:flex gap-7 text-sm">' + links + "</nav>" +
      "</div>" +
      '<nav class="mobile-nav md:hidden flex gap-6 overflow-x-auto px-4 pb-3 text-sm whitespace-nowrap">' +
      links + "</nav>" +
      "</header>";
  }

  function renderFooter() {
    var mount = document.getElementById("footer");
    if (!mount) return;

    mount.innerHTML =
      '<footer class="border-t border-white/10 mt-12 py-8 text-center">' +
      '<h2 class="logo text-xl">chinesXdonghua</h2>' +
      '<p class="text-gray-500 text-sm mt-3">Your Ultimate Chinese Animation Destination.</p>' +
      '<p class="text-gray-600 text-xs mt-5">Metadata by AniList · © 2026 chinesXdonghua</p>' +
      "</footer>";
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderNav();
    renderFooter();
  });

  window.CX = {
    esc: esc,
    stripHtml: stripHtml,
    titleOf: titleOf,
    gql: gql,
    cardHtml: cardHtml,
    skeletons: skeletons,
    getList: getList,
    inList: inList,
    toggleList: toggleList
  };
})();
    
