// =====================================================
// script.js — everything that MOVES or REACTS on the page
// Each block is one small feature. Read them one at a time.
// =====================================================

// Does the visitor prefer less motion? (a setting on their phone/computer)
const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

// ---------- 1. Footer year + live Lagos clock ----------
document.getElementById("year").textContent = new Date().getFullYear();

const clockEl = document.getElementById("clock");
function updateClock() {
  clockEl.textContent = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  }).format(new Date());
}
updateClock();
setInterval(updateClock, 30000); // refresh every 30 seconds

// ---------- 2. Barcode that encodes your name ----------
// Every letter has a number code (K = 75). We write that number in binary
// (75 = 01001011) and draw: 1 = thick bar, 0 = thin bar.
const barcodeEl = document.getElementById("barcode");
const text = "KENNY.DEV";

const bits = [...text]
  .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
  .join("");

// Build a list of pieces: [bar, gap, bar, gap, ...] with their widths
const pieces = [];
[...bits].forEach((bit) => {
  pieces.push({ type: "bar", width: bit === "1" ? 3 : 1 });
  pieces.push({ type: "gap", width: 1.5 });
});

// Convert widths to percentages so the barcode always fills its box
const totalWidth = pieces.reduce((sum, p) => sum + p.width, 0);

pieces.forEach((piece, i) => {
  const el = document.createElement("span");
  el.style.width = (piece.width / totalWidth) * 100 + "%";
  if (piece.type === "gap") el.classList.add("gap");
  el.style.animationDelay = 0.5 + i * 0.006 + "s"; // bars grow one after another
  barcodeEl.appendChild(el);
});

// ---------- 3. Marquee: duplicate the words so the loop is seamless ----------
const track = document.querySelector(".marquee-track");
track.innerHTML += track.innerHTML;

// ---------- 4. Scroll effects: progress bar, header, hero parallax ----------
const header = document.querySelector(".site-header");
const progress = document.querySelector(".progress");
const heroTitle = document.querySelector(".hero-title");
let lastScrollY = 0;

function onScroll() {
  const y = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

  // Progress bar: 0 at the top, 1 at the bottom
  progress.style.transform = `scaleX(${maxScroll > 0 ? y / maxScroll : 0})`;

  // Header gets a background once you leave the top
  header.classList.toggle("scrolled", y > 40);

  // Hide header when scrolling DOWN, show it when scrolling UP
  const goingDown = y > lastScrollY;
  const menuOpen = document.body.classList.contains("menu-open");
  header.classList.toggle("hidden", goingDown && y > 300 && !menuOpen);
  lastScrollY = y;

  // Hero title drifts up slower than the page and fades out (parallax)
  if (!reduceMotion && y < window.innerHeight) {
    heroTitle.style.transform = `translateY(${y * 0.25}px)`;
    heroTitle.style.opacity = 1 - (y / window.innerHeight) * 0.9;
  }
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ---------- 5. Mobile menu ----------
const toggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelectorAll(".nav a");

function setMenu(open) {
  document.body.classList.toggle("menu-open", open);
  toggle.setAttribute("aria-expanded", open);
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}
toggle.addEventListener("click", () => {
  setMenu(!document.body.classList.contains("menu-open"));
});
navLinks.forEach((link) =>
  link.addEventListener("click", () => setMenu(false)),
);

// ---------- 6. Reveal elements as they scroll into view ----------
// IntersectionObserver = the browser tells us when an element appears on screen.
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target); // animate only once
      }
    });
  },
  { threshold: 0.15 },
); // 15% of the element must be visible

document
  .querySelectorAll(".reveal")
  .forEach((el) => revealObserver.observe(el));

// ---------- 7. Highlight the menu link for the section you're reading ----------
const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((link) => {
          link.classList.toggle(
            "active",
            link.getAttribute("href") === "#" + entry.target.id,
          );
        });
      }
    });
  },
  { rootMargin: "-45% 0px -50% 0px" },
); // "in the middle band of the screen"

document
  .querySelectorAll("main section[id]")
  .forEach((section) => navObserver.observe(section));

// ---------- 8. Count-up numbers in the About stats ----------
const countObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const el = entry.target;
      const target = Number(el.dataset.count);
      const duration = 1500; // milliseconds
      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // fast start, slow finish
        el.textContent = Math.round(target * eased);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      countObserver.unobserve(el);
    });
  },
  { threshold: 0.6 },
);

document
  .querySelectorAll("[data-count]")
  .forEach((el) => countObserver.observe(el));

// ---------- 9. Copy email to clipboard ----------
const emailBtn = document.querySelector(".email-btn");
const emailHint = emailBtn.querySelector(".email-hint");

emailBtn.addEventListener("click", () => {
  const email = emailBtn.dataset.email;
  navigator.clipboard
    .writeText(email)
    .then(() => {
      emailHint.textContent = "Copied ✓";
      setTimeout(() => (emailHint.textContent = "Click to copy"), 2000);
    })
    .catch(() => {
      window.location.href = "mailto:" + email; // fallback: open email app
    });
});

// ---------- 10. Magnetic button (desktop mice only) ----------
// The button gently follows your cursor when you hover near it.
if (window.matchMedia("(hover: hover)").matches && !reduceMotion) {
  document.querySelectorAll(".magnetic").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${x * 0.2}px, ${y * 0.3}px)`;
    });
    el.addEventListener("mouseleave", () => (el.style.transform = ""));
  });
}
