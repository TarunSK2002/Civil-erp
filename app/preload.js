const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Listen for real-time synchronization updates sent from Electron Main Process
    onSyncStatusChange: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('sync-status-changed', subscription);
        return () => ipcRenderer.removeListener('sync-status-changed', subscription);
    }
});
