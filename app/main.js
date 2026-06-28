const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const isDev = !app.isPackaged;

let backendProcess = null;
let mainWindow = null;

function startBackend() {
    const backendDir = isDev 
        ? path.join(__dirname, '../backend')
        : path.join(process.resourcesPath, 'backend');
    
    const backendPath = path.join(backendDir, 'server.js');

    console.log('Starting backend at:', backendPath);
    
    backendProcess = fork(backendPath, [], {
        cwd: backendDir,
        env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: '1',
            DB_DIALECT: 'sqlite',
            USER_DATA_PATH: app.getPath('userData'),
            RENDER_API_URL: 'https://civil-erp.onrender.com/api'
        },
        stdio: 'pipe'
    });

    // Forward sync status events from backend to the renderer process
    backendProcess.on('message', (message) => {
        if (message && message.type === 'sync-status-changed') {
            if (mainWindow && !mainWindow.webContents.isDestroyed()) {
                mainWindow.webContents.send('sync-status-changed', message.data);
            }
        }
    });

    if (backendProcess.stdout) {
        backendProcess.stdout.on('data', (data) => {
            console.log(`Backend stdout: ${data}`);
        });
    }

    if (backendProcess.stderr) {
        backendProcess.stderr.on('data', (data) => {
            console.error(`Backend stderr: ${data}`);
        });
    }

    backendProcess.on('exit', (code) => {
        console.log(`Backend process exited with code ${code}`);
    });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        backgroundColor: '#1A1A2E',
        title: 'Jeeva Cloud ERP',
        icon: path.join(__dirname, 'public/logo.jpeg'),
        autoHideMenuBar: false,
    });

    const template = [
        {
            label: 'File',
            submenu: [
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Check for Updates',
                    click: async () => {
                        const { dialog, shell } = require('electron');
                        try {
                            const response = await fetch('http://localhost:5000/api/master-settings');
                            if (!response.ok) throw new Error('Failed to fetch settings');
                            const settings = await response.json();
                            
                            const currentVersion = '2.7.0';
                            const latestVersion = settings.LatestAppVersion || '2.7.0';
                            const updateLink = settings.UpdateLink || 'https://drive.google.com';
                            
                            if (latestVersion !== currentVersion) {
                                const result = await dialog.showMessageBox(win, {
                                    type: 'info',
                                    title: 'Update Available',
                                    message: `A new version (v${latestVersion}) of Jeeva Cloud ERP is available!`,
                                    detail: `Your current version: v${currentVersion}\nLatest version: v${latestVersion}\n\nWould you like to open the download link to download the new update installer?`,
                                    buttons: ['Download Update', 'Cancel'],
                                    defaultId: 0,
                                    cancelId: 1
                                });
                                
                                if (result.response === 0) {
                                    await shell.openExternal(updateLink);
                                }
                            } else {
                                await dialog.showMessageBox(win, {
                                    type: 'info',
                                    title: 'Up to Date',
                                    message: 'You are running the latest version!',
                                    detail: `Current version: v${currentVersion}`
                                });
                            }
                        } catch (err) {
                            console.error('Failed to check for updates:', err);
                            await dialog.showMessageBox(win, {
                                type: 'error',
                                title: 'Update Check Failed',
                                message: 'Could not contact the local server to check for updates.',
                                detail: err.message
                            });
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'About',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(win, {
                            title: 'Jeeva Cloud ERP',
                            message: 'Jeeva Cloud ERP\nVersion 2.7.0\nDesigned for Jeeva Construction',
                            type: 'info'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    mainWindow = win;

    win.loadURL(
        isDev
            ? 'http://localhost:5173'
            : `file://${path.join(__dirname, 'dist/index.html')}`
    );

    // DevTools can be opened via the menu bar View option or keyboard shortcuts (Ctrl+Shift+I)
}

app.whenReady().then(() => {
    startBackend();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    if (backendProcess) {
        backendProcess.kill();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
