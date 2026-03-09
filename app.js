import { formMap } from "./formMap.js";
// ==========================
// DOM
// ==========================
const settingScreen = document.getElementById("setting-screen");
const quizScreen = document.getElementById("quiz-screen");

const startBtn = document.getElementById("start-btn");
const updateBtn = document.getElementById("update-btn");
const backBtn = document.getElementById("back-btn");

const filterLegendary = document.getElementById("filter-legendary");
const filterMega = document.getElementById("filter-mega");
const filterPrevo = document.getElementById("filter-prevo");

const updateStatus = document.getElementById("update-status");

const statH = document.getElementById("stat-h");
const statA = document.getElementById("stat-a");
const statB = document.getElementById("stat-b");
const statC = document.getElementById("stat-c");
const statD = document.getElementById("stat-d");
const statS = document.getElementById("stat-s");

const answerInput = document.getElementById("answer-input");
const answerBtn = document.getElementById("answer-btn");
const result = document.getElementById("result");
const nextBtn = document.getElementById("next-btn");
const showAnswerBtn = document.getElementById("show-answer-btn");

const datalist = document.getElementById("pokemon-list");

const API = "https://pokeapi.co/api/v2";

// ==========================
// 状態
// ==========================
let allPokemon = [];
let currentPokemon = null;

let typeDict = {};
let abilityDict = {};

let evolvesFromSet = new Set();

// ==========================
// 画面
// ==========================
function showSetting() {
  settingScreen.classList.remove("hidden");
  quizScreen.classList.add("hidden");
}
function showQuiz() {
  settingScreen.classList.add("hidden");
  quizScreen.classList.remove("hidden");
}

// ==========================
// ユーティリティ
// ==========================
function isMegaPokemon(data) {
  const name = data.name;
  return (
    name.includes("-mega") ||
    name.includes("-primal")
  );
}

function romanToNumber(roman) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let num = 0;
  let prev = 0;

  for (let i = roman.length - 1; i >= 0; i--) {
    const curr = map[roman[i]];
    num += curr < prev ? -curr : curr;
    prev = curr;
  }
  return num;
}

function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// ==========================
// 日本語辞書取得
// ==========================
async function getTypeJa(typeUrl) {
  const key = typeUrl;
  if (typeDict[key]) return typeDict[key];

  const data = await fetch(typeUrl).then(r => r.json());
  const ja =
    data.names.find(n => n.language.name === "ja")?.name ?? data.name;

  typeDict[key] = ja;
  return ja;
}

async function getAbilityJa(abilityUrl) {
  const key = abilityUrl;
  if (abilityDict[key]) return abilityDict[key];

  const data = await fetch(abilityUrl).then(r => r.json());
  const ja =
    data.names.find(n => n.language.name === "ja")?.name ?? data.name;

  abilityDict[key] = ja;
  return ja;
}

