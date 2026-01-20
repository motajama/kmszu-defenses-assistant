const { PHASES, CRITERIA } = require("./model");
const { fmtDuration } = require("./time");

function safeCsv(v) {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function gradeLabel(g) {
  switch (g) {
    case "PV": return "prospěl/a výborně";
    case "P": return "prospěl/a";
    case "N": return "neprospěl/a";
    case "ABS": return "nedostavil/a se";
    default: return "";
  }
}

function totalMs(student) {
  return PHASES.reduce((acc, p) => acc + (student.timers?.[p.key]?.elapsedMs || 0), 0);
}

function toCsv(day) {
  const headers = [
    "date",
    "committee_title",
    "student_name",
    "uco",
    "supervisor",
    "opponent",
    "planned_start",
    "planned_end",
    "actual_start",
    "actual_end",
    "grade",
    ...PHASES.map(p => `phase_${p.key}_mmss`),
    "total_mmss",
    ...Array.from({ length: 10 }, (_, i) => `check_${i + 1}`),
    "notes"
  ];

  const rows = [headers.join(",")];

  for (const s of day.students) {
    const row = [
      day.meta.dateISO,
      day.committee.title || "",
      s.name,
      s.uco,
      s.supervisor,
      s.opponent,
      s.plannedStartISO,
      s.plannedEndISO,
      s.actualStartISO,
      s.actualEndISO,
      gradeLabel(s.grade),
      ...PHASES.map(p => fmtDuration(s.timers?.[p.key]?.elapsedMs || 0)),
      fmtDuration(totalMs(s)),
      ...s.checks.map(b => (b ? "1" : "0")),
      s.notes || ""
    ].map(safeCsv);

    rows.push(row.join(","));
  }

  return rows.join("\n");
}

function toTxt(day) {
  const lines = [];
  lines.push(`Den obhajob: ${day.meta.dateISO}`);
  lines.push(day.committee.title ? `Komise: ${day.committee.title}` : "");
  lines.push(day.committee.chair?.name ? `Předseda: ${day.committee.chair.name} (učo ${day.committee.chair.uco || "—"})` : "");
  if (day.committee.members?.length) {
    lines.push("Členové:");
    for (const m of day.committee.members) lines.push(`- ${m.name} (učo ${m.uco || "—"})`);
  }
  lines.push("");
  for (const s of day.students) {
    lines.push(`== ${s.name} (učo ${s.uco || "—"}) ==`);
    lines.push(`Vedoucí: ${s.supervisor || "—"} | Oponent: ${s.opponent || "—"}`);
    lines.push(`Plán: ${s.plannedStartISO || "—"} → ${s.plannedEndISO || "—"}`);
    lines.push(`Skutečnost: ${s.actualStartISO || "—"} → ${s.actualEndISO || "—"}`);
    lines.push(`Hodnocení: ${gradeLabel(s.grade) || "—"}`);
    for (const p of PHASES) lines.push(`- ${p.label}: ${fmtDuration(s.timers?.[p.key]?.elapsedMs || 0)}`);
    lines.push(`Celkem: ${fmtDuration(totalMs(s))}`);
    lines.push("Checkboxy:");
    s.checks.forEach((b, i) => lines.push(`  ${i + 1}. ${b ? "[x]" : "[ ]"}`));
    lines.push("Poznámky:");
    lines.push(s.notes || "");
    lines.push("");
  }
  return lines.filter(Boolean).join("\n");
}

module.exports = { toCsv, toTxt };

