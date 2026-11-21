(() => {
  "use strict";

  const introScreen = document.getElementById("intro-screen");
  const gameScreen = document.getElementById("game-screen");
  const overScreen = document.getElementById("over-screen");
  const startButton = document.getElementById("start-button");
  const restartButton = document.getElementById("restart-button");
  const timerEl = document.getElementById("timer");
  const finalTimeEl = document.getElementById("final-time");
  const gameMessage = document.getElementById("game-message");
  const bestTimeEl = document.getElementById("best-time");
  const lossHeadline = document.getElementById("loss-headline");
  const newBestBadge = document.getElementById("new-best-badge");
  const ringProgress = document.getElementById("ring-progress");

  const BEST_KEY = "play-nothing-best-ms";
  const RING_CIRCUMFERENCE = 2 * Math.PI * 132;
  const MOVE_THRESHOLD_PX = 3;
  const ARM_DELAY_MS = 220;

  const whispers = [
    { at: 10, text: "Relax. It's literally your only job." },
    { at: 25, text: "Don't even think about touching that mouse." },
    { at: 50, text: "Your mouse misses you. Ignore" },
    { at: 90, text: "Doing nothing is harder than it looks, huh?" },
    { at: 180, text: "Your brain: Should we do something? You: NO." },
    { at: 300, text: "Five minutes of zero achievements. Beautiful." },
    { at: 600, text: "LinkedIn can't turn this into a success story." },
    { at: 1800, text: "You could've watched an entire episode. But here you are." },
    { at: 3600, text: "You've done absolutely nothing. And done it exceptionally." }
  ];

  const headlineMap = {
    move: "YOU MOVED.",
    click: "YOU CLICKED.",
    type: "YOU TYPED.",
    scroll: "YOU SCROLLED.",
    touch: "YOU TOUCHED.",
    drag: "YOU DRAGGED."
  };

  let state = "idle";
  let startedAt = 0;
  let rafId = 0;
  let armTimerId = 0;
  let whisperIndex = 0;
  let listenersAttached = false;
  let originX = null;
  let originY = null;

  function formatParts(ms) {
    const safeMs = Math.max(0, ms);
    const totalSeconds = Math.floor(safeMs / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    const hundredths = String(Math.floor((safeMs % 1000) / 10)).padStart(2, "0");
    return {
      main: `${hours}:${minutes}:${seconds}`,
      ms: hundredths
    };
  }

  function renderClock(el, ms) {
    const { main, ms: hundredths } = formatParts(ms);
    el.innerHTML = `${main}<span class="timer-ms">.${hundredths}</span>`;
  }

  function getBest() {
    try {
      return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  function saveBest(ms) {
    try {
      localStorage.setItem(BEST_KEY, String(Math.floor(ms)));
    } catch {
      // Ignore storage restrictions in private browsing.
    }
  }

  function updateBestLabel() {
    bestTimeEl.textContent = formatParts(getBest()).main;
  }

  function setBodyState(nextState) {
    document.body.classList.toggle("is-playing", nextState === "playing");
    document.body.classList.toggle("is-over", nextState === "over");
  }

  function showScreen(screen) {
    [introScreen, gameScreen, overScreen].forEach((el) => el.classList.add("hidden"));
    screen.classList.remove("hidden");
  }

  function setWhisper(text) {
    gameMessage.classList.add("is-fading");
    window.setTimeout(() => {
      if (state !== "playing") return;
      gameMessage.textContent = text;
      gameMessage.classList.remove("is-fading");
    }, 320);
  }

  function updateRing(elapsedMs) {
    const cycleProgress = (elapsedMs % 60000) / 60000;
    ringProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - cycleProgress));
  }

  function tick(now) {
    if (state !== "playing") return;
    const elapsed = now - startedAt;
    renderClock(timerEl, elapsed);
    updateRing(elapsed);

    const seconds = Math.floor(elapsed / 1000);
    if (whisperIndex < whispers.length && seconds >= whispers[whisperIndex].at) {
      setWhisper(whispers[whisperIndex].text);
      whisperIndex += 1;
    }

    rafId = requestAnimationFrame(tick);
  }

  function hasPointerMoved(x, y) {
    if (typeof x !== "number" || typeof y !== "number") return true;
    if (originX === null || originY === null) {
      originX = x;
      originY = y;
      return false;
    }
    return Math.hypot(x - originX, y - originY) >= MOVE_THRESHOLD_PX;
  }

  function onPointerMove(event) {
    if (event.pointerType === "mouse" || event.pointerType === "pen") {
      if (hasPointerMoved(event.clientX, event.clientY)) {
        eliminate("move");
      }
    }
  }

  function onMouseMove(event) {
    if (hasPointerMoved(event.clientX, event.clientY)) {
      eliminate("move");
    }
  }

  function onPointerDown(event) {
    eliminate(event.pointerType === "touch" ? "touch" : "click");
  }

  function onClick() {
    eliminate("click");
  }

  function onKey() {
    eliminate("type");
  }

  function onScroll() {
    eliminate("scroll");
  }

  function onTouch() {
    eliminate("touch");
  }

  function onDrag() {
    eliminate("drag");
  }

  function attachGameListeners() {
    if (listenersAttached) return;
    window.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
    window.addEventListener("mousemove", onMouseMove, { capture: true, passive: true });
    window.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    window.addEventListener("mousedown", onClick, { capture: true, passive: true });
    window.addEventListener("click", onClick, { capture: true, passive: true });
    window.addEventListener("dblclick", onClick, { capture: true, passive: true });
    window.addEventListener("contextmenu", onClick, { capture: true, passive: true });
    window.addEventListener("keydown", onKey, { capture: true, passive: true });
    window.addEventListener("keyup", onKey, { capture: true, passive: true });
    window.addEventListener("wheel", onScroll, { capture: true, passive: true });
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("touchstart", onTouch, { capture: true, passive: true });
    window.addEventListener("touchmove", onTouch, { capture: true, passive: true });
    window.addEventListener("touchend", onTouch, { capture: true, passive: true });
    window.addEventListener("dragstart", onDrag, { capture: true, passive: true });
    listenersAttached = true;
  }

  function detachGameListeners() {
    if (!listenersAttached) return;
    window.removeEventListener("pointermove", onPointerMove, true);
    window.removeEventListener("mousemove", onMouseMove, true);
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("mousedown", onClick, true);
    window.removeEventListener("click", onClick, true);
    window.removeEventListener("dblclick", onClick, true);
    window.removeEventListener("contextmenu", onClick, true);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("keyup", onKey, true);
    window.removeEventListener("wheel", onScroll, true);
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("touchstart", onTouch, true);
    window.removeEventListener("touchmove", onTouch, true);
    window.removeEventListener("touchend", onTouch, true);
    window.removeEventListener("dragstart", onDrag, true);
    listenersAttached = false;
  }

  function startGame(event) {
    if (state === "playing") return;

    cancelAnimationFrame(rafId);
    window.clearTimeout(armTimerId);
    detachGameListeners();

    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }

    // Record pointer origin from Start click to ignore phantom 0px moves on DOM swap.
    if (event && event.detail > 0) {
      originX = event.clientX;
      originY = event.clientY;
    } else {
      originX = null;
      originY = null;
    }

    state = "playing";
    startedAt = performance.now();
    whisperIndex = 0;

    gameMessage.classList.remove("is-fading");
    gameMessage.textContent = "Be still.";
    renderClock(timerEl, 0);
    ringProgress.style.strokeDasharray = String(RING_CIRCUMFERENCE);
    ringProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE);

    setBodyState("playing");
    showScreen(gameScreen);
    rafId = requestAnimationFrame(tick);

    // Brief settle window so the Start tap/click/key release doesn't immediately trigger a loss.
    armTimerId = window.setTimeout(() => {
      if (state === "playing") {
        attachGameListeners();
      }
    }, ARM_DELAY_MS);
  }

  function eliminate(reason) {
    if (state !== "playing") return;

    state = "over";
    const elapsed = Math.max(0, performance.now() - startedAt);

    cancelAnimationFrame(rafId);
    window.clearTimeout(armTimerId);
    detachGameListeners();

    const previousBest = getBest();
    const isNewBest = elapsed > previousBest && elapsed >= 1000;
    if (elapsed > previousBest) {
      saveBest(elapsed);
    }

    lossHeadline.textContent = headlineMap[reason] || "YOU MOVED.";
    renderClock(finalTimeEl, elapsed);
    newBestBadge.classList.toggle("hidden", !isNewBest);
    document.body.dataset.lossReason = reason;

    setBodyState("over");
    showScreen(overScreen);
    updateBestLabel();
  }

  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", startGame);

  document.addEventListener("contextmenu", (event) => {
    if (state === "playing") event.preventDefault();
  });

  updateBestLabel();
})();
