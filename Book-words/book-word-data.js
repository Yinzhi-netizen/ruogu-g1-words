// 若谷课外书生词本
// 每读完一本书：在 RUOGU_BOOKS 末尾加一本，词放进 words。
// kind 三类：decode（会说但读不出 → 切音节 chunks）、tail（词尾变化 → root + tail）、new（真生词）。
// clue 例句为自拟，贴近书中情节，不摘抄原文。
window.RUOGU_BOOKS = [
  {
    id: "nate-missing-tomatoes",
    title: "Nate the Great and the Missing Tomatoes",
    shortTitle: "Nate & the Missing Tomatoes",
    author: "Andrew Sharmat",
    level: "Lexile 560L · F&P K",
    cover: "🍅",
    readOn: "2026-10-07 / 10-08",
    words: [
      { word: "greatest", kind: "tail", root: "great", tail: "est", zh: "最棒的", emoji: "🏆", clue: "Nate is the greatest detective in town." },
      { word: "protect", kind: "decode", chunks: ["pro", "tect"], zh: "保护", emoji: "🛡️", clue: "A fence can protect the garden." },
      { word: "assistant", kind: "decode", chunks: ["as", "sis", "tant"], zh: "助手", emoji: "🤝", clue: "Sludge the dog is Nate's assistant." },
      { word: "compete", kind: "decode", chunks: ["com", "pete"], zh: "比赛；竞争", emoji: "🏁", clue: "The kids compete to grow the best garden." },
      { word: "competing", kind: "tail", root: "compete", tail: "ing", dropE: true, zh: "正在比赛", emoji: "🏅", clue: "Everyone is competing in the garden contest." },
      { word: "vegetable", kind: "decode", chunks: ["veg", "e", "ta", "ble"], zh: "蔬菜", emoji: "🥕", clue: "Rosamond grows a vegetable garden." },
      { word: "trench", kind: "new", chunks: ["trench"], zh: "沟；壕沟", emoji: "⛏️", clue: "He dug a long trench around the plants." },
      { word: "moat", kind: "new", chunks: ["moat"], zh: "护城河", emoji: "🏰", clue: "The castle has a moat full of water." },
      { word: "usual", kind: "decode", chunks: ["u", "su", "al"], zh: "平常的；通常的", emoji: "🔁", clue: "Nate eats pancakes, as usual." },
      { word: "dentist", kind: "decode", chunks: ["den", "tist"], zh: "牙医", emoji: "🦷", clue: "I visit the dentist to check my teeth." },
      { word: "office", kind: "decode", chunks: ["of", "fice"], zh: "办公室", emoji: "🏢", clue: "Dad works in an office." },
      { word: "completely", kind: "tail", root: "complete", tail: "ly", zh: "完全地", emoji: "💯", clue: "The plate was completely empty." },
      { word: "destroy", kind: "decode", chunks: ["de", "stroy"], zh: "毁坏", emoji: "💥", clue: "A big storm can destroy the plants." },
      { word: "vaporize", kind: "new", chunks: ["va", "por", "ize"], zh: "蒸发；化成气", emoji: "💨", clue: "The hot sun can vaporize a puddle." },
      { word: "ruin", kind: "new", chunks: ["ru", "in"], zh: "毁掉；弄糟", emoji: "🏚️", clue: "Rain could ruin our picnic." },
      { word: "area", kind: "decode", chunks: ["ar", "e", "a"], zh: "区域；地方", emoji: "🗺️", clue: "This area of the garden gets lots of sun." },
      { word: "confused", kind: "tail", root: "confuse", tail: "d", zh: "困惑的；搞糊涂的", emoji: "😕", clue: "Nate was confused by the strange clue." },
      { word: "dough", kind: "new", chunks: ["dough"], zh: "面团", emoji: "🥖", clue: "Mom rolls the dough to make pancakes." },
      { word: "scattered", kind: "tail", root: "scatter", tail: "ed", zh: "撒得到处都是", emoji: "🍂", clue: "Leaves were scattered all over the ground." },
      { word: "growl", kind: "new", chunks: ["growl"], zh: "（狗）低声吼叫", emoji: "🐕", clue: "The dog began to growl at the stranger." },
      { word: "decide", kind: "decode", chunks: ["de", "cide"], zh: "决定", emoji: "🤔", clue: "I can't decide which book to read." },
      { word: "report", kind: "decode", chunks: ["re", "port"], zh: "报告", emoji: "📋", clue: "Nate writes a report about the case." },
      { word: "result", kind: "decode", chunks: ["re", "sult"], zh: "结果", emoji: "📊", clue: "The result of the contest is a surprise." },
      { word: "cardboard", kind: "decode", chunks: ["card", "board"], zh: "硬纸板", emoji: "📦", clue: "The box is made of cardboard." }
    ]
  }
];

window.RUOGU_BOOK_KINDS = {
  decode: { label: "Say it in chunks", icon: "🧩", tip: "You may know this word already. Read it chunk by chunk." },
  tail: { label: "Take off the tail", icon: "✂️", tip: "Cut off the ending to find a word you know." },
  new: { label: "Detective words", icon: "🔍", tip: "A brand-new word. Use the picture and the sentence as clues." }
};