// ==========================
// データ更新（B方式）
// ==========================
async function updateAllPokemon() {
  updateBtn.disabled = true;
  updateStatus.textContent = "更新中… 初期化";

  allPokemon = [];
  typeDict = {};
  abilityDict = {};
  evolvesFromSet.clear();

  const list = await fetch(`${API}/pokemon?limit=2000`).then(r => r.json());
  const groups = chunk(list.results, 10);

  let done = 0;

  for (const group of groups) {
    await Promise.all(
      group.map(async p => {
        const data = await fetch(p.url).then(r => r.json());
        if (data.name.endsWith("-gmax")) return;
        const species = await fetch(data.species.url).then(r => r.json());      

        
        if (species.evolves_from_species) {
        evolvesFromSet.add(species.evolves_from_species.name);
      }


      const jpName =
        species.names.find(n => n.language.name === "ja")?.name ?? data.name;

      let displayName = jpName;
// ==========================
// フォルム辞書処理
// ==========================

// ① 完全一致
if (formMap[data.name]) {
  displayName = `${jpName}（${formMap[data.name]}）`;
}

// ② species名を除いたスラッグ部分だけチェック
else if (data.name.includes("-")) {
  const slug = data.name.replace(species.name + "-", "");

  if (formMap[slug]) {
    displayName = `${jpName}（${formMap[slug]}）`;
  }
}
      




        const types = [];
        for (const t of data.types) {
          types.push(await getTypeJa(t.type.url));
        }

        const abilities = [];
        for (const a of data.abilities) {
          abilities.push(await getAbilityJa(a.ability.url));
        }

        const generation =
          species.generation.name.replace("generation-", "").toUpperCase();
        
        const hasPrevo = species.evolves_from_species !== null;
        const isFinal =
          !evolvesFromSet.has(species.name) || isMegaPokemon(data);

      // 既に同じ性能の個体があるか確認
      const newStats = {
        h: data.stats[0].base_stat,
        a: data.stats[1].base_stat,
        b: data.stats[2].base_stat,
        c: data.stats[3].base_stat,
        d: data.stats[4].base_stat,
        s: data.stats[5].base_stat
      };

 const alreadyExists = allPokemon.some(existing =>
  existing.speciesId === species.id &&
  JSON.stringify(existing.stats) === JSON.stringify(newStats)
);


 if (alreadyExists) return;
       

  allPokemon.push({
  id: data.name,
  speciesId: species.id,   // ★ 追加
  name: jpName,
  displayName,
  stats: newStats,
  types,
  abilities,
  generation,
  isLegendary: species.is_legendary || species.is_mythical,
  isMega: isMegaPokemon(data),
  hasPrevo,
  isFinal: null
});

      })   // ← ★ group.map の閉じ
    );     // ← ★ Promise.all の閉じ

    done += group.length;
    updateStatus.textContent = `更新中… ${done} / ${list.results.length}`;
  }
  allPokemon.forEach(p => {
  p.isFinal = !evolvesFromSet.has(p.id) || p.isMega;
  });

  localStorage.setItem("pokemonData", JSON.stringify(allPokemon));
  localStorage.setItem("typeDict", JSON.stringify(typeDict));
  localStorage.setItem("abilityDict", JSON.stringify(abilityDict));

  updateStatus.textContent = "更新完了";
  updateBtn.disabled = false;
}

// ==========================
// datalist
// ==========================
function buildDatalist() {
  datalist.innerHTML = "";
  allPokemon.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.displayName ?? p.name;
    datalist.appendChild(opt);
  });
}

// ==========================
// クイズ
// ==========================
function nextQuiz() {
  const allowLegend = filterLegendary.checked;
  const allowMega = filterMega.checked;
  const allowPrevo = filterPrevo.checked;

  const pool = allPokemon.filter(p => {
    if (!allowLegend && p.isLegendary) return false;
    if (!allowMega && p.isMega) return false;
    if (!allowPrevo && !p.isFinal) return false;
    return true;
  });

  currentPokemon = pool[Math.floor(Math.random() * pool.length)];

  statH.textContent = currentPokemon.stats.h;
  statA.textContent = currentPokemon.stats.a;
  statB.textContent = currentPokemon.stats.b;
  statC.textContent = currentPokemon.stats.c;
  statD.textContent = currentPokemon.stats.d;
  statS.textContent = currentPokemon.stats.s;

  document.querySelectorAll(".hint span").forEach(s => (s.textContent = ""));
  result.textContent = "";
  answerInput.value = "";
}

// ==========================
// ヒント
// ==========================
document.querySelectorAll(".hint-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (!currentPokemon) return;

    const key = btn.dataset.key;
    const map = {
      type1: currentPokemon.types[0],
      type2: currentPokemon.types[1] || "なし",
      ability1: currentPokemon.abilities[0],
      ability2: currentPokemon.abilities[1] || "なし",
      ability3: currentPokemon.abilities[2] || "なし",
      generation: `第${romanToNumber(currentPokemon.generation)}世代`
    };

    document.getElementById("hint-" + key).textContent = map[key];
  });
});

// ==========================
// イベント
// ==========================
startBtn.addEventListener("click", () => {
  allPokemon = JSON.parse(localStorage.getItem("pokemonData") || "[]");
  if (allPokemon.length === 0) {
    alert("先にデータ更新してください");
    return;
  }
  buildDatalist();
  showQuiz();
  nextQuiz();
});

updateBtn.addEventListener("click", updateAllPokemon);
backBtn.addEventListener("click", showSetting);
nextBtn.addEventListener("click", nextQuiz);

showAnswerBtn.addEventListener("click", () => {
  result.textContent =  `正解：${currentPokemon.displayName ?? currentPokemon.name}`;
});

answerBtn.addEventListener("click", () => {
  result.textContent =
    answerInput.value.trim() === (currentPokemon.displayName ?? currentPokemon.name) ? "正解！" : "不正解";
});

// ==========================

window.allPokemon = allPokemon;

showSetting();
