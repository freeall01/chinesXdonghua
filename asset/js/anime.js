/* chinesXdonghua - anime.js
   Loads one Donghua from AniList (id comes from ?id=123) and shows its details. */

(function () {
  "use strict";

  var CX = window.CX;
  var root = document.getElementById("anime-root");

  var QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      countryOfOrigin
      title { romaji english native }
      description(asHtml: false)
      bannerImage
      coverImage { large extraLarge }
      genres
      tags { name rank isMediaSpoiler }
      status
      episodes
      duration
      season
      seasonYear
      format
      averageScore
      startDate { year month day }
      endDate { year month day }
      nextAiringEpisode { episode airingAt }
      studios(isMain: true) { nodes { name } }
    }
  }`;

  var STATUS_TEXT = {
    RELEASING: "Ongoing",
    FINISHED: "Completed",
    NOT_YET_RELEASED: "Upcoming",
    CANCELLED: "Cancelled",
    HIATUS: "On Hiatus"
  };

  /* Tags that describe cultivation / xianxia style stories */
  var CULTIVATION_WORDS = /cultivation|xianxia|wuxia|martial arts|reincarnation|isekai|immortal|gods|demons/i;

  function formatDate(d) {
    if (!d || !d.year) return "TBA";
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var parts = [];
    if (d.day) parts.push(d.day);
    if (d.month) parts.push(months[d.month - 1]);
    parts.push(d.year);
    return parts.join(" ");
  }

  function airedEpisodes(media) {
    if (media.status === "NOT_YET_RELEASED") return 0;
    if (media.status === "RELEASING") {
      if (media.nextAiringEpisode) return Math.max(0, media.nextAiringEpisode.episode - 1);
      return media.episodes || 0;
    }
    return media.episodes || 0;
  }

  function showError(message) {
    root.innerHTML =
      '<div class="max-w-5xl mx-auto px-4 py-16 text-center">' +
      '<p class="text-gray-400">' + CX.esc(message) + "</p>" +
      '<a href="index.html" class="btn-primary mt-6">Back to Home</a>' +
      "</div>";
  }

  function render(media) {
    var title = CX.titleOf(media);
    var native = media.title.native || "";
    var description = CX.stripHtml(media.description) || "No description available yet.";
    var studio = media.studios.nodes.length ? media.studios.nodes[0].name : "Unknown";
    var status = STATUS_TEXT[media.status] || media.status;
    var seasonText = media.season
      ? media.season.charAt(0) + media.season.slice(1).toLowerCase() + " " + (media.seasonYear || "")
      : (media.seasonYear || "TBA");

    document.title = title + " | chinesXdonghua";

    var genres = media.genres.map(function (g) {
      return '<span class="chip">' + CX.esc(g) + "</span>";
    }).join("");

    var cultivation = media.tags
      .filter(function (t) { return !t.isMediaSpoiler && CULTIVATION_WORDS.test(t.name); })
      .map(function (t) { return '<span class="chip orange">' + CX.esc(t.name) + "</span>"; })
      .join("");

    var releaseInfo = "";
    if (media.nextAiringEpisode) {
      var when = new Date(media.nextAiringEpisode.airingAt * 1000).toLocaleString([], {
        weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
      });
      releaseInfo =
        '<p class="text-sm text-orange-300 mt-4">Episode ' + media.nextAiringEpisode.episode +
        " airs " + CX.esc(when) + "</p>";
    }

    var banner = media.bannerImage || media.coverImage.extraLarge;

    var inList = CX.inList(media.id);

    root.innerHTML =
      '<div class="banner" style="background-image:url(\'' + CX.esc(banner) + '\')"></div>' +
      '<div class="max-w-5xl mx-auto px-4 -mt-28 relative z-10">' +
      '  <div class="flex gap-4 sm:gap-6">' +
      '    <img src="' + CX.esc(media.coverImage.large) + '" alt="' + CX.esc(title) + '"' +
      '      class="w-28 sm:w-44 rounded-xl self-start shadow-2xl bg-[#171923]">' +
      '    <div class="pt-14 sm:pt-20 min-w-0">' +
      '      <span class="badge">' + CX.esc(status.toUpperCase()) + "</span>" +
      '      <h1 class="text-2xl sm:text-4xl font-black mt-2 leading-tight">' + CX.esc(title) + "</h1>" +
      (native ? '<p class="text-gray-400 mt-1">' + CX.esc(native) + "</p>" : "") +
      "    </div>" +
      "  </div>" +

      '  <div class="flex flex-wrap gap-3 mt-6">' +
      '    <a href="watch.html?id=' + media.id + '&ep=1" class="btn-primary">▶ Watch Episode 1</a>' +
      '    <button id="list-btn" class="btn-ghost">' + (inList ? "✓ In My List" : "+ My List") + "</button>" +
      "  </div>" +

      '  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 text-sm">' +
      '    <div class="bg-white/5 rounded-xl p-3"><p class="text-gray-400 text-xs">Season</p><p class="font-bold mt-1">' + CX.esc(seasonText) + "</p></div>" +
      '    <div class="bg-white/5 rounded-xl p-3"><p class="text-gray-400 text-xs">Episodes</p><p class="font-bold mt-1">' + CX.esc(media.episodes || "?") + "</p></div>" +
      '    <div class="bg-white/5 rounded-xl p-3"><p class="text-gray-400 text-xs">Score</p><p class="font-bold mt-1">' + (media.averageScore ? media.averageScore + "/100" : "N/A") + "</p></div>" +
      '    <div class="bg-white/5 rounded-xl p-3"><p class="text-gray-400 text-xs">Studio</p><p class="font-bold mt-1">' + CX.esc(studio) + "</p></div>" +
      "  </div>" +

      '  <p class="text-gray-400 text-xs mt-4">Started: ' + CX.esc(formatDate(media.startDate)) +
      " · Ended: " + CX.esc(media.status === "FINISHED" ? formatDate(media.endDate) : "TBA") + "</p>" +
      releaseInfo +

      '  <div class="flex flex-wrap gap-2 mt-5">' + genres + cultivation + "</div>" +

      '  <h2 class="section-title mt-8">Description</h2>' +
      '  <p class="text-gray-300 leading-7 whitespace-pre-line">' + CX.esc(description) + "</p>" +

      '  <h2 class="section-title mt-10">Episodes</h2>' +
      '  <div id="episode-list"></div>' +
      "</div>";

    renderEpisodes(media);

    document.getElementById("list-btn").addEventListener("click", function () {
      var added = CX.toggleList({
        id: media.id,
        title: title,
        cover: media.coverImage.large,
        year: media.seasonYear || null,
        episodes: media.episodes || null
      });
      this.textContent = added ? "✓ In My List" : "+ My List";
    });
  }

  function renderEpisodes(media) {
    var box = document.getElementById("episode-list");
    var aired = airedEpisodes(media);

    if (!aired) {
      box.innerHTML = '<p class="text-gray-500">No episodes have been released yet.</p>';
      return;
    }

    var html = "";
    for (var n = 1; n <= aired; n++) {
      html += '<a class="ep-btn" href="watch.html?id=' + media.id + "&ep=" + n + '">' + n + "</a>";
    }
    box.innerHTML = '<div class="ep-grid">' + html + "</div>" +
      '<p class="text-xs text-gray-500 mt-3">Episode numbers come from AniList airing data. ' +
      "Playback depends on an authorized source being available.</p>";
  }

  async function load() {
    var id = parseInt(new URLSearchParams(location.search).get("id"), 10);

    if (!id) {
      showError("No Donghua selected.");
      return;
    }

    try {
      var data = await CX.gql(QUERY, { id: id });
      var media = data.Media;

      if (media.countryOfOrigin !== "CN") {
        showError("This title is not a Chinese Donghua.");
        return;
      }
      render(media);
    } catch (error) {
      console.error(error);
      showError("Could not load details. Check your connection and try again.");
    }
  }

  load();
})();
                      
