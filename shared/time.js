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

function isoFromDateAndHm(dateISO, hm) {
  // dateISO: YYYY-MM-DD, hm: HH:MM
  return `${dateISO}T${hm}:00`;
}

function addMinutesToISO(iso, minutes) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

module.exports = { fmtClock, fmtHm, fmtDuration, isoFromDateAndHm, addMinutesToISO };

