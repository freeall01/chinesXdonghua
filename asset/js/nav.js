/* =====================================
   chinesXdonghua - Navigation System
===================================== */

(() => {
    "use strict";

    const navbar = document.getElementById("navbar");

    const menuToggle = document.getElementById("menu-toggle");

    const mobileMenu = document.getElementById("mobile-menu");

    // ---------------------------------
    // Mobile Menu
    // ---------------------------------

    function openMenu() {
        if (!mobileMenu) return;

        mobileMenu.classList.add("active");

        menuToggle?.setAttribute("aria-expanded", "true");
    }

    function closeMenu() {
        if (!mobileMenu) return;

        mobileMenu.classList.remove("active");

        menuToggle?.setAttribute("aria-expanded", "false");
    }

    function toggleMenu() {
        if (!mobileMenu) return;

        mobileMenu.classList.contains("active")
            ? closeMenu()
            : openMenu();
    }

    menuToggle?.addEventListener("click", toggleMenu);

    mobileMenu?.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", closeMenu);
    });

    // ---------------------------------
    // Navbar Scroll Effect
    // ---------------------------------

    function handleScroll() {
        if (!navbar) return;

        if (window.scrollY > 30) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    }

    window.addEventListener("scroll", handleScroll, {
        passive: true
    });

    handleScroll();

    // ---------------------------------
    // Active Navigation
    // ---------------------------------

    function updateActiveNavigation() {
        const currentPage = location.pathname
            .split("/")
            .pop() || "index.html";

        document.querySelectorAll("[data-nav]").forEach(link => {
            const href = link.getAttribute("href");

            if (!href) return;

            const linkPage = href.split("?")[0];

            if (linkPage === currentPage) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
            } else {
                link.classList.remove("active");
                link.removeAttribute("aria-current");
            }
        });
    }

    updateActiveNavigation();

    // ---------------------------------
    // Search Navigation
    // ---------------------------------

    document.querySelectorAll("[data-open-search]")
        .forEach(button => {
            button.addEventListener("click", () => {
                window.location.href = "search.html";
            });
        });

    // ---------------------------------
    // Back To Top
    // ---------------------------------

    let backToTop = document.getElementById("back-to-top");

    if (!backToTop) {
        backToTop = document.createElement("button");

        backToTop.id = "back-to-top";

        backToTop.type = "button";

        backToTop.className = "back-to-top";

        backToTop.textContent = "↑";

        backToTop.setAttribute("aria-label", "Back to top");

        document.body.appendChild(backToTop);
    }

    function updateBackToTop() {
        backToTop.classList.toggle(
            "visible",
            window.scrollY > 400
        );
    }

    window.addEventListener("scroll", updateBackToTop, {
        passive: true
    });

    backToTop.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    updateBackToTop();

    // ---------------------------------
    // Escape Key
    // ---------------------------------

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

    // ---------------------------------
    // Close Menu Outside Click
    // ---------------------------------

    document.addEventListener("click", event => {
        if (!mobileMenu || !menuToggle) return;

        const clickedInsideMenu =
            mobileMenu.contains(event.target);

        const clickedToggle =
            menuToggle.contains(event.target);

        if (!clickedInsideMenu && !clickedToggle) {
            closeMenu();
        }
    });

    // ---------------------------------
    // Public API
    // ---------------------------------

    window.DonghuaNav = {
        openMenu,
        closeMenu,
        toggleMenu
    };

})();
