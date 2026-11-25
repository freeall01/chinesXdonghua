/* =========================================
   chinesXdonghua - Navigation System
   File: asset/js/nav.js
========================================= */

(function () {
    "use strict";

    const Nav = {

        // Website pages
        pages: {
            home: "index.html",
            anime: "anime.html",
            search: "search.html",
            schedule: "schedule.html",
            myList: "my-list.html"
        },

        // Initialize navigation
        init() {
            this.setActiveLink();
            this.setupMobileMenu();
            this.setupSearch();
            this.setupBackToTop();
            this.setupNavbarScroll();
        },

        // Highlight current page
        setActiveLink() {
            const currentPage =
                window.location.pathname.split("/").pop() || "index.html";

            document.querySelectorAll("[data-nav]").forEach(link => {
                const target = link.getAttribute("data-nav");

                if (this.pages[target] === currentPage) {
                    link.classList.add("active");
                    link.setAttribute("aria-current", "page");
                } else {
                    link.classList.remove("active");
                    link.removeAttribute("aria-current");
                }
            });
        },

        // Mobile navigation menu
        setupMobileMenu() {
            const menuButton = document.getElementById("menu-toggle");
            const mobileMenu = document.getElementById("mobile-menu");

            if (!menuButton || !mobileMenu) return;

            menuButton.addEventListener("click", () => {
                const isOpen =
                    mobileMenu.classList.toggle("menu-open");

                menuButton.setAttribute(
                    "aria-expanded",
                    String(isOpen)
                );

                menuButton.textContent = isOpen ? "✕" : "☰";
            });

            // Close menu after clicking a link
            mobileMenu.querySelectorAll("a").forEach(link => {
                link.addEventListener("click", () => {
                    mobileMenu.classList.remove("menu-open");
                    menuButton.setAttribute("aria-expanded", "false");
                    menuButton.textContent = "☰";
                });
            });
        },

        // Search navigation
        setupSearch() {
            const searchButtons =
                document.querySelectorAll("[data-open-search]");

            searchButtons.forEach(button => {
                button.addEventListener("click", () => {
                    window.location.href = this.pages.search;
                });
            });

            const searchForms =
                document.querySelectorAll("[data-search-form]");

            searchForms.forEach(form => {
                form.addEventListener("submit", event => {
                    event.preventDefault();

                    const input = form.querySelector("input");

                    if (!input || !input.value.trim()) return;

                    window.location.href =
                        this.pages.search +
                        "?q=" +
                        encodeURIComponent(input.value.trim());
                });
            });
        },

        // Back to top button
        setupBackToTop() {
            const button =
                document.getElementById("back-to-top");

            if (!button) return;

            window.addEventListener("scroll", () => {
                button.style.display =
                    window.scrollY > 400 ? "block" : "none";
            });

            button.addEventListener("click", () => {
                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            });
        },

        // Navbar scroll effect
        setupNavbarScroll() {
            const navbar =
                document.getElementById("navbar");

            if (!navbar) return;

            window.addEventListener("scroll", () => {
                navbar.classList.toggle(
                    "navbar-scrolled",
                    window.scrollY > 30
                );
            });
        }
    };

    // Global access
    window.DonghuaNav = Nav;

    // Start navigation
    document.addEventListener("DOMContentLoaded", () => {
        Nav.init();
    });

})();
