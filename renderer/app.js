/* global kmszu */
const { PHASES, CRITERIA } = (() => {
  // jednoduchý mirror (renderer nemá require)
  return {
    PHASES: [
      { key: "welcome", label: "Přivítání" },
      { key: "presentation", label: "Prezentace" },
      { key: "reports", label: "Čtení posudků" },
      { key: "discussion", label: "Diskuze" },
      { key: "deliberation", label: "Porada komise" },
      { key: "break", label: "Přestávka" },
    ],
    CRITERIA: {
      Bc: [
        "Formální náležitosti (povinné části + rozsah)",
        "Problém a cíl jsou jasné",
        "Odpovídá typu BP (A/B/C/D)",
        "Teorie/kontext je relevantní",
        "Metoda je adekvátní a popsaná",
        "Zdroje a citace jsou korektní",
        "Data/přílohy jsou doložené (anonymita)",
        "Výzkumná/tvůrčí část je kvalitní",
        "Reflexe/diskuse je přesvědčivá",
        "Struktura, koherence a jazyk",
      ],
      Mgr: [
        "Formální náležitosti (povinné části + rozsah)",
        "Problém a cíl jsou jasné",
        "Relevance a novost pojetí",
        "Teorie/kontext je páteř práce",
        "Rešerše je důkladná (odborné zdroje)",
        "Metoda/strategie je adekvátní",
        "Analýza/argumentace je silná",
        "Koherence logické linky",
        "Přínos řešení/zjištění",
        "Jazyk, forma, citační disciplína",
      ],
    },
  };
})();

