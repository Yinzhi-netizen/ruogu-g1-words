// Word Lab 星星与学习记录桥接器。
// totalStars 沿用若谷星河书旅的既有字段；课外书生词进度放在 english.books。
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
    if (!profile.english.books || typeof profile.english.books !== "object") {
      profile.english.books = { version: 1, books: {} };
      writeBundle(data);
    }
    return profile.english.books;
  }

  function saveStudyState(nextState) {
    const data = ensureBundle();
    const profile = activeProfile(data);
    if (!profile.english || typeof profile.english !== "object") profile.english = {};
    profile.english.books = nextState;
    writeBundle(data);
  }

  window.RUOGU_BOOK_STARS = { totalStars, addStars, studyState, saveStudyState, PROFILES_KEY };
})();
