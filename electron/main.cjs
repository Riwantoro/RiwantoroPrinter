const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    backgroundColor: '#0f121a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    await mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    await mainWindow.loadURL(devUrl);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  ipcMain.handle('print-ticket', async () => {
    if (!mainWindow) return;
    return new Promise((resolve, reject) => {
      mainWindow.webContents.print(
        { silent: true, printBackground: true },
        (success, failureReason) => {
          if (!success) {
            reject(new Error(failureReason || 'Print failed'));
            return;
          }
          resolve();
        }
      );
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