function pad2(n) {
  return String(n).padStart(2, "0");
}
function fmtClock(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function fmtHm(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function fmtDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

let state = {
  filePath: "",
  day: null,
};

const el = {
  clock: document.getElementById("clock"),
  order: document.getElementById("order"),
  currentStudent: document.getElementById("currentStudent"),
  nextStudent: document.getElementById("nextStudent"),
  currentPhase: document.getElementById("currentPhase"),
  predictedEnd: document.getElementById("predictedEnd"),

  studentList: document.getElementById("studentList"),
  studentCard: document.getElementById("studentCard"),

  btnNew: document.getElementById("btnNew"),
  btnImport: document.getElementById("btnImport"),
  btnOpen: document.getElementById("btnOpen"),
  btnSave: document.getElementById("btnSave"),
  btnSaveAs: document.getElementById("btnSaveAs"),
  btnCsv: document.getElementById("btnCsv"),
  btnTxt: document.getElementById("btnTxt"),

  importDialog: document.getElementById("importDialog"),
  importText: document.getElementById("importText"),
  btnParseImport: document.getElementById("btnParseImport"),
};

function selectedStudent() {
  const id = state.day?.ui?.selectedStudentId;
  return (
    state.day?.students?.find((s) => s.id === id) ||
    state.day?.students?.[0] ||
    null
  );
}

function totalMs(s) {
  return PHASES.reduce(
    (acc, p) => acc + (s.timers?.[p.key]?.elapsedMs || 0),
    0,
  );
}

function runningPhaseKey(s) {
  for (const p of PHASES) if (s.timers?.[p.key]?.running) return p.key;
  return "";
}

function progressCount(s) {
  return (s.checks || []).filter(Boolean).length;
}

function isFormalOk(s) {
  // 1. checkbox = formální náležitosti (gate)
  return !!(s.checks && s.checks[0]);
}


function suggestedGrade(dayType, s, thresholds) {
  // Gate: pokud chybí formální součásti nebo min. rozsah → automaticky N
  if (!isFormalOk(s)) return "N";

  const count = progressCount(s);
  const t = thresholds || { failMax: 4, passMax: 7, excellentMax: 10 };
  if (count <= t.failMax) return "N";
  if (count <= t.passMax) return "P";
  return "PV";
}

function formalInfoHtml(defType) {
  // Info box pro 1. checkbox (gate: formální náležitosti)
  if (defType === "Mgr") {
    return `
      <div class="value" style="font-weight:750">Formální náležitosti (povinné části + rozsah)</div>
      <div class="label" style="margin-top:6px; line-height:1.45;">
        <div style="margin-bottom:6px;">
          <span class="badge warn">Gate</span>
          Pokud nejsou splněny formální náležitosti (povinné součásti / klíčové části textu / minimální rozsah), je to důvod k hodnocení <b>neprospěl/a</b>.
        </div>

        <div style="margin:6px 0 4px 0; font-weight:650; color: var(--text)">Povinné formální součásti (v práci):</div>
        <ul style="margin:6px 0 10px 18px; padding:0;">
          <li>titulní strana</li>
          <li>bibliografický záznam (CZ + EN)</li>
          <li>klíčová slova</li>
          <li>abstrakt/anotace (CZ + EN)</li>
          <li>čestné prohlášení</li>
          <li>obsah</li>
          <li>seznam literatury a pramenů</li>
          <li>přílohy (pokud jsou)</li>
        </ul>

        <div style="margin:6px 0 4px 0; font-weight:650; color: var(--text)">Povinné části vlastního textu (minimálně):</div>
        <ul style="margin:6px 0 10px 18px; padding:0;">
          <li>úvod</li>
          <li>teoretická/kontextuální expozice</li>
          <li>metodologická část</li>
          <li>analytická/interpretační/tvůrčí část</li>
          <li>diskusní a analyticko-reflexivní část</li>
          <li>závěr</li>
        </ul>

        <div style="margin:6px 0 0 0;">
          <b>Rozsah:</b> 15 000–25 000 slov (včetně poznámek pod čarou). Na stránce s obsahem má být uveden počet slov (a u projektových prací i rozsah výstupu). Nedodržení spodní hranice = nesplnění formálních požadavků.
        </div>
        <div style="margin-top:6px;">
          <span style="color: var(--muted)">Tip:</span> Obsah, přílohy a textové tvůrčí výstupy se do rozsahu nepočítají.
        </div>
      </div>`;
  }

  // Bc
  return `
    <div class="value" style="font-weight:750">Formální náležitosti (povinné části + rozsah)</div>
    <div class="label" style="margin-top:6px; line-height:1.45;">
      <div style="margin-bottom:6px;">
        <span class="badge warn">Gate</span>
        Pokud chybí některá povinná součást, vede to k jednoznačnému hodnocení <b>neprospěl/a</b>.
      </div>

      <div style="margin:6px 0 4px 0; font-weight:650; color: var(--text)">Povinné formální součásti (v práci):</div>
      <ul style="margin:6px 0 10px 18px; padding:0;">
        <li>titulní strana</li>
        <li>bibliografický záznam (CZ + EN)</li>
        <li>klíčová slova</li>
        <li>abstrakt/anotace (CZ + EN)</li>
        <li>čestné prohlášení</li>
        <li>obsah</li>
        <li>seznam pramenů / použitých zdrojů</li>
        <li>přílohy (pokud jsou)</li>
      </ul>

      <div style="margin:6px 0 0 0;">
        <b>Rozsah:</b> 10 000–15 000 slov. Poznámky pod čarou, obsah a přílohy se do rozsahu nepočítají. Nedodržení spodní hranice = nesplnění formálních požadavků.
      </div>
      <div style="margin-top:6px;">
        <span style="color: var(--muted)">Tip:</span> Na stránce s obsahem má být uveden počet slov (a u produktových prací i samostatně rozsah žurnalistického produktu).
      </div>
    </div>`;
}

function pickCurrentIndex() {
  const id = state.day?.ui?.selectedStudentId;
  const idx = state.day?.students?.findIndex((s) => s.id === id) ?? -1;
  return idx >= 0 ? idx : 0;
}

function computePredictedEnd() {
  const d = state.day;
  if (!d || !d.students?.length) return "";

  const defType = d.meta.defenseType;
  const totalMin =
    d.settings?.limits?.totalMin || (defType === "Mgr" ? 60 : 40);
  const totalMsPlanned = totalMin * 60_000;

  // 1) Kotva = začátek dne = plánovaný start prvního studenta (nejčasnější)
  // fallback: nejčasnější actualStart, jinak "teď"
  const startCandidates = d.students
    .map((s) => s.plannedStartISO || s.actualStartISO || "")
    .filter(Boolean)
    .map((iso) => new Date(iso))
    .filter((dt) => !Number.isNaN(dt.getTime()));

  const dayStart = startCandidates.length
    ? new Date(Math.min(...startCandidates.map((dt) => dt.getTime())))
    : new Date();

  // helper: spočti "reálné nebo odhadované" trvání jednoho studenta
  function effectiveDurationMs(s) {
    // hotový student: ber real = actualEnd - actualStart (pokud existuje)
    if (s.actualStartISO && s.actualEndISO) {
      const a = new Date(s.actualStartISO);
      const b = new Date(s.actualEndISO);
      const diff = b.getTime() - a.getTime();
      if (!Number.isNaN(diff) && diff > 0) return diff;
      // fallback když jsou ISO rozbitá: použij timers
    }

    // nehotový / bez actualEnd: vezmi aspoň plán (40/60),
    // ale pokud už reálně běželo víc (timery), reflektuj přetahování
    const spent = PHASES.reduce((acc, p) => acc + phaseElapsedMs(s, p.key), 0);
    return Math.max(totalMsPlanned, spent);
  }

  // 2) Sečti všechny studenty v pořadí dne:
  // - hotové = real (actualStart/actualEnd)
  // - nehotové = max(plán, už uběhlo)
  const sumMs = d.students.reduce((acc, s) => acc + effectiveDurationMs(s), 0);

  const end = new Date(dayStart.getTime() + sumMs);
  return fmtHm(end);
}

function getPlannedDt(iso) {
  if (!iso) return null;
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function minutesBetween(a, b) {
  if (!a || !b) return 0;
  return (b.getTime() - a.getTime()) / 60000;
}

function computeBlocks() {
  const d = state.day;
  if (!d || !d.students?.length) return [];

  // “Obědová pauza” = plánovaný konec != plánovaný start další obhajoby.
  // Heuristika: pokud je mezera >= 30 min, začíná nový blok.
  const GAP_MIN = d.settings?.breakDetectMin ?? 30;

  const blocks = [];
  let cur = { startIdx: 0, endIdx: 0 };

  for (let i = 0; i < d.students.length - 1; i++) {
    const sA = d.students[i];
    const sB = d.students[i + 1];

    const aEnd = getPlannedDt(sA.plannedEndISO);
    const bStart = getPlannedDt(sB.plannedStartISO);

    const gap = minutesBetween(aEnd, bStart);
    if (gap >= GAP_MIN) {
      cur.endIdx = i;
      blocks.push(cur);
      cur = { startIdx: i + 1, endIdx: i + 1 };
    }
  }
  cur.endIdx = d.students.length - 1;
  blocks.push(cur);
  return blocks;
}

function computePredictedEnds() {
  const d = state.day;
  if (!d || !d.students?.length) return [];

  const defType = d.meta.defenseType;
  const totalMin =
    d.settings?.limits?.totalMin || (defType === "Mgr" ? 60 : 40);
  const totalMsPlanned = totalMin * 60_000;

  function effectiveDurationMs(s) {
    // Hotovo: použij real (actualEnd - actualStart), pokud dává smysl
    if (s.actualStartISO && s.actualEndISO) {
      const a = new Date(s.actualStartISO);
      const b = new Date(s.actualEndISO);
      const diff = b.getTime() - a.getTime();
      if (!Number.isNaN(diff) && diff > 0) return diff;
    }

    // Nehotovo: plán (40/60), ale když už přetahuje, vezmi alespoň spent
    const spent = PHASES.reduce((acc, p) => acc + phaseElapsedMs(s, p.key), 0);
    return Math.max(totalMsPlanned, spent);
  }

  const blocks = computeBlocks();
  const outputs = [];

  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi];
    const students = d.students.slice(b.startIdx, b.endIdx + 1);

    // Začátek bloku: plánovaný start prvního (fallback actualStart, jinak now)
    const s0 = students[0];
    const startDt =
      getPlannedDt(s0.plannedStartISO) ||
      getPlannedDt(s0.actualStartISO) ||
      new Date();

    const sumMs = students.reduce((acc, s) => acc + effectiveDurationMs(s), 0);
    const end = new Date(startDt.getTime() + sumMs);

    let label = "Vyhlášení";
    if (blocks.length >= 2) {
      if (bi === 0) label = "Vyhlášení před obědem";
      else if (bi === 1) label = "Vyhlášení po obědě";
      else label = `Vyhlášení blok ${bi + 1}`;
    }

    outputs.push({
      label,
      endHm: fmtHm(end),
      startIdx: b.startIdx,
      endIdx: b.endIdx,
    });
  }

  return outputs;
}

function renderTopbar() {
  const d = state.day;
  if (!d) return;

  const idx = pickCurrentIndex();
  const cur = d.students[idx];
  const next = d.students[idx + 1];

  el.order.textContent = `${idx + 1} / ${d.students.length}`;
  el.currentStudent.textContent = `Aktuální: ${
    cur ? `${cur.name} (${cur.uco || "—"})` : "—"
  }`;
  el.nextStudent.textContent = `Následující: ${
    next ? `${next.name} (${next.uco || "—"})` : "—"
  }`;

  const rp = cur ? runningPhaseKey(cur) : "";
  const phaseLabel = PHASES.find((p) => p.key === rp)?.label || "—";
  el.currentPhase.textContent = `Fáze: ${phaseLabel}`;

  const ends = computePredictedEnds();
  if (!ends.length) {
    el.predictedEnd.textContent = "Vyhlášení: —";
  } else if (ends.length === 1) {
    el.predictedEnd.textContent = `Vyhlášení: ${ends[0].endHm}`;
  } else if (ends.length === 2) {
    el.predictedEnd.textContent = `Vyhlášení: před obědem ${ends[0].endHm} • po obědě ${ends[1].endHm}`;
  } else {
    // více bloků – zkrať text do jedné pilulky
    const parts = ends.map(
      (e) => `${e.label.replace("Vyhlášení ", "").toLowerCase()} ${e.endHm}`,
    );
    el.predictedEnd.textContent = `Vyhlášení: ${parts.join(" • ")}`;
  }
}

function studentStatusBadges(s) {
  const badges = [];
  if (s.grade === "ABS") badges.push({ text: "nedostavil/a", cls: "danger" });

  const over = isOverTotal(s);
  if (over) badges.push({ text: "přetahuje", cls: "danger" });

  const rk = runningPhaseKey(s);
  if (rk) badges.push({ text: "běží", cls: "ok" });

  return badges;
}

function isOverTotal(s) {
  const totalLimitMin = state.day?.settings?.limits?.totalMin || 0;
  if (!totalLimitMin) return false;
  return totalMs(s) / 60000 > totalLimitMin;
}

function renderStudentList() {
  const d = state.day;
  el.studentList.innerHTML = "";
  if (!d) return;

  const activeId = d.ui.selectedStudentId;

  // Rozdělení na bloky (např. před/po obědě)
  const blocks = computeBlocks();
  const idxToBlock = new Array(d.students.length).fill(0);
  for (let bi = 0; bi < blocks.length; bi++) {
    for (let i = blocks[bi].startIdx; i <= blocks[bi].endIdx; i++)
      idxToBlock[i] = bi;
  }

  function addDivider(label) {
    const div = document.createElement("div");
    div.className = "label";
    div.style.margin = "8px 0 2px 2px";
    div.style.paddingTop = "10px";
    div.style.borderTop = "1px solid var(--border)";
    div.textContent = label;
    el.studentList.appendChild(div);
  }

  if (blocks.length >= 2) addDivider("Před obědem");

  for (let i = 0; i < d.students.length; i++) {
    const s = d.students[i];
    const bi = idxToBlock[i];

    // Divider mezi bloky (typicky oběd)
    if (blocks.length >= 2 && i > 0 && idxToBlock[i - 1] !== bi) {
      if (bi === 1) addDivider("Po obědě");
      else addDivider(`Blok ${bi + 1}`);
    }

    const item = document.createElement("div");
    item.className =
      "studentItem" + (s.id === activeId ? " studentItem--active" : "");

    // barevné odlišení bloků bez nutnosti sahat do CSS
    if (bi % 2 === 1) {
      item.style.background = "rgba(29, 35, 48, 0.85)"; // lehce odlišný panel
      item.style.borderColor = "rgba(255, 176, 32, 0.35)"; // jemný akcent
    }

    item.addEventListener("click", () => {
      d.ui.selectedStudentId = s.id;
      renderAll();
    });

    const name = document.createElement("div");
    name.className = "studentItem__name";
    name.textContent = s.name || "—";

    const meta = document.createElement("div");
    meta.className = "studentItem__meta";
    const ps = s.plannedStartISO ? fmtHm(new Date(s.plannedStartISO)) : "—";
    const pe = s.plannedEndISO ? fmtHm(new Date(s.plannedEndISO)) : "—";
    meta.appendChild(spanMuted(`${ps}–${pe}`));
    meta.appendChild(spanMuted(`učo ${s.uco || "—"}`));

    for (const b of studentStatusBadges(s)) {
      const badge = document.createElement("span");
      badge.className = `badge ${b.cls}`;
      badge.textContent = b.text;
      meta.appendChild(badge);
    }

    item.appendChild(name);
    item.appendChild(meta);
    el.studentList.appendChild(item);
  }
}

function spanMuted(t) {
  const s = document.createElement("span");
  s.textContent = t;
  s.style.color = "var(--muted)";
  return s;
}

function ensureActualStart(s) {
  if (!s.actualStartISO) s.actualStartISO = new Date().toISOString();
}

function ensureActualEnd(s) {
  s.actualEndISO = new Date().toISOString();
}

function stopAllPhases(s) {
  for (const p of PHASES) {
    const t = s.timers[p.key];
    if (t.running && t.startedAtMs != null) {
      t.elapsedMs += Date.now() - t.startedAtMs;
      t.running = false;
      t.startedAtMs = null;
    }
  }
}

function togglePhase(s, phaseKey) {
  ensureActualStart(s);

  const t = s.timers[phaseKey];
  if (!t) return;

  // pokud spouštím novou fázi, stopni ostatní (praktická prevence omylu)
  if (!t.running) {
    stopAllPhases(s);
    t.running = true;
    t.startedAtMs = Date.now();
    s.lastPhaseKey = phaseKey;
  } else {
    // stop
    t.elapsedMs += Date.now() - t.startedAtMs;
    t.running = false;
    t.startedAtMs = null;
  }
}

function phaseElapsedMs(s, phaseKey) {
  const t = s.timers?.[phaseKey];
  if (!t) return 0;
  if (t.running && t.startedAtMs != null)
    return t.elapsedMs + (Date.now() - t.startedAtMs);
  return t.elapsedMs;
}

function isPhaseOver(s, phaseKey) {
  const limit = state.day?.settings?.limits?.phasesMin?.[phaseKey];
  if (!limit) return false;
  return phaseElapsedMs(s, phaseKey) / 60000 > limit;
}

function gradeHelpText(g) {
  if (g === "PV") {
    return "PROSPĚL/A VÝBORNĚ: výborná obhajoba a vynikající práce; v klíčových parametrech bezchybná, přináší nová/innovativní zjištění či řešení a prokazuje nadstandardní znalosti.";
  }
  if (g === "P") {
    return "PROSPĚL/A: kvalitní obhajoba a práce, která ve všech klíčových parametrech naplňuje očekávání pro daný typ práce dle pravidel.";
  }
  if (g === "N") {
    return "NEPROSPĚL/A: práce v některém klíčovém parametru nenaplňuje očekávání dle pravidel a obhajoba nepřesvědčila komisi, že si práce zaslouží hodnocení „prospěl/a“.";
  }
  if (g === "ABS") {
    return "NEDOSTAVIL/A SE: studující se k obhajobě nedostavil/a (administrativní stav).";
  }
  return "";
}

function renderStudentCard() {
  const d = state.day;
  const s = selectedStudent();
  if (!d || !s) {
    el.studentCard.innerHTML = "<p class='label'>Žádná data.</p>";
    return;
  }

  const defType = d.meta.defenseType;
  const criteria = CRITERIA[defType] || [];
  const thresholds = d.settings?.colorThresholds || {
    failMax: 4,
    passMax: 7,
    excellentMax: 10,
  };
  const pc = progressCount(s);
  const suggested = suggestedGrade(defType, s, thresholds);
  const formalOK = isFormalOk(s);

  // hlavička
  const plannedStart = s.plannedStartISO
    ? fmtHm(new Date(s.plannedStartISO))
    : "—";
  const plannedEnd = s.plannedEndISO ? fmtHm(new Date(s.plannedEndISO)) : "—";
  const actualStart = s.actualStartISO
    ? fmtHm(new Date(s.actualStartISO))
    : "—";
  const actualEnd = s.actualEndISO ? fmtHm(new Date(s.actualEndISO)) : "—";

  const total = totalMs(s);
  const totalLimitMin =
    d.settings?.limits?.totalMin || (defType === "Mgr" ? 60 : 40);
  const overTotal = total / 60000 > totalLimitMin;

  el.studentCard.innerHTML = `
    <div class="row">
      <div>
        <div class="value" style="font-size:18px;font-weight:750">${escapeHtml(
          s.name || "—",
        )}</div>
        <div class="label">učo ${escapeHtml(s.uco || "—")} • typ: ${defType}</div>
      </div>
      <div style="margin-left:auto; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <span id="totalBadge" class="badge ${
          overTotal ? "danger" : "ok"
        }">celkem ${fmtDuration(total)} / ${totalLimitMin} min</span>
      </div>
    </div>

    <div class="hr"></div>

    <div class="grid2">
      <div>
        <div class="label">Vedoucí</div>
        <input id="inpSupervisor" value="${escapeAttr(
          s.supervisor || "",
        )}" placeholder="Vedoucí práce…" />
      </div>
      <div>
        <div class="label">Oponent/ka</div>
        <input id="inpOpponent" value="${escapeAttr(
          s.opponent || "",
        )}" placeholder="Oponent/ka…" />
      </div>
    </div>

    <div class="grid2" style="margin-top:10px;">
      <div>
        <div class="label">Plán</div>
        <div class="value">${plannedStart} → ${plannedEnd}</div>
      </div>
      <div>
        <div class="label">Skutečnost</div>
        <div class="value">${actualStart} → ${actualEnd}</div>
      </div>
    </div>

    <div class="hr"></div>

    <div class="label">Fáze (klik = start/stop; start jedné fáze stopne ostatní)</div>
    <div class="phaseGrid" id="phaseGrid"></div>

    <div class="hr"></div>

    <div class="grid2">
      <div>
        <div class="label">Hodnocení</div>
        <select id="selGrade">
          <option value="UNSET">—</option>
          <option value="PV">prospěl/a výborně</option>
          <option value="P">prospěl/a</option>
          <option value="N">neprospěl/a</option>
          <option value="ABS">nedostavil/a se</option>
        </select>

        <div id="gradeHelp" class="label" style="margin-top:8px; line-height:1.35;">
          ${escapeHtml(gradeHelpText(s.grade))}
        </div>

        <div class="label" style="margin-top:8px;">
          Návrh podle checkboxů:
          <span class="value">${gradeLabel(suggested)}</span> (${pc}/10)
          ${formalOK ? "" : `<span class="badge danger" style="margin-left:8px;">nesplněny formální náležitosti</span>`}
        </div>
      </div>
      <div>
        <div class="label">Poznámky předsedajícího</div>
        <textarea id="txtNotes" placeholder="Poznámky…">${escapeHtml(
          s.notes || "",
        )}</textarea>
      </div>
    </div>

    <div class="progressWrap">
      <div class="label">Kritéria (10) + progressbar (1. checkbox = formální náležitosti, gate)</div>
      <div class="card" id="formalInfoBox" style="margin-top:10px; background: var(--panel2); border-color: rgba(255, 176, 32, 0.35);">
        ${formalInfoHtml(defType)}
      </div>
      <div class="progressBar" title="0–4 neprospěl/a • 5–7 prospěl/a • 8–10 prospěl/a výborně (pokud jsou splněny formální náležitosti; jinak automaticky neprospěl/a)">
        <div class="progressFill" id="progressFill"></div>
      </div>
      <div class="checkGrid" id="checkGrid"></div>
    </div>
  `;

  // phase buttons
  const grid = document.getElementById("phaseGrid");
  for (const p of PHASES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "phaseBtn";
    btn.id = `phaseBtn-${p.key}`;

    const running = s.timers?.[p.key]?.running;
    const over = isPhaseOver(s, p.key);

    btn.classList.toggle("running", !!running);
    btn.classList.toggle("over", !!over);
    btn.classList.toggle("ok", !over);

    const limit = d.settings?.limits?.phasesMin?.[p.key];
    const cur = fmtDuration(phaseElapsedMs(s, p.key));

    btn.innerHTML = `
      <div>
        <div style="font-weight:650">${p.label}</div>
        <div class="label">${limit ? `max ${limit} min` : "max —"}</div>
      </div>
      <div class="phaseTime" id="phaseTime-${p.key}">${cur}</div>
    `;

    btn.addEventListener("click", () => {
      togglePhase(s, p.key);
      // ne renderAll() při běhu; ale po kliknutí je OK přerenderovat
      renderAll();
    });
    grid.appendChild(btn);
  }

  // inputs
  document.getElementById("inpSupervisor").addEventListener("input", (e) => {
    s.supervisor = e.target.value;
  });
  document.getElementById("inpOpponent").addEventListener("input", (e) => {
    s.opponent = e.target.value;
  });

  const sel = document.getElementById("selGrade");
  sel.value = s.grade || "UNSET";
  sel.addEventListener("change", (e) => {
    s.grade = e.target.value;

    const gh = document.getElementById("gradeHelp");
    if (gh) gh.textContent = gradeHelpText(s.grade);

    // pokud nastavíš známku a nic neběží, je to dobrý moment pro actualEnd
    if (!runningPhaseKey(s) && totalMs(s) > 0) ensureActualEnd(s);

    renderAll();
  });

  document.getElementById("txtNotes").addEventListener("input", (e) => {
    s.notes = e.target.value;
  });

  // checks
  const checkGrid = document.getElementById("checkGrid");
  checkGrid.innerHTML = "";

  for (let i = 0; i < 10; i++) {
    const item = document.createElement("label");
    item.className = "checkItem";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!s.checks[i];

    const txt = document.createElement("span");
    txt.textContent = criteria[i] || `Kritérium ${i + 1}`;

    if (i === 0) {
      const badge = document.createElement("span");
      badge.className = `badge ${cb.checked ? "ok" : "warn"}`;
      badge.textContent = "povinné";
      badge.style.marginLeft = "8px";

      const hint = document.createElement("span");
      hint.className = "label";
      hint.textContent = "(chybí-li, návrh = neprospěl/a)";
      hint.style.marginLeft = "8px";

      txt.appendChild(badge);
      txt.appendChild(hint);
    }

    cb.addEventListener("change", () => {
      s.checks[i] = cb.checked;
      renderAll();
    });

    item.appendChild(cb);
    item.appendChild(txt);
    checkGrid.appendChild(item);
  }

  // progress fill
  const fill = document.getElementById("progressFill");
  const pct = (pc / 10) * 100;
  fill.style.width = `${pct}%`;

  // Barva výplně podle návrhu známky; formální náležitosti = gate
  if (!formalOK) {
    fill.style.background = "rgba(255, 77, 77, 0.45)";
  } else if (suggested === "PV") {
    fill.style.background = "rgba(43, 213, 118, 0.35)";
  } else if (suggested === "P") {
    fill.style.background = "rgba(255, 176, 32, 0.35)";
  } else {
    fill.style.background = "rgba(255, 77, 77, 0.35)";
  }
}

function gradeLabel(g) {
  if (g === "PV") return "prospěl/a výborně";
  if (g === "P") return "prospěl/a";
  if (g === "N") return "neprospěl/a";
  if (g === "ABS") return "nedostavil/a se";
  return "—";
}

function escapeHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

function renderAll() {
  renderTopbar();
  renderStudentList();
  renderStudentCard();
}

function tick() {
  el.clock.textContent = fmtClock(new Date());

  if (!state.day) return;

  renderTopbar(); // jen topbar
  updateLiveCard(); // jen časy + stavy na kartě (bez re-renderu inputů)
}

// ---- Actions
el.btnNew.addEventListener("click", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const { day } = await kmszu.newDay({ dateISO: today, defenseType: "Mgr" });
  state.day = day;
  state.filePath = "";
  renderAll();
});

