// 若谷 G2 词库数据
// 每次收到新一轮材料：先增加 Cycle 元数据，再增加对应词组。
window.RUOGU_G2_CYCLES = [
  {
    id: "cycle3-2026-official",
    label: "Cycle 3",
    title: "Spelling + Heart Words",
    schoolYear: "2026-2027",
    testDate: null,
    status: "review",
    groupIds: [
      "cycle3-2026-spelling-words",
      "cycle3-2026-heart-words"
    ]
  },
  {
    id: "cycle4-2026-official",
    label: "Cycle 4",
    title: "Spelling + Heart Words",
    schoolYear: "2026-2027",
    testDate: null,
    status: "review",
    groupIds: [
      "cycle4-2026-spelling-words",
      "cycle4-2026-heart-words"
    ]
  },
  {
    id: "cycle5-2026-official",
    label: "Cycle 5",
    title: "Spelling + Heart Words",
    schoolYear: "2026-2027",
    testDate: null,
    status: "review",
    groupIds: [
      "cycle5-2026-spelling-words",
      "cycle5-2026-heart-words"
    ]
  },
  {
    id: "cycle6-2026-official",
    label: "Cycle 6",
    title: "Spelling + Heart Words",
    schoolYear: "2026-2027",
    testDate: "2026-10-20",
    status: "review",
    groupIds: [
      "cycle6-2026-spelling-words",
      "cycle6-2026-heart-words"
    ]
  },
  {
    id: "cycle8-2026-official",
    label: "Cycle 8",
    title: "Heart Words Review",
    schoolYear: "2026-2027",
    testDate: null,
    status: "current",
    groupIds: [
      "cycle8-2026-heart-words"
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
  {
    id: "cycle4-2026-spelling-words",
    title: "Cycle 4 · Spelling Words",
    track: "core",
    source: "../G2词表原件/Cycle 4 Spelling.pdf",
    cycle: "cycle4-2026-official",
    date: "2026-09-17/24",
    subject: "Spelling Words",
    words: [
      "need", "feet", "see", "tree", "eel",
      "mean", "team", "eat", "each", "tea", "flea",
      "money", "turkey", "hockey"
    ],
  },
  {
    id: "cycle4-2026-heart-words",
    title: "Cycle 4 · Heart Words",
    track: "core",
    source: "../G2词表原件/Cycle 4 Spelling.pdf",
    cycle: "cycle4-2026-official",
    date: "2026-09-17/24",
    subject: "Heart Words",
    words: ["above", "among", "again", "against"],
  },
  {
    id: "cycle5-2026-spelling-words",
    title: "Cycle 5 · Spelling Words",
    track: "core",
    source: "../G2词表原件/Spelling Cycle 5.jpg",
    cycle: "cycle5-2026-official",
    date: "2026-09/10",
    subject: "Spelling Words",
    words: [
      "pie", "light", "flight", "night",
      "bright", "right", "tie", "push",
      "pull", "look", "good", "book",
      "took", "wood", "lightning", "cooking"
    ],
  },
  {
    id: "cycle5-2026-heart-words",
    title: "Cycle 5 · Heart Words",
    track: "core",
    source: "../G2词表原件/Spelling Cycle 5.jpg",
    cycle: "cycle5-2026-official",
    date: "2026-09/10",
    subject: "Heart Words",
    words: ["always", "almost", "floor", "poor"],
  },
  {
    id: "cycle6-2026-spelling-words",
    title: "Cycle 6 · Spelling Words",
    track: "core",
    source: "../G2词表原件/Cycle 6 Spelling Poster.png",
    cycle: "cycle6-2026-official",
    date: "2026-10-13/20",
    subject: "Spelling Words",
    words: [
      "glue", "scoop", "boot", "tooth",
      "food", "room", "soon", "new",
      "fruit", "blue", "chew", "clue"
    ],
  },
  {
    id: "cycle6-2026-heart-words",
    title: "Cycle 6 · Heart Words",
    track: "core",
    source: "../G2词表原件/Cycle 6 Spelling Poster.png",
    cycle: "cycle6-2026-official",
    date: "2026-10-13/20",
    subject: "Heart Words",
    words: ["won", "son", "month"],
  },
  {
    id: "cycle8-2026-heart-words",
    title: "Cycle 8 · Heart Words",
    track: "core",
    source: "../G2词表原件/Cycle 8 Newsletter.pdf",
    cycle: "cycle8-2026-official",
    date: "2026-11-02/05",
    subject: "Heart Words",
    words: [
      "against", "almost", "always", "floor",
      "door", "poor", "won", "son",
      "month", "hour", "minute"
    ],
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
