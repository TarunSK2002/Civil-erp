const { contextBridge, ipcRenderer } = require('electron');
const pkg = require('./package.json');

contextBridge.exposeInMainWorld('electronAPI', {
    appVersion: pkg.version,
    getAppVersion: () => pkg.version,
});
