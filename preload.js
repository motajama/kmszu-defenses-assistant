const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kmszu", {
  newDay: (payload) => ipcRenderer.invoke("day:new", payload),

  openJson: () => ipcRenderer.invoke("file:openJson"),
  saveJsonAs: (payload) => ipcRenderer.invoke("file:saveJsonAs", payload),
  saveJson: (payload) => ipcRenderer.invoke("file:saveJson", payload),

  parseCommissionText: (payload) => ipcRenderer.invoke("import:parseCommissionText", payload),

  exportCsv: (payload) => ipcRenderer.invoke("export:csv", payload),
  exportTxt: (payload) => ipcRenderer.invoke("export:txt", payload)
});

