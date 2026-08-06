# 若谷 G1 Word Lab

若谷的一年级英文词库练习 PWA，与「若谷星河书旅」共用星星池。

- **听写**：手写板写字，自己拼字母自查或家长肉眼判定
- **阅读**：用词库词写的小故事，点词发音
- **掌握**：进度分布、易错词汇总
- **星星**：与星河书旅共用 `localStorage.ruogu-literacy-profiles-v1`，听写对了 +5★，读完故事 +10★

## 部署

GitHub Pages 自动部署：`https://yinzhi-netizen.github.io/ruogu-g1-words/`

**改代码后记得升 `sw.js` 里的 `cacheName` 版本号**（如 `v1` → `v2`），否则旧缓存不更新。

## 数据源

- `若谷G1词库.json`：516 词，分核心听写 / 拓展听写 / 重点识读三轨
- `g1-word-data.js`：由 `_codex_build/生成词库.mjs` 从 JSON 自动生成
- `g1-stories.js`：5 篇小故事，用词全来自词库

## 相关项目

- [若谷星河书旅](https://github.com/Yinzhi-netizen/ruogu-literacy)：语文识字 + 小人对战
