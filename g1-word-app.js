(function () {
  const groups = window.RUOGU_G1_WORD_GROUPS || [];
  const sentences = window.RUOGU_G1_SENTENCES || {};
  const stories = window.RUOGU_G1_STORIES || [];
  const STARS = window.RUOGU_G1_STARS;

  const trackRank = { core: 0, challenge: 1, vocab: 2 };
  const trackText = { core: "核心听写", challenge: "拓展听写", vocab: "重点识读" };
  const statusText = { unseen: "未复习", read: "会认", spell: "会拼", trouble: "易错" };

  const STARS_PER_WORD = 5;
  const STARS_PER_STORY = 10;

  const state = {
    view: "spelling",
    filter: "today",
    index: 0,
    progress: loadProgress(),
    pendingWord: null,
    peeked: false,
    lastSpokenKey: null,
    judgeMode: "self", // "self" 或 "parent"
    tileAttempts: 0,
    speechUnlocked: false
  };

  const words = buildWords(groups);
  let todayWords = makeTodayWords(words, 10);

  function getTodayDate() { return new Date().toISOString().split("T")[0]; }

  function makeTodayWords(allWords, count) {
    const today = getTodayDate();
    const cached = state.progress.today;
    if (cached && cached.date === today && cached.keys && cached.keys.length) {
      // 同一天，还原这批词
      const map = new Map(allWords.map(w => [w.key, w]));
      return cached.keys.map(k => map.get(k)).filter(Boolean);
    }
    // 新一天或首次，重新计算
    const trouble = allWords.filter((w) => getStatus(w.key) === "trouble");
    const coreUn = allWords.filter((w) => w.track === "core" && !isMastered(w.key));
    const challengeUn = allWords.filter((w) => w.track === "challenge" && getStatus(w.key) === "unseen");
    const vocabUn = allWords.filter((w) => w.track === "vocab" && getStatus(w.key) === "unseen");
    const list = uniqueByKey([...trouble, ...coreUn, ...challengeUn, ...vocabUn]).slice(0, count);
    state.progress.today = { date: today, keys: list.map(w => w.key) };
    saveProgress();
    return list;
  }

  const els = {
    tabs: document.querySelectorAll(".mode-tab"),
    views: {
      spelling: document.getElementById("spellingView"),
      reading: document.getElementById("readingView"),
      progress: document.getElementById("progressView")
    },
    segments: document.querySelectorAll("[data-filter]"),
    totalStars: document.getElementById("totalStars"),
    todayCount: document.getElementById("todayCount"),
    coreMastered: document.getElementById("coreMastered"),
    challengeSeen: document.getElementById("challengeSeen"),
    vocabRead: document.getElementById("vocabRead"),
    troubleCount: document.getElementById("troubleCount"),
    queue: document.getElementById("wordQueue"),
    queueCount: document.getElementById("queueCount"),
    sourceLine: document.getElementById("sourceLine"),
    statusPill: document.getElementById("statusPill"),
    wordHint: document.getElementById("wordHint"),
    wordMeta: document.getElementById("wordMeta"),
    wordSentence: document.getElementById("wordSentence"),
    speakButton: document.getElementById("speakButton"),
    speakAgain: document.getElementById("speakAgain"),
    peekButton: document.getElementById("peekButton"),
    prevButton: document.getElementById("prevButton"),
    nextButton: document.getElementById("nextButton"),
    pad: document.getElementById("padCanvas"),
    padUndo: document.getElementById("padUndo"),
    padClear: document.getElementById("padClear"),
    padSubmit: document.getElementById("padSubmit"),
    verdictRow: document.getElementById("verdictRow"),
    verdictAnswer: document.getElementById("verdictAnswer"),
    verdictExpected: document.getElementById("verdictExpected"),
    verdictRight: document.getElementById("verdictRight"),
    verdictWrong: document.getElementById("verdictWrong"),
    checkResult: document.getElementById("checkResult"),
    storyList: document.getElementById("storyList"),
    storyReader: document.getElementById("storyReader"),
    storyTitle: document.getElementById("storyTitle"),
    storySub: document.getElementById("storySub"),
    storyBody: document.getElementById("storyBody"),
    storyClose: document.getElementById("storyClose"),
    storyListen: document.getElementById("storyListen"),
    storyDone: document.getElementById("storyDone"),
    progressBars: document.getElementById("progressBars"),
    troubleList: document.getElementById("troubleList")
  };

  /* ---------- 数据 ---------- */

  function buildWords(sourceGroups) {
    const map = new Map();
    sourceGroups.forEach((group) => {
      group.words.forEach((rawWord) => {
        const key = normalize(rawWord);
        if (!map.has(key)) {
          map.set(key, {
            word: rawWord,
            key,
            track: group.track,
            groups: [],
            source: group.source,
            pattern: group.pattern || "",
            sentence: sentences[key] || ""
          });
        }
        const item = map.get(key);
        if (trackRank[group.track] < trackRank[item.track]) item.track = group.track;
        item.groups.push(group.title);
        if (group.pattern && !item.pattern) item.pattern = group.pattern;
      });
    });
    return [...map.values()].sort((a, b) => {
      if (a.track !== b.track) return trackRank[a.track] - trackRank[b.track];
      return a.word.localeCompare(b.word);
    });
  }

  function makeTodayWords(allWords, count) {
    const trouble = allWords.filter((w) => getStatus(w.key) === "trouble");
    const coreUn = allWords.filter((w) => w.track === "core" && !isMastered(w.key));
    const challengeUn = allWords.filter((w) => w.track === "challenge" && getStatus(w.key) === "unseen");
    const vocabUn = allWords.filter((w) => w.track === "vocab" && getStatus(w.key) === "unseen");
    return uniqueByKey([...trouble, ...coreUn, ...challengeUn, ...vocabUn]).slice(0, count);
  }

  function uniqueByKey(items) {
    const seen = new Set();
    return items.filter((i) => (seen.has(i.key) ? false : (seen.add(i.key), true)));
  }

  function normalize(v) { return v.trim().toLowerCase(); }

  /* ---------- 进度（挂在语文档案的 english 字段下） ---------- */

  function loadProgress() {
    const e = STARS.englishState();
    if (!e.progress) e.progress = {};
    if (!e.storiesDone) e.storiesDone = {};
    if (!e.judgeMode) e.judgeMode = "self";
    state.judgeMode = e.judgeMode;
    return e;
  }

  function saveProgress() { STARS.saveEnglish(); }

  function getStatus(key) { return state.progress.progress[key]?.status || "unseen"; }
  function isMastered(key) { const s = getStatus(key); return s === "spell"; }

  function setStatus(key, status) {
    state.progress.progress[key] = { status, updatedAt: new Date().toISOString() };
    saveProgress();
  }

  function currentList() {
    if (state.filter === "today") {
      // 每天重新检查是否过期
      const today = getTodayDate();
      if (!state.progress.today || state.progress.today.date !== today) {
        todayWords = makeTodayWords(words, 10);
      }
      return todayWords;
    }
    if (state.filter === "core") return words.filter((w) => w.track === "core");
    if (state.filter === "challenge") return words.filter((w) => w.track === "challenge");
    if (state.filter === "vocab") return words.filter((w) => w.track === "vocab");
    if (state.filter === "trouble") return words.filter((w) => getStatus(w.key) === "trouble");
    return words;
  }

  function currentWord() {
    const list = currentList();
    if (!list.length) return null;
    if (state.index >= list.length) state.index = 0;
    return list[state.index];
  }

  /* ---------- 渲染 ---------- */

  function render() {
    renderDashboard();
    renderQueue();
    renderCard();
    renderProgress();
    renderStories();
  }

  function renderDashboard() {
    const core = words.filter((w) => w.track === "core");
    const masteredCore = core.filter((w) => getStatus(w.key) === "spell").length;
    const challenge = words.filter((w) => w.track === "challenge");
    const seenChallenge = challenge.filter((w) => getStatus(w.key) !== "unseen").length;
    const vocab = words.filter((w) => w.track === "vocab");
    const readVocab = vocab.filter((w) => getStatus(w.key) !== "unseen").length;
    els.totalStars.textContent = STARS.totalStars();
    els.todayCount.textContent = todayWords.length;
    els.coreMastered.textContent = `${masteredCore}/${core.length}`;
    els.challengeSeen.textContent = `${seenChallenge}/${challenge.length}`;
    els.vocabRead.textContent = `${readVocab}/${vocab.length}`;
    els.troubleCount.textContent = words.filter((w) => getStatus(w.key) === "trouble").length;
  }

  function renderQueue() {
    const list = currentList();
    els.queue.innerHTML = "";
    els.queueCount.textContent = list.length ? `${state.index + 1}/${list.length}` : "";
    if (!list.length) {
      els.queue.innerHTML = `<li class="empty-row">这个队列空了</li>`;
      return;
    }
    list.forEach((word, index) => {
      const li = document.createElement("li");
      li.className = index === state.index ? "is-current" : "";
      const status = getStatus(word.key);
      li.innerHTML = `<button type="button" title="第 ${index + 1} 个" aria-label="第 ${index + 1} 个词，${statusText[status]}"><span class="q-index">${index + 1}</span><span class="q-dot q-${status}" aria-hidden="true"></span></button>`;
      li.querySelector("button").addEventListener("click", () => { state.index = index; render(); });
      els.queue.appendChild(li);
    });
    const current = els.queue.querySelector(".is-current");
    if (current) current.scrollIntoView({ block: "nearest" });
  }

  function renderCard() {
    const word = currentWord();
    els.checkResult.textContent = "";
    els.verdictRow.hidden = true;
    state.pendingWord = null;
    state.peeked = false;
    state.tileAttempts = 0;
    hideTileTray();
    Pad.clear();
    if (!word) {
      els.sourceLine.textContent = "队列已清空";
      els.wordHint.textContent = "Well done";
      els.wordMeta.textContent = "换一个词库继续";
      els.wordSentence.textContent = "";
      els.statusPill.textContent = "";
      state.lastSpokenKey = null;
      return;
    }
    const status = getStatus(word.key);
    els.sourceLine.textContent = trackText[word.track] || "";
    els.statusPill.textContent = statusText[status];
    els.statusPill.dataset.status = status;
    els.wordHint.textContent = "听音写词";
    els.wordMeta.textContent = [word.groups.slice(0, 2).join(" / "), word.pattern].filter(Boolean).join(" · ");
    els.wordSentence.textContent = "";
    // 只在听写视图且词真的变了时自动读
    if (state.view === "spelling" && word.key !== state.lastSpokenKey) {
      state.lastSpokenKey = word.key;
      setTimeout(() => speak(word.word), 250);
    }
  }

  function renderProgress() {
    const counts = { unseen: 0, read: 0, spell: 0, trouble: 0 };
    words.forEach((w) => (counts[getStatus(w.key)] += 1));
    const total = words.length || 1;
    els.progressBars.innerHTML = Object.entries(counts).map(([key, count]) => {
      const percent = Math.round((count / total) * 100);
      return `<div class="bar-row"><span>${statusText[key]}</span><div class="bar-track"><div class="bar-fill ${key}" style="width:${percent}%"></div></div><strong>${count}</strong></div>`;
    }).join("");
    const trouble = words.filter((w) => getStatus(w.key) === "trouble");
    els.troubleList.innerHTML = trouble.length
      ? trouble.map((w) => `<button type="button" data-word="${w.key}">${w.word}</button>`).join("")
      : `<p>还没有易错词。</p>`;
    els.troubleList.querySelectorAll("[data-word]").forEach((button) => {
      button.addEventListener("click", () => {
        state.view = "spelling";
        state.filter = "trouble";
        state.index = words.filter((w) => getStatus(w.key) === "trouble").findIndex((w) => w.key === button.dataset.word);
        syncTabs();
        render();
      });
    });
  }

  /* ---------- 朗读 ---------- */

  function unlockSpeech() {
    if (state.speechUnlocked) return;
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance("");
    window.speechSynthesis.speak(u);
    state.speechUnlocked = true;
  }

  function speak(text, opts = {}) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = opts.rate || 0.78;
    // iOS 兜底：有时 cancel 后需要 resume 才能真正播放
    u.onstart = () => { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); };
    window.speechSynthesis.speak(u);
  }

  function speakCurrent() {
    const w = currentWord();
    if (w) speak(w.word);
  }

  function speakStory(paragraphs) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    // 按句切分避免长文本被截断
    const sentences = paragraphs.join(" ").match(/[^.!?]+[.!?]+/g) || [paragraphs.join(" ")];
    sentences.forEach((sent, i) => {
      const u = new SpeechSynthesisUtterance(sent.trim());
      u.lang = "en-US";
      u.rate = 0.82;
      if (i === 0) u.onstart = () => { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); };
      window.speechSynthesis.speak(u);
    });
  }

  /* ---------- 手写板 ---------- */

  const Pad = (() => {
    const canvas = els.pad;
    const ctx = canvas.getContext("2d");
    let strokes = [];
    let current = null;
    let drawing = false;

    function resize() {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    }

    function redraw() {
      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = "#102a37";
      ctx.lineWidth = 5;
      strokes.forEach((s) => {
        if (s.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(s[0].x, s[0].y);
        for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
        ctx.stroke();
      });
    }

    function pos(e) {
      const r = canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    }

    function start(e) {
      if (drawing) return; // 已经在画，忽略新触点（掌压）
      drawing = true;
      current = [pos(e)];
      strokes.push(current);
      e.preventDefault();
    }
    function move(e) { if (!drawing) return; current.push(pos(e)); redraw(); e.preventDefault(); }
    function end() { drawing = false; current = null; }

    function clear() { strokes = []; redraw(); }
    function undo() { strokes.pop(); redraw(); }
    function isEmpty() { return strokes.every((s) => s.length < 2); }

    // 把手写笔迹压成一个文本猜测——这里不做 OCR，交给家长肉眼判
    function snapshot() { return canvas.toDataURL("image/png"); }

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end);
    window.addEventListener("resize", resize);

    return { resize, clear, undo, isEmpty, snapshot };
  })();

  /* ---------- 听写判定（家长肉眼） ---------- */

  function submitSpelling() {
    const word = currentWord();
    if (!word) return;
    if (Pad.isEmpty()) {
      els.checkResult.textContent = "先在写字板上写一写。";
      return;
    }
    // 根据模式分流
    if (state.judgeMode === "self") {
      showTileTray(word);
    } else {
      showParentVerdict(word);
    }
  }

  function showParentVerdict(word) {
    // 不做 OCR：显示参考答案，由家长对照笔迹判定
    state.pendingWord = word.key;
    els.verdictAnswer.textContent = "（请对照上方笔迹）";
    els.verdictExpected.textContent = word.word;
    els.verdictRow.hidden = false;
    els.checkResult.textContent = "";
  }

  function verdict(correct) {
    const key = state.pendingWord;
    if (!key) return;
    const word = currentWord();
    if (correct) {
      if (state.peeked) {
        setStatus(key, "trouble");
        els.checkResult.textContent = `偷看过一眼，先记进易错本，下次不看也能写对再加星。`;
      } else {
        setStatus(key, "spell");
        STARS.addStars(STARS_PER_WORD);
        els.checkResult.textContent = `写对了，+${STARS_PER_WORD}★！`;
      }
      advanceAfterJudge();
    } else {
      setStatus(key, "trouble");
      els.checkResult.textContent = `先记住 ${word ? word.word : ""}，等会儿再来一遍。`;
      advanceAfterJudge();
    }
    state.pendingWord = null;
    els.verdictRow.hidden = true;
    render();
  }

  function advanceAfterJudge() {
    const list = currentList(); // 重算列表（易错筛选下判完会变短）
    if (!list.length) return;
    state.index = (state.index + 1) % list.length;
  }

  function advance() {
    advanceAfterJudge();
  }

  /* ---------- 字母拼写自查 ---------- */

  function showTileTray(word) {
    state.pendingWord = word.key;
    const letters = word.word.toLowerCase().split("");
    // 加 2~3 个干扰字母
    const distractors = "abcdefghijklmnopqrstuvwxyz".split("").filter(c => !letters.includes(c));
    const shuffled = shuffle([...letters, ...distractors.slice(0, Math.min(3, distractors.length))]);

    const tray = document.getElementById("tileTray");
    const slots = document.getElementById("tileSlots");
    tray.hidden = false;

    // 清空并重建
    document.getElementById("tileButtons").innerHTML = shuffled.map(c =>
      `<button class="tile" data-letter="${c}" type="button">${c}</button>`
    ).join("");
    slots.innerHTML = Array.from({length: letters.length}, (_, i) =>
      `<span class="slot" data-index="${i}"></span>`
    ).join("");

    document.getElementById("tileButtons").querySelectorAll(".tile").forEach(btn => {
      btn.addEventListener("click", () => tileTap(btn.dataset.letter));
    });

    els.checkResult.textContent = "";
  }

  function hideTileTray() {
    const tray = document.getElementById("tileTray");
    if (tray) tray.hidden = true;
  }

  function tileTap(letter) {
    const slots = document.querySelectorAll("#tileSlots .slot");
    const empty = Array.from(slots).find(s => !s.textContent);
    if (!empty) return;
    empty.textContent = letter;
    empty.classList.add("filled");

    // 拼满自动判
    if (Array.from(slots).every(s => s.textContent)) {
      setTimeout(() => checkTileSpelling(), 300);
    }
  }

  function checkTileSpelling() {
    const word = currentWord();
    if (!word) return;
    const slots = document.querySelectorAll("#tileSlots .slot");
    const answer = Array.from(slots).map(s => s.textContent).join("");
    const correct = answer.toLowerCase() === word.word.toLowerCase();

    if (correct) {
      // 对了
      if (state.peeked) {
        setStatus(word.key, "trouble");
        els.checkResult.textContent = `偷看过一眼，先记进易错本，下次不看也能写对再加星。`;
      } else {
        setStatus(word.key, "spell");
        STARS.addStars(STARS_PER_WORD);
        els.checkResult.textContent = `拼对了，+${STARS_PER_WORD}★！`;
      }
      els.wordHint.textContent = word.word;
      els.wordSentence.textContent = word.sentence || "";
      setTimeout(() => {
        hideTileTray();
        advanceAfterJudge();
        render();
      }, 1800);
    } else {
      // 错了
      state.tileAttempts++;
      if (state.tileAttempts >= 2) {
        // 第二次仍错，记易错，露答案
        setStatus(word.key, "trouble");
        els.wordHint.textContent = word.word;
        els.wordSentence.textContent = word.sentence || "";
        els.checkResult.textContent = `这个词是 ${word.word}，记住下次再来。`;
        setTimeout(() => {
          hideTileTray();
          advanceAfterJudge();
          render();
        }, 2400);
      } else {
        // 第一次错，抖一下重来
        const slotsContainer = document.getElementById("tileSlots");
        slotsContainer.classList.add("shake");
        setTimeout(() => {
          slotsContainer.classList.remove("shake");
          slots.forEach(s => { s.textContent = ""; s.classList.remove("filled"); });
        }, 400);
      }
    }
  }

  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /* ---------- 阅读 ---------- */

  function renderStories() {
    els.storyList.innerHTML = stories.map((s) => {
      const done = state.progress.storiesDone[s.id];
      const count = s.wordsUsed.length;
      return `<button class="story-card ${done ? "is-done" : ""}" data-story="${s.id}" type="button">
        <span class="story-level">${s.level}</span>
        <strong>${s.title}</strong>
        <em>${s.subtitle}</em>
        <small>${count} 个词库词${done ? " · 已读" : ""}</small>
      </button>`;
    }).join("");
    els.storyList.querySelectorAll("[data-story]").forEach((btn) => {
      btn.addEventListener("click", () => openStory(btn.dataset.story));
    });
  }

  function openStory(id) {
    const story = stories.find((s) => s.id === id);
    if (!story) return;
    state.currentStory = story;
    els.storyTitle.textContent = story.title;
    els.storySub.textContent = `${story.subtitle} · ${story.level}`;
    els.storyBody.innerHTML = story.paragraphs
      .map((p) => `<p>${linkify(p)}</p>`)
      .join("");
    els.storyReader.hidden = false;
    els.storyDone.textContent = state.progress.storiesDone[id] ? "已读过（再读一遍）" : `我读完了 +${STARS_PER_STORY}★`;
    els.storyReader.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // 把词库里的词包成可点击的发音按钮
  function linkify(text) {
    const dict = new Map(words.map((w) => [w.key, w.word]));
    return text.split(/(\b[\w'-]+\b)/g).map((tok) => {
      const key = normalize(tok.replace(/^['-]+|['-]+$/g, ""));
      if (dict.has(key) && /^[A-Za-z]/.test(tok)) {
        return `<button class="story-word" type="button" data-say="${dict.get(key)}">${tok}</button>`;
      }
      return tok;
    }).join("");
  }

  function storyWordClick(e) {
    const btn = e.target.closest(".story-word");
    if (btn) speak(btn.dataset.say);
  }

  function finishStory() {
    const s = state.currentStory;
    if (!s) return;
    if (!state.progress.storiesDone[s.id]) {
      state.progress.storiesDone[s.id] = new Date().toISOString();
      STARS.addStars(STARS_PER_STORY);
      saveProgress();
    }
    els.storyReader.hidden = true;
    render();
  }

  /* ---------- 事件 ---------- */

  function syncTabs() {
    els.tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.view === state.view));
    Object.entries(els.views).forEach(([k, v]) => v.classList.toggle("is-active", k === state.view));
    els.segments.forEach((s) => s.classList.toggle("is-active", s.dataset.filter === state.filter));
    Pad.resize(); // 视图切换时重算画布
  }

  els.tabs.forEach((t) => t.addEventListener("click", () => { state.view = t.dataset.view; syncTabs(); render(); }));
  els.segments.forEach((s) => s.addEventListener("click", () => { state.filter = s.dataset.filter; state.index = 0; syncTabs(); render(); }));

  els.speakButton.addEventListener("click", speakCurrent);
  els.speakAgain.addEventListener("click", speakCurrent);
  els.prevButton.addEventListener("click", () => {
    const list = currentList();
    if (!list.length) return;
    state.index = (state.index - 1 + list.length) % list.length;
    render();
  });
  els.nextButton.addEventListener("click", () => {
    advance();
    render();
  });
  els.peekButton.addEventListener("click", () => {
    const w = currentWord();
    if (!w) return;
    els.wordHint.textContent = w.word;
    els.wordSentence.textContent = w.sentence || "";
    state.peeked = true;
    els.checkResult.textContent = "看过一眼——写对不加星，作为易错词处理";
  });
  els.padUndo.addEventListener("click", () => Pad.undo());
  els.padClear.addEventListener("click", () => Pad.clear());
  els.padSubmit.addEventListener("click", submitSpelling);
  els.verdictRight.addEventListener("click", () => verdict(true));
  els.verdictWrong.addEventListener("click", () => verdict(false));

  els.storyBody.addEventListener("click", storyWordClick);
  els.storyClose.addEventListener("click", () => { els.storyReader.hidden = true; });
  els.storyListen.addEventListener("click", () => {
    if (state.currentStory) speakStory(state.currentStory.paragraphs);
  });
  els.storyDone.addEventListener("click", finishStory);

  // 判定模式切换
  document.getElementById("judgeModeToggle").addEventListener("click", () => {
    state.judgeMode = state.judgeMode === "self" ? "parent" : "self";
    state.progress.judgeMode = state.judgeMode;
    saveProgress();
    document.getElementById("judgeModeLabel").textContent = state.judgeMode === "self" ? "自己拼" : "家长判";
  });

  // iOS 语音解锁
  document.body.addEventListener("pointerdown", unlockSpeech, { once: true });
  document.body.addEventListener("touchstart", unlockSpeech, { once: true });

  syncTabs();
  render();
  Pad.resize();
})();
