/* chinesXdonghua - search.js
   Searches Chinese animation only (countryOfOrigin = CN) on AniList. */

(function () {
  "use strict";

  var CX = window.CX;

  var form = document.getElementById("search-form");
  var input = document.getElementById("search-input");
  var statusEl = document.getElementById("status");
  var results = document.getElementById("results");

  var QUERY = `
  query ($q: String) {
    Page(page: 1, perPage: 30) {
      media(
        type: ANIME
        search: $q
        countryOfOrigin: "CN"
        format_in: [TV, TV_SHORT, ONA, MOVIE]
        isAdult: false
        sort: SEARCH_MATCH
      ) {
        id
        title { romaji english }
        coverImage { large }
        episodes
        seasonYear
      }
    }
  }`;

  var requestCounter = 0;

  async function runSearch(term) {
    var text = term.trim();

    if (!text) {
      results.innerHTML = "";
      statusEl.textContent = "Type a name to search.";
      return;
    }

    var thisRequest = ++requestCounter;
    statusEl.textContent = "Searching...";
    results.innerHTML = CX.skeletons(8);

    try {
      var data = await CX.gql(QUERY, { q: text });

      /* Ignore old answers if a newer search was started */
      if (thisRequest !== requestCounter) return;

      var list = data.Page.media;

      if (!list.length) {
        results.innerHTML = "";
        statusEl.textContent = 'No Donghua found for "' + text + '".';
        return;
      }

      statusEl.textContent = list.length + " result" + (list.length === 1 ? "" : "s");
      results.innerHTML = list.map(CX.cardHtml).join("");
    } catch (error) {
      console.error(error);
      if (thisRequest !== requestCounter) return;
      results.innerHTML = "";
      statusEl.textContent = "Search failed. Check your connection and try again.";
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var term = input.value;
    history.replaceState(null, "", "search.html?q=" + encodeURIComponent(term.trim()));
    runSearch(term);
  });

  /* Search while typing (waits 500 ms after the last key) */
  var timer = null;
  input.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(function () { runSearch(input.value); }, 500);
  });

  var initial = new URLSearchParams(location.search).get("q") || "";
  input.value = initial;

  if (initial) {
    runSearch(initial);
  } else {
    statusEl.textContent = "Type a name to search.";
  }
})();
