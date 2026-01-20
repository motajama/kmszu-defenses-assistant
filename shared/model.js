const PHASES = [
  { key: "welcome", label: "Přivítání" },
  { key: "presentation", label: "Prezentace" },
  { key: "reports", label: "Čtení posudků" },
  { key: "discussion", label: "Diskuze" },
  { key: "deliberation", label: "Porada komise" },
  { key: "break", label: "Přestávka" }
];

const DEFAULT_LIMITS = {
  Bc: {
    totalMin: 40,
    phasesMin: { welcome: 3, presentation: 10, reports: 8, discussion: 12, deliberation: 2, break: 5 }
  },
  Mgr: {
    totalMin: 60,
    phasesMin: { welcome: 3, presentation: 15, reports: 10, discussion: 20, deliberation: 7, break: 5 }
  }
};

// 10 checkboxů – v app jsou popisky viditelné, ale krátké (a editovatelné v budoucnu).
const CRITERIA = {
  Bc: [
    "Problém a cíl jsou jasné",
    "Odpovídá typu BP (A/B/C/D)",
    "Teorie/kontext je relevantní",
    "Metoda je adekvátní a popsaná",
    "Zdroje a citace jsou korektní",
    "Data/přílohy jsou doložené (anonymita)",
    "Výzkumná/tvůrčí část je kvalitní",
    "Reflexe/diskuse je přesvědčivá",
    "Struktura a koherence textu",
    "Jazyk a forma (odborný styl)"
  ],
  Mgr: [
    "Problém a cíl jsou jasné",
    "Relevance a novost pojetí",
    "Teorie/kontext je páteř práce",
    "Rešerše je důkladná",
    "Zdroje jsou odborné",
    "Metoda/strategie je adekvátní",
    "Analýza/argumentace je silná",
    "Koherence logické linky",
    "Přínos řešení/zjištění",
    "Forma, jazyk, citační disciplína"
  ]
};

function makeStudentCard() {
  const timers = {};
  for (const p of PHASES) {
    timers[p.key] = { elapsedMs: 0, running: false, startedAtMs: null };
  }
  return {
    id: cryptoRandomId(),
    name: "",
    uco: "",
    supervisor: "",
    opponent: "",
    plannedStartISO: "",
    plannedEndISO: "",
    actualStartISO: "",
    actualEndISO: "",
    notes: "",
    grade: "UNSET", // PV / P / N / ABS / UNSET
    checks: Array(10).fill(false),
    timers,
    lastPhaseKey: ""
  };
}

function makeNewDay({ dateISO, defenseType }) {
  const dType = defenseType === "Mgr" ? "Mgr" : "Bc";
  return {
    meta: {
      dateISO: dateISO || new Date().toISOString().slice(0, 10),
      defenseType: dType,
      createdAtISO: new Date().toISOString()
    },
    settings: {
      limits: structuredClone(DEFAULT_LIMITS[dType]),
      colorThresholds: { failMax: 4, passMax: 7, excellentMax: 10 }
    },
    committee: {
      title: "",
      id: "",
      studyTypeText: "",
      chair: { name: "", uco: "" },
      members: []
    },
    students: [makeStudentCard()],
    ui: { selectedStudentId: "" }
  };
}

function cryptoRandomId() {
  // bez závislostí
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

module.exports = { PHASES, DEFAULT_LIMITS, CRITERIA, makeNewDay, makeStudentCard };

