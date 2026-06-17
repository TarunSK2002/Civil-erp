const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const isDev = !app.isPackaged;

let backendProcess = null;

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
            ELECTRON_RUN_AS_NODE: '1'
        },
        stdio: 'pipe'
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

// Remove the default menu bar completely
Menu.setApplicationMenu(null);

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
        title: 'Jeeva Construction',
        icon: path.join(__dirname, 'public/logo.jpeg'),
        autoHideMenuBar: true,
    });

    // Hide the menu bar on this window as well
    win.setMenuBarVisibility(false);

    win.loadURL(
        isDev
            ? 'http://localhost:5173'
            : `file://${path.join(__dirname, 'dist/index.html')}`
    );

    // DevTools removed — no longer opens automatically
    win.webContents.openDevTools();
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
