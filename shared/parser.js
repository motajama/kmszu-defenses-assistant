const { makeNewDay, makeStudentCard, DEFAULT_LIMITS } = require("./model");
const { isoFromDateAndHm } = require("./time");

function normalizeDashes(s) {
  return s.replace(/[–—]/g, "-");
}

function extractUco(s) {
  const m = s.match(/učo\s+(\d+)/i);
  return m ? m[1] : "";
}

function stripTitle(name) {
  // odstraní typické tituly na začátku řádku
  return name
    .replace(/^(Bc\.|Mgr\.|Ing\.|MUDr\.|PhDr\.|doc\.|prof\.)\s+/i, "")
    .trim();
}

function parseCommissionText(textRaw) {
  const text = normalizeDashes(textRaw);
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // datum
  const dateLine = lines.find(l => l.match(/\d{1,2}\.\s*\d{1,2}\.\s*\d{4}/));
  const dateMatch = dateLine ? dateLine.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/) : null;
  const dateISO = dateMatch
    ? `${dateMatch[3]}-${String(dateMatch[2]).padStart(2, "0")}-${String(dateMatch[1]).padStart(2, "0")}`
    : new Date().toISOString().slice(0, 10);

  // typ studia
  const studyTypeLine = lines.find(l => l.toLowerCase().startsWith("typ studia:"));
  const studyTypeText = studyTypeLine ? studyTypeLine.split(":").slice(1).join(":").trim() : "";
  const isMgr =
    (dateLine && dateLine.toLowerCase().includes("diplomových")) ||
    (studyTypeText && studyTypeText.toLowerCase().includes("magister"));

  const defenseType = isMgr ? "Mgr" : "Bc";
  const day = makeNewDay({ dateISO, defenseType });
  day.committee.studyTypeText = studyTypeText || "";
  day.settings.limits = structuredClone(DEFAULT_LIMITS[defenseType]);

  // název + id
  if (dateLine) {
    day.committee.title = dateLine;
    const idm = dateLine.match(/\[id=(\d+)\]/i);
    day.committee.id = idm ? idm[1] : "";
  }

  // komise
  const chairLine = lines.find(l => l.toLowerCase().startsWith("předseda komise:"));
  if (chairLine) {
    const rest = chairLine.split(":").slice(1).join(":").trim();
    day.committee.chair = { name: stripTitle(rest.split(",")[0].trim()), uco: extractUco(rest) };
  }
  const memberLines = lines.filter(l => l.toLowerCase().startsWith("člen komise:"));
  day.committee.members = memberLines.map(l => {
    const rest = l.split(":").slice(1).join(":").trim();
    return { name: stripTitle(rest.split(",")[0].trim()), uco: extractUco(rest) };
  });

  // studenti: bloky začínající "HH:MM - HH:MM"
  const idxs = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\s+/)) idxs.push(i);
  }

  const students = [];
  for (let b = 0; b < idxs.length; b++) {
    const start = idxs[b];
    const end = b + 1 < idxs.length ? idxs[b + 1] : lines.length;
    const block = lines.slice(start, end);

    const first = block[0]; // "09:00 - 10:00 Bc. Jméno, učo 123..."
    const m = first.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s+(.+)$/);
    if (!m) continue;

    const plannedStartHm = m[1];
    const plannedEndHm = m[2];
    const rest = m[3];

    // jméno + uco
    const namePart = rest.split(",")[0].trim();
    const uco = extractUco(rest);
    const name = stripTitle(namePart);

    const s = makeStudentCard();
    s.name = name;
    s.uco = uco;
    s.plannedStartISO = isoFromDateAndHm(dateISO, plannedStartHm);
    s.plannedEndISO = isoFromDateAndHm(dateISO, plannedEndHm);

    const supLine = block.find(l => l.toLowerCase().startsWith("vedoucí práce:"));
    if (supLine) {
      const restSup = supLine.split(":").slice(1).join(":").trim();
      s.supervisor = stripTitle(restSup.split(",")[0].trim());
    }
    const oppLine = block.find(l => l.toLowerCase().startsWith("oponent"));
    if (oppLine) {
      const restOpp = oppLine.split(":").slice(1).join(":").trim();
      s.opponent = stripTitle(restOpp.split(",")[0].trim());
    }

    students.push(s);
  }

  if (students.length) {
    day.students = students;
    day.ui.selectedStudentId = students[0].id;
  }

  return day;
}

module.exports = { parseCommissionText };

