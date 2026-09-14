(function () {
  const groups = window.RUOGU_G1_WORD_GROUPS || [];
  const explicitSentences = window.RUOGU_G1_SENTENCES || {};
  const stories = window.RUOGU_G1_STORIES || [];
  const STARS = window.RUOGU_G1_STARS;
  const MISSION_SIZE = 8;
  const routeInfo = {
    core: { title: "Into the Spelling Woods", copy: "Listen for words and rebuild familiar spellings from start to finish.", sticker: "🌿" },
    vocab: { title: "Explore Discovery Bay", copy: "Put classroom words back into sentences and little stories.", sticker: "🔎" },
    mixed: { title: "Take the Mystery Route", copy: "Listening, spelling and story questions can all appear. See who you meet today.", sticker: "⛵" }
  };

  const els = {
    totalStars: document.getElementById("totalStars"),
    seenCount: document.getElementById("seenCount"),
    strongCount: document.getElementById("strongCount"),
    stickerCount: document.getElementById("stickerCount"),
    filters: document.querySelectorAll("[data-route]"),
    launchCard: document.getElementById("launchCard"),
    launchTitle: document.getElementById("launchTitle"),
    launchCopy: document.getElementById("launchCopy"),
    startMission: document.getElementById("startMission"),
    missionCard: document.getElementById("missionCard"),
    missionProgress: document.getElementById("missionProgress"),
    activityLabel: document.getElementById("activityLabel"),
    activityTitle: document.getElementById("activityTitle"),
    activityPrompt: document.getElementById("activityPrompt"),
    activityArea: document.getElementById("activityArea"),
    feedback: document.getElementById("feedback"),
    hintButton: document.getElementById("hintButton"),
    nextTask: document.getElementById("nextTask"),
    finishCard: document.getElementById("finishCard"),
    finishCopy: document.getElementById("finishCopy"),
    earnedSticker: document.getElementById("earnedSticker"),
    missionCorrect: document.getElementById("missionCorrect"),
    againButton: document.getElementById("againButton"),
    confetti: document.getElementById("confetti")
  };

  if (!STARS || !groups.length) {
    els.launchCopy.textContent = "The word library did not load. Please refresh and try again.";
    els.startMission.disabled = true;
    return;
  }

  const words = buildWords(groups);
  const sentenceMap = buildSentenceMap();
  let saved = normalizeState(STARS.studyState());
  let route = "core";
  let mission = [];
  let taskIndex = 0;
  let task = null;
  let usedHint = false;
  let hadMistake = false;
  let independentCorrect = 0;
  let pickedTiles = [];

  function normalizeKey(value) { return String(value || "").trim().toLowerCase(); }

  function buildWords(sourceGroups) {
    const rank = { core: 0, challenge: 1, vocab: 2 };
    const map = new Map();
    sourceGroups.forEach((group) => {
      group.words.forEach((raw) => {
        const key = normalizeKey(raw);
        if (!key) return;
        if (!map.has(key)) map.set(key, { key, word: String(raw), track: group.track || "vocab", groups: [], subject: group.subject || "" });
        const item = map.get(key);
        if ((rank[group.track] ?? 9) < (rank[item.track] ?? 9)) item.track = group.track;
        if (group.title && !item.groups.includes(group.title)) item.groups.push(group.title);
        if (!item.subject && group.subject) item.subject = group.subject;
      });
    });
    return [...map.values()];
  }

  function buildSentenceMap() {
    const map = { ...explicitSentences };
    stories.forEach((story) => {
      (story.wordsUsed || []).forEach((word) => {
        const key = normalizeKey(word);
        if (map[key]) return;
        const sentence = (story.paragraphs || []).flatMap((p) => p.match(/[^.!?]+[.!?]+/g) || [p])
          .find((part) => new RegExp(`\\b${escapeRegExp(key)}\\b`, "i").test(part));
        if (sentence) map[key] = sentence.trim();
      });
    });
    return map;
  }

  function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function normalizeState(value) {
    const next = value && typeof value === "object" ? value : {};
    if (!next.words || typeof next.words !== "object") next.words = {};
    if (!Array.isArray(next.stickers)) next.stickers = [];
    if (!Number.isFinite(next.missionsCompleted)) next.missionsCompleted = 0;
    next.version = 2;
    return next;
  }

  function wordState(key) {
    if (!saved.words[key]) saved.words[key] = { attempts: 0, correct: 0, independentCorrect: 0, needsReview: false };
    return saved.words[key];
  }

  function save() { STARS.saveStudyState(saved); updateHeader(); }

  function updateHeader() {
    const entries = Object.values(saved.words);
    els.totalStars.textContent = STARS.totalStars();
    els.seenCount.textContent = entries.filter((item) => Number(item.attempts || 0) > 0).length;
    els.strongCount.textContent = entries.filter((item) => Number(item.independentCorrect || 0) >= 2).length;
    els.stickerCount.textContent = saved.stickers.length;
  }

  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function routePool() {
    if (route === "core") return words.filter((item) => item.track === "core" || item.track === "challenge");
    if (route === "vocab") return words.filter((item) => item.track === "vocab");
    return words;
  }

  function chooseMission() {
    const pool = routePool();
    const review = shuffle(pool.filter((item) => wordState(item.key).needsReview));
    const unseen = shuffle(pool.filter((item) => !wordState(item.key).attempts && !wordState(item.key).needsReview));
    const familiar = shuffle(pool.filter((item) => wordState(item.key).attempts && !wordState(item.key).needsReview));
    return unique([...review, ...unseen, ...familiar]).slice(0, MISSION_SIZE);
  }

  function unique(items) {
    const seen = new Set();
    return items.filter((item) => !seen.has(item.key) && seen.add(item.key));
  }

  function activityFor(word, index) {
    const sentence = sentenceMap[word.key];
    const canSpell = /^[a-z]+$/i.test(word.word) && word.word.length <= 12;
    if (word.track === "vocab" && sentence) return "context";
    if (canSpell && index % 3 === 2) return "spell";
    if (canSpell && index % 3 === 1) return "missing";
    return "listen";
  }

  function makeTask(word, index) { return { word, type: activityFor(word, index) }; }

  function setRoute(nextRoute) {
    route = nextRoute;
    els.filters.forEach((button) => button.classList.toggle("is-active", button.dataset.route === route));
    els.launchTitle.textContent = routeInfo[route].title;
    els.launchCopy.textContent = routeInfo[route].copy;
  }

  function startMission() {
    mission = chooseMission();
    taskIndex = 0;
    independentCorrect = 0;
    els.launchCard.hidden = true;
    els.finishCard.hidden = true;
    els.missionCard.hidden = false;
    renderTask();
  }

  function renderTask() {
    if (taskIndex >= mission.length) return finishMission();
    task = makeTask(mission[taskIndex], taskIndex);
    usedHint = false;
    hadMistake = false;
    pickedTiles = [];
    els.missionProgress.style.width = `${(taskIndex / mission.length) * 100}%`;
    els.feedback.className = "feedback";
    els.feedback.textContent = "";
    els.nextTask.hidden = true;
    els.hintButton.hidden = false;
    els.activityArea.innerHTML = "";

    if (task.type === "listen") renderListen();
    if (task.type === "missing") renderMissing();
    if (task.type === "spell") renderSpell();
    if (task.type === "context") renderContext();
  }

  function renderListen() {
    els.activityLabel.textContent = "Listen and find";
    els.activityTitle.textContent = "Listen. Which word is it?";
    els.activityPrompt.textContent = `${taskIndex + 1} / ${mission.length} · Tap the sound, then choose below.`;
    const speak = document.createElement("button");
    speak.className = "speak-orb";
    speak.type = "button";
    speak.setAttribute("aria-label", "Play the word");
    speak.textContent = "♪";
    speak.addEventListener("click", () => speakWord(task.word.word));
    els.activityArea.appendChild(speak);
    const options = choiceWords(task.word, 4);
    els.activityArea.appendChild(choiceGrid(options));
  }

  function renderMissing() {
    const letters = task.word.word.toLowerCase().split("");
    const index = Math.min(letters.length - 1, Math.max(1, Math.floor(letters.length / 2)));
    const missing = letters[index];
    const shown = letters.map((letter, i) => i === index ? "_" : letter).join("");
    els.activityLabel.textContent = "Word workshop";
    els.activityTitle.textContent = "Which letter is missing?";
    els.activityPrompt.textContent = `${taskIndex + 1} / ${mission.length} · Listen first, then fill the gap.`;
    const speak = document.createElement("button");
    speak.className = "speak-orb";
    speak.type = "button";
    speak.textContent = "♪";
    speak.addEventListener("click", () => speakWord(task.word.word));
    const pattern = document.createElement("div");
    pattern.className = "word-pattern";
    pattern.textContent = shown;
    els.activityArea.append(speak, pattern);
    const lettersPool = shuffle([missing, ...shuffle("abcdefghijklmnopqrstuvwxyz".split("").filter((item) => item !== missing)).slice(0, 3)]);
    els.activityArea.appendChild(choiceGrid(lettersPool.map((letter) => ({ word: letter, key: letter })), missing));
  }

  function renderContext() {
    const sentence = sentenceMap[task.word.key] || "";
    const blank = sentence.replace(new RegExp(`\\b${escapeRegExp(task.word.word)}\\b`, "i"), "______");
    els.activityLabel.textContent = "Move the story along";
    els.activityTitle.textContent = "Which word fits best?";
    els.activityPrompt.textContent = `${taskIndex + 1} / ${mission.length}`;
    const pattern = document.createElement("div");
    pattern.className = "paper-card";
    pattern.style.marginBottom = "20px";
    pattern.style.fontFamily = "Georgia, serif";
    pattern.style.fontSize = "clamp(20px, 4vw, 30px)";
    pattern.style.lineHeight = "1.6";
    pattern.textContent = blank;
    els.activityArea.appendChild(pattern);
    els.activityArea.appendChild(choiceGrid(choiceWords(task.word, 3)));
  }

  function renderSpell() {
    els.activityLabel.textContent = "Spell it on your own";
    els.activityTitle.textContent = "Build the word you hear";
    els.activityPrompt.textContent = `${taskIndex + 1} / ${mission.length} · No letter clues this time.`;
    const speak = document.createElement("button");
    speak.className = "speak-orb";
    speak.type = "button";
    speak.textContent = "♪";
    speak.addEventListener("click", () => speakWord(task.word.word));
    const answer = document.createElement("div");
    answer.className = "tile-answer";
    answer.id = "tileAnswer";
    const bank = document.createElement("div");
    bank.className = "tile-bank";
    bank.id = "tileBank";
    const letters = task.word.word.toLowerCase().split("").map((letter, index) => ({ id: `${letter}-${index}`, letter }));
    shuffle(letters).forEach((item) => {
      const button = tileButton(item);
      bank.appendChild(button);
    });
    const check = document.createElement("button");
    check.className = "primary-button sage";
    check.type = "button";
    check.textContent = "Check spelling";
    check.addEventListener("click", checkSpelling);
    els.activityArea.append(speak, answer, bank, check);
  }

  function tileButton(item) {
    const button = document.createElement("button");
    button.className = "tile-button";
    button.type = "button";
    button.textContent = item.letter;
    button.dataset.tileId = item.id;
    button.addEventListener("click", () => {
      if (pickedTiles.some((tile) => tile.id === item.id)) {
        pickedTiles = pickedTiles.filter((tile) => tile.id !== item.id);
        button.disabled = false;
      } else {
        pickedTiles.push(item);
        button.disabled = true;
      }
      const answer = document.getElementById("tileAnswer");
      answer.textContent = pickedTiles.map((tile) => tile.letter).join("");
    });
    return button;
  }

  function checkSpelling() {
    const answer = pickedTiles.map((item) => item.letter).join("");
    if (answer === task.word.word.toLowerCase()) return completeTask(true);
    hadMistake = true;
    wordState(task.word.key).needsReview = true;
    els.feedback.className = "feedback try";
    els.feedback.textContent = "Almost there. Put the letters back and try again slowly.";
    pickedTiles = [];
    document.getElementById("tileAnswer").textContent = "";
    document.querySelectorAll("[data-tile-id]").forEach((button) => { button.disabled = false; });
  }

  function choiceWords(target, count) {
    const sameTrack = words.filter((item) => item.key !== target.key && item.track === target.track && Math.abs(item.word.length - target.word.length) <= 3);
    const rest = words.filter((item) => item.key !== target.key);
    return shuffle([target, ...unique([...shuffle(sameTrack), ...shuffle(rest)]).slice(0, count - 1)]);
  }

  function choiceGrid(options, expectedKey) {
    const grid = document.createElement("div");
    grid.className = "choice-grid";
    options.forEach((item) => {
      const key = normalizeKey(item.key || item.word);
      const button = document.createElement("button");
      button.className = "choice-button";
      button.type = "button";
      button.textContent = item.word;
      button.addEventListener("click", () => {
        const correctKey = normalizeKey(expectedKey || task.word.key);
        if (key === correctKey) {
          button.classList.add("is-correct");
          completeTask(true);
        } else {
          button.classList.add("is-wrong");
          button.disabled = true;
          hadMistake = true;
          wordState(task.word.key).needsReview = true;
          els.feedback.className = "feedback try";
          els.feedback.textContent = "Not this one. Listen again and take another look.";
        }
      });
      grid.appendChild(button);
    });
    return grid;
  }

  function completeTask(correct) {
    const entry = wordState(task.word.key);
    entry.attempts = Number(entry.attempts || 0) + 1;
    entry.lastSeenAt = new Date().toISOString();
    if (correct) entry.correct = Number(entry.correct || 0) + 1;
    if (correct && !usedHint && !hadMistake) {
      independentCorrect += 1;
      if (task.type === "spell") entry.independentCorrect = Number(entry.independentCorrect || 0) + 1;
      entry.needsReview = false;
      els.feedback.className = "feedback good";
      els.feedback.textContent = "You found it all by yourself!";
    } else {
      entry.needsReview = true;
      els.feedback.className = "feedback good";
      els.feedback.textContent = `We found ${task.word.word} together. It will visit again soon.`;
    }
    save();
    els.activityArea.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    els.hintButton.hidden = true;
    els.nextTask.hidden = false;
  }

  function showHint() {
    usedHint = true;
    const first = task.word.word.slice(0, 1);
    const last = task.word.word.length > 2 ? task.word.word.slice(-1) : "";
    els.activityPrompt.textContent = `Hint: it starts with “${first}”${last ? ` and ends with “${last}”` : ""}.`;
    speakWord(task.word.word);
  }

  function nextTask() { taskIndex += 1; renderTask(); }

  function finishMission() {
    saved.missionsCompleted += 1;
    const sticker = routeInfo[route].sticker;
    saved.stickers.push({ sticker, route, earnedAt: new Date().toISOString() });
    STARS.addStars(5);
    STARS.saveStudyState(saved);
    updateHeader();
    els.missionCard.hidden = true;
    els.finishCard.hidden = false;
    els.missionCorrect.textContent = independentCorrect;
    els.earnedSticker.textContent = sticker;
    els.finishCopy.textContent = independentCorrect === mission.length
      ? "You completed the whole route on your own. Those words are shining bright today."
      : `You found ${independentCorrect} words on your own. The words that needed hints will visit again.`;
    celebrate();
  }

  function celebrate() {
    const colors = ["#356b86", "#789581", "#e9be72", "#c97862"];
    els.confetti.innerHTML = "";
    for (let i = 0; i < 24; i += 1) {
      const bit = document.createElement("i");
      bit.style.left = `${Math.random() * 100}%`;
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = `${Math.random() * .5}s`;
      bit.style.setProperty("--drift", `${(Math.random() - .5) * 180}px`);
      els.confetti.appendChild(bit);
    }
    els.confetti.hidden = false;
    window.setTimeout(() => { els.confetti.hidden = true; }, 2300);
  }

  function speakWord(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = .78;
    window.speechSynthesis.speak(utterance);
  }

  els.filters.forEach((button) => button.addEventListener("click", () => setRoute(button.dataset.route)));
  els.startMission.addEventListener("click", startMission);
  els.hintButton.addEventListener("click", showHint);
  els.nextTask.addEventListener("click", nextTask);
  els.againButton.addEventListener("click", () => {
    els.finishCard.hidden = true;
    els.launchCard.hidden = false;
  });

  setRoute(route);
  updateHeader();
})();
