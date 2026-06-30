document.documentElement.classList.add("calendar-gate-enabled", "form-gate-enabled");

const startScreen = document.querySelector("#start-screen");
const inviteSlider = document.querySelector("#open-invite");
const musicButton = document.querySelector(".music-button");
const audio = document.querySelector("#wedding-audio");
const unlockAudio = document.querySelector("#unlock-audio");
const guestForm = document.querySelector("#guest-form");
const finalSection = document.querySelector("#final");
const reveals = document.querySelectorAll(".reveal");
const doodles = document.querySelectorAll(".doodle");
const programItems = document.querySelectorAll(".program-item");
const floatingHearts = document.querySelector(".floating-hearts");
const weddingDayButton = document.querySelector(".wedding-day");
const calendarSection = document.querySelector(".date-section");
let sliderDragging = false;
let sliderMax = 0;
let sliderRatio = 0;
let inviteUnlocking = false;
let calendarUnlocked = false;
let lastTouchY = 0;
let parallaxTicking = false;
let lastHeartBurst = 0;

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  {
    threshold: 0.18,
    rootMargin: "0px 0px -8% 0px",
  }
);

reveals.forEach((element) => revealObserver.observe(element));

programItems.forEach((item, index) => {
  item.style.setProperty("--item-index", index);
});

function updateDoodles() {
  doodles.forEach((doodle) => {
    const trigger = Number(doodle.dataset.showAt || 0);
    const active = window.scrollY + window.innerHeight * 0.55 > trigger && window.scrollY < trigger + 920;
    if (active) {
      doodle.classList.add("is-visible");
    } else {
      doodle.classList.remove("is-visible");
    }
  });
}

updateDoodles();
window.addEventListener("scroll", updateDoodles, { passive: true });

function updateParallax() {
  document.documentElement.style.setProperty("--page-parallax", `${Math.round(window.scrollY * -0.1)}px`);
  parallaxTicking = false;
}

function requestParallax() {
  if (parallaxTicking) return;
  parallaxTicking = true;
  window.requestAnimationFrame(updateParallax);
}

updateParallax();
window.addEventListener("scroll", requestParallax, { passive: true });

function spawnFloatingHearts(force = false) {
  if (!floatingHearts || document.body.classList.contains("is-locked")) return;

  const now = Date.now();
  if (!force && now - lastHeartBurst < 1800) return;
  lastHeartBurst = now;

  const side = Math.random() > 0.5 ? "right" : "left";
  const baseX = side === "right" ? 86 : 9;
  const colors = ["rgba(142, 116, 179, 0.54)", "rgba(184, 158, 211, 0.5)", "rgba(111, 86, 143, 0.46)"];

  for (let index = 0; index < 3; index += 1) {
    const heart = document.createElement("span");
    heart.className = "float-heart-burst";
    heart.style.setProperty("--x", `${baseX + (Math.random() * 8 - 4)}vw`);
    heart.style.setProperty("--y", `${54 + Math.random() * 18}vh`);
    heart.style.setProperty("--size", `${12 + Math.random() * 10}px`);
    heart.style.setProperty("--rotate", `${-18 + Math.random() * 34}deg`);
    heart.style.setProperty("--drift", `${(side === "right" ? -1 : 1) * (18 + Math.random() * 34)}px`);
    heart.style.setProperty("--color", colors[index % colors.length]);
    heart.style.animationDelay = `${index * 0.16}s`;
    floatingHearts.appendChild(heart);
    heart.addEventListener("animationend", () => heart.remove(), { once: true });
  }
}

const heartBurstObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
        spawnFloatingHearts();
      }
    });
  },
  {
    threshold: [0.52],
  }
);

document.querySelectorAll(".section").forEach((section) => heartBurstObserver.observe(section));

async function toggleMusic() {
  if (!audio) return;

  try {
    if (audio.paused) {
      await audio.play();
      musicButton.classList.add("is-playing");
      musicButton.setAttribute("aria-label", "Выключить музыку");
    } else {
      audio.pause();
      musicButton.classList.remove("is-playing");
      musicButton.setAttribute("aria-label", "Включить музыку");
    }
  } catch {
    musicButton.setAttribute("aria-label", "Музыка недоступна");
  }
}

async function openInvite() {
  if (startScreen?.classList.contains("is-opened")) return;

  document.body.classList.remove("is-locked");
  startScreen.classList.add("is-opened");
  document.querySelector(".first")?.classList.add("is-visible");
  window.setTimeout(() => spawnFloatingHearts(true), 520);

  if (audio) {
    try {
      await audio.play();
      musicButton.classList.add("is-playing");
      musicButton.setAttribute("aria-label", "Выключить музыку");
    } catch {
      musicButton.setAttribute("aria-label", "Включить музыку");
    }
  }
}

