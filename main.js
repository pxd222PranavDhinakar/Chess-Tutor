const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let stockfishProcess;

function createWindow() {
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
}

function initStockfish() {
    const stockfishPath = path.join(__dirname, 'stockfish', 'stockfish');
    
    try {
        stockfishProcess = spawn(stockfishPath);
        
        stockfishProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            console.log('Stockfish:', output);
            if (mainWindow) {
                mainWindow.webContents.send('stockfish-output', output);
            }
        });

        stockfishProcess.stderr.on('data', (data) => {
            console.error('Stockfish error:', data.toString());
        });

        // Initialize
        stockfishProcess.stdin.write('uci\n');
    } catch (error) {
        console.error('Failed to start Stockfish:', error);
    }
}

ipcMain.on('stockfish-command', (event, command) => {
    if (stockfishProcess && stockfishProcess.stdin.writable) {
        stockfishProcess.stdin.write(command + '\n');
    }
});

app.whenReady().then(() => {
    createWindow();
    initStockfish();
});

app.on('window-all-closed', () => {
    if (stockfishProcess) {
        stockfishProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});