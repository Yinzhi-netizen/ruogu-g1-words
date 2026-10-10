(function () {
  const books = window.RUOGU_BOOKS || [];
  const kinds = window.RUOGU_BOOK_KINDS || {};
  const STARS = window.RUOGU_BOOK_STARS;
  const MISSION_SIZE = 8;

  const els = {
    totalStars: document.getElementById("totalStars"),
    metCount: document.getElementById("metCount"),
    gettingCount: document.getElementById("gettingCount"),
    solvedCount: document.getElementById("solvedCount"),
    bookMeta: document.getElementById("bookMeta"),
    bookTitle: document.getElementById("bookTitle"),
    bookSub: document.getElementById("bookSub"),
    bookWordCount: document.getElementById("bookWordCount"),
    pathSteps: document.querySelectorAll("[data-step]"),
    meetView: document.getElementById("meetView"),
    meetShelf: document.getElementById("meetShelf"),
    toCase: document.getElementById("toCase"),
    caseView: document.getElementById("caseView"),
    caseProgress: document.getElementById("caseProgress"),
    activityLabel: document.getElementById("activityLabel"),
    activityTitle: document.getElementById("activityTitle"),
    activityPrompt: document.getElementById("activityPrompt"),
    activityArea: document.getElementById("activityArea"),
    feedback: document.getElementById("feedback"),
    hintButton: document.getElementById("hintButton"),
    nextTask: document.getElementById("nextTask"),
    finishView: document.getElementById("finishView"),
    finishCopy: document.getElementById("finishCopy"),
    finishTotal: document.getElementById("finishTotal"),
    finishCorrect: document.getElementById("finishCorrect"),
    againButton: document.getElementById("againButton"),
    toFile: document.getElementById("toFile"),
    fileView: document.getElementById("fileView"),
    fileList: document.getElementById("fileList"),
    confetti: document.getElementById("confetti")
  };

  if (!STARS || !books.length) {
    els.bookSub.textContent = "The book words did not load. Please refresh and try again.";
    return;
  }

  const book = chooseBook();
  const words = book.words.map((item) => ({ ...item, key: normalizeKey(item.word) }));
  const allWords = books.flatMap((item) => item.words);
  let saved = normalizeState(STARS.studyState());
  let activeStep = "meet";
  let mission = [];
  let taskIndex = 0;
  let task = null;
  let usedHint = false;
  let hadMistake = false;
  let answered = false;
  let independentCorrect = 0;

  function normalizeKey(value) { return String(value || "").trim().toLowerCase(); }

  function chooseBook() {
    const requestedId = new URLSearchParams(window.location.search).get("book");
    return books.find((item) => item.id === requestedId) || books[books.length - 1];
  }

  function normalizeState(value) {
    const next = value && typeof value === "object" ? value : {};
    if (!next.books || typeof next.books !== "object") next.books = {};
    if (!next.books[book.id]) next.books[book.id] = { words: {}, missionsCompleted: 0 };
    if (!next.books[book.id].words) next.books[book.id].words = {};
    next.version = 1;
    return next;
  }

  function bookState() { return saved.books[book.id]; }

  function wordState(key) {
    const state = bookState();
    if (!state.words[key]) state.words[key] = { met: false, attempts: 0, independentCorrect: 0, needsReview: false };
    return state.words[key];
  }

  function statusOf(key) {
    const state = wordState(key);
    if (Number(state.independentCorrect || 0) >= 2 && !state.needsReview) return "solved";
    if (state.attempts || state.met) return "getting";
    return "new";
  }

  function save() { STARS.saveStudyState(saved); updateHeader(); }

  function updateHeader() {
    els.totalStars.textContent = STARS.totalStars();
    els.metCount.textContent = words.filter((item) => wordState(item.key).met).length;
    els.gettingCount.textContent = words.filter((item) => statusOf(item.key) === "getting").length;
    els.solvedCount.textContent = words.filter((item) => statusOf(item.key) === "solved").length;
    updatePathStatus();
  }

  function updatePathStatus() {
    const done = {
      meet: words.every((item) => wordState(item.key).met),
      case: Number(bookState().missionsCompleted || 0) > 0,
      file: words.every((item) => statusOf(item.key) === "solved")
    };
    els.pathSteps.forEach((button) => {
      const step = button.dataset.step;
      button.classList.toggle("is-active", step === activeStep);
      button.classList.toggle("is-done", done[step]);
      button.querySelector(".step-num").textContent = done[step] ? "✓" : ({ meet: 1, case: 2, file: 3 }[step]);
    });
  }

  function renderBanner() {
    els.bookMeta.textContent = `${book.cover} Read on ${book.readOn}`;
    els.bookTitle.textContent = book.title;
    els.bookSub.textContent = `${book.author} · ${book.level}`;
    els.bookWordCount.textContent = words.length;
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

  // 把词拆成可视化片段：decode/new 按音节交替着色，tail 词根与词尾分色。
  function wordMarkup(item) {
    if (item.kind === "tail") {
      const cut = item.word.length - item.tail.length;
      return `<span class="chunk">${escapeHtml(item.word.slice(0, cut))}</span><span class="chunk tail">${escapeHtml(item.word.slice(cut))}</span>`;
    }
    const chunks = item.chunks && item.chunks.length ? item.chunks : [item.word];
    return chunks.map((chunk, index) => `<span class="chunk${index % 2 ? " alt" : ""}">${escapeHtml(chunk)}</span>`).join("");
  }

  function rootNote(item) {
    if (item.kind !== "tail") return "";
    const stem = item.word.slice(0, item.word.length - item.tail.length);
    return item.dropE
      ? `${stem} + ${item.tail} ← ${item.root} (the silent e jumped off)`
      : `${item.root} + ${item.tail}`;
  }

  function showStep(step) {
    activeStep = step;
    [els.meetView, els.caseView, els.finishView, els.fileView].forEach((view) => { view.hidden = true; });
    if (step === "meet") { els.meetView.hidden = false; renderShelf(); }
    if (step === "case") startMission();
    if (step === "file") { els.fileView.hidden = false; renderFile(); }
    updatePathStatus();
  }

  function renderShelf() {
    els.meetShelf.innerHTML = "";
    ["decode", "tail", "new"].forEach((kind) => {
      const group = words.filter((item) => item.kind === kind);
      if (!group.length) return;
      const info = kinds[kind] || { label: kind, icon: "", tip: "" };
      const heading = document.createElement("div");
      heading.className = "kind-heading";
      heading.innerHTML = `<p class="eyebrow">${info.icon} ${info.label} · ${group.length}</p><small>${info.tip}</small>`;
      els.meetShelf.appendChild(heading);
      const shelf = document.createElement("div");
      shelf.className = "word-shelf";
      group.forEach((item) => {
        const state = wordState(item.key);
        const card = document.createElement("button");
        card.type = "button";
        card.className = `word-note book-note${state.met ? " is-seen" : ""}`;
        const note = rootNote(item);
        card.innerHTML = `
          <span class="book-emoji" aria-hidden="true">${item.emoji}</span>
          <strong class="chunked">${wordMarkup(item)}</strong>
          <span class="reveal">${note ? `<em>${escapeHtml(note)}</em>` : ""}<b>${escapeHtml(item.zh)}</b>${escapeHtml(item.clue)}</span>`;
        card.addEventListener("click", () => {
          state.met = true;
          card.classList.add("is-seen", "is-open");
          save();
          speakWord(item.word);
        });
        shelf.appendChild(card);
      });
      els.meetShelf.appendChild(shelf);
    });
  }

  function chooseMission() {
    const review = shuffle(words.filter((item) => wordState(item.key).needsReview));
    const fresh = shuffle(words.filter((item) => !wordState(item.key).attempts && !wordState(item.key).needsReview));
    const rest = shuffle(words.filter((item) => wordState(item.key).attempts && !wordState(item.key).needsReview))
      .sort((a, b) => Number(wordState(a.key).independentCorrect || 0) - Number(wordState(b.key).independentCorrect || 0));
    const seen = new Set();
    return [...review, ...fresh, ...rest].filter((item) => !seen.has(item.key) && seen.add(item.key)).slice(0, MISSION_SIZE);
  }

  function activityFor(item, index) {
    if (item.kind === "tail") return index % 3 === 2 ? "meaning" : "cut";
    if (item.kind === "new") return index % 2 ? "meaning" : "context";
    return index % 2 ? "context" : "meaning";
  }

  function startMission() {
    mission = chooseMission();
    taskIndex = 0;
    independentCorrect = 0;
    els.finishView.hidden = true;
    els.caseView.hidden = false;
    renderTask();
  }

  function renderTask() {
    if (taskIndex >= mission.length) return finishMission();
    const item = mission[taskIndex];
    task = { item, type: activityFor(item, taskIndex) };
    usedHint = false;
    hadMistake = false;
    answered = false;
    els.caseProgress.style.width = `${(taskIndex / mission.length) * 100}%`;
    els.feedback.className = "feedback";
    els.feedback.textContent = "";
    els.nextTask.hidden = true;
    els.hintButton.hidden = false;
    els.activityArea.innerHTML = "";
    if (task.type === "meaning") renderMeaning();
    if (task.type === "context") renderContext();
    if (task.type === "cut") renderCut();
  }

  function distractors(item, field, count) {
    const pool = shuffle(allWords.filter((other) => normalizeKey(other.word) !== item.key && other[field] !== item[field]));
    const picked = [];
    pool.forEach((other) => {
      if (picked.length < count && !picked.some((p) => p[field] === other[field])) picked.push(other);
    });
    return picked;
  }

  function renderMeaning() {
    const item = task.item;
    els.activityLabel.textContent = `Read and think · ${taskIndex + 1}/${mission.length}`;
    els.activityTitle.textContent = "What does this word mean?";
    els.activityPrompt.textContent = "Read it by yourself first. Need help? Tap “Give me a clue” to see the chunks and hear it.";
    const word = document.createElement("div");
    word.className = "word-pattern book-word";
    word.textContent = item.word;
    const grid = document.createElement("div");
    grid.className = "choice-grid";
    shuffle([item, ...distractors(item, "zh", 2)]).forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-button";
      button.innerHTML = `<span aria-hidden="true">${option.emoji}</span> ${escapeHtml(option.zh)}`;
      button.addEventListener("click", () => answerChoice(button, option.word === item.word, grid));
      grid.appendChild(button);
    });
    els.activityArea.append(word, grid);
  }

  function renderContext() {
    const item = task.item;
    els.activityLabel.textContent = `Story clue · ${taskIndex + 1}/${mission.length}`;
    els.activityTitle.textContent = "Which word fits the clue?";
    els.activityPrompt.textContent = "Read the sentence. The picture is a clue too.";
    const pattern = new RegExp(`\\b${item.word}\\b`, "i");
    const sentence = document.createElement("p");
    sentence.className = "clue-sentence";
    sentence.innerHTML = `<span aria-hidden="true">${item.emoji}</span> ${escapeHtml(item.clue).replace(pattern, '<span class="blank">______</span>')}`;
    const grid = document.createElement("div");
    grid.className = "choice-grid";
    shuffle([item, ...distractors(item, "word", 2)]).forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-button";
      button.textContent = option.word;
      button.addEventListener("click", () => answerChoice(button, option.word === item.word, grid));
      grid.appendChild(button);
    });
    els.activityArea.append(sentence, grid);
  }

  function renderCut() {
    const item = task.item;
    const letters = item.word.split("");
    let cutAt = null;
    els.activityLabel.textContent = `Take off the tail · ${taskIndex + 1}/${mission.length}`;
    els.activityTitle.textContent = "Where does the tail start?";
    els.activityPrompt.textContent = "Tap the first letter of the ending. What word is hiding in front?";
    const row = document.createElement("div");
    row.className = "cut-row";
    const buttons = letters.map((letter, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cut-letter";
      button.textContent = letter;
      button.disabled = index === 0;
      button.addEventListener("click", () => {
        if (answered) return;
        cutAt = index;
        buttons.forEach((other, i) => other.classList.toggle("is-tail", i >= cutAt));
        check.disabled = false;
      });
      row.appendChild(button);
      return button;
    });
    const check = document.createElement("button");
    check.type = "button";
    check.className = "primary-button";
    check.textContent = "Cut here ✂️";
    check.disabled = true;
    check.addEventListener("click", () => {
      const right = cutAt === item.word.length - item.tail.length;
      if (right) {
        check.disabled = true;
        buttons.forEach((button) => { button.disabled = true; });
        markResult(true);
        els.feedback.textContent = `${rootNote(item)} · ${item.zh}`;
        speakWord(item.root);
      } else {
        markResult(false);
        els.feedback.textContent = "Not quite. Try another place to cut.";
      }
    });
    els.activityArea.append(row, check);
  }

  function answerChoice(button, right, grid) {
    if (answered) return;
    if (right) {
      button.classList.add("is-correct");
      grid.querySelectorAll("button").forEach((other) => { other.disabled = true; });
      markResult(true);
      const item = task.item;
      els.feedback.textContent = `${item.word} · ${item.zh}`;
      speakWord(item.word);
    } else {
      button.classList.add("is-wrong");
      button.disabled = true;
      markResult(false);
      els.feedback.textContent = "Not this one. Look for another clue.";
    }
  }

  function markResult(right) {
    const state = wordState(task.item.key);
    if (!right) {
      hadMistake = true;
      els.feedback.className = "feedback try";
      return;
    }
    answered = true;
    state.met = true;
    state.attempts = Number(state.attempts || 0) + 1;
    state.lastSeenAt = new Date().toISOString();
    if (!usedHint && !hadMistake) {
      state.independentCorrect = Number(state.independentCorrect || 0) + 1;
      state.needsReview = false;
      independentCorrect += 1;
    } else {
      state.needsReview = true;
    }
    save();
    els.feedback.className = "feedback good";
    els.hintButton.hidden = true;
    els.nextTask.hidden = false;
  }

  function giveHint() {
    const item = task.item;
    usedHint = true;
    els.feedback.className = "feedback try";
    if (task.type === "meaning") {
      els.feedback.innerHTML = `Clue: <span class="chunked inline">${wordMarkup(item)}</span>`;
      speakWord(item.word);
    } else if (task.type === "context") {
      els.feedback.textContent = `Clue: the word means “${item.zh}”.`;
    } else {
      els.feedback.textContent = `Clue: the word hiding inside is “${item.root}”.`;
      speakWord(item.root);
    }
  }

  function finishMission() {
    bookState().missionsCompleted = Number(bookState().missionsCompleted || 0) + 1;
    STARS.addStars(5);
    save();
    els.caseView.hidden = true;
    els.finishView.hidden = false;
    els.finishTotal.textContent = mission.length;
    els.finishCorrect.textContent = independentCorrect;
    const solved = words.filter((item) => statusOf(item.key) === "solved").length;
    els.finishCopy.textContent = `${solved} of ${words.length} words from ${book.shortTitle} are solved. Words that needed a clue will come back next time.`;
    celebrate();
  }

  function renderFile() {
    const label = { solved: "Solved", getting: "Getting it", new: "Not yet met" };
    const order = { new: 0, getting: 1, solved: 2 };
    els.fileList.innerHTML = "";
    [...words].sort((a, b) => order[statusOf(a.key)] - order[statusOf(b.key)]).forEach((item) => {
      const status = statusOf(item.key);
      const row = document.createElement("button");
      row.type = "button";
      row.className = "mark-row file-row";
      row.innerHTML = `<span aria-hidden="true">${item.emoji}</span><div class="mark-word"><strong>${escapeHtml(item.word)}</strong><small>${escapeHtml(item.zh)}${wordState(item.key).needsReview ? " · needs another look" : ""}</small></div><span class="file-status is-${status}">${label[status]}</span>`;
      row.addEventListener("click", () => speakWord(item.word));
      els.fileList.appendChild(row);
    });
  }

  function speakWord(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = .76;
    window.speechSynthesis.speak(utterance);
  }

  function celebrate() {
    const colors = ["#356b86", "#789581", "#e9be72", "#c97862"];
    els.confetti.innerHTML = "";
    for (let i = 0; i < 26; i += 1) {
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

  els.pathSteps.forEach((button) => button.addEventListener("click", () => showStep(button.dataset.step)));
  els.toCase.addEventListener("click", () => showStep("case"));
  els.hintButton.addEventListener("click", giveHint);
  els.nextTask.addEventListener("click", () => { taskIndex += 1; renderTask(); });
  els.againButton.addEventListener("click", () => showStep("case"));
  els.toFile.addEventListener("click", () => showStep("file"));

  renderBanner();
  updateHeader();
  showStep("meet");
})();
