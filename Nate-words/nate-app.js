// Nate's Pancake Words — 破案模式 + Sludge 养成版。
// 一局 = 一个小案子：连续切对 = 收集证物，集齐破案揪出"凶手"。
// 切对的煎饼喂给 Sludge：吃得越多长得越大，还能换装（海龙队球衣是终极收藏）。
// 无每日任务；案件进度跨session保留，命没了只是"线索断了"，证物不丢。
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
  const CASE_GOAL = 8;
  const SLUDGE_LEVELS = [
    { fed: 0, name: "Puppy", scale: 0.8 },
    { fed: 25, name: "Sniffer", scale: 0.92 },
    { fed: 60, name: "Tracker", scale: 1.02 },
    { fed: 120, name: "Detective Dog", scale: 1.12 },
    { fed: 220, name: "Super Sniffer", scale: 1.22 },
    { fed: 380, name: "Neighborhood Legend", scale: 1.34 }
  ];
  const SLUDGE_ITEMS = [
    { id: "hat", emoji: "🎩", slot: "top", name: "Detective hat", how: "Close your first case", done: (s) => s.cases.solved >= 1 },
    { id: "bone", emoji: "🦴", slot: "side", name: "Juicy bone", how: "Feed Sludge 25 pancakes", done: (s) => s.sludge.fed >= 25 },
    { id: "ball", emoji: "⚽", slot: "side", name: "Football", how: "Sludge reaches level 2", done: () => sludgeLevel() >= 2 },
    { id: "scarf", emoji: "🧣", slot: "top", name: "Red scarf", how: "Close 3 cases", done: (s) => s.cases.solved >= 3 },
    { id: "medal", emoji: "🥇", slot: "top", name: "Gold medal", how: "Slice a golden pancake", done: (s) => s.sludge.golds >= 1 },
    { id: "shades", emoji: "🕶️", slot: "top", name: "Cool shades", how: "Close 5 cases", done: (s) => s.cases.solved >= 5 },
    { id: "megaphone", emoji: "📣", slot: "side", name: "Coach whistle", how: "Sludge reaches level 3", done: () => sludgeLevel() >= 3 },
    { id: "jersey", emoji: "👕", slot: "body", name: "Hailong jersey", how: "Close 8 cases", done: (s) => s.cases.solved >= 8, team: true },
    { id: "party", emoji: "🥳", slot: "top", name: "Party hat", how: "Sludge reaches level 4", done: () => sludgeLevel() >= 4 },
    { id: "badge", emoji: "🎖️", slot: "top", name: "Detective badge", how: "Close 20 cases", done: (s) => s.cases.solved >= 20 }
  ];
  const CASE_TITLES = [
    "The Case of the Missing Pancakes", "The Case of the Vanishing Ball", "The Case of the Squeaky Door",
    "The Case of the Hungry Cat", "The Case of the Lost Whistle", "The Case of the Muddy Footprints",
    "The Case of the Sticky Syrup", "The Case of the Sneaky Raccoon", "The Case of the Backyard Mystery",
    "The Case of the Torn Note", "The Case of the Empty Food Bowl", "The Case of the Night Noise",
    "The Case of the Missing Sock", "The Case of the Runaway Hat", "The Case of the Peculiar Smell",
    "The Case of the Hidden Bone", "The Case of the Rainy Day Clue", "The Case of the Crumpled Map",
    "The Case of the Footprint in the Flour", "The Case of the Barking Midnight", "The Case of the Wobbly Fence",
    "The Case of the Tricky Trail", "The Case of the Whispering Bushes", "The Case of the Slow Snail"
  ];
  const CULPRITS = [
    { name: "Hex", emoji: "🐈", line: "Hex just wanted a snack. Now he is sleeping on it." },
    { name: "Big Hex", emoji: "🐈‍⬛", line: "Big Hex sat on it. He refuses to move." },
    { name: "Rosamond", emoji: "🐈‍⬛", line: "Rosamond took it for her cats. Of course she did." },
    { name: "Fang", emoji: "🦷", line: "Fang took it to cheer up Harry. A good dog, mostly." },
    { name: "Harry", emoji: "👦", line: "Harry was scared to say he lost it. Again." },
    { name: "Oliver", emoji: "🧒", line: "Oliver followed Nate and forgot to give it back." },
    { name: "Claude", emoji: "🙋‍♂️", line: "Claude lost it. Some things never change." },
    { name: "Esmeralda", emoji: "💡", line: "Esmeralda knew all along. She was testing Nate." },
    { name: "Pip", emoji: "🤫", line: "Pip whispered the answer from the very start." },
    { name: "Sludge", emoji: "🐕", line: "Sludge ate it. Case closed!" }
  ];
  const COMBO_LINES = [
    "Sharp slicing!", "I, Nate the Great, am amazed!", "Case closed!",
    "Super detective work!", "The trail is hot!"
  ];
  const MISS_LINES = [
    "The trail went cold.", "This case is tricky.", "Keep looking, detective.", "Sludge is still hungry."
  ];

  const els = {
    totalStars: document.getElementById("totalStars"),
    metCount: document.getElementById("metCount"),
    knowCount: document.getElementById("knowCount"),
    caseCount: document.getElementById("caseCount"),
    modeChips: document.querySelectorAll("[data-mode]"),
    pathSteps: document.querySelectorAll("[data-step]"),
    startView: document.getElementById("startView"),
    startKicker: document.getElementById("startKicker"),
    startTitle: document.getElementById("startTitle"),
    startCopy: document.getElementById("startCopy"),
    startButton: document.getElementById("startButton"),
    deskSludge: document.getElementById("deskSludge"),
    startSludgeMeta: document.getElementById("startSludgeMeta"),
    playView: document.getElementById("playView"),
    hearts: document.getElementById("hearts"),
    evidence: document.getElementById("evidence"),
    sliceBanner: document.getElementById("sliceBanner"),
    hearButton: document.getElementById("hearButton"),
    comboLabel: document.getElementById("comboLabel"),
    arena: document.getElementById("arena"),
    sludgePal: document.getElementById("sludgePal"),
    slashCanvas: document.getElementById("slashCanvas"),
    feedback: document.getElementById("feedback"),
    nateToast: document.getElementById("nateToast"),
    finishView: document.getElementById("finishView"),
    finishKicker: document.getElementById("finishKicker"),
    finishTitle: document.getElementById("finishTitle"),
    finishCopy: document.getElementById("finishCopy"),
    finishStack: document.getElementById("finishStack"),
    finishWords: document.getElementById("finishWords"),
    finishFed: document.getElementById("finishFed"),
    finishEarned: document.getElementById("finishEarned"),
    nextCaseButton: document.getElementById("nextCaseButton"),
    toCloset: document.getElementById("toCloset"),
    sludgeView: document.getElementById("sludgeView"),
    sludgeBig: document.getElementById("sludgeBig"),
    sludgeStats: document.getElementById("sludgeStats"),
    wardrobe: document.getElementById("wardrobe"),
    shelfView: document.getElementById("shelfView"),
    shelfTitle: document.getElementById("shelfTitle"),
    caseBoard: document.getElementById("caseBoard"),
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
    if (!next.sludge || typeof next.sludge !== "object") next.sludge = {};
    next.sludge.fed = Math.max(0, Number(next.sludge.fed || 0));
    next.sludge.golds = Math.max(0, Number(next.sludge.golds || 0));
    if (!Array.isArray(next.sludge.unlocked)) next.sludge.unlocked = [];
    if (!next.sludge.worn) next.sludge.worn = null;
    if (!next.cases || typeof next.cases !== "object") next.cases = {};
    next.cases.solved = Math.max(0, Number(next.cases.solved || 0));
    if (!Array.isArray(next.cases.recent)) next.cases.recent = [];
    if (next.activeCase && typeof next.activeCase === "object" && !next.activeCase.title) next.activeCase = null;
    next.version = 4;
    delete next.today;
    delete next.streak;
    return next;
  }

  function sludgeLevel() {
    let level = 1;
    SLUDGE_LEVELS.forEach((entry, index) => { if (saved.sludge.fed >= entry.fed) level = index + 1; });
    return level;
  }

  function sludgeInfo() {
    const level = sludgeLevel();
    const current = SLUDGE_LEVELS[level - 1];
    const next = SLUDGE_LEVELS[level] || null;
    return {
      level,
      name: current.name,
      scale: current.scale,
      toNext: next ? Math.max(0, next.fed - saved.sludge.fed) : 0,
      nextFed: next ? next.fed : null
    };
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
    els.caseCount.textContent = saved.cases.solved;
    els.modeChips.forEach((chip) => chip.classList.toggle("is-on", chip.dataset.mode === saved.mode));
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

  // ---- Sludge ----
  function sludgeHTML(scaleClass) {
    const worn = SLUDGE_ITEMS.find((item) => item.id === saved.sludge.worn);
    const jersey = worn && worn.slot === "body";
    return `<span class="pal-jersey${jersey ? " is-on" : ""}" aria-hidden="true"><b>7</b></span>`
      + `<span class="pal-body" aria-hidden="true">🐕</span>`
      + (worn && worn.slot !== "body" ? `<span class="pal-item" aria-hidden="true">${worn.emoji}</span>` : "");
  }

  function renderDeskSludge() {
    if (!els.deskSludge) return;
    const info = sludgeInfo();
    els.deskSludge.className = `sludge-pal lv${info.level}`;
    els.deskSludge.innerHTML = sludgeHTML();
    els.startSludgeMeta.innerHTML = `<strong>Sludge · ${info.name}</strong><small>${saved.sludge.fed} pancakes fed${info.toNext ? ` · ${info.toNext} to next size` : " · full legend"}</small>`;
  }

  function renderSludgeView() {
    showView("sludge");
    const info = sludgeInfo();
    els.sludgeBig.className = `sludge-pal big lv${info.level}`;
    els.sludgeBig.innerHTML = sludgeHTML();
    els.sludgeStats.innerHTML = `
      <div class="summary-strip">
        <div class="summary-item"><small>Level</small><strong>${info.level} · ${info.name}</strong></div>
        <div class="summary-item"><small>Pancakes fed</small><strong>${saved.sludge.fed}</strong></div>
        <div class="summary-item"><small>Cases closed</small><strong>${saved.cases.solved}</strong></div>
        <div class="summary-item"><small>Golden pancakes</small><strong>${saved.sludge.golds}</strong></div>
      </div>
      <p class="prompt">${info.toNext ? `Feed Sludge ${info.toNext} more pancakes to reach <strong>${SLUDGE_LEVELS[info.level].name}</strong>.` : "Sludge is a Neighborhood Legend. Nate is so proud."}</p>`;
    els.wardrobe.innerHTML = SLUDGE_ITEMS.map((item) => {
      const unlocked = saved.sludge.unlocked.includes(item.id);
      const worn = saved.sludge.worn === item.id;
      return `<button class="wardrobe-item${unlocked ? "" : " is-locked"}${worn ? " is-worn" : ""}" type="button" data-item="${item.id}" ${unlocked ? "" : "disabled"}>
        <span class="wear-emoji">${unlocked ? item.emoji : "🔒"}</span>
        <strong>${item.team ? "Hailong jersey" : item.name}</strong>
        <small>${unlocked ? (worn ? "Wearing now — tap to take off" : "Tap to wear") : item.how}</small>
      </button>`;
    }).join("");
    els.wardrobe.querySelectorAll("[data-item]").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.item;
      saved.sludge.worn = saved.sludge.worn === id ? null : id;
      save();
      renderSludgeView();
    }));
  }

  function checkUnlocks() {
    SLUDGE_ITEMS.forEach((item) => {
      if (saved.sludge.unlocked.includes(item.id)) return;
      let unlocked = false;
      try { unlocked = !!item.done(saved); } catch (_) {}
      if (unlocked) {
        saved.sludge.unlocked.push(item.id);
        nateToast(`${item.emoji} New for Sludge: ${item.team ? "the Hailong jersey!" : item.name + "!"}`);
      }
    });
  }

  // ---- 案件 ----
  function activeCase() { return saved.activeCase || null; }

  function newCase() {
    const title = CASE_TITLES[Math.floor(Math.random() * CASE_TITLES.length)];
    const culprit = CULPRITS[Math.floor(Math.random() * CULPRITS.length)];
    saved.activeCase = { title, culprit, goal: CASE_GOAL, evidence: 0 };
    save();
  }

  function renderDesk() {
    showView("start");
    round = null;
    updateHeader();
    renderDeskSludge();
    if (!allWords.length) {
      els.startTitle.textContent = "The kitchen is quiet";
      els.startCopy.textContent = "No book words are loaded yet.";
      els.startButton.hidden = true;
      return;
    }
    const active = activeCase();
    els.startKicker.textContent = "Detective desk";
    if (active) {
      els.startTitle.textContent = active.title;
      els.startCopy.textContent = `Evidence: ${active.evidence} of ${active.goal}. ${active.evidence ? "The trail is still warm — finish the case!" : "Slice the right pancakes to collect evidence."}`;
      els.startButton.textContent = "Back on the case 🔪";
    } else {
      els.startTitle.textContent = "A new case is waiting";
      els.startCopy.textContent = `${allWords.length} words in the pool. ${CASE_GOAL} pieces of evidence close a case. Can you find out who did it?`;
      els.startButton.textContent = "Take the case 🕵️";
    }
    els.startButton.hidden = false;
  }

  function showView(name) {
    [els.startView, els.playView, els.finishView, els.sludgeView, els.shelfView].forEach((view) => { view.hidden = true; });
    els[`${name}View`].hidden = false;
    const step = name === "shelf" ? "shelf" : name === "sludge" ? "sludge" : "today";
    els.pathSteps.forEach((button) => button.classList.toggle("is-active", button.dataset.step === step));
    if (name !== "play") stopPlay();
  }

  function renderHearts() {
    const left = round ? round.hearts : HEARTS;
    els.hearts.innerHTML = Array.from({ length: HEARTS }, (_, i) => `<i class="${i < left ? "" : "is-lost"}"></i>`).join("");
  }

  function renderEvidence() {
    const active = activeCase();
    els.evidence.innerHTML = `🔍 <strong>${active ? active.evidence : 0}</strong>/${active ? active.goal : CASE_GOAL}`;
  }

  function startRound() {
    if (!activeCase()) newCase();
    round = { score: 0, hearts: HEARTS, combo: 0, maxCombo: 0, golds: 0, roundStars: 0, fedThisCase: 0 };
    openArena();
  }

  function openArena() {
    showView("play");
    window.requestAnimationFrame(() => {
      if (!round) return;
      resizeCanvas();
      renderHearts();
      renderEvidence();
      els.sludgePal.className = `sludge-pal arena lv${sludgeLevel()}`;
      els.sludgePal.innerHTML = sludgeHTML();
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
    const active = activeCase();
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
    toastTimer = window.setTimeout(() => els.nateToast.classList.remove("is-show"), 1600);
  }

  function sludgeAnim(className) {
    if (!els.sludgePal) return;
    els.sludgePal.classList.remove("is-munch", "is-sad", "is-trick");
    void els.sludgePal.offsetWidth;
    els.sludgePal.classList.add(className);
  }

  function loseHeart() {
    round.hearts -= 1;
    round.combo = 0;
    renderHearts();
    paintCombo();
    if (round.hearts <= 0) {
      window.setTimeout(() => finishRound(false), 500);
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
    sludgeAnim("is-sad");
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
      saved.sludge.golds += 1;
      feedSludge(3);
      STARS.addStars(2);
      els.totalStars.textContent = STARS.totalStars();
      nateToast("Golden pancake! Sludge gets 3 🥞");
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

  function feedSludge(count) {
    const before = sludgeLevel();
    saved.sludge.fed += count;
    if (round) round.fedThisCase += count;
    const after = sludgeLevel();
    if (after > before) {
      nateToast(`🐕 Sludge grew! Now a ${sludgeInfo().name}!`);
      celebrate();
    }
    checkUnlocks();
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
      feedSludge(1);
      sludgeAnim("is-munch");
      els.feedback.textContent = `${item.word} · ${item.zh}`;
      const active = activeCase();
      if (active && active.evidence < active.goal) {
        active.evidence += 1;
        renderEvidence();
        if (active.evidence >= active.goal) {
          save();
          window.setTimeout(() => finishRound(true), 550);
          if (saved.mode === "mean") speakWord(item.word);
          return;
        }
      }
      if (round.combo >= 5 && round.combo % 5 === 0) {
        sludgeAnim("is-trick");
        nateToast(COMBO_LINES[Math.floor(Math.random() * COMBO_LINES.length)]);
      }
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

  function finishRound(solved) {
    if (!round) return;
    stopPlay();
    const earned = solved ? 4 : 0;
    if (solved && activeCase()) {
      const active = saved.activeCase;
      saved.cases.solved += 1;
      saved.cases.recent.unshift({ title: active.title, culprit: active.culprit.name, emoji: active.culprit.emoji, words: round.score, date: new Date().toISOString().slice(0, 10) });
      saved.cases.recent = saved.cases.recent.slice(0, 30);
      saved.activeCase = null;
      checkUnlocks();
    }
    if (earned) STARS.addStars(earned);
    save();
    showView("finish");
    if (solved) {
      const closed = saved.cases.recent[0];
      els.finishKicker.textContent = "CASE CLOSED";
      els.finishTitle.textContent = `It was ${closed.culprit}!`;
      els.finishCopy.textContent = `${closed.emoji} ${CULPRITS.find((c) => c.name === closed.culprit).line}`;
    } else {
      els.finishKicker.textContent = "The trail went cold";
      els.finishTitle.textContent = "Three got away";
      els.finishCopy.textContent = `Evidence is safe (${activeCase() ? activeCase().evidence : 0}/${activeCase() ? activeCase().goal : CASE_GOAL}). Sludge kept the pancakes warm. Come back any time.`;
    }
    els.finishWords.textContent = round.score;
    els.finishFed.textContent = `+${round.fedThisCase}`;
    els.finishEarned.textContent = `+${earned + round.roundStars}★`;
    els.finishStack.innerHTML = Array.from({ length: Math.max(round.score, 1) }, (_, i) => `<i style="--tilt:${(i % 3) - 1}deg"></i>`).join("") + '<b class="butter" aria-hidden="true"></b>';
    els.nextCaseButton.textContent = solved ? "Take a new case 🕵️" : "Back on the case 🔪";
    round = null;
    if (solved) celebrate();
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
    els.caseBoard.innerHTML = saved.cases.recent.length
      ? saved.cases.recent.map((entry) => `
        <div class="case-card">
          <span class="case-emoji" aria-hidden="true">${entry.emoji}</span>
          <strong>${escapeHtml(entry.title.replace("The Case of the ", ""))}</strong>
          <small>It was ${escapeHtml(entry.culprit)} · ${entry.words} words · ${entry.date}</small>
        </div>`).join("")
      : '<p class="empty-cycle-copy">Close your first case and it gets pinned here.</p>';
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
    const step = button.dataset.step;
    if (step === "shelf") renderShelf();
    else if (step === "sludge") renderSludgeView();
    else if (round) openArena();
    else renderDesk();
  }));
  els.modeChips.forEach((chip) => chip.addEventListener("click", () => {
    saved.mode = chip.dataset.mode === "mean" ? "mean" : "hear";
    save();
    els.modeChips.forEach((c) => c.classList.toggle("is-on", c.dataset.mode === saved.mode));
  }));
  els.startButton.addEventListener("click", startRound);
  els.nextCaseButton.addEventListener("click", startRound);
  els.toCloset.addEventListener("click", renderSludgeView);

  checkUnlocks();
  renderDesk();
})();
