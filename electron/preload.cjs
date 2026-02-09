const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printTicket: () => ipcRenderer.invoke('print-ticket'),
});