function setSliderProgress(value) {
  if (!inviteSlider) return;
  const clamped = Math.max(0, Math.min(value, sliderMax));
  const ratio = sliderMax ? clamped / sliderMax : 0;
  sliderRatio = ratio;
  inviteSlider.style.setProperty("--slider-x", `${clamped}px`);
  inviteSlider.style.setProperty("--slider-progress", `${ratio * 100}%`);
  inviteSlider.style.setProperty("--slider-ratio", ratio.toFixed(3));
}

function playUnlockSound() {
  return new Promise((resolve) => {
    if (!unlockAudio) {
      resolve();
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(fallbackTimer);
      unlockAudio.removeEventListener("ended", finish);
      resolve();
    };
    const fallbackTimer = window.setTimeout(finish, 4000);

    unlockAudio.currentTime = 0;
    unlockAudio.addEventListener("ended", finish, { once: true });
    unlockAudio.play().catch(finish);
  });
}

async function completeInviteUnlock() {
  if (inviteUnlocking || startScreen?.classList.contains("is-opened")) return;
  inviteUnlocking = true;
  setSliderProgress(sliderMax);
  inviteSlider?.classList.add("is-complete");

  await playUnlockSound();

  if (audio) {
    audio.currentTime = 0;
    audio.muted = false;
  }
  await openInvite();
}

function primeSliderAudio() {
  if (!audio || !audio.paused) return;

  audio.muted = true;
  audio.play().catch(() => {
    audio.muted = false;
  });
}

function cancelSliderAudio() {
  if (!audio?.muted) return;

  audio.pause();
  audio.currentTime = 0;
  audio.muted = false;
}

function startSliderDrag(event) {
  if (!inviteSlider) return;
  const rect = inviteSlider.getBoundingClientRect();
  sliderMax = Math.max(0, rect.width - 58);
  sliderDragging = true;
  primeSliderAudio();
  inviteSlider.classList.add("is-dragging");
  inviteSlider.setPointerCapture?.(event.pointerId);
  moveSliderDrag(event);
}

function moveSliderDrag(event) {
  if (!sliderDragging || !inviteSlider) return;
  const rect = inviteSlider.getBoundingClientRect();
  setSliderProgress(event.clientX - rect.left - 29);
}

function endSliderDrag(event) {
  if (!sliderDragging || !inviteSlider) return;
  if (event.type === "pointerup") {
    const rect = inviteSlider.getBoundingClientRect();
    setSliderProgress(event.clientX - rect.left - 29);
  }
  sliderDragging = false;
  inviteSlider.classList.remove("is-dragging");
  inviteSlider.releasePointerCapture?.(event.pointerId);

  if (event.type === "pointerup" && sliderRatio >= 0.98) {
    completeInviteUnlock();
  } else if (!startScreen.classList.contains("is-opened")) {
    cancelSliderAudio();
    setSliderProgress(0);
  }
}

inviteSlider?.addEventListener("pointerdown", startSliderDrag);
inviteSlider?.addEventListener("pointermove", moveSliderDrag);
inviteSlider?.addEventListener("pointerup", endSliderDrag);
inviteSlider?.addEventListener("pointercancel", endSliderDrag);
inviteSlider?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    const rect = inviteSlider.getBoundingClientRect();
    sliderMax = Math.max(0, rect.width - 58);
    primeSliderAudio();
    completeInviteUnlock();
  }
});

musicButton?.addEventListener("click", toggleMusic);

weddingDayButton?.addEventListener("click", () => {
  calendarUnlocked = true;
  document.body.classList.add("calendar-unlocked");
  calendarSection?.classList.add("is-unlocked");
  const programSection = document.querySelector("#program");
  programSection?.classList.add("is-visible");
  spawnFloatingHearts(true);
  window.requestAnimationFrame(() => {
    programSection?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
});

function isCalendarActive() {
  if (calendarUnlocked || !calendarSection) return false;
  const scrollLimit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return window.scrollY >= scrollLimit - 2;
}

function holdCalendar(event) {
  if (!isCalendarActive()) return;
  event.preventDefault();
}

window.addEventListener(
  "wheel",
  (event) => {
    if (event.deltaY > 0) holdCalendar(event);
  },
  { passive: false }
);

window.addEventListener(
  "touchstart",
  (event) => {
    lastTouchY = event.touches[0]?.clientY ?? 0;
  },
  { passive: true }
);

window.addEventListener(
  "touchmove",
  (event) => {
    const touchY = event.touches[0]?.clientY ?? lastTouchY;
    const swipingDownPage = touchY < lastTouchY;
    lastTouchY = touchY;
    if (swipingDownPage) holdCalendar(event);
  },
  { passive: false }
);

window.addEventListener("keydown", (event) => {
  const forwardKeys = ["ArrowDown", "PageDown", "Space", "End"];
  if (forwardKeys.includes(event.code) || forwardKeys.includes(event.key)) {
    holdCalendar(event);
  }
});

guestForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  button.textContent = "Спасибо ♥";
  button.disabled = true;
  document.body.classList.add("form-submitted");
  finalSection?.classList.add("is-visible");
  spawnFloatingHearts(true);
  window.requestAnimationFrame(() => {
    finalSection?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
});