el.btnImport.addEventListener("click", () => {
  el.importText.value = "";
  el.importDialog.showModal();
});

el.btnParseImport.addEventListener("click", async (e) => {
  e.preventDefault();
  const text = el.importText.value || "";
  if (!text.trim()) return;
  const res = await kmszu.parseCommissionText({ text });
  state.day = res.day;
  state.filePath = "";
  el.importDialog.close();
  renderAll();
});

el.btnOpen.addEventListener("click", async () => {
  const res = await kmszu.openJson();
  if (res.canceled) return;
  state.day = res.day;
  state.filePath = res.filePath;
  renderAll();
});

el.btnSaveAs.addEventListener("click", async () => {
  if (!state.day) return;
  const res = await kmszu.saveJsonAs({ day: state.day });
  if (res.canceled) return;
  state.filePath = res.filePath;
});

el.btnSave.addEventListener("click", async () => {
  if (!state.day) return;
  if (!state.filePath) {
    const res = await kmszu.saveJsonAs({ day: state.day });
    if (res.canceled) return;
    state.filePath = res.filePath;
    return;
  }
  await kmszu.saveJson({ day: state.day, filePath: state.filePath });
});

el.btnCsv.addEventListener("click", async () => {
  if (!state.day) return;
  await kmszu.exportCsv({ day: state.day });
});

