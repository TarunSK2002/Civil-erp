const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    appVersion: '3.2.4',
    getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
