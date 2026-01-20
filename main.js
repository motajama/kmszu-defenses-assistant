const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

const { makeNewDay } = require("./shared/model");
const { parseCommissionText } = require("./shared/parser");
const { toCsv, toTxt } = require("./shared/export");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---- Helpers
function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf-8");
}
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// ---- IPC API
ipcMain.handle("day:new", async (_evt, { dateISO, defenseType }) => {
  const day = makeNewDay({ dateISO, defenseType });
  return { day };
});

ipcMain.handle("file:openJson", async () => {
  const res = await dialog.showOpenDialog({
    title: "Načíst den obhajob (JSON)",
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (res.canceled || !res.filePaths?.[0]) return { canceled: true };
  const filePath = res.filePaths[0];
  return { canceled: false, filePath, day: readJson(filePath) };
});

ipcMain.handle("file:saveJsonAs", async (_evt, { day }) => {
  const res = await dialog.showSaveDialog({
    title: "Uložit den obhajob jako…",
    defaultPath: `obhajoby-${day.meta.dateISO}.json`,
    filters: [{ name: "JSON", extensions: ["json"] }]
  });
  if (res.canceled || !res.filePath) return { canceled: true };
  writeJson(res.filePath, day);
  return { canceled: false, filePath: res.filePath };
});

ipcMain.handle("file:saveJson", async (_evt, { day, filePath }) => {
  if (!filePath) return { canceled: true, reason: "NO_PATH" };
  writeJson(filePath, day);
  return { canceled: false, filePath };
});

ipcMain.handle("import:parseCommissionText", async (_evt, { text }) => {
  const day = parseCommissionText(text);
  return { day };
});

ipcMain.handle("export:csv", async (_evt, { day }) => {
  const csv = toCsv(day);
  const res = await dialog.showSaveDialog({
    title: "Export do CSV",
    defaultPath: `obhajoby-${day.meta.dateISO}.csv`,
    filters: [{ name: "CSV", extensions: ["csv"] }]
  });
  if (res.canceled || !res.filePath) return { canceled: true };
  fs.writeFileSync(res.filePath, csv, "utf-8");
  return { canceled: false, filePath: res.filePath };
});

ipcMain.handle("export:txt", async (_evt, { day }) => {
  const txt = toTxt(day);
  const res = await dialog.showSaveDialog({
    title: "Export do TXT",
    defaultPath: `obhajoby-${day.meta.dateISO}.txt`,
    filters: [{ name: "Text", extensions: ["txt"] }]
  });
  if (res.canceled || !res.filePath) return { canceled: true };
  fs.writeFileSync(res.filePath, txt, "utf-8");
  return { canceled: false, filePath: res.filePath };
});

