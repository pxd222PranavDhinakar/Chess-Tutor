const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    console.log('🚀 Creating main window...');
    
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.webContents.openDevTools();
    
    console.log('✅ Main window created');
}

// Test IPC handler - CRITICAL for debugging
ipcMain.on('stockfish-ipc-test', (event) => {
    console.log('📨 [MAIN PROCESS] IPC test received from renderer');
    const testData = {
        timestamp: Date.now(),
        mainProcessWorking: true,
        message: 'Main process is responding'
    };
    console.log('📤 [MAIN PROCESS] Sending IPC test response:', testData);
    event.reply('stockfish-ipc-test-response', testData);
});

// Status request handler
ipcMain.on('stockfish-status-request', (event) => {
    console.log('📊 [MAIN PROCESS] Status request received');
    const status = {
        mainProcessActive: true,
        timestamp: Date.now(),
        stockfishAvailable: false,
        note: 'Stockfish disabled for testing'
    };
    console.log('📊 [MAIN PROCESS] Sending status:', status);
    event.reply('stockfish-process-status', status);
});

// Stockfish command handler (dummy for now)
ipcMain.on('stockfish-command', (event, command) => {
    console.log('📨 [MAIN PROCESS] Received command:', command);
    
    // For testing, simulate a UCI response
    if (command === 'uci') {
        console.log('🎭 [MAIN PROCESS] Simulating UCI response...');
        setTimeout(() => {
            console.log('📤 [MAIN PROCESS] Sending fake uciok');
            mainWindow.webContents.send('stockfish-output', 'uciok');
        }, 1000);
    }
    
    if (command === 'isready') {
        console.log('🎭 [MAIN PROCESS] Simulating isready response...');
        setTimeout(() => {
            console.log('📤 [MAIN PROCESS] Sending fake readyok');
            mainWindow.webContents.send('stockfish-output', 'readyok');
        }, 500);
    }
});

app.whenReady().then(() => {
    console.log('🚀 [MAIN PROCESS] App ready, creating window...');
    createWindow();
});

app.on('window-all-closed', () => {
    console.log('🛑 [MAIN PROCESS] All windows closed');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    console.log('🔄 [MAIN PROCESS] App activated');
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

console.log('🚀 [MAIN PROCESS] Main.js loaded and ready');