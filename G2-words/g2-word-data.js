// 若谷 G2 词库数据
// 每次收到新一轮材料：先增加 Cycle 元数据，再增加对应词组。
window.RUOGU_G2_CYCLES = [
  {
    id: "cycle3-2026-official",
    label: "Cycle 3",
    title: "Spelling + Heart Words",
    schoolYear: "2026-2027",
    testDate: null,
    status: "current",
    groupIds: [
      "cycle3-2026-spelling-words",
      "cycle3-2026-heart-words"
    ]
  }
];

window.RUOGU_G2_WORD_GROUPS = [
  {
    id: "cycle3-2026-spelling-words",
    title: "Cycle 3 · Spelling Words",
    track: "core",
    source: "../G2词表原件/Cycle 3 Spelling.pdf",
    cycle: "cycle3-2026-official",
    date: "2026-09",
    subject: "Spelling Words",
    words: [
      "worker", "first", "after", "number",
      "farmer", "third", "worst", "shark",
      "trail", "may", "way", "stain",
      "waist", "day", "play", "rain"
    ],
  },
  {
    id: "cycle3-2026-heart-words",
    title: "Cycle 3 · Heart Words",
    track: "core",
    source: "../G2词表原件/Cycle 3 Spelling.pdf",
    cycle: "cycle3-2026-official",
    date: "2026-09",
    subject: "Heart Words",
    words: ["father", "water", "today", "very"],
  },
];

// 为每个单词组生成完整的单词对象
window.RUOGU_G2_WORDS = [];
RUOGU_G2_WORD_GROUPS.forEach(group => {
  group.words.forEach(word => {
    RUOGU_G2_WORDS.push({
      word: word,
      track: group.track,
      groupId: group.id,
      groupTitle: group.title,
      subject: group.subject || '',
      date: group.date
    });
  });
});
