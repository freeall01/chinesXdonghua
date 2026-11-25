/* chinesXdonghua - app.js
   Shared code for every page: injects the navbar and footer.
   Phase 2 will add the AniList data loading here. */

(function () {
  "use strict";

  const NAV_ITEMS = [
    { label: "Home", href: "index.html" },
    { label: "Search", href: "search.html" },
    { label: "Schedule", href: "schedule.html" },
    { label: "My List", href: "my-list.html" }
  ];

  function currentPage() {
    const file = location.pathname.split("/").pop();
    return file || "index.html";
  }

  function renderNavbar() {
    const mount = document.getElementById("navbar");
    if (!mount) return;

    const page = currentPage();
    const links = NAV_ITEMS.map(function (item) {
      const active = item.href === page ? " active" : "";
      return '<a href="' + item.href + '" class="nav-link' + active + '">' + item.label + "</a>";
    }).join("");

    mount.innerHTML =
      '<header id="site-nav" class="glass-nav fixed top-0 inset-x-0 z-50">' +
      '  <div class="max-w-7xl mx-auto h-16 px-4 flex items-center justify-between gap-4">' +
      '    <a href="index.html" class="text-lg font-extrabold tracking-tight">' +
      '      chines<span class="text-accent">X</span>donghua' +
      "    </a>" +
      '    <nav class="flex items-center gap-4 sm:gap-6">' + links + "</nav>" +
      "  </div>" +
      "</header>";

    const nav = document.getElementById("site-nav");
    function onScroll() {
      nav.classList.toggle("scrolled", window.scrollY > 10);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function renderFooter() {
    const mount = document.getElementById("footer");
    if (!mount) return;

    mount.innerHTML =
      '<footer class="site-footer">' +
      '  <div class="max-w-7xl mx-auto px-4 py-8 text-center text-xs text-gray-500">' +
      '    <p class="font-semibold text-gray-300">chines<span class="text-accent">X</span>donghua</p>' +
      '    <p class="mt-2">Metadata provided by AniList. This site does not host video files.</p>' +
      "  </div>" +
      "</footer>";
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderNavbar();
    renderFooter();
  });
})();

