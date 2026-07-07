const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // No sync APIs needed — online-only mode
});
