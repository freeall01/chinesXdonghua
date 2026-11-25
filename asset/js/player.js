/* chinesXdonghua - player.js
   Custom player built on Shaka Player.
   Video sources are read from sources.json (you add authorized URLs there).
   Nothing in this file contains or invents any video URL. */

(function () {
  "use strict";

  var CX = window.CX;

  /* ---------- URL parameters ---------- */
  var params = new URLSearchParams(location.search);
  var animeId = parseInt(params.get("id"), 10);
  var episode = Math.max(1, parseInt(params.get("ep"), 10) || 1);

  /* ---------- storage keys ---------- */
  var POS_KEY = "cx_pos_" + animeId + "_" + episode;
  var AUTONEXT_KEY = "cx_autonext";
  var SUBLANG_KEY = "cx_sublang";

  /* ---------- elements ---------- */
  function $(id) { return document.getElementById(id); }

  var wrap = $("player-wrap");
  var video = $("video");
  var tapLayer = $("tap-layer");
  var controls = $("controls");
  var btnPlay = $("btn-play");
  var btnPrev = $("btn-prev");
  var btnNext = $("btn-next");
  var btnFullscreen = $("btn-fullscreen");
  var btnSettings = $("btn-settings");
  var seek = $("seek");
  var timeLabel = $("time");
  var settingsBox = $("settings");
  var nextBox = $("next-box");
  var spinner = $("spinner");
  var spinnerText = $("spinner-text");
  var errorBox = $("error-box");
  var errorText = $("error-text");
  var btnRetry = $("btn-retry");
  var btnTryNext = $("btn-try-next");
  var toastEl = $("toast");
  var bubbleLeft = $("bubble-left");
  var bubbleRight = $("bubble-right");
  var serversBox = $("servers");

  /* ---------- state ---------- */
  var player = null;
  var sources = [];
  var serverIndex = -1;
  var failed = [];
  var statusOk = [];
  var loading = false;
  var loadToken = 0;
  var animeTitle = "";
  var airedCount = 0;
  var hideTimer = null;
  var toastTimer = null;
  var lastSave = 0;
  var seeking = false;
  var nextTimer = null;

  /* ---------- small helpers ---------- */

  function fmt(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor(seconds % 60);
    var mm = h ? String(m).padStart(2, "0") : String(m);
    return (h ? h + ":" : "") + mm + ":" + String(s).padStart(2, "0");
  }

  function show(el, visible) {
    el.classList.toggle("hidden", !visible);
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  function autoNextEnabled() {
    return readJson(AUTONEXT_KEY, true) !== false;
  }

  function serverName(i) {
    return (sources[i] && sources[i].name) || "Server " + (i + 1);
  }

  /* ---------- page header ---------- */

  var META_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      countryOfOrigin
      title { romaji english }
      status
      episodes
      nextAiringEpisode { episode }
    }
  }`;

  async function loadMeta() {
    var data = await CX.gql(META_QUERY, { id: animeId });
    var media = data.Media;

    animeTitle = CX.titleOf(media);

    if (media.status === "RELEASING" && media.nextAiringEpisode) {
      airedCount = Math.max(0, media.nextAiringEpisode.episode - 1);
    } else if (media.status === "NOT_YET_RELEASED") {
      airedCount = 0;
    } else {
      airedCount = media.episodes || 0;
    }
  }

  function goToEpisode(n) {
    location.href = "watch.html?id=" + animeId + "&ep=" + n;
  }

  function renderHeader() {
    var title = animeTitle || "Donghua";
    $("page-title").textContent = title + " · Episode " + episode;
    $("page-sub").textContent = airedCount ? airedCount + " episodes released" : "";
    $("player-title").textContent = title + " · Ep " + episode;
    document.title = title + " Ep " + episode + " | chinesXdonghua";

    var hasPrev = episode > 1;
    var hasNext = airedCount ? episode < airedCount : true;

    var linkPrev = $("link-prev");
    var linkNext = $("link-next");

    linkPrev.href = "watch.html?id=" + animeId + "&ep=" + (episode - 1);
    linkNext.href = "watch.html?id=" + animeId + "&ep=" + (episode + 1);
    $("link-details").href = "anime.html?id=" + animeId;

    linkPrev.style.display = hasPrev ? "" : "none";
    linkNext.style.display = hasNext ? "" : "none";
    btnPrev.disabled = !hasPrev;
    btnNext.disabled = !hasNext;
  }

  /* ---------- sources (sources.json) ---------- */

  async function loadSources() {
    try {
      var response = await fetch("sources.json", { cache: "no-store" });
      if (!response.ok) return [];

      var json = await response.json();
      var entry = json && json[animeId] && json[animeId][episode];

      if (!Array.isArray(entry)) return [];

      return entry.filter(function (item) {
        return item && typeof item.url === "string" && /^https?:\/\//i.test(item.url);
      });
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  function renderServers() {
    if (!sources.length) {
      serversBox.innerHTML = '<p class="text-sm text-gray-500">No servers added for this episode.</p>';
      return;
    }

    var html = '<button class="server-chip" data-server="auto">⚡ Auto</button>';

    sources.forEach(function (source, i) {
      var dot = failed[i] ? "bad" : (statusOk[i] ? "ok" : "");
      var active = i === serverIndex ? " active" : "";
      html +=
        '<button class="server-chip' + active + '" data-server="' + i + '">' +
        '<span class="dot ' + dot + '"></span>' + CX.esc(serverName(i)) + "</button>";
    });

    serversBox.innerHTML = html;
  }

  /* ---------- overlays ---------- */

  function showSpinner(text) {
    spinnerText.textContent = text;
    show(errorBox, false);
    show(spinner, true);
  }

  function showError(message, canTryNext) {
    errorText.textContent = message;
    show(spinner, false);
    show(btnTryNext, !!canTryNext);
    show(errorBox, true);
  }

  function showNoSource() {
    var message = "No authorized source has been added for Episode " + episode + " yet.";

    if (airedCount && episode > airedCount) {
      message = "Episode " + episode + " has not been released yet.";
    }

    errorText.textContent = message;
    show(btnRetry, false);
    show(btnTryNext, false);
    show(spinner, false);
    show(errorBox, true);
    controls.classList.remove("show");
  }

  /* ---------- playback position ---------- */

  function getResume() {
    var saved = readJson(POS_KEY, null);
    if (!saved || !saved.t) return 0;
    if (saved.d && saved.t > saved.d - 30) return 0;
    return saved.t;
  }

  function savePosition(force) {
    var now = Date.now();
    if (!force && now - lastSave < 4000) return;
    if (!isFinite(video.duration) || !video.duration || video.currentTime < 1) return;

    lastSave = now;
    writeJson(POS_KEY, { t: video.currentTime, d: video.duration });
  }

  /* ---------- loading a server ---------- */

  function nextServer(from) {
    var n = sources.length;
    for (var k = 1; k <= n; k++) {
      var i = (from + k) % n;
      if (!failed[i]) return i;
    }
    return -1;
  }

  function withTimeout(promise, ms) {
    var timer;
    var timeout = new Promise(function (resolve, reject) {
      timer = setTimeout(function () { reject(new Error("Timed out")); }, ms);
    });
    return Promise.race([promise, timeout]).then(
      function (value) { clearTimeout(timer); return value; },
      function (error) { clearTimeout(timer); throw error; }
    );
  }

  async function addSubtitles(source) {
    var list = Array.isArray(source.subtitles) ? source.subtitles : [];

    for (var i = 0; i < list.length; i++) {
      var sub = list[i];
      if (!sub || typeof sub.url !== "string") continue;

      try {
        await player.addTextTrackAsync(
          sub.url, sub.lang || "und", "subtitles", "text/vtt", "", sub.label || sub.lang || "Subtitles"
        );
      } catch (error) {
        console.warn("Could not add subtitle", sub.url, error);
      }
    }
  }

  function applySubtitlePreference() {
    var wanted = readJson(SUBLANG_KEY, "");
    if (!wanted) {
      player.setTextTrackVisibility(false);
      return;
    }

    var track = player.getTextTracks().find(function (t) { return t.language === wanted; });
    if (track) {
      player.selectTextTrack(track);
      player.setTextTrackVisibility(true);
    }
  }

  /* Returns true on success, false on failure. */
  async function playServer(index, startAt) {
    var token = ++loadToken;
    loading = true;

    showSpinner("Connecting to " + serverName(index) + "...");

    try {
      await withTimeout(player.load(sources[index].url, startAt > 1 ? startAt : null), 20000);

      if (token !== loadToken) return true;

      serverIndex = index;
      failed[index] = false;
      statusOk[index] = true;
      loading = false;

      await addSubtitles(sources[index]);
      applySubtitlePreference();

      show(spinner, false);
      show(errorBox, false);
      renderServers();
      renderSettings();

      if (startAt > 5) toast("Resumed from " + fmt(startAt));

      video.play().catch(function () { /* browser may block autoplay */ });
      return true;
    } catch (error) {
      console.warn("Server failed:", serverName(index), error);

      if (token !== loadToken) return true;

      failed[index] = true;
      statusOk[index] = false;
      loading = false;
      renderServers();
      return false;
    }
  }

  /* Tries servers one by one until one works. */
  async function autoPlay(startAt) {
    var i = nextServer(serverIndex);

    while (i >= 0) {
      var ok = await playServer(i, startAt);
      if (ok) return;
      toast(serverName(i) + " failed, trying next...");
      i = nextServer(i);
    }

    showError("None of the servers could play this episode right now.", false);
  }

  async function switchServer(index) {
    var startAt = video.currentTime || getResume();
    failed[index] = false;

    var ok = await playServer(index, startAt);

    if (!ok) {
      showError(serverName(index) + " is not available. Try another server.", sources.length > 1);
    }
  }

  function onPlayerError(event) {
    var detail = event && event.detail;
    console.error("Player error", detail);

    if (loading) return;
    if (!detail || detail.severity !== shaka.util.Error.Severity.CRITICAL) return;

    /* A source stopped working during playback: fall back to another one */
    var current = serverIndex;
    var startAt = video.currentTime;

    failed[current] = true;
    statusOk[current] = false;
    renderServers();

    var next = nextServer(current);

    if (next < 0) {
      showError("Playback failed and no other server is available.", false);
      return;
    }

    toast("Server failed, switching...");

    playServer(next, startAt).then(function (ok) {
      if (!ok) autoPlay(startAt);
    });
  }

  /* ---------- settings panel ---------- */

  function opt(kind, value, label, active) {
    return '<button class="opt' + (active ? " active" : "") + '" data-kind="' + kind +
      '" data-value="' + CX.esc(value) + '">' + CX.esc(label) + "</button>";
  }

  function renderSettings() {
    if (!player) return;

    var html = "";

    /* Speed */
    html += "<h4>Speed</h4>";
    [0.5, 0.75, 1, 1.25, 1.5, 2].forEach(function (rate) {
      html += opt("speed", rate, rate + "x", video.playbackRate === rate);
    });

    /* Quality */
    var tracks = player.getVariantTracks();
    var heights = [];
    tracks.forEach(function (t) {
      if (t.height && heights.indexOf(t.height) < 0) heights.push(t.height);
    });
    heights.sort(function (a, b) { return b - a; });

    html += "<h4>Quality</h4>";
    if (heights.length > 1) {
      var abrOn = player.getConfiguration().abr.enabled;
      var activeTrack = tracks.find(function (t) { return t.active; });

      html += opt("quality", "auto", "Auto", abrOn);
      heights.forEach(function (h) {
        html += opt("quality", h, h + "p", !abrOn && activeTrack && activeTrack.height === h);
      });
    } else {
      html += '<p class="note">This source has a single quality.</p>';
    }

    /* Subtitles */
    var texts = player.getTextTracks();
    html += "<h4>Subtitles</h4>";
    if (texts.length) {
      var visible = player.isTextTrackVisible();
      html += opt("sub", "off", "Off", !visible);
      texts.forEach(function (t) {
        html += opt("sub", t.id, t.label || t.language || "Track", visible && t.active);
      });
    } else {
      html += '<p class="note">No subtitles for this source.</p>';
    }

    /* Audio */
    var audios = player.getAudioLanguagesAndRoles();
    html += "<h4>Audio</h4>";
    if (audios.length > 1) {
      var currentTrack = tracks.find(function (t) { return t.active; });
      audios.forEach(function (a) {
        var label = (a.language || "und").toUpperCase() + (a.role ? " (" + a.role + ")" : "");
        html += opt("audio", a.language + "|" + (a.role || ""), label,
          currentTrack && currentTrack.language === a.language);
      });
    } else {
      html += '<p class="note">Single audio track.</p>';
    }

    /* Auto next */
    html += "<h4>Auto next episode</h4>";
    html += opt("autonext", "on", "On", autoNextEnabled());
    html += opt("autonext", "off", "Off", !autoNextEnabled());

    settingsBox.innerHTML = html;
  }

  function onSettingsClick(event) {
    var button = event.target.closest(".opt");
    if (!button || !player) return;

    var kind = button.getAttribute("data-kind");
    var value = button.getAttribute("data-value");

    if (kind === "speed") {
      video.playbackRate = parseFloat(value);
    }

    if (kind === "quality") {
      if (value === "auto") {
        player.configure({ abr: { enabled: true } });
      } else {
        var height = parseInt(value, 10);
        var tracks = player.getVariantTracks();
        var current = tracks.find(function (t) { return t.active; });

        var candidates = tracks.filter(function (t) {
          return t.height === height && (!current || t.language === current.language);
        }).sort(function (a, b) { return b.bandwidth - a.bandwidth; });

        if (candidates.length) {
          player.configure({ abr: { enabled: false } });
          player.selectVariantTrack(candidates[0], true);
        }
      }
    }

    if (kind === "sub") {
      if (value === "off") {
        player.setTextTrackVisibility(false);
        writeJson(SUBLANG_KEY, "");
      } else {
        var track = player.getTextTracks().find(function (t) { return String(t.id) === value; });
        if (track) {
          player.selectTextTrack(track);
          player.setTextTrackVisibility(true);
          writeJson(SUBLANG_KEY, track.language);
        }
      }
    }

    if (kind === "audio") {
      var parts = value.split("|");
      player.selectAudioLanguage(parts[0], parts[1] || undefined);
    }

    if (kind === "autonext") {
      writeJson(AUTONEXT_KEY, value === "on");
    }

    /* Wait a moment so the player can apply the change, then refresh the panel */
    setTimeout(renderSettings, 150);
  }

  /* ---------- controls ---------- */

  function showControls() {
    controls.classList.add("show");
    clearTimeout(hideTimer);

    if (!video.paused && settingsBox.classList.contains("hidden")) {
      hideTimer = setTimeout(function () { controls.classList.remove("show"); }, 3000);
    }
  }

  function toggleControls() {
    if (controls.classList.contains("show")) {
      controls.classList.remove("show");
      clearTimeout(hideTimer);
    } else {
      showControls();
    }
  }

  function togglePlay() {
    if (video.paused) {
      video.play().catch(function () { /* ignore */ });
    } else {
      video.pause();
    }
  }

  function toggleFullscreen() {
    var fsElement = document.fullscreenElement || document.webkitFullscreenElement;

    if (fsElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      try { screen.orientation.unlock(); } catch (e) { /* not supported */ }
      return;
    }

    var request = wrap.requestFullscreen || wrap.webkitRequestFullscreen;

    if (request) {
      var result = request.call(wrap);
      Promise.resolve(result).then(function () {
        try { screen.orientation.lock("landscape"); } catch (e) { /* not supported */ }
      }).catch(function () { /* ignore */ });
    } else if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
    }
  }

  function skip(seconds, side) {
    var duration = isFinite(video.duration) ? video.duration : Infinity;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));

    var bubble = side === "left" ? bubbleLeft : bubbleRight;
    bubble.classList.remove("show");
    void bubble.offsetWidth; /* restart the animation */
    bubble.classList.add("show");
  }

  /* Single tap: show/hide controls. Double tap left/right: seek 10 seconds. */
  var lastTapTime = 0;
  var lastTapSide = "";
  var tapTimer = null;

  tapLayer.addEventListener("click", function (event) {
    if (!settingsBox.classList.contains("hidden")) {
      show(settingsBox, false);
    }

    var rect = wrap.getBoundingClientRect();
    var x = (event.clientX - rect.left) / rect.width;
    var side = x < 0.4 ? "left" : (x > 0.6 ? "right" : "center");
    var now = Date.now();

    if (side !== "center" && side === lastTapSide && now - lastTapTime < 300) {
      clearTimeout(tapTimer);
      skip(side === "left" ? -10 : 10, side);
      lastTapTime = now;
      return;
    }

    lastTapTime = now;
    lastTapSide = side;

    clearTimeout(tapTimer);
    tapTimer = setTimeout(toggleControls, 300);
  });

  /* ---------- auto next episode ---------- */

  function cancelNext() {
    clearInterval(nextTimer);
    show(nextBox, false);
  }

  function onEnded() {
    try { localStorage.removeItem(POS_KEY); } catch (e) { /* ignore */ }

    var hasNext = airedCount ? episode < airedCount : false;
    if (!autoNextEnabled() || !hasNext) return;

    var seconds = 5;

    function draw() {
      nextBox.innerHTML =
        '<p class="font-bold">Next episode in ' + seconds + "s</p>" +
        '<div class="flex gap-2 mt-2">' +
        '<button id="next-now" class="btn-primary" style="padding:6px 12px;font-size:12px">Play now</button>' +
        '<button id="next-cancel" class="btn-ghost" style="padding:6px 12px;font-size:12px">Cancel</button>' +
        "</div>";

      $("next-now").onclick = function () { goToEpisode(episode + 1); };
      $("next-cancel").onclick = cancelNext;
    }

    show(nextBox, true);
    draw();

    nextTimer = setInterval(function () {
      seconds--;
      if (seconds <= 0) {
        clearInterval(nextTimer);
        goToEpisode(episode + 1);
        return;
      }
      draw();
    }, 1000);
  }

  /* ---------- wire up all events ---------- */

  function bindUi() {
    btnPlay.addEventListener("click", togglePlay);
    btnFullscreen.addEventListener("click", toggleFullscreen);

    btnPrev.addEventListener("click", function () { if (episode > 1) goToEpisode(episode - 1); });
    btnNext.addEventListener("click", function () { goToEpisode(episode + 1); });

    btnSettings.addEventListener("click", function () {
      renderSettings();
      settingsBox.classList.toggle("hidden");
      showControls();
    });
    settingsBox.addEventListener("click", onSettingsClick);

    video.addEventListener("play", function () {
      btnPlay.textContent = "⏸";
      cancelNext();
      showControls();
    });
    video.addEventListener("pause", function () {
      btnPlay.textContent = "▶";
  
