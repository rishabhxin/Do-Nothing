(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const el = {
    intro: $("intro-screen"),
    game: $("game-screen"),
    over: $("over-screen"),
    start: $("start-button"),
    restart: $("restart-button"),
    timer: $("timer"),
    final: $("final-time"),
    message: $("game-message"),
    best: $("best-time"),
    streak: $("streak-count"),
    headline: $("loss-headline"),
    badge: $("new-best-badge"),
    challengeBadge: $("challenge-result-badge"),
    challengeBanner: $("challenge-banner"),
    ring: $("ring-progress"),
    mode: $("mode-select"),
    stage: $("timer-stage"),
    modeLabel: $("mode-label"),
    survival: $("survival-label"),
    footerHint: $("footer-hint"),
    events: $("event-counter"),
    panel: $("info-panel"),
    panelEyebrow: $("panel-eyebrow"),
    panelTitle: $("panel-title"),
    panelContent: $("panel-content"),
    toast: $("toast"),
    notification: $("notification-layer"),
    fake: $("fake-overlay"),
    temptation: $("temptation"),
    fakeOs: $("fake-os"),
    fakeOsTitle: $("fake-os-title"),
    fakeOsHeading: $("fake-os-heading"),
    fakeOsBody: $("fake-os-body"),
    fakeOsBtn1: $("fake-os-btn-1"),
    fakeOsBtn2: $("fake-os-btn-2"),
    ghostCursor: $("ghost-cursor"),
    speck: $("screen-speck"),
    sound: $("sound-toggle"),
    ambient: $("ambient-toggle")
  };

  const KEY = "do-nothing-v3";
  const LEGACY_KEY = "do-nothing-v2";
  const C = 2 * Math.PI * 132;

  const MODES = {
    normal: "NORMAL",
    hardcore: "HARDCORE",
    blind: "BLIND",
    anxiety: "ANXIETY",
    invisible: "INVISIBLE",
    minute: "ONE MINUTE",
    impossible: "IMPOSSIBLE",
    tilt: "PHONE TILT",
    zen: "ZEN"
  };

  const CAUSE_LABELS = {
    move: "Mouse moved",
    click: "Clicked",
    type: "Key pressed",
    scroll: "Scrolled",
    touch: "Screen touched",
    drag: "Dragged",
    tab: "Switched tab",
    tilt: "Phone tilted"
  };

  const HEADLINES = {
    move: "YOU MOVED.",
    click: "YOU CLICKED.",
    type: "YOU TYPED.",
    scroll: "YOU SCROLLED.",
    touch: "YOU TOUCHED.",
    drag: "YOU DRAGGED.",
    tab: "YOU LEFT THE TAB.",
    tilt: "YOU TILTED."
  };

  const whispers = [
    "Relax. It's literally your only job.",
    "Don't even think about touching that mouse.",
    "Your mouse misses you. Ignore it.",
    "Doing nothing is harder than it looks, huh?",
    "Your brain: Should we do something? You: NO.",
    "Five minutes of zero achievements. Beautiful.",
    "LinkedIn can't turn this into a success story.",
    "You could've watched an entire episode. But here you are.",
    "Your hand just twitched. We saw that.",
    "Imagine explaining this to your future self.",
    "You are currently winning at absolutely nothing.",
    "Somewhere, someone is being productive. Not you. Good.",
    "Don't check the time. Oh wait, you can't.",
    "Is this meditation or a cry for help?",
    "You have become one with the chair."
  ];

  const notifications = [
    ["YOUR PHONE", "You have 17 unread messages. Probably important."],
    ["BANK ALERT", "Your imaginary cashback is waiting."],
    ["YOUR BOSS", "Quick question. Are you free for a second?"],
    ["UNKNOWN NUMBER", "We need to talk."],
    ["SOCIAL MEDIA", "Someone just posted something you need to see."],
    ["SYSTEM", "Your patience subscription is about to expire."],
    ["YOUR FRIEND", "Bro. Are you alive?"],
    ["URGENT", "You have been selected for absolutely nothing."]
  ];

  const fakeOsAlerts = [
    ["Browser Alert", "Page Unresponsive", "Do Nothing is not responding. You can wait for it or exit the page.", "Wait", "Exit Page"],
    ["System Power", "Battery Critically Low (2%)", "Your device will sleep soon unless plugged in immediately.", "Dismiss", "Power Options"],
    ["System Update", "Restart Required", "Your device needs to restart in 10 seconds to finish updates.", "Later", "Restart Now"],
    ["Security Check", "Unusual Activity Detected", "Someone tried to be productive on your device.", "Ignore", "Verify"]
  ];

  const achievements = [
    ["🥉", "The Beginner", "Survive 30 seconds", 30],
    ["🥈", "The Patient", "Survive 2 minutes", 120],
    ["🧘", "Unbothered", "Survive 5 minutes", 300],
    ["🥇", "The Monk", "Survive 10 minutes", 600],
    ["🪨", "Stone Cold", "Survive 15 minutes", 900],
    ["👑", "The Legend", "Survive 1 hour", 3600],
    ["🫥", "Invisible", "Survive 60 seconds in Blind Mode", 60, "blind"],
    ["🔥", "No Fear", "Survive 2 minutes in Hardcore", 120, "hardcore"],
    ["📱", "Flat Surface", "Survive 60 seconds in Phone Tilt Mode", 60, "tilt"],
    ["🍃", "Pure Stillness", "Survive 3 minutes in Zen Mode", 180, "zen"]
  ];

  let state = "idle";
  let startAt = 0;
  let raf = 0;
  let arm = 0;
  let whisperAt = 0;
  let lastPointer = null;
  let lastAccel = null;
  let events = 0;
  let eventTimers = [];
  let heartbeatTimer = null;
  let ghostRaf = 0;
  let speckRaf = 0;
  let soundOn = true;
  let ambientOn = false;
  let audio = null;
  let ambientSource = null;
  let ambientGain = null;
  let mode = "normal";
  let best = 0;
  let lastRun = { ms: 0, mode: "normal", reason: "move", won: false, events: 0 };
  let activeChallenge = null;

  function defaultData() {
    return {
      best: 0,
      records: [],
      unlocked: [],
      streak: 0,
      lastDay: "",
      dailyDone: false,
      totalMs: 0,
      runs: 0,
      causes: {}
    };
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
      if (!raw) return defaultData();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultData(), parsed, {
        causes: Object.assign({}, parsed.causes || {})
      });
    } catch {
      return defaultData();
    }
  }

  let data = loadData();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }

  function fmt(ms) {
    const s = Math.floor(ms / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, "0");
    return `${h}:${m}:${sec}<span class="timer-ms">.${cs}</span>`;
  }

  function fmtPlain(ms) {
    const s = Math.floor(ms / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  }

  function fmtHuman(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ${s % 60}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }

  function seconds(ms) { return Math.floor(ms / 1000); }

  function show(screen) {
    [el.intro, el.game, el.over].forEach(x => x.classList.add("hidden"));
    screen.classList.remove("hidden");
  }

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.remove("hidden");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.toast.classList.add("hidden"), 2600);
  }

  /* ---------------- Audio Engine (Web Audio API) ---------------- */
  function getAudio() {
    if (!audio) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audio = new Ctx();
    }
    if (audio && audio.state === "suspended") {
      audio.resume().catch(() => {});
    }
    return audio;
  }

  function tone(freq = 520, duration = 0.08, gainLevel = 0.035, type = "sine") {
    if (!soundOn) return;
    try {
      const ctx = getAudio();
      if (!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gainLevel;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + duration);
      o.stop(ctx.currentTime + duration);
    } catch {}
  }

  function playNotificationPing() {
    if (!soundOn) return;
    tone(880, 0.09, 0.03, "sine");
    setTimeout(() => tone(1174.66, 0.14, 0.025, "sine"), 85);
  }

  function playHeartbeatPulse() {
    if (!soundOn || state !== "playing") return;
    tone(62, 0.11, 0.055, "sine");
    setTimeout(() => {
      if (state === "playing") tone(54, 0.14, 0.04, "sine");
    }, 155);
  }

  function startHeartbeatLoop() {
    if (mode === "zen") return;
    const beat = () => {
      if (state !== "playing") return;
      const elapsedSec = seconds(performance.now() - startAt);
      if (elapsedSec >= 20) {
        playHeartbeatPulse();
      }
      // Subtle acceleration from 1250ms down to 680ms as time increases
      const nextDelay = Math.max(680, 1250 - elapsedSec * 4.5);
      heartbeatTimer = setTimeout(beat, nextDelay);
    };
    heartbeatTimer = setTimeout(beat, 20000);
  }

  function toggleAmbientRain() {
    try {
      const ctx = getAudio();
      if (!ctx) {
        toast("Audio unavailable.");
        return;
      }
      if (ambientOn) {
        if (ambientGain) {
          ambientGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
          const src = ambientSource;
          setTimeout(() => { try { src && src.stop(); } catch {} }, 380);
        }
        ambientSource = null;
        ambientGain = null;
        ambientOn = false;
        el.ambient.classList.remove("is-active");
        el.ambient.title = "Ambient rain: Off";
        toast("Ambient rain off");
        return;
      }

      // Generate seamless 4-second brown-noise buffer (soft rain feel)
      const duration = 4;
      const sampleRate = ctx.sampleRate;
      const length = sampleRate * duration;
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const output = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 2.4;
      }
      // Smooth crossfade at loop seam
      const fadeSamples = Math.floor(sampleRate * 0.15);
      for (let i = 0; i < fadeSamples; i++) {
        const k = i / fadeSamples;
        output[length - fadeSamples + i] =
          output[length - fadeSamples + i] * (1 - k) + output[i] * k;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 520;

      const gain = ctx.createGain();
      gain.gain.value = 0.001;
      gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.6);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      ambientSource = source;
      ambientGain = gain;
      ambientOn = true;
      el.ambient.classList.add("is-active");
      el.ambient.title = "Ambient rain: On";
      toast("Ambient rain on");
    } catch {
      toast("Unable to start ambient audio.");
    }
  }

  /* ---------------- UI Helpers ---------------- */
  function setMessage(t) {
    el.message.style.opacity = "0";
    setTimeout(() => {
      if (state === "playing") {
        el.message.textContent = t;
        el.message.style.opacity = "1";
      }
    }, 250);
  }

  function updateHeaderStats() {
    el.best.textContent = best ? fmtPlain(best) : "00:00:00";
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const activeStreak = (data.lastDay === today || data.lastDay === yesterday) ? (data.streak || 0) : 0;
    el.streak.textContent = `${activeStreak}d`;
  }

  function clearEvents() {
    eventTimers.forEach(clearTimeout);
    eventTimers = [];
    clearTimeout(arm);
    clearTimeout(heartbeatTimer);
    cancelAnimationFrame(raf);
    cancelAnimationFrame(ghostRaf);
    cancelAnimationFrame(speckRaf);
    el.notification.innerHTML = "";
    el.fake.classList.add("hidden");
    el.temptation.classList.add("hidden");
    el.fakeOs.classList.add("hidden");
    el.ghostCursor.classList.add("hidden");
    el.speck.classList.add("hidden");
    document.body.classList.remove("event-glitch", "event-flash");
  }

  function later(fn, ms) {
    const t = setTimeout(() => {
      if (state === "playing") fn();
    }, ms);
    eventTimers.push(t);
  }

  function rand(a) { return a[Math.floor(Math.random() * a.length)]; }

  function bumpEvents() {
    events++;
    el.events.textContent = `DISTRACTIONS: ${events}`;
  }

  /* ---------------- Psychological Traps ---------------- */
  function addNotification() {
    const [title, body] = rand(notifications);
    const n = document.createElement("div");
    n.className = "fake-notification";
    n.innerHTML = `<small>${title}</small><strong>${body.split(".")[0]}</strong><p>${body}</p>`;
    el.notification.appendChild(n);
    playNotificationPing();
    later(() => n.remove(), 4800);
    bumpEvents();
  }

  function fakeGameOver() {
    el.fake.classList.remove("hidden");
    tone(180, 0.2);
    bumpEvents();
    later(() => {
      el.fake.classList.add("hidden");
      setMessage("Still playing. You almost fell for that.");
    }, 1800);
  }

  function glitch() {
    document.body.classList.add("event-glitch");
    bumpEvents();
    later(() => document.body.classList.remove("event-glitch"), 700);
    setMessage("Did the screen just move?");
  }

  function showTemptation() {
    el.temptation.classList.remove("hidden");
    tone(600, 0.15);
    bumpEvents();
    later(() => el.temptation.classList.add("hidden"), 4200);
  }

  function showFakeOsAlert() {
    const [title, heading, body, b1, b2] = rand(fakeOsAlerts);
    el.fakeOsTitle.textContent = title;
    el.fakeOsHeading.textContent = heading;
    el.fakeOsBody.textContent = body;
    el.fakeOsBtn1.textContent = b1;
    el.fakeOsBtn2.textContent = b2;
    el.fakeOs.classList.remove("hidden");
    tone(420, 0.14, 0.04, "triangle");
    bumpEvents();
    later(() => el.fakeOs.classList.add("hidden"), 3800);
  }

  function spawnGhostCursor() {
    cancelAnimationFrame(ghostRaf);
    const w = window.innerWidth;
    const h = window.innerHeight;
    let x = Math.random() < 0.5 ? w * 0.15 : w * 0.85;
    let y = Math.random() * h * 0.7 + h * 0.15;
    const tx = w * (0.35 + Math.random() * 0.3);
    const ty = h * (0.35 + Math.random() * 0.3);
    const start = performance.now();
    const duration = 3600;
    el.ghostCursor.classList.remove("hidden");
    bumpEvents();

    const step = now => {
      if (state !== "playing") {
        el.ghostCursor.classList.add("hidden");
        return;
      }
      const p = Math.min(1, (now - start) / duration);
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const wobble = Math.sin(p * Math.PI * 3) * 18;
      const cx = x + (tx - x) * ease + wobble;
      const cy = y + (ty - y) * ease + Math.cos(p * Math.PI * 2) * 10;
      el.ghostCursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      if (p < 1) {
        ghostRaf = requestAnimationFrame(step);
      } else {
        later(() => el.ghostCursor.classList.add("hidden"), 700);
      }
    };
    ghostRaf = requestAnimationFrame(step);
  }

  function spawnScreenSpeck() {
    cancelAnimationFrame(speckRaf);
    const rect = el.stage.getBoundingClientRect();
    let x = rect.left + rect.width * (0.2 + Math.random() * 0.6);
    let y = rect.top + rect.height * (0.2 + Math.random() * 0.6);
    let vx = (Math.random() - 0.5) * 1.1;
    let vy = (Math.random() - 0.5) * 1.1;
    const start = performance.now();
    const duration = 5200;
    el.speck.classList.remove("hidden");
    bumpEvents();

    const step = now => {
      if (state !== "playing") {
        el.speck.classList.add("hidden");
        return;
      }
      if (now - start >= duration) {
        el.speck.classList.add("hidden");
        return;
      }
      // Subtle erratic insect-like drift
      if (Math.random() < 0.08) {
        vx += (Math.random() - 0.5) * 0.9;
        vy += (Math.random() - 0.5) * 0.9;
        vx = Math.max(-1.4, Math.min(1.4, vx));
        vy = Math.max(-1.4, Math.min(1.4, vy));
      }
      x += vx;
      y += vy;
      el.speck.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      speckRaf = requestAnimationFrame(step);
    };
    speckRaf = requestAnimationFrame(step);
  }

  function scheduleEvents() {
    if (mode === "zen") return; // Zen mode has zero distractions

    const interval = (mode === "impossible" || mode === "anxiety") ? 14000 : 24000;
    const schedule = () => {
      if (state !== "playing") return;
      const intensePool = [
        addNotification,
        addNotification,
        glitch,
        fakeGameOver,
        showTemptation,
        showFakeOsAlert,
        spawnGhostCursor,
        spawnScreenSpeck,
        () => setMessage("Someone just mentioned your name.")
      ];
      const standardPool = [
        addNotification,
        glitch,
        fakeGameOver,
        showFakeOsAlert,
        spawnGhostCursor,
        spawnScreenSpeck,
        () => setMessage(rand([
          "You can leave now.",
          "Nobody is watching.",
          "Just one click won't hurt.",
          "Are you seriously still here?"
        ]))
      ];
      const pool = (mode === "anxiety" || mode === "impossible") ? intensePool : standardPool;
      rand(pool)();
      later(schedule, interval + Math.random() * 10000);
    };

    later(schedule, mode === "impossible" ? 8000 : 13000);
    if (mode === "anxiety" || mode === "impossible") {
      later(() => { if (state === "playing") addNotification(); }, 4500);
    }
    startHeartbeatLoop();
  }

  /* ---------------- Input & Motion Detection ---------------- */
  function pointerMove(e) {
    if (e.pointerType === "touch") return;
    const x = e.clientX;
    const y = e.clientY;
    if (lastPointer) {
      const d = Math.hypot(x - lastPointer.x, y - lastPointer.y);
      const threshold = (mode === "hardcore" || mode === "impossible") ? 1 : 3;
      if (d >= threshold) {
        endGame("move");
        return;
      }
    }
    lastPointer = { x, y };
  }

  function onDown(e) { endGame(e.pointerType === "touch" ? "touch" : "click"); }
  function onKey() { endGame("type"); }
  function onScroll() { endGame("scroll"); }
  function onTouch() { endGame("touch"); }
  function onDrag() { endGame("drag"); }

  function onDeviceMotion(e) {
    if (state !== "playing" || mode !== "tilt") return;
    const acc = e.accelerationIncludingGravity || e.acceleration;
    if (!acc || acc.x == null) return;
    const cur = { x: acc.x, y: acc.y || 0, z: acc.z || 0 };
    if (lastAccel) {
      const delta = Math.hypot(cur.x - lastAccel.x, cur.y - lastAccel.y, cur.z - lastAccel.z);
      if (delta > 0.65) {
        endGame("tilt");
        return;
      }
    }
    lastAccel = cur;
  }

  function attach() {
    window.addEventListener("pointermove", pointerMove, true);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("wheel", onScroll, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("touchstart", onTouch, { capture: true, passive: true });
    window.addEventListener("dragstart", onDrag, true);
    if (mode === "tilt") {
      window.addEventListener("devicemotion", onDeviceMotion, true);
    }
  }

  function detach() {
    window.removeEventListener("pointermove", pointerMove, true);
    window.removeEventListener("pointerdown", onDown, true);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("wheel", onScroll, true);
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("touchstart", onTouch, true);
    window.removeEventListener("dragstart", onDrag, true);
    window.removeEventListener("devicemotion", onDeviceMotion, true);
  }

  /* ---------------- Core Game Loop ---------------- */
  function gameTick(now) {
    if (state !== "playing") return;
    const elapsed = now - startAt;
    const sec = seconds(elapsed);
    el.timer.innerHTML = fmt(elapsed);

    const p = (elapsed % 60000) / 60000;
    el.ring.style.strokeDashoffset = String(C * (1 - p));

    if (whisperAt < Math.min(whispers.length, Math.floor(sec / 16) + 1)) {
      setMessage(whispers[whisperAt++]);
    }
    if (mode === "blind") {
      el.stage.classList.add("timer-hidden");
    }
    if (mode === "invisible" && sec >= 30) {
      el.stage.classList.add("timer-hidden");
    }
    if (mode === "minute") {
      const left = Math.max(0, 60000 - elapsed);
      el.survival.textContent = left > 0 ? `SURVIVE ${Math.ceil(left / 1000)}s` : "YOU MADE IT";
      if (elapsed >= 60000) {
        win();
        return;
      }
    } else if (activeChallenge && activeChallenge.mode === mode) {
      const left = Math.max(0, activeChallenge.ms - elapsed);
      el.survival.textContent = left > 0 ? `TARGET ${fmtPlain(left)}` : "CHALLENGE BEATEN";
    }

    raf = requestAnimationFrame(gameTick);
  }

  async function startGame() {
    if (state === "playing") return;
    mode = el.mode.value;

    // Request iOS 13+ DeviceMotion permission inside user gesture
    if (mode === "tilt") {
      if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
        try {
          const res = await DeviceMotionEvent.requestPermission();
          if (res !== "granted") {
            toast("Motion sensor permission denied.");
            return;
          }
        } catch {
          toast("Motion sensor permission required.");
          return;
        }
      } else if (typeof window.DeviceMotionEvent === "undefined") {
        toast("No gyroscope detected — mouse/touch still monitored.");
      }
    }

    clearEvents();
    detach();
    state = "playing";
    startAt = performance.now();
    whisperAt = 0;
    events = 0;
    lastPointer = null;
    lastAccel = null;

    el.events.textContent = mode === "zen" ? "ZEN · NO DISTRACTIONS" : "DISTRACTIONS: 0";
    el.modeLabel.textContent = `${MODES[mode]} MODE`;
    el.survival.textContent = mode === "minute"
      ? "SURVIVE 60s"
      : (activeChallenge && activeChallenge.mode === mode ? `BEAT ${fmtPlain(activeChallenge.ms)}` : "STAY ALIVE");
    el.footerHint.textContent = mode === "tilt" ? "SET YOUR PHONE DOWN STILL" : "DO NOT TOUCH ANYTHING";
    el.stage.classList.toggle("timer-hidden", mode === "blind");
    el.message.textContent = mode === "tilt" ? "Set it down. Don't breathe on it." : "Be still.";
    el.timer.innerHTML = fmt(0);
    el.ring.style.strokeDasharray = String(C);
    el.ring.style.strokeDashoffset = String(C);

    document.body.classList.add("is-playing");
    document.body.classList.remove("is-over");
    show(el.game);
    tone(440);
    raf = requestAnimationFrame(gameTick);

    // Arm delay: give Phone Tilt mode 1.2s to set phone down, standard modes 450ms
    const armDelay = mode === "tilt" ? 1200 : 450;
    arm = setTimeout(() => {
      if (state === "playing") {
        attach();
        scheduleEvents();
      }
    }, armDelay);
  }

  function rank(ms) {
    const s = seconds(ms);
    if (s >= 3600) return "LEGEND";
    if (s >= 900) return "STONE COLD";
    if (s >= 600) return "THE MONK";
    if (s >= 300) return "UNBOTHERED";
    if (s >= 120) return "PATIENT";
    if (s >= 30) return "BEGINNER";
    return "WARM-UP";
  }

  function updateAchievements(ms) {
    achievements.forEach(a => {
      if (seconds(ms) >= a[3] && (!a[4] || a[4] === mode) && !data.unlocked.includes(a[1])) {
        data.unlocked.push(a[1]);
        toast("Achievement unlocked: " + a[1]);
        tone(880, 0.18);
      }
    });
  }

  function record(ms, reason, won = false) {
    const day = new Date().toISOString().slice(0, 10);
    if (data.lastDay !== day) {
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      data.streak = data.lastDay === y ? (data.streak || 0) + 1 : 1;
      data.lastDay = day;
      data.dailyDone = false;
    }

    data.runs = (data.runs || 0) + 1;
    data.totalMs = (data.totalMs || 0) + Math.floor(ms);
    if (!won && reason) {
      data.causes[reason] = (data.causes[reason] || 0) + 1;
    }

    data.records.unshift({ ms: Math.floor(ms), mode, day, won, reason });
    data.records = data.records.slice(0, 10);

    if (ms > data.best) {
      data.best = Math.floor(ms);
      best = data.best;
      el.badge.classList.remove("hidden");
    } else {
      el.badge.classList.add("hidden");
    }

    updateAchievements(ms);
    if (won && mode === "minute") data.dailyDone = true;
    save();
    updateHeaderStats();
  }

  function finish(ms, reason, won) {
    state = "over";
    clearEvents();
    detach();
    document.body.classList.remove("is-playing");
    document.body.classList.add("is-over");

    lastRun = { ms: Math.floor(ms), mode, reason, won, events };
    record(ms, reason, won);

    const beatChallenge = activeChallenge && activeChallenge.mode === mode && ms > activeChallenge.ms;
    el.challengeBadge.classList.toggle("hidden", !beatChallenge);

    el.headline.textContent = won ? "YOU DID NOTHING." : (HEADLINES[reason] || "YOU MOVED.");
    el.final.innerHTML = fmt(ms);
    $("result-copy").textContent = won
      ? "An entire minute of absolutely nothing. Beautiful."
      : (beatChallenge
        ? `You beat the ${fmtPlain(activeChallenge.ms)} challenge. Send it back.`
        : rand([
          "Your willpower had a short vacation.",
          "The mouse won this round.",
          "You moved. The universe noticed.",
          "You were so close to doing nothing.",
          "At least you failed at something simple."
        ]));

    $("result-mode").textContent = MODES[mode];
    $("result-rank").textContent = rank(ms);
    $("result-events").textContent = events;
    $("result-kicker").textContent = won ? "CHALLENGE COMPLETE" : "THE EXPERIMENT IS OVER";

    show(el.over);
    tone(won || beatChallenge ? 900 : 220, 0.2);
  }

  function endGame(reason) {
    if (state !== "playing") return;
    finish(performance.now() - startAt, reason, false);
  }

  function win() {
    if (state !== "playing") return;
    finish(60000, "", true);
  }

  /* ---------------- Downloadable Result Card (Canvas PNG) ---------------- */
  function downloadResultCard() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");

    // Dark background
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, 1080, 1350);

    // Subtle radial ambient glow
    const glow = ctx.createRadialGradient(540, 560, 40, 540, 560, 520);
    glow.addColorStop(0, lastRun.won ? "rgba(52, 211, 153, 0.16)" : "rgba(244, 63, 94, 0.16)");
    glow.addColorStop(1, "rgba(9, 9, 11, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1080, 1350);

    // Outer border card
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(64, 64, 952, 1222, 42);
    ctx.stroke();

    // Brand header
    ctx.fillStyle = lastRun.won ? "#34d399" : "#f43f5e";
    ctx.beginPath();
    ctx.arc(130, 148, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fafafa";
    ctx.font = '600 24px "Outfit", sans-serif';
    ctx.textAlign = "left";
    ctx.fillText("DO NOTHING", 156, 156);

    ctx.fillStyle = "#52525b";
    ctx.font = '400 20px "JetBrains Mono", monospace';
    ctx.textAlign = "right";
    ctx.fillText(new Date().toISOString().slice(0, 10), 952, 155);

    // Kicker
    ctx.textAlign = "center";
    ctx.fillStyle = "#71717a";
    ctx.font = '400 22px "JetBrains Mono", monospace';
    ctx.fillText(lastRun.won ? "CHALLENGE COMPLETE" : "THE EXPERIMENT IS OVER", 540, 340);

    // Headline
    const headlineText = lastRun.won ? "YOU DID NOTHING." : (HEADLINES[lastRun.reason] || "YOU MOVED.");
    ctx.fillStyle = "#fafafa";
    ctx.font = '500 84px "Outfit", sans-serif';
    ctx.fillText(headlineText, 540, 445);

    // Time readout
    const cs = String(Math.floor((lastRun.ms % 1000) / 10)).padStart(2, "0");
    ctx.fillStyle = "#e4e4e7";
    ctx.font = '300 96px "JetBrains Mono", monospace';
    ctx.fillText(`${fmtPlain(lastRun.ms)}.${cs}`, 540, 620);

    // Subtle divider ring line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.moveTo(220, 725);
    ctx.lineTo(860, 725);
    ctx.stroke();

    // Stats row
    const stats = [
      ["MODE", MODES[lastRun.mode] || "NORMAL"],
      ["RANK", rank(lastRun.ms)],
      ["EVENTS", String(lastRun.events)]
    ];
    stats.forEach((item, idx) => {
      const cx = 270 + idx * 270;
      ctx.fillStyle = "#fafafa";
      ctx.font = '500 32px "JetBrains Mono", monospace';
      ctx.fillText(item[1], cx, 825);
      ctx.fillStyle = "#71717a";
      ctx.font = '400 20px "JetBrains Mono", monospace';
      ctx.fillText(item[0], cx, 868);
    });

    // Footer tagline
    ctx.fillStyle = "#a1a1aa";
    ctx.font = '300 28px "Outfit", sans-serif';
    ctx.fillText("Can you survive longer doing absolutely nothing?", 540, 1080);

    ctx.fillStyle = "#52525b";
    ctx.font = '400 22px "JetBrains Mono", monospace';
    ctx.fillText(location.host || "do-nothing.app", 540, 1185);

    const link = document.createElement("a");
    link.download = `do-nothing-${fmtPlain(lastRun.ms).replace(/:/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast("Result card saved.");
  }

  /* ---------------- URL Challenge Links ---------------- */
  function buildChallengeUrl() {
    const url = new URL(location.href);
    url.search = "";
    const targetMs = state === "over" ? lastRun.ms : best;
    const targetMode = state === "over" ? lastRun.mode : el.mode.value;
    if (targetMs > 0) {
      url.searchParams.set("beat", String(Math.floor(targetMs)));
      url.searchParams.set("mode", targetMode);
    }
    return url.toString();
  }

  function parseIncomingChallenge() {
    const params = new URLSearchParams(location.search);
    const beat = parseInt(params.get("beat"), 10);
    const m = params.get("mode");
    if (!Number.isNaN(beat) && beat > 0 && MODES[m]) {
      activeChallenge = { ms: beat, mode: m };
      el.mode.value = m;
      el.challengeBanner.textContent = `FRIEND CHALLENGE · BEAT ${fmtPlain(beat)} IN ${MODES[m]}`;
      el.challengeBanner.classList.remove("hidden");
    }
  }

  function share() {
    const msText = state === "over" ? fmtPlain(lastRun.ms) : fmtPlain(best);
    const modeName = MODES[state === "over" ? lastRun.mode : el.mode.value];
    const url = buildChallengeUrl();
    const text = `I survived ${msText} doing absolutely nothing in ${modeName} mode. Can you beat me?`;
    if (navigator.share) {
      navigator.share({ title: "Do Nothing", text, url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(`${text} ${url}`)
        .then(() => toast("Challenge link copied."))
        .catch(() => toast(text));
    } else {
      toast(text);
    }
  }

  /* ---------------- Panels ---------------- */
  function openPanel(which) {
    el.panel.classList.remove("hidden");

    if (which === "achievements") {
      el.panelEyebrow.textContent = `${data.unlocked.length} / ${achievements.length} UNLOCKED`;
      el.panelTitle.textContent = "Achievements";
      el.panelContent.innerHTML = '<div class="achievement-list">' + achievements.map(a => {
        const ok = data.unlocked.includes(a[1]);
        return `<div class="achievement ${ok ? "" : "locked"}">
          <span class="emoji">${a[0]}</span>
          <div><strong>${a[1]}</strong><small>${a[2]}</small></div>
          <span>${ok ? "✓" : "🔒"}</span>
        </div>`;
      }).join("") + "</div>";
    }

    if (which === "leaderboard") {
      el.panelEyebrow.textContent = "TOP 10 LOCAL RUNS";
      el.panelTitle.textContent = "Leaderboard";
      const rows = data.records || [];
      el.panelContent.innerHTML = rows.length
        ? '<div class="leader-list">' + rows.map((r, i) => `
          <div class="leader-row">
            <strong>#${i + 1}</strong>
            <div><strong>${fmtPlain(r.ms)}</strong><small>${MODES[r.mode] || r.mode} · ${r.day}</small></div>
            <span>${r.won ? "🏆" : rank(r.ms)}</span>
          </div>`).join("") + "</div>"
        : '<p class="muted">No runs yet. Go do nothing.</p>';
    }

    if (which === "stats") {
      el.panelEyebrow.textContent = "LIFETIME DIAGNOSTICS";
      el.panelTitle.textContent = "Your Stats";
      const entries = Object.entries(data.causes || {}).sort((a, b) => b[1] - a[1]);
      const maxCause = entries.length ? entries[0][1] : 1;
      const causeHtml = entries.length
        ? '<div class="cause-list">' + entries.map(([k, v]) => `
          <div class="cause-row">
            <div class="cause-meta">
              <span>${CAUSE_LABELS[k] || k}</span>
              <span>${v}x</span>
            </div>
            <div class="cause-bar-track">
              <div class="cause-bar-fill" style="width:${Math.max(8, Math.round((v / maxCause) * 100))}%"></div>
            </div>
          </div>`).join("") + "</div>"
        : '<p class="muted">No failures recorded yet.</p>';

      el.panelContent.innerHTML = `
        <div class="stats-grid">
          <div class="stat-box"><span>TOTAL TIME WASTED</span><strong>${fmtHuman(data.totalMs || 0)}</strong></div>
          <div class="stat-box"><span>TOTAL ATTEMPTS</span><strong>${data.runs || 0}</strong></div>
          <div class="stat-box"><span>DAILY STREAK</span><strong>${data.streak || 0} days</strong></div>
          <div class="stat-box"><span>PERSONAL BEST</span><strong>${fmtPlain(data.best || 0)}</strong></div>
        </div>
        <h3 class="section-sub">CAUSES OF DEATH</h3>
        ${causeHtml}
      `;
    }

    if (which === "daily") {
      const today = new Date().toISOString().slice(0, 10);
      const done = data.dailyDone && data.lastDay === today;
      el.panelEyebrow.textContent = `STREAK: ${data.streak || 0} DAY${data.streak === 1 ? "" : "S"}`;
      el.panelTitle.textContent = "Daily challenge";
      el.panelContent.innerHTML = `
        <div class="daily-card">
          <span style="font-size:32px">📅</span>
          <div>
            <strong>Today's challenge: The One-Minute Void</strong>
            <small>Survive for 60 seconds in One Minute mode. No movement. No excuses.</small>
            <p>${done ? "Completed today ✓" : "Not completed yet"}</p>
          </div>
        </div>
        <button class="pill-btn" id="daily-start" style="margin-top:16px">Play daily challenge →</button>
      `;
      $("daily-start").addEventListener("click", () => {
        el.panel.classList.add("hidden");
        el.mode.value = "minute";
        startGame();
      });
    }
  }

  /* ---------------- Event Bindings ---------------- */
  el.start.addEventListener("click", startGame);
  el.restart.addEventListener("click", startGame);
  $("share-button").addEventListener("click", share);
  $("download-card-button").addEventListener("click", downloadResultCard);
  $("change-mode-btn").addEventListener("click", () => {
    document.body.classList.remove("is-over");
    show(el.intro);
  });
  $("close-panel").addEventListener("click", () => el.panel.classList.add("hidden"));
  document.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", () => openPanel(b.dataset.open)));

  el.sound.addEventListener("click", () => {
    soundOn = !soundOn;
    el.sound.textContent = soundOn ? "♫" : "♪";
    el.sound.classList.toggle("is-active", soundOn);
    el.sound.title = soundOn ? "Sound effects: On" : "Sound effects: Off";
    toast(soundOn ? "Sound on" : "Sound off");
    if (soundOn) tone();
  });

  el.ambient.addEventListener("click", toggleAmbientRain);

  $("temptation-button").addEventListener("click", () => {
    el.temptation.classList.add("hidden");
    endGame("click");
  });
  el.fakeOsBtn1.addEventListener("click", () => {
    el.fakeOs.classList.add("hidden");
    endGame("click");
  });
  el.fakeOsBtn2.addEventListener("click", () => {
    el.fakeOs.classList.add("hidden");
    endGame("click");
  });

  document.addEventListener("visibilitychange", () => {
    if (state === "playing" && document.hidden) endGame("tab");
  });
  window.addEventListener("beforeunload", () => {
    if (state === "playing") state = "over";
  });

  // Init
  best = data.best || 0;
  el.sound.classList.add("is-active");
  parseIncomingChallenge();
  updateHeaderStats();
})();