el.btnTxt.addEventListener("click", async () => {
  if (!state.day) return;
  await kmszu.exportTxt({ day: state.day });
});

function updateLiveCard() {
  const s = selectedStudent();
  const d = state.day;
  if (!s || !d) return;

  // Total badge (id=totalBadge)
  const totalEl = document.getElementById("totalBadge");
  if (totalEl) {
    const total = totalMs(s);
    const totalLimitMin =
      d.settings?.limits?.totalMin || (d.meta.defenseType === "Mgr" ? 60 : 40);
    const overTotal = total / 60000 > totalLimitMin;

    totalEl.textContent = `celkem ${fmtDuration(total)} / ${totalLimitMin} min`;
    totalEl.className = `badge ${overTotal ? "danger" : "ok"}`;
  }

  // Fáze: čas + stavové třídy (ok/running/over)
  for (const p of PHASES) {
    const timeSpan = document.getElementById(`phaseTime-${p.key}`);
    const btn = document.getElementById(`phaseBtn-${p.key}`);
    if (!timeSpan || !btn) continue;

    timeSpan.textContent = fmtDuration(phaseElapsedMs(s, p.key));

    const running = s.timers?.[p.key]?.running;
    const over = isPhaseOver(s, p.key);

    btn.classList.toggle("running", !!running);
    btn.classList.toggle("over", !!over);
    btn.classList.toggle("ok", !over);
  }
}

// ---- Init
(async function init() {
  const today = new Date().toISOString().slice(0, 10);
  const { day } = await kmszu.newDay({ dateISO: today, defenseType: "Mgr" });
  state.day = day;
  renderAll();
  setInterval(tick, 250);
})();
