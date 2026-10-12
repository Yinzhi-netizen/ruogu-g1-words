// Nate's Pancake Words — 生存街机版。
// 无每日任务：词从池子里按掌握度加权随机抽（错的词多飞、完全掌握的词少飞但不绝迹），
// 3 条命一局，计分冲最高分。星星仍走星河书旅共享池。
(function () {
  const BOOKS = window.NATE_BOOKS || [];
  const BOOK_WORDS = window.RUOGU_BOOKS || [];
  const STARS = window.RUOGU_NATE_STARS;
  const HEARTS = 3;
  const KNOW_LEVEL = 4;
  const MASTER_LEVEL = 6;
  const MAX_LEVEL = 8;
  const GRAVITY = 380;
  const GOLD_CHANCE = 0.09;
  const WEIGHTS = { unseen: 3.2, learning: 2.4, known: 1.0, mastered: 0.35 };
  const COMBO_LINES = [
    "Sharp slicing!",
    "I, Nate the Great, am amazed!",
    "Case closed!",
    "Super detective work!",
    "The trail is hot!"
  ];
  const MISS_LINES = [
    "Sludge ate it!",
    "This case is tricky.",
    "Keep looking, detective.",
    "The trail went cold."
  ];

  const els = {
    totalStars: document.getElementById("totalStars"),
    metCount: document.getElementById("metCount"),
    knowCount: document.getElementById("knowCount"),
    bestCount: document.getElementById("bestCount"),
    modeChips: document.querySelectorAll("[data-mode]"),
    pathSteps: document.querySelectorAll("[data-step]"),
    startView: document.getElementById("startView"),
    startKicker: document.getElementById("startKicker"),
    startTitle: document.getElementById("startTitle"),
    startCopy: document.getElementById("startCopy"),
    startButton: document.getElementById("startButton"),
    playView: document.getElementById("playView"),
    hearts: document.getElementById("hearts"),
    scoreCount: document.getElementById("scoreCount"),
    sliceBanner: document.getElementById("sliceBanner"),
    hearButton: document.getElementById("hearButton"),
    comboLabel: document.getElementById("comboLabel"),
    arena: document.getElementById("arena"),
    sludge: document.getElementById("sludge"),
    slashCanvas: document.getElementById("slashCanvas"),
    feedback: document.getElementById("feedback"),
    nateToast: document.getElementById("nateToast"),
    finishView: document.getElementById("finishView"),
    finishTitle: document.getElementById("finishTitle"),
    finishCopy: document.getElementById("finishCopy"),
    finishStack: document.getElementById("finishStack"),
    finishPancakes: document.getElementById("finishPancakes"),
    finishBest: document.getElementById("finishBest"),
    finishEarned: document.getElementById("finishEarned"),
    playAgainButton: document.getElementById("playAgainButton"),
    toShelf: document.getElementById("toShelf"),
    shelfView: document.getElementById("shelfView"),
    shelfTitle: document.getElementById("shelfTitle"),
    nateShelf: document.getElementById("nateShelf"),
    bookDetail: document.getElementById("bookDetail"),
    confetti: document.getElementById("confetti")
  };

  if (!STARS || !BOOKS.length || !els.arena) {
    if (els.startCopy) els.startCopy.textContent = "The Nate words did not load. Please refresh and try again.";
    if (els.startButton) els.startButton.hidden = true;
    return;
  }

  const books = BOOKS.map((book) => {
    const confirmed = book.bookWordsId && BOOK_WORDS.find((item) => item.id === book.bookWordsId);
    const list = confirmed ? confirmed.words : book.words;
    return { ...book, words: list.map((item) => ({ ...item, key: normalizeKey(item.word), bookId: book.id })) };
  });
  const allWords = [];
  const byKey = {};
  books.forEach((book) => book.words.forEach((item) => {
    if (byKey[item.key]) return;
    byKey[item.key] = item;
    allWords.push(item);
  }));

  let saved = normalizeState(STARS.studyState());
  let round = null;
  let wave = null;
  let flyers = [];
  let raf = 0;
  let lastT = 0;
  let drawing = false;
  let slash = [];
  let openBookId = null;
  let recentKeys = [];
  let toastTimer = 0;
  const slashCtx = els.slashCanvas.getContext("2d");

  function normalizeKey(value) { return String(value || "").trim().toLowerCase(); }

  function normalizeState(value) {
    const next = value && typeof value === "object" ? value : {};
    if (!next.words || typeof next.words !== "object") next.words = {};
    if (next.mode !== "mean") next.mode = "hear";
    next.best = Math.max(0, Number(next.best || 0));
    next.version = 3;
    delete next.today;
    delete next.streak;
    return next;
  }

  function wordState(key) {
    if (!saved.words[key]) saved.words[key] = { level: 0, seen: 0, right: 0, wrong: 0 };
    return saved.words[key];
  }

  function peekState(key) { return saved.words[key] || null; }

  function statusOf(key) {
    const state = peekState(key);
    if (!state || !state.seen) return "new";
    return state.level >= KNOW_LEVEL ? "know" : "met";
  }

  function save() { STARS.saveStudyState(saved); updateHeader(); }

  function updateHeader() {
    els.totalStars.textContent = STARS.totalStars();
    els.metCount.textContent = allWords.filter((item) => statusOf(item.key) !== "new").length;
    els.knowCount.textContent = allWords.filter((item) => statusOf(item.key) === "know").length;
    els.bestCount.textContent = saved.best;
    renderModeChips();
  }

  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  // ---- 权重抽词：掌握得越好飞得越少，但永不消失 ----
  function weightOf(item) {
    const state = peekState(item.key);
    let weight;
    if (!state || !state.seen) weight = WEIGHTS.unseen;
    else if (state.level >= MASTER_LEVEL) weight = WEIGHTS.mastered;
    else if (state.level >= KNOW_LEVEL) weight = WEIGHTS.known;
    else weight = WEIGHTS.learning;
    const focusBook = books.find((book) => book.id === saved.focus);
    if (focusBook && focusBook.words.some((word) => word.key === item.key)) weight *= 1.6;
    return weight;
  }

  function pickWord() {
    const recent = new Set(recentKeys);
    let pool = allWords.filter((item) => !recent.has(item.key));
    if (!pool.length) pool = allWords;
    let total = 0;
    const weights = pool.map((item) => { const w = weightOf(item); total += w; return w; });
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function showView(name) {
    [els.startView, els.playView, els.finishView, els.shelfView].forEach((view) => { view.hidden = true; });
    els[`${name}View`].hidden = false;
    const step = name === "shelf" ? "shelf" : "today";
    els.pathSteps.forEach((button) => button.classList.toggle("is-active", button.dataset.step === step));
    if (name !== "play") stopPlay();
  }

  function renderHearts() {
    const left = round ? round.hearts : HEARTS;
    els.hearts.innerHTML = Array.from({ length: HEARTS }, (_, i) => `<i class="${i < left ? "" : "is-lost"}"></i>`).join("");
  }

  function renderModeChips() {
    els.modeChips.forEach((chip) => chip.classList.toggle("is-on", chip.dataset.mode === saved.mode));
  }

  function renderStart() {
    showView("start");
    round = null;
    updateHeader();
    if (!allWords.length) {
      els.startTitle.textContent = "The kitchen is quiet";
      els.startCopy.textContent = "No book words are loaded yet.";
      els.startButton.hidden = true;
      return;
    }
    const know = allWords.filter((item) => statusOf(item.key) === "know").length;
    els.startKicker.textContent = "Free play";
    els.startTitle.textContent = "Pancakes are ready";
    els.startCopy.textContent = saved.best
      ? `${allWords.length} words in the pool. Best round: ${saved.best} pancakes. Can you beat it?`
      : `${allWords.length} words in the pool. Slice the right pancake before it drops. Three misses and the round is over.`;
    els.startButton.textContent = "Start slicing 🔪";
    els.startButton.hidden = false;
  }

  function startRound() {
    round = { score: 0, hearts: HEARTS, combo: 0, maxCombo: 0, golds: 0, roundStars: 0 };
    openArena();
  }

  function openArena() {
    showView("play");
    window.requestAnimationFrame(() => {
      if (!round) return;
      resizeCanvas();
      renderHearts();
      els.scoreCount.textContent = round.score;
      paintCombo();
      if (!wave) beginWord();
      startLoop();
    });
  }

  function beginWord() {
    clearFlyers();
    els.feedback.textContent = "";
    const item = pickWord();
    recentKeys.push(item.key);
    if (recentKeys.length > 6) recentKeys.shift();
    const state = peekState(item.key);
    wave = { item, phase: "fly", wrong: false, resolved: false };
    if (!state || !state.seen) showResting(item);
    else launchWave();
  }

  function showResting(item) {
    wave.phase = "meet";
    els.sliceBanner.innerHTML = `${item.emoji} Meet this word<small>Slice the big pancake</small>`;
    const box = arenaBox();
    const flyer = makeFlyer(item, box.width / 2, box.height * 0.56, true);
    flyer.el.classList.add("is-resting");
    flyer.hold = true;
    flyer.correct = true;
    const meaning = document.createElement("em");
    meaning.textContent = item.zh;
    flyer.el.appendChild(meaning);
    flyers.push(flyer);
    placeFlyer(flyer);
    speakWord(item.word);
  }

  function launchWave() {
    const item = wave.item;
    wave.phase = "fly";
    wave.resolved = false;
    clearFlyers();
    if (saved.mode === "hear") {
      els.sliceBanner.innerHTML = `🔊 Slice the word you hear`;
      speakWord(item.word);
    } else {
      els.sliceBanner.innerHTML = `${item.emoji} ${escapeHtml(item.zh)}<small>Slice this word</small>`;
    }
    const decoyCount = allWords.length > 2 && (peekState(item.key) || {}).level >= 2 ? 2 : 1;
    const decoys = similarWords(item, decoyCount);
    const pack = shuffle([item, ...decoys]);
    const box = arenaBox();
    const width = box.width;
    const height = box.height;
    pack.forEach((word, index) => {
      const flyer = makeFlyer(word, width * (0.22 + index * (0.56 / Math.max(1, pack.length - 1))), height + 80, false);
      flyer.correct = word.key === item.key;
      flyer.hold = true;
      flyer.vy = 0;
      flyers.push(flyer);
      placeFlyer(flyer);
      window.setTimeout(() => releaseFlyer(flyer, height), 180 + index * 420);
    });
    if (Math.random() < GOLD_CHANCE) {
      const gold = makeGoldFlyer(width * (0.15 + Math.random() * 0.7), height + 60);
      flyers.push(gold);
      placeFlyer(gold);
      window.setTimeout(() => releaseFlyer(gold, height), 300 + Math.random() * 500);
    }
  }

  function releaseFlyer(flyer, height) {
    if (!flyer.alive || wave.phase !== "fly") return;
    const rise = Math.max(180, flyer.y - height * 0.18);
    flyer.hold = false;
    flyer.vy = -Math.sqrt(2 * GRAVITY * rise) * (0.92 + Math.random() * 0.1);
    flyer.vx = (Math.random() - 0.5) * 90;
    flyer.spin = (Math.random() - 0.5) * 28;
  }

  function makeFlyer(item, x, y, showMeaning) {
    const el = document.createElement("div");
    el.className = "flyer";
    const strong = document.createElement("strong");
    strong.textContent = item.word;
    if (item.word.length > 10) strong.style.fontSize = "16px";
    else if (item.word.length > 8) strong.style.fontSize = "18px";
    el.appendChild(strong);
    els.arena.appendChild(el);
    return { el, item, x, y, vx: 0, vy: 0, rot: (Math.random() - 0.5) * 10, spin: 0, alive: true, hold: true, correct: false, gold: false, showMeaning };
  }

  function makeGoldFlyer(x, y) {
    const el = document.createElement("div");
    el.className = "flyer is-gold";
    const strong = document.createElement("strong");
    strong.textContent = "★";
    el.appendChild(strong);
    els.arena.appendChild(el);
    return { el, item: null, x, y, vx: 0, vy: 0, rot: (Math.random() - 0.5) * 10, spin: 0, alive: true, hold: true, correct: false, gold: true };
  }

  function placeFlyer(flyer) {
    flyer.el.style.left = `${flyer.x}px`;
    flyer.el.style.top = `${flyer.y}px`;
    if (!flyer.el.classList.contains("is-resting")) flyer.el.style.transform = `rotate(${flyer.rot}deg)`;
  }

  function similarWords(item, count) {
    const pool = shuffle(allWords.filter((other) => other.key !== item.key));
    const close = pool.filter((other) => Math.abs(other.word.length - item.word.length) <= 3);
    const picked = [];
    [...close, ...pool].forEach((other) => {
      if (picked.length < count && !picked.some((entry) => entry.key === other.key)) picked.push(other);
    });
    return picked;
  }

  function clearFlyers() {
    flyers.forEach((flyer) => { flyer.alive = false; });
    flyers = [];
    els.arena.querySelectorAll(".flyer, .slice-crumb").forEach((node) => node.remove());
  }

  function arenaBox() {
    return {
      width: els.arena.clientWidth || els.playView.clientWidth || 680,
      height: els.arena.clientHeight || 560
    };
  }

  function startLoop() {
    if (raf) cancelAnimationFrame(raf);
    lastT = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function stopPlay() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    drawing = false;
    slash = [];
    clearFlyers();
    wave = null;
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - lastT) / 1000 || 0.016);
    lastT = now;
    const height = els.arena.clientHeight;
    const width = els.arena.clientWidth;
    flyers.forEach((flyer) => {
      if (!flyer.alive || flyer.hold) return;
      flyer.vy += GRAVITY * dt;
      flyer.x += flyer.vx * dt;
      flyer.y += flyer.vy * dt;
      flyer.rot += flyer.spin * dt;
      if (flyer.x < 78) { flyer.x = 78; flyer.vx = Math.abs(flyer.vx); }
      if (flyer.x > width - 78) { flyer.x = width - 78; flyer.vx = -Math.abs(flyer.vx); }
      placeFlyer(flyer);
      if (flyer.y > height + 110) {
        flyer.alive = false;
        flyer.el.remove();
        if (flyer.correct && wave && !wave.resolved) missWave();
      }
    });
    flyers = flyers.filter((flyer) => flyer.alive);
    fadeSlash(dt);
    raf = requestAnimationFrame(tick);
  }

  function nateToast(text) {
    els.nateToast.textContent = text;
    els.nateToast.classList.add("is-show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.nateToast.classList.remove("is-show"), 1500);
  }

  function sludgeMunch() {
    if (!els.sludge) return;
    els.sludge.classList.remove("is-munch");
    void els.sludge.offsetWidth;
    els.sludge.classList.add("is-munch");
  }

  function loseHeart() {
    round.hearts -= 1;
    round.combo = 0;
    renderHearts();
    paintCombo();
    if (round.hearts <= 0) {
      window.setTimeout(() => finishRound(), 500);
      return true;
    }
    return false;
  }

  function missWave() {
    if (!wave || wave.resolved || !round) return;
    wave.resolved = true;
    const item = wave.item;
    const state = wordState(item.key);
    state.seen = Number(state.seen || 0) + 1;
    state.wrong = Number(state.wrong || 0) + 1;
    state.level = Math.max(0, Number(state.level || 0) - 1);
    state.lastAt = new Date().toISOString();
    els.feedback.textContent = `${item.word} · ${item.zh}`;
    save();
    sludgeMunch();
    nateToast(MISS_LINES[Math.floor(Math.random() * MISS_LINES.length)]);
    const dead = loseHeart();
    if (!dead) window.setTimeout(() => { if (round) beginWord(); }, 750);
  }

  function sliceAt(point, fromTap) {
    if (!wave || wave.resolved) return;
    flyers.forEach((flyer) => {
      if (!flyer.alive) return;
      const near = Math.hypot(flyer.x - point.x, flyer.y - point.y) < (flyer.el.classList.contains("is-resting") ? 120 : 78);
      if (near) cutFlyer(flyer, fromTap);
    });
  }

  function cutFlyer(flyer) {
    if (!flyer.alive || !wave || wave.resolved) return;
    if (flyer.gold) {
      flyer.alive = false;
      flyer.el.classList.add("is-cut");
      burst(flyer, "#ffd76a");
      round.golds += 1;
      round.roundStars += 2;
      STARS.addStars(2);
      els.totalStars.textContent = STARS.totalStars();
      nateToast("Golden pancake! +2★");
      return;
    }
    if (wave.phase === "meet") {
      flyer.alive = false;
      flyer.el.classList.add("is-cut");
      burst(flyer, "#e7b45a");
      speakWord(flyer.item.word);
      window.setTimeout(() => { if (wave && wave.phase === "meet") launchWave(); }, 280);
      return;
    }
    flyer.alive = false;
    if (flyer.correct) {
      wave.resolved = true;
      flyer.el.classList.add("is-cut");
      burst(flyer, "#f3d48a");
      flyers.forEach((other) => {
        if (other !== flyer && other.alive && !other.gold) {
          other.alive = false;
          other.el.classList.add("is-fade");
        }
      });
      scoreSlice();
    } else {
      flyer.el.classList.add("is-phony");
      burst(flyer, "#e7b2a4");
      wave.wrong = true;
      nateToast("Not that one.");
      const dead = loseHeart();
      if (dead) wave.resolved = true;
    }
  }

  function scoreSlice() {
    const item = wave.item;
    const state = wordState(item.key);
    const clean = !wave.wrong;
    state.seen = Number(state.seen || 0) + 1;
    state.lastAt = new Date().toISOString();
    if (clean) {
      state.right = Number(state.right || 0) + 1;
      state.level = Math.min(MAX_LEVEL, Number(state.level || 0) + 1);
      round.score += 1;
      round.combo = Number(round.combo || 0) + 1;
      round.maxCombo = Math.max(round.maxCombo, round.combo);
      els.scoreCount.textContent = round.score;
      els.feedback.textContent = `${item.word} · ${item.zh}`;
      if (round.combo >= 3 && round.combo % 2 === 1) nateToast(COMBO_LINES[Math.floor(Math.random() * COMBO_LINES.length)]);
    } else {
      state.wrong = Number(state.wrong || 0) + 1;
      state.level = Math.max(1, Number(state.level || 0) - 1);
      els.feedback.textContent = `${item.word} · ${item.zh}`;
    }
    if (saved.mode === "mean") speakWord(item.word);
    paintCombo();
    save();
    window.setTimeout(() => { if (round) beginWord(); }, 700);
  }

  function paintCombo() {
    const combo = round && round.combo;
    els.comboLabel.hidden = !combo || combo < 2;
    els.comboLabel.textContent = combo >= 2 ? `${combo} in a row` : "";
  }

  function burst(flyer, color) {
    for (let i = 0; i < 8; i += 1) {
      const crumb = document.createElement("i");
      crumb.className = "slice-crumb";
      crumb.style.left = `${flyer.x}px`;
      crumb.style.top = `${flyer.y}px`;
      crumb.style.background = color;
      crumb.style.setProperty("--dx", `${(Math.random() - 0.5) * 120}px`);
      crumb.style.setProperty("--dy", `${(Math.random() - 0.6) * 100}px`);
      els.arena.appendChild(crumb);
      window.setTimeout(() => crumb.remove(), 560);
    }
  }

  function finishRound() {
    if (!round) return;
    stopPlay();
    const score = round.score;
    const isBest = score > saved.best;
    if (isBest) saved.best = score;
    saved.rounds = Number(saved.rounds || 0) + 1;
    const earned = Math.min(8, 1 + Math.floor(score / 4)) + round.roundStars;
    if (earned) STARS.addStars(Math.min(8, 1 + Math.floor(score / 4)) + round.roundStars);
    save();
    showView("finish");
    els.finishTitle.textContent = isBest ? "A new best round!" : score >= 15 ? "What a stack!" : score >= 8 ? "Nice slicing!" : "The plate needs a rest";
    els.finishPancakes.textContent = score;
    els.finishBest.textContent = saved.best;
    els.finishEarned.textContent = `+${earned}★`;
    els.finishCopy.textContent = isBest
      ? `I, Nate the Great, say: that was great slicing! ${score} pancakes in one round.`
      : `Best round so far: ${saved.best}. The words that got away will fly again soon.`;
    els.finishStack.innerHTML = Array.from({ length: Math.max(score, 1) }, (_, i) => `<i style="--tilt:${(i % 3) - 1}deg"></i>`).join("") + '<b class="butter" aria-hidden="true"></b>';
    round = null;
    if (score >= 8 || isBest) celebrate();
  }

  function resizeCanvas() {
    const rect = els.playView.getBoundingClientRect();
    els.slashCanvas.width = rect.width;
    els.slashCanvas.height = rect.height;
  }

  function pointerPoint(event) {
    const rect = els.arena.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerDown(event) {
    if (!round || els.playView.hidden) return;
    drawing = true;
    els.arena.setPointerCapture?.(event.pointerId);
    slash = [pointerPoint(event)];
    drawSlash();
  }

  function onPointerMove(event) {
    if (!drawing) return;
    const point = pointerPoint(event);
    const prev = slash[slash.length - 1];
    slash.push(point);
    if (slash.length > 18) slash.shift();
    drawSlash();
    if (prev && Math.hypot(point.x - prev.x, point.y - prev.y) > 6) sliceAlong(prev, point);
  }

  function onPointerUp(event) {
    if (!drawing) return;
    const point = pointerPoint(event);
    const start = slash[0];
    drawing = false;
    if (start && Math.hypot(point.x - start.x, point.y - start.y) < 12) sliceAt(point, true);
    window.setTimeout(() => { slash = []; drawSlash(); }, 160);
  }

  function sliceAlong(a, b) {
    flyers.forEach((flyer) => {
      if (!flyer.alive) return;
      const reach = flyer.el.classList.contains("is-resting") ? 116 : 74;
      if (flyer.gold || distToSeg(flyer, a, b) < reach) cutFlyer(flyer);
    });
  }

  function distToSeg(p, a, b) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2));
    return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
  }

  function drawSlash() {
    const canvas = els.slashCanvas;
    slashCtx.clearRect(0, 0, canvas.width, canvas.height);
    if (slash.length < 2) return;
    slashCtx.lineCap = "round";
    slashCtx.lineJoin = "round";
    slashCtx.strokeStyle = "rgba(255, 248, 220, .95)";
    slashCtx.lineWidth = 16;
    slashCtx.beginPath();
    slash.forEach((point, index) => (index ? slashCtx.lineTo(point.x, point.y) : slashCtx.moveTo(point.x, point.y)));
    slashCtx.stroke();
    slashCtx.strokeStyle = "rgba(201, 150, 63, .9)";
    slashCtx.lineWidth = 5;
    slashCtx.stroke();
  }

  function fadeSlash() {
    if (!drawing && slash.length) {
      slash = slash.slice(1);
      drawSlash();
    }
  }

  const SPINE_COLORS = ["#d9a441", "#7fa7b8", "#c97862", "#8fae86", "#e3c27a", "#9fb3c8", "#b98a6a", "#c4a2a0", "#6f9a8d", "#d7b98e"];

  function bookProgress(book) {
    const total = book.words.length;
    const know = book.words.filter((item) => statusOf(item.key) === "know").length;
    const met = book.words.filter((item) => statusOf(item.key) !== "new").length;
    return { total, know, met };
  }

  function renderShelf() {
    showView("shelf");
    const readyBooks = books.filter((book) => book.words.length).length;
    els.shelfTitle.textContent = `${readyBooks} books with words`;
    els.nateShelf.innerHTML = "";
    books.forEach((book, index) => {
      const progress = bookProgress(book);
      const spine = document.createElement("button");
      spine.type = "button";
      spine.className = `nate-spine${book.id === openBookId ? " is-open" : ""}${saved.focus === book.id ? " is-focus" : ""}`;
      spine.style.setProperty("--spine", SPINE_COLORS[index % SPINE_COLORS.length]);
      spine.style.setProperty("--fill", `${progress.total ? Math.round((progress.know / progress.total) * 100) : 0}%`);
      spine.style.setProperty("--met", `${progress.total ? Math.round((progress.met / progress.total) * 100) : 0}%`);
      const count = progress.total ? `${progress.know}/${progress.total}` : "···";
      spine.innerHTML = `<span class="spine-hat" aria-hidden="true">${book.emoji}</span><span class="spine-title">${escapeHtml(book.short)}</span><span class="spine-count">${count}</span>${book.readByDefault ? '<span class="spine-read" title="Read">✓</span>' : ""}`;
      spine.addEventListener("click", () => { openBookId = book.id === openBookId ? null : book.id; renderShelf(); });
      els.nateShelf.appendChild(spine);
    });
    renderBookDetail();
  }

  function renderBookDetail() {
    const book = books.find((item) => item.id === openBookId);
    els.bookDetail.hidden = !book;
    if (!book) return;
    const progress = bookProgress(book);
    const label = { new: "Not yet", met: "Met", know: "Know it" };
    const isFocus = saved.focus === book.id;
    const waiting = !book.words.length;
    els.bookDetail.innerHTML = `
      <div class="detail-head">
        <div><p class="eyebrow">${book.emoji} ${waiting ? "Waiting for the real pages" : `${progress.know} of ${progress.total} known`}</p><h3>${escapeHtml(book.title)}</h3>${book.note ? `<small>${escapeHtml(book.note)}</small>` : ""}</div>
        ${waiting ? "" : `<button class="secondary-button" type="button" id="focusButton">${isFocus ? "★ Flying more often" : "Fly this book more"}</button>`}
      </div>
      ${waiting ? `<p class="prompt">This book is on the shelf, but its words are not in the game yet. They go in after a real page is checked.</p>` : `<div class="mark-list">${book.words.map((item) => `
        <button class="mark-row file-row" type="button" data-word="${escapeHtml(item.word)}">
          <span aria-hidden="true">${item.emoji}</span>
          <div class="mark-word"><strong>${escapeHtml(item.word)}</strong><small>${escapeHtml(item.zh)}</small></div>
          <span class="file-status is-${statusOf(item.key) === "know" ? "solved" : statusOf(item.key) === "met" ? "getting" : "new"}">${label[statusOf(item.key)]}</span>
        </button>`).join("")}</div>`}`;
    els.bookDetail.querySelectorAll("[data-word]").forEach((row) => row.addEventListener("click", () => speakWord(row.dataset.word)));
    const focusButton = els.bookDetail.querySelector("#focusButton");
    if (focusButton) {
      focusButton.addEventListener("click", () => {
        saved.focus = isFocus ? null : book.id;
        save();
        renderShelf();
      });
    }
  }

  function speakWord(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.76;
    window.speechSynthesis.speak(utterance);
  }

  document.addEventListener("pointerdown", function unlock() {
    if ("speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    document.removeEventListener("pointerdown", unlock);
  });

  function celebrate() {
    const colors = ["#d9a441", "#e9be72", "#789581", "#c97862"];
    els.confetti.innerHTML = "";
    for (let i = 0; i < 26; i += 1) {
      const bit = document.createElement("i");
      bit.style.left = `${Math.random() * 100}%`;
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = `${Math.random() * 0.5}s`;
      bit.style.setProperty("--drift", `${(Math.random() - 0.5) * 180}px`);
      els.confetti.appendChild(bit);
    }
    els.confetti.hidden = false;
    window.setTimeout(() => { els.confetti.hidden = true; }, 2300);
  }

  els.arena.addEventListener("pointerdown", onPointerDown);
  els.arena.addEventListener("pointermove", onPointerMove);
  els.arena.addEventListener("pointerup", onPointerUp);
  els.arena.addEventListener("pointercancel", onPointerUp);
  els.hearButton.addEventListener("click", () => { if (wave && wave.item) speakWord(wave.item.word); });
  window.addEventListener("resize", () => { if (round) resizeCanvas(); });
  els.pathSteps.forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.step === "shelf") renderShelf();
    else if (round) openArena();
    else renderStart();
  }));
  els.modeChips.forEach((chip) => chip.addEventListener("click", () => {
    saved.mode = chip.dataset.mode === "mean" ? "mean" : "hear";
    save();
  }));
  els.startButton.addEventListener("click", startRound);
  els.playAgainButton.addEventListener("click", startRound);
  els.toShelf.addEventListener("click", renderShelf);

  renderStart();
})();
