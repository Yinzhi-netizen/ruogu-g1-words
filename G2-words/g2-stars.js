// Word Lab 星星与学习记录桥接器。
// totalStars 沿用若谷星河书旅的既有字段；G2 各 Cycle 进度放在 english.g2。
(function () {
  const PROFILES_KEY = "ruogu-literacy-profiles-v1";
  const LEGACY_STARS_KEY = "wordlab-total-stars";

  function readBundle() {
    try {
      const data = JSON.parse(localStorage.getItem(PROFILES_KEY) || "null");
      if (data && data.activeId && data.profiles && data.profiles[data.activeId]) return data;
    } catch (_) {}
    return null;
  }

  function writeBundle(data) {
    try { localStorage.setItem(PROFILES_KEY, JSON.stringify(data)); } catch (_) {}
  }

  function ensureBundle() {
    let data = readBundle();
    if (data) return data;
    const legacyStars = Math.max(0, Number(localStorage.getItem(LEGACY_STARS_KEY) || 0));
    data = {
      activeId: "ruogu",
      profiles: {
        ruogu: {
          id: "ruogu",
          name: "若谷",
          version: 1,
          totalStars: legacyStars,
          cursor: 0,
          readingCursor: 0,
          readingCat: "recite",
          scope: "全部",
          proficiency: {},
          completedReadings: {},
          learnedAt: {},
          english: {}
        }
      }
    };
    writeBundle(data);
    return data;
  }

  function activeProfile(data) { return data.profiles[data.activeId]; }

  function totalStars() {
    return Math.max(0, Number(activeProfile(ensureBundle()).totalStars || 0));
  }

  function addStars(delta) {
    const data = ensureBundle();
    const profile = activeProfile(data);
    profile.totalStars = Math.max(0, Number(profile.totalStars || 0) + Number(delta || 0));
    writeBundle(data);
    return profile.totalStars;
  }

  function studyState() {
    const data = ensureBundle();
    const profile = activeProfile(data);
    if (!profile.english || typeof profile.english !== "object") profile.english = {};
    if (!profile.english.g2 || typeof profile.english.g2 !== "object") {
      profile.english.g2 = { version: 2, currentCycle: null, cycles: {} };
      writeBundle(data);
    }
    return profile.english.g2;
  }

  function saveStudyState(nextState) {
    const data = ensureBundle();
    const profile = activeProfile(data);
    if (!profile.english || typeof profile.english !== "object") profile.english = {};
    profile.english.g2 = nextState;
    writeBundle(data);
  }

  function legacyEnglishState() {
    const data = ensureBundle();
    return activeProfile(data).english || {};
  }

  window.RUOGU_G2_STARS = { totalStars, addStars, studyState, saveStudyState, legacyEnglishState, PROFILES_KEY };
})();
