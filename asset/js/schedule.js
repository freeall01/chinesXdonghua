/* chinesXdonghua - schedule.js
   Shows the next airing episode of ongoing Chinese animation, grouped by day. */

(function () {
  "use strict";

  var CX = window.CX;
  var box = document.getElementById("schedule");

  var QUERY = `
  query {
    Page(page: 1, perPage: 50) {
      media(
        type: ANIME
        countryOfOrigin: "CN"
        status: RELEASING
        format_in: [TV, TV_SHORT, ONA]
        isAdult: false
        sort: POPULARITY_DESC
      ) {
        id
        title { romaji english }
        coverImage { large }
        nextAiringEpisode { episode airingAt }
      }
    }
  }`;

  function dayKey(date) {
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
  }

  function dayLabel(date) {
    var today = new Date();
    var tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (dayKey(date) === dayKey(today)) return "Today";
    if (dayKey(date) === dayKey(tomorrow)) return "Tomorrow";

    return date.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" });
  }

  function timeLabel(date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function render(list) {
    var upcoming = list
      .filter(function (m) { return m.nextAiringEpisode; })
      .sort(function (a, b) { return a.nextAiringEpisode.airingAt - b.nextAiringEpisode.airingAt; });

    if (!upcoming.length) {
      box.innerHTML = '<p class="text-gray-500">No upcoming episodes found right now.</p>';
      return;
    }

    var groups = [];
    var lookup = {};

    upcoming.forEach(function (media) {
      var date = new Date(media.nextAiringEpisode.airingAt * 1000);
      var key = dayKey(date);

      if (!lookup[key]) {
        lookup[key] = { label: dayLabel(date), items: [] };
        groups.push(lookup[key]);
      }
      lookup[key].items.push({ media: media, date: date });
    });

    box.innerHTML = groups.map(function (group) {
      var rows = group.items.map(function (entry) {
        var m = entry.media;
        var title = CX.esc(CX.titleOf(m));
        return (
          '<a href="anime.html?id=' + m.id + '" class="flex items-center gap-4 bg-white/5 rounded-xl p-3 hover:bg-white/10">' +
          '<img src="' + CX.esc(m.coverImage.large) + '" alt="' + title + '" loading="lazy" ' +
          'class="w-14 h-20 object-cover rounded-lg bg-[#171923]">' +
          '<div class="min-w-0 flex-1">' +
          '<p class="font-bold text-sm line-clamp-2">' + title + "</p>" +
          '<p class="text-xs text-gray-400 mt-1">Episode ' + m.nextAiringEpisode.episode + "</p>" +
          "</div>" +
          '<span class="badge">' + CX.esc(timeLabel(entry.date)) + "</span>" +
          "</a>"
        );
      }).join("");

      return (
        '<section class="mb-8">' +
        '<h2 class="text-lg font-extrabold mb-3 border-l-4 border-orange-500 pl-3">' + CX.esc(group.label) + "</h2>" +
        '<div class="space-y-3">' + rows + "</div>" +
        "</section>"
      );
    }).join("");
  }

  async function load() {
    box.innerHTML = '<p class="text-gray-400">Loading schedule...</p>';

    try {
      var data = await CX.gql(QUERY);
      render(data.Page.media);
    } catch (error) {
      console.error(error);
      box.innerHTML =
        '<p class="text-gray-400 text-sm">Could not load the schedule.' +
        '<button class="retry-btn" id="retry">Retry</button></p>';
      document.getElementById("retry").addEventListener("click", load);
    }
  }

  load();
})();
