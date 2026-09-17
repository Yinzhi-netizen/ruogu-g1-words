(function () {
  const cycles = window.RUOGU_G2_CYCLES || [];
  const groups = window.RUOGU_G2_WORD_GROUPS || [];
  const sentences = window.RUOGU_G2_SENTENCES || {};
  const STARS = window.RUOGU_G2_STARS;

  const els = {
    totalStars: document.getElementById("totalStars"),
    metCount: document.getElementById("metCount"),
    practiceCount: document.getElementById("practiceCount"),
    paperCount: document.getElementById("paperCount"),
    cycleTitle: document.getElementById("cycleTitle"),
    cycleSub: document.getElementById("cycleSub"),
    cycleWordCount: document.getElementById("cycleWordCount"),
    pathSteps: document.querySelectorAll("[data-step]"),
    meetView: document.getElementById("meetView"),
    wordShelf: document.getElementById("wordShelf"),
    markAllMet: document.getElementById("markAllMet"),
    practiceView: document.getElementById("practiceView"),
    practiceProgress: document.getElementById("practiceProgress"),
    practiceGroup: document.getElementById("practiceGroup"),
    practicePrompt: document.getElementById("practicePrompt"),
    practiceArea: document.getElementById("practiceArea"),
    practiceFeedback: document.getElementById("practiceFeedback"),
    practiceHint: document.getElementById("practiceHint"),
    practiceNext: document.getElementById("practiceNext"),
    paperIntroView: document.getElementById("paperIntroView"),
    startHandwriting: document.getElementById("startHandwriting"),
    startPaper: document.getElementById("startPaper"),
    paperTestView: document.getElementById("paperTestView"),
    paperNumber: document.getElementById("paperNumber"),
    paperSpeak: document.getElementById("paperSpeak"),
    dictationTitle: document.getElementById("dictationTitle"),
    dictationHelp: document.getElementById("dictationHelp"),
    handwritingPanel: document.getElementById("handwritingPanel"),
    handwritingInput: document.getElementById("handwritingInput"),
    recognitionFeedback: document.getElementById("recognitionFeedback"),
    testDots: document.getElementById("testDots"),
    paperPrev: document.getElementById("paperPrev"),
    paperNext: document.getElementById("paperNext"),
    markView: document.getElementById("markView"),
    markKicker: document.getElementById("markKicker"),
    markTitle: document.getElementById("markTitle"),
    markCopy: document.getElementById("markCopy"),
    markList: document.getElementById("markList"),
    savePaperResult: document.getElementById("savePaperResult"),
    resultView: document.getElementById("resultView"),
    resultTitle: document.getElementById("resultTitle"),
    resultCopy: document.getElementById("resultCopy"),
    resultRight: document.getElementById("resultRight"),
    resultWrong: document.getElementById("resultWrong"),
    reviewTrouble: document.getElementById("reviewTrouble"),
    troubleView: document.getElementById("troubleView"),
    troubleTitle: document.getElementById("troubleTitle"),
    troubleCopy: document.getElementById("troubleCopy"),
    troubleArea: document.getElementById("troubleArea"),
    troubleFeedback: document.getElementById("troubleFeedback"),
    troubleHint: document.getElementById("troubleHint"),
    troubleNext: document.getElementById("troubleNext"),
    confetti: document.getElementById("confetti")
  };

  if (!STARS || !cycles.length || !groups.length) {
    els.cycleSub.textContent = "This Cycle did not load. Please refresh and try again.";
    return;
  }

  let saved = normalizeState(STARS.studyState());
  const currentCycle = chooseCycle();
  const cycleGroups = groups.filter((group) => currentCycle.groupIds.includes(group.id));
  const cycleWords = buildCycleWords(cycleGroups);
  let activeStep = "meet";
  let practiceQueue = [];
  let practiceIndex = 0;
  let practiceMode = "practice";
  let selectedTiles = [];
  let practiceHintUsed = false;
  let paperQueue = [];
  let paperIndex = 0;
  let paperMarks = {};
  let dictationMode = "ipad";
  let dictationAnswers = {};

  function normalizeKey(value) { return String(value || "").trim().toLowerCase(); }

  function normalizeState(value) {
    const next = value && typeof value === "object" ? value : {};
    if (!next.cycles || typeof next.cycles !== "object") next.cycles = {};
    next.version = 3;
    return next;
  }

  function chooseCycle() {
    const requestedId = new URLSearchParams(window.location.search).get("cycle");
    const requested = cycles.find((cycle) => cycle.id === requestedId);
    const stored = cycles.find((cycle) => cycle.id === saved.currentCycle);
    const publishedCurrent = cycles.find((cycle) => cycle.status === "current");
    const current = requested || publishedCurrent || stored || cycles[cycles.length - 1];
    saved.currentCycle = current.id;
    if (!saved.cycles[current.id]) saved.cycles[current.id] = { words: {}, dictationHistory: [], metAll: false };
    const state = saved.cycles[current.id];
    if (!state.words || typeof state.words !== "object") state.words = {};
    if (!Array.isArray(state.dictationHistory)) {
      state.dictationHistory = Array.isArray(state.paperHistory) ? [...state.paperHistory] : [];
    }
    migrateLegacyProgress(current);
    save();
    return current;
  }

  function cycleState() { return saved.cycles[currentCycle.id]; }

  function wordState(key) {
    const state = cycleState();
    if (!state.words[key]) state.words[key] = { met: false, practiceAttempts: 0, practiceCorrect: 0, paperResult: null };
    return state.words[key];
  }

  function migrateLegacyProgress(cycle) {
    const state = saved.cycles[cycle.id];
    if (state.legacyChecked) return;
    const legacy = STARS.legacyEnglishState();
    const oldProgress = legacy && legacy.progress;
    if (oldProgress && typeof oldProgress === "object") {
      const keys = new Set(groups.filter((group) => cycle.groupIds.includes(group.id)).flatMap((group) => group.words.map(normalizeKey)));
      keys.forEach((key) => {
        const old = oldProgress[key];
        if (!old) return;
        state.words[key] = state.words[key] || { met: false, practiceAttempts: 0, practiceCorrect: 0, paperResult: null };
        state.words[key].met = old.status !== "unseen";
        state.words[key].practiceCorrect = old.status === "spell" ? 1 : 0;
      });
    }
    state.legacyChecked = true;
  }

  function save() { STARS.saveStudyState(saved); }

  function buildCycleWords(sourceGroups) {
    const seen = new Set();
    const result = [];
    sourceGroups.forEach((group) => {
      group.words.forEach((word) => {
        const key = normalizeKey(word);
        if (seen.has(key)) return;
        seen.add(key);
        result.push({ key, word, groupId: group.id, groupTitle: group.title, subject: group.subject || "Spelling", sentence: sentences[key] || "" });
      });
    });
    return result;
  }

  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function updateHeader() {
    const states = cycleWords.map((word) => wordState(word.key));
    els.totalStars.textContent = STARS.totalStars();
    els.metCount.textContent = states.filter((item) => item.met).length;
    els.practiceCount.textContent = states.filter((item) => Number(item.practiceCorrect || 0) > 0).length;
    els.paperCount.textContent = states.filter((item) => item.paperResult === "correct").length;
    els.cycleTitle.textContent = `${currentCycle.label} · ${currentCycle.title}`;
    els.cycleWordCount.textContent = cycleWords.length;
    els.cycleSub.textContent = currentCycle.status === "current"
      ? currentCycle.testDate
        ? `Quiz date: ${currentCycle.testDate} · Meet the words, practise, then take an iPad handwriting dictation.`
        : "Current Cycle · Meet the words, practise, then take an iPad handwriting dictation."
      : "Review Cycle · Revisit the words, practise, or take another handwriting dictation.";
    updatePathStatus();
  }

  function updatePathStatus() {
    const states = cycleWords.map((word) => wordState(word.key));
    const done = {
      meet: states.every((item) => item.met),
      practice: states.every((item) => Number(item.practiceCorrect || 0) > 0),
      paper: cycleState().dictationHistory.length > 0,
      trouble: cycleState().dictationHistory.length > 0 && states.every((item) => item.paperResult !== "review")
    };
    els.pathSteps.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.step === activeStep);
      button.classList.toggle("is-done", done[button.dataset.step]);
      button.querySelector(".step-num").textContent = done[button.dataset.step] ? "✓" : ({ meet: 1, practice: 2, paper: 3, trouble: 4 }[button.dataset.step]);
    });
  }

  function showStep(step) {
    activeStep = step;
    [els.meetView, els.practiceView, els.paperIntroView, els.paperTestView, els.markView, els.resultView, els.troubleView]
      .forEach((view) => { view.hidden = true; });
    if (step === "meet") {
      els.meetView.hidden = false;
      renderShelf();
    }
    if (step === "practice") startPractice("practice");
    if (step === "paper") els.paperIntroView.hidden = false;
    if (step === "trouble") startPractice("trouble");
    updatePathStatus();
  }

  function renderShelf() {
    els.wordShelf.innerHTML = "";
    cycleGroups.forEach((group) => {
      const heading = document.createElement("div");
      heading.style.gridColumn = "1 / -1";
      heading.style.marginTop = els.wordShelf.children.length ? "18px" : "0";
      heading.innerHTML = `<p class="eyebrow">${group.title.replace(`${currentCycle.label} · `, "")}</p>`;
      els.wordShelf.appendChild(heading);
      group.words.forEach((rawWord) => {
        const word = cycleWords.find((item) => item.key === normalizeKey(rawWord));
        const state = wordState(word.key);
        const card = document.createElement("button");
        card.className = `word-note${state.met ? " is-seen" : ""}`;
        card.type = "button";
        card.innerHTML = `<strong>${word.word}</strong><span>${word.sentence || "Tap to hear the word"}</span>`;
        card.addEventListener("click", () => {
          state.met = true;
          save();
          card.classList.add("is-seen");
          speakWord(word.word);
          updateHeader();
        });
        els.wordShelf.appendChild(card);
      });
    });
  }

  function markAllMet() {
    cycleWords.forEach((word) => { wordState(word.key).met = true; });
    cycleState().metAll = true;
    save();
    updateHeader();
    showStep("practice");
  }

  function startPractice(mode) {
    practiceMode = mode;
    if (mode === "trouble") {
      practiceQueue = cycleWords.filter((word) => wordState(word.key).paperResult === "review");
      els.practiceView.hidden = true;
      els.troubleView.hidden = false;
      if (!practiceQueue.length) {
        els.troubleTitle.textContent = "No tricky words to practise yet";
        els.troubleCopy.textContent = "After a mock dictation, words that need more work will gather here.";
        els.troubleArea.innerHTML = `<div class="empty-state">🌿<br>This spot is empty for now</div>`;
        els.troubleHint.hidden = true;
        els.troubleNext.hidden = true;
        return;
      }
      els.troubleTitle.textContent = `Try tricky words again · ${practiceQueue.length}`;
      els.troubleCopy.textContent = "Listen and rebuild each word. Your mock-dictation result will stay in the record.";
    } else {
      practiceQueue = [...cycleWords].sort((a, b) => Number(wordState(a.key).practiceCorrect || 0) - Number(wordState(b.key).practiceCorrect || 0));
      els.practiceView.hidden = false;
    }
    practiceIndex = 0;
    renderPracticeWord();
  }

  function renderPracticeWord() {
    if (practiceIndex >= practiceQueue.length) return finishPractice();
    const word = practiceQueue[practiceIndex];
    selectedTiles = [];
    practiceHintUsed = false;
    const area = practiceMode === "trouble" ? els.troubleArea : els.practiceArea;
    const feedback = practiceMode === "trouble" ? els.troubleFeedback : els.practiceFeedback;
    const hint = practiceMode === "trouble" ? els.troubleHint : els.practiceHint;
    const next = practiceMode === "trouble" ? els.troubleNext : els.practiceNext;
    area.innerHTML = "";
    feedback.textContent = "";
    feedback.className = "feedback";
    hint.hidden = false;
    next.hidden = true;
    if (practiceMode === "practice") {
      els.practiceProgress.style.width = `${(practiceIndex / practiceQueue.length) * 100}%`;
      els.practiceGroup.textContent = `${word.groupTitle} · ${practiceIndex + 1}/${practiceQueue.length}`;
      els.practicePrompt.textContent = word.sentence || "Listen carefully, then tap the letters in order.";
    }

    const speak = document.createElement("button");
    speak.className = "speak-orb";
    speak.type = "button";
    speak.textContent = "♪";
    speak.addEventListener("click", () => speakWord(word.word));
    const answer = document.createElement("div");
    answer.className = "tile-answer";
    answer.id = `${practiceMode}TileAnswer`;
    const bank = document.createElement("div");
    bank.className = "tile-bank";
    const tiles = word.word.toLowerCase().split("").map((letter, index) => ({ id: `${letter}-${index}`, letter }));
    shuffle(tiles).forEach((tile) => bank.appendChild(makeTileButton(tile, answer)));
    const check = document.createElement("button");
    check.className = "primary-button";
    check.type = "button";
    check.textContent = "Check spelling";
    check.addEventListener("click", () => checkPractice(word, area, feedback, hint, next));
    area.append(speak, answer, bank, check);
  }

  function makeTileButton(tile, answer) {
    const button = document.createElement("button");
    button.className = "tile-button";
    button.type = "button";
    button.textContent = tile.letter;
    button.addEventListener("click", () => {
      if (selectedTiles.some((item) => item.id === tile.id)) {
        selectedTiles = selectedTiles.filter((item) => item.id !== tile.id);
        button.disabled = false;
      } else {
        selectedTiles.push(tile);
        button.disabled = true;
      }
      answer.textContent = selectedTiles.map((item) => item.letter).join("");
    });
    return button;
  }

  function checkPractice(word, area, feedback, hint, next) {
    const state = wordState(word.key);
    state.met = true;
    state.practiceAttempts = Number(state.practiceAttempts || 0) + 1;
    state.lastPracticedAt = new Date().toISOString();
    const answer = selectedTiles.map((item) => item.letter).join("");
    if (answer === word.word.toLowerCase()) {
      state.practiceCorrect = Number(state.practiceCorrect || 0) + 1;
      state.lastPracticeUsedHint = practiceHintUsed;
      feedback.className = "feedback good";
      feedback.textContent = practiceHintUsed ? `You rebuilt ${word.word}. Next time, try it without the hint.` : "Correct — and you did it without a hint!";
      area.querySelectorAll("button").forEach((button) => { button.disabled = true; });
      hint.hidden = true;
      next.hidden = false;
      save();
      updateHeader();
    } else {
      feedback.className = "feedback try";
      feedback.textContent = "The order is not quite right. Put the letters back and listen again.";
      selectedTiles = [];
      area.querySelector(".tile-answer").textContent = "";
      area.querySelectorAll(".tile-button").forEach((button) => { button.disabled = false; });
      save();
    }
  }

  function practiceHint() {
    const word = practiceQueue[practiceIndex];
    practiceHintUsed = true;
    const feedback = practiceMode === "trouble" ? els.troubleFeedback : els.practiceFeedback;
    feedback.className = "feedback try";
    feedback.textContent = `Hint: it starts with “${word.word.slice(0, 1)}”, ends with “${word.word.slice(-1)}” and has ${word.word.length} letters.`;
    speakWord(word.word);
  }

  function nextPractice() { practiceIndex += 1; renderPracticeWord(); }

  function finishPractice() {
    if (practiceMode === "trouble") {
      els.troubleArea.innerHTML = `<div class="empty-state">✓<br>Tricky-word practice complete</div>`;
      els.troubleFeedback.textContent = "Try another mock dictation when you are ready to show what you know.";
      els.troubleHint.hidden = true;
      els.troubleNext.hidden = true;
    } else {
      showStep("paper");
    }
  }

  function startDictation(mode) {
    activeStep = "paper";
    dictationMode = mode;
    paperQueue = shuffle(cycleWords);
    paperIndex = 0;
    paperMarks = {};
    dictationAnswers = {};
    els.paperIntroView.hidden = true;
    els.paperTestView.hidden = false;
    renderPaperQuestion(true);
  }

  function renderPaperQuestion(autoSpeak) {
    const word = paperQueue[paperIndex];
    els.paperNumber.textContent = `Word ${paperIndex + 1} of ${paperQueue.length}`;
    els.paperPrev.disabled = paperIndex === 0;
    if (dictationMode === "ipad") {
      els.dictationTitle.textContent = "Listen, then write with Apple Pencil";
      els.dictationHelp.textContent = "Write on the line. iPad turns the handwriting into letters, but the answer stays hidden.";
      els.handwritingPanel.hidden = false;
      els.handwritingInput.value = dictationAnswers[word.key] || "";
      els.recognitionFeedback.textContent = els.handwritingInput.value ? `iPad read: ${els.handwritingInput.value}` : "";
      els.paperNext.disabled = !normalizeKey(els.handwritingInput.value);
      els.paperNext.textContent = paperIndex === paperQueue.length - 1 ? "Submit the last word →" : "Submit this word →";
    } else {
      els.dictationTitle.textContent = "Listen, then write on paper";
      els.dictationHelp.textContent = "Listen again whenever you need. Number each answer; the words stay hidden here.";
      els.handwritingPanel.hidden = true;
      els.paperNext.disabled = false;
      els.paperNext.textContent = paperIndex === paperQueue.length - 1 ? "Finish and check together →" : "Next word →";
    }
    els.testDots.innerHTML = paperQueue.map((_, index) => `<span class="test-dot${index < paperIndex ? " is-past" : index === paperIndex ? " is-current" : ""}"></span>`).join("");
    if (autoSpeak) speakWord(word.word);
  }

  function movePaper(delta) {
    if (dictationMode === "ipad") {
      const word = paperQueue[paperIndex];
      const answer = els.handwritingInput.value.trim();
      if (delta > 0 && !normalizeKey(answer)) {
        els.recognitionFeedback.textContent = "Write the word you heard on the line first.";
        els.handwritingInput.focus();
        return;
      }
      if (answer) {
        dictationAnswers[word.key] = answer;
        paperMarks[word.key] = normalizeKey(answer) === word.key ? "correct" : "review";
      }
    }
    if (delta > 0 && paperIndex === paperQueue.length - 1) return showMarking();
    paperIndex = Math.max(0, Math.min(paperQueue.length - 1, paperIndex + delta));
    renderPaperQuestion(true);
  }

  function showMarking() {
    els.paperTestView.hidden = true;
    els.markView.hidden = false;
    if (dictationMode === "ipad") {
      els.markKicker.textContent = "System check";
      els.markTitle.textContent = "Take a quick look at what iPad read";
      els.markCopy.textContent = "The system has checked each word. If iPad misread the handwriting, a parent can correct it below.";
    } else {
      els.markKicker.textContent = "Check together";
      els.markTitle.textContent = "How did the paper dictation go?";
      els.markCopy.textContent = "Mark each word as correct or try again. The result can be saved when every word is checked.";
    }
    els.markList.innerHTML = "";
    paperQueue.forEach((word, index) => {
      const row = document.createElement("div");
      row.className = "mark-row";
      const answerLine = dictationMode === "ipad"
        ? `<small>iPad read: ${escapeHtml(dictationAnswers[word.key] || "(blank)")}</small>`
        : "<small>Compare with the paper answer</small>";
      row.innerHTML = `<span>${index + 1}.</span><div class="mark-word"><strong>${word.word}</strong>${answerLine}</div><div class="mark-actions"><button class="icon-button good" type="button" aria-label="${word.word} is correct">✓</button><button class="icon-button bad" type="button" aria-label="${word.word} needs another try">↻</button></div>`;
      const good = row.querySelector(".good");
      const bad = row.querySelector(".bad");
      good.addEventListener("click", () => setMark(word.key, "correct", good, bad));
      bad.addEventListener("click", () => setMark(word.key, "review", bad, good));
      if (paperMarks[word.key] === "correct") good.classList.add("is-active");
      if (paperMarks[word.key] === "review") bad.classList.add("is-active");
      els.markList.appendChild(row);
    });
    updateMarkButton();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function setMark(key, value, selected, other) {
    paperMarks[key] = value;
    selected.classList.add("is-active");
    other.classList.remove("is-active");
    updateMarkButton();
  }

  function updateMarkButton() {
    const marked = Object.keys(paperMarks).length;
    els.savePaperResult.disabled = marked !== paperQueue.length;
    els.savePaperResult.textContent = marked === paperQueue.length ? "Save this result" : `${paperQueue.length - marked} words still to check`;
  }

  function savePaperResult() {
    const now = new Date().toISOString();
    let right = 0;
    cycleWords.forEach((word) => {
      const result = paperMarks[word.key];
      const state = wordState(word.key);
      state.paperResult = result;
      state.lastDictationAt = now;
      if (dictationMode === "paper") state.lastPaperTestAt = now;
      if (result === "correct") right += 1;
    });
    const wrong = cycleWords.length - right;
    cycleState().dictationHistory.push({
      testedAt: now,
      mode: dictationMode,
      right,
      total: cycleWords.length,
      results: { ...paperMarks },
      recognizedAnswers: dictationMode === "ipad" ? { ...dictationAnswers } : undefined
    });
    STARS.addStars(6);
    save();
    updateHeader();
    els.markView.hidden = true;
    els.resultView.hidden = false;
    els.resultRight.textContent = right;
    els.resultWrong.textContent = wrong;
    els.resultTitle.textContent = right === cycleWords.length ? "Every word is correct!" : "Dictation complete";
    els.resultCopy.textContent = wrong
      ? `${right} words are ready. ${wrong} words are waiting for another try.`
      : "Every word passed the mock dictation. They will still pop back in for a quick review sometimes.";
    els.reviewTrouble.hidden = wrong === 0;
    celebrate();
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
  els.markAllMet.addEventListener("click", markAllMet);
  els.practiceHint.addEventListener("click", practiceHint);
  els.practiceNext.addEventListener("click", nextPractice);
  els.startHandwriting.addEventListener("click", () => startDictation("ipad"));
  els.startPaper.addEventListener("click", () => startDictation("paper"));
  els.paperSpeak.addEventListener("click", () => speakWord(paperQueue[paperIndex].word));
  els.paperPrev.addEventListener("click", () => movePaper(-1));
  els.paperNext.addEventListener("click", () => movePaper(1));
  els.handwritingInput.addEventListener("input", () => {
    const recognized = els.handwritingInput.value.trim();
    els.recognitionFeedback.textContent = recognized ? `iPad read: ${recognized}` : "";
    els.paperNext.disabled = !normalizeKey(recognized);
  });
  els.handwritingInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || els.paperNext.disabled) return;
    event.preventDefault();
    movePaper(1);
  });
  els.savePaperResult.addEventListener("click", savePaperResult);
  els.reviewTrouble.addEventListener("click", () => showStep("trouble"));
  els.troubleHint.addEventListener("click", practiceHint);
  els.troubleNext.addEventListener("click", nextPractice);

  updateHeader();
  showStep("meet");
})();
