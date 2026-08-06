// 若谷英文 ↔ 小人对战 · 总星桥
// 与语文识字共用同一个档案：ruogu-literacy-profiles-v1 的 profiles[activeId].totalStars
// 只读写 totalStars，不动其他字段；小人游戏与神兵系统照常读这个池子，无需改动。

(function () {
  const PROFILES_KEY = "ruogu-literacy-profiles-v1";

  function bundle() {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && data.activeId && data.profiles && data.profiles[data.activeId]) return data;
    } catch {}
    return null;
  }

  // 若语文档案还没建过，就地补一个若谷档案，键结构对齐 state-store.js
  function ensureBundle() {
    let data = bundle();
    if (data) return data;
    data = {
      activeId: "ruogu",
      profiles: {
        ruogu: {
          id: "ruogu",
          name: "若谷",
          version: 1,
          totalStars: 0,
          cursor: 0,
          readingCursor: 0,
          readingCat: "recite",
          scope: "全部",
          proficiency: {},
          completedReadings: {},
          learnedAt: {},
          english: {} // 英文端自己的存档放这里，避免与语文字段冲突
        }
      }
    };
    saveBundle(data);
    return data;
  }

  function saveBundle(data) {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(data));
    } catch {}
  }

  let cachedEnglish = null;

  function activeProfile() {
    const data = ensureBundle();
    return data.profiles[data.activeId];
  }

  function totalStars() {
    return Math.max(0, Number(activeProfile().totalStars || 0));
  }

  // delta 可为负（兑换时扣）；写回并返回最新总星
  function addStars(delta) {
    const data = ensureBundle();
    const profile = data.profiles[data.activeId];
    profile.totalStars = Math.max(0, Number(profile.totalStars || 0) + delta);
    saveBundle(data);
    return profile.totalStars;
  }

  // 英文端自己的持久化数据（听写进度、易错、阅读记录等）
  function englishState() {
    if (!cachedEnglish) {
      const profile = activeProfile();
      if (!profile.english || typeof profile.english !== "object") profile.english = {};
      cachedEnglish = profile.english;
    }
    return cachedEnglish;
  }

  function saveEnglish() {
    if (!cachedEnglish) return;
    const data = ensureBundle();
    const profile = data.profiles[data.activeId];
    profile.english = cachedEnglish;
    saveBundle(data);
  }

  window.RUOGU_G1_STARS = {
    totalStars,
    addStars,
    englishState,
    saveEnglish,
    PROFILES_KEY
  };
})();
