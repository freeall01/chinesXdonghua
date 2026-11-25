/* =====================================
   chinesXdonghua
   Navigation System
===================================== */

(function () {

    "use strict";


    /* =====================================
       ELEMENTS
    ===================================== */

    const navbar = document.getElementById("navbar");

    const menuToggle = document.getElementById("menu-toggle");

    const mobileMenu = document.getElementById("mobile-menu");


    /* =====================================
       MOBILE MENU
    ===================================== */

    function toggleMobileMenu() {

        if (!mobileMenu) return;

        mobileMenu.classList.toggle("hidden");

        const isOpen = !mobileMenu.classList.contains("hidden");

        if (menuToggle) {

            menuToggle.textContent = isOpen ? "✕" : "☰";

            menuToggle.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

        }

    }


    function closeMobileMenu() {

        if (!mobileMenu) return;

        mobileMenu.classList.add("hidden");

        if (menuToggle) {

            menuToggle.textContent = "☰";

            menuToggle.setAttribute("aria-expanded", "false");

        }

    }


    /* =====================================
       NAVBAR SCROLL EFFECT
    ===================================== */

    function handleNavbarScroll() {

        if (!navbar) return;

        if (window.scrollY > 30) {

            navbar.classList.add("shadow-xl");

        } else {

            navbar.classList.remove("shadow-xl");

        }

    }


    /* =====================================
       ACTIVE NAVIGATION
    ===================================== */

    function setActiveNavigation() {

        const currentPage = location.pathname
            .split("/")
            .pop() || "index.html";

        document.querySelectorAll("[data-nav]")
            .forEach(link => {

                const page = link.getAttribute("href");

                const active = page === currentPage;

                link.classList.toggle("text-brand", active);

                if (active) {

                    link.setAttribute("aria-current", "page");

                } else {

                    link.removeAttribute("aria-current");

                }

            });

    }


    /* =====================================
       CLOSE MENU ON LINK CLICK
    ===================================== */

    function bindMenuLinks() {

        if (!mobileMenu) return;

        mobileMenu.querySelectorAll("a")
            .forEach(link => {

                link.addEventListener("click", closeMobileMenu);

            });

    }


    /* =====================================
       SEARCH NAVIGATION
    ===================================== */

    function bindSearchButtons() {

        document.querySelectorAll("[data-open-search]")
            .forEach(button => {

                button.addEventListener("click", () => {

                    location.href = "search.html";

                });

            });

    }


    /* =====================================
       BACK TO TOP
    ===================================== */

    function createBackToTop() {

        let button = document.getElementById("back-to-top");

        if (!button) {

            button = document.createElement("button");

            button.id = "back-to-top";

            button.type = "button";

            button.textContent = "↑";

            button.setAttribute("aria-label", "Back to top");

            button.className = `
                fixed bottom-6 right-5 z-40
                w-12 h-12 rounded-full
                bg-brand text-white text-2xl
                shadow-xl
                hidden
            `;

            document.body.appendChild(button);

        }

        button.addEventListener("click", () => {

            window.scrollTo({

                top: 0,

                behavior: "smooth"

            });

        });

        window.addEventListener("scroll", () => {

            button.classList.toggle(
                "hidden",
                window.scrollY < 400
            );

        });

    }


    /* =====================================
       KEYBOARD SHORTCUTS
    ===================================== */

    function bindKeyboardShortcuts() {

        document.addEventListener("keydown", event => {

            if (
                event.target.matches("input, textarea") ||
                event.target.isContentEditable
            ) {
                return;
            }

            if (event.key === "Escape") {

                closeMobileMenu();

            }

        });

    }


    /* =====================================
       INITIALIZATION
    ===================================== */

    function init() {

        if (menuToggle) {

            menuToggle.addEventListener(
                "click",
                toggleMobileMenu
            );

        }

        window.addEventListener(
            "scroll",
            handleNavbarScroll
        );

        bindMenuLinks();

        bindSearchButtons();

        setActiveNavigation();

        createBackToTop();

        bindKeyboardShortcuts();

        handleNavbarScroll();

        console.log("Donghua Navigation Initialized.");

    }


    /* =====================================
       GLOBAL OBJECT
    ===================================== */

    window.DonghuaNav = {

        init: init,

        closeMenu: closeMobileMenu,

        toggleMenu: toggleMobileMenu,

        setActive: setActiveNavigation

    };


    /* =====================================
       START
    ===================================== */

    if (document.readyState === "loading") {

        document.addEventListener("DOMContentLoaded", init);

    } else {

        init();

    }

})();
