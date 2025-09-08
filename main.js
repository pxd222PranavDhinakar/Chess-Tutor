const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;
let stockfishProcess = null;
let stockfishReady = false;

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

/**
 * Find Stockfish binary - RESTORED FUNCTIONALITY
 */
function findStockfishBinary() {
    const possiblePaths = [
        // Common installation paths
        '/usr/local/bin/stockfish',
        '/usr/bin/stockfish',
        '/opt/homebrew/bin/stockfish', // macOS Homebrew
        'C:\\Program Files\\Stockfish\\stockfish.exe', // Windows
        'C:\\stockfish\\stockfish.exe',
        
        // Local development paths
        './stockfish/stockfish',
        './bin/stockfish',
        './stockfish.exe',
        
        // Just try the command directly
        'stockfish'
    ];
    
    for (const stockfishPath of possiblePaths) {
        try {
            if (stockfishPath.includes('/') || stockfishPath.includes('\\')) {
                // Check if file exists for absolute/relative paths
                if (fs.existsSync(stockfishPath)) {
                    console.log('📁 Found Stockfish at:', stockfishPath);
                    return stockfishPath;
                }
            } else {
                // For command names, we'll try spawning directly
                console.log('🔍 Will try command:', stockfishPath);
                return stockfishPath;
            }
        } catch (error) {
            // Continue to next path
        }
    }
    
    return null;
}

/**
 * Initialize Stockfish engine - RESTORED FUNCTIONALITY
 */
function initializeStockfish() {
    console.log('🚀 [MAIN PROCESS] Initializing Stockfish engine...');
    
    const stockfishPath = findStockfishBinary();
    if (!stockfishPath) {
        console.error('❌ [MAIN PROCESS] Stockfish binary not found');
        mainWindow.webContents.send('stockfish-error', 'Stockfish binary not found. Please install Stockfish.');
        return false;
    }
    
    try {
        console.log('🔧 [MAIN PROCESS] Spawning Stockfish process:', stockfishPath);
        
        stockfishProcess = spawn(stockfishPath, [], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Handle Stockfish output
        stockfishProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            console.log('📥 [STOCKFISH OUTPUT]:', output);
            
            // Send output to renderer process
            mainWindow.webContents.send('stockfish-output', output);
            
            // Track readiness
            if (output === 'uciok') {
                console.log('✅ [MAIN PROCESS] Stockfish UCI protocol confirmed');
            } else if (output === 'readyok') {
                stockfishReady = true;
                console.log('✅ [MAIN PROCESS] Stockfish engine ready');
            }
        });
        
        // Handle Stockfish errors
        stockfishProcess.stderr.on('data', (data) => {
            const error = data.toString().trim();
            console.error('❌ [STOCKFISH ERROR]:', error);
            mainWindow.webContents.send('stockfish-error', error);
        });
        
        // Handle process exit
        stockfishProcess.on('exit', (code, signal) => {
            console.log(`🛑 [MAIN PROCESS] Stockfish process exited with code ${code}, signal ${signal}`);
            stockfishProcess = null;
            stockfishReady = false;
            
            if (code !== 0) {
                mainWindow.webContents.send('stockfish-error', `Stockfish exited unexpectedly (code: ${code})`);
            }
        });
        
        // Handle spawn errors
        stockfishProcess.on('error', (error) => {
            console.error('❌ [MAIN PROCESS] Failed to spawn Stockfish:', error);
            stockfishProcess = null;
            stockfishReady = false;
            
            if (error.code === 'ENOENT') {
                mainWindow.webContents.send('stockfish-error', 'Stockfish not found. Please install Stockfish and ensure it\'s in your PATH.');
            } else {
                mainWindow.webContents.send('stockfish-error', `Failed to start Stockfish: ${error.message}`);
            }
        });
        
        console.log('✅ [MAIN PROCESS] Stockfish process spawned successfully');
        return true;
        
    } catch (error) {
        console.error('❌ [MAIN PROCESS] Exception while initializing Stockfish:', error);
        mainWindow.webContents.send('stockfish-error', `Stockfish initialization failed: ${error.message}`);
        return false;
    }
}

/**
 * Send command to Stockfish - RESTORED FUNCTIONALITY
 */
function sendToStockfish(command) {
    if (!stockfishProcess || !stockfishProcess.stdin) {
        console.error('❌ [MAIN PROCESS] Stockfish process not available');
        return false;
    }
    
    try {
        console.log('📤 [MAIN PROCESS] Sending to Stockfish:', command);
        stockfishProcess.stdin.write(command + '\n');
        return true;
    } catch (error) {
        console.error('❌ [MAIN PROCESS] Error sending to Stockfish:', error);
        mainWindow.webContents.send('stockfish-error', `Failed to send command: ${error.message}`);
        return false;
    }
}

/**
 * Shutdown Stockfish cleanly - RESTORED FUNCTIONALITY
 */
function shutdownStockfish() {
    if (stockfishProcess) {
        console.log('🛑 [MAIN PROCESS] Shutting down Stockfish...');
        
        try {
            sendToStockfish('quit');
            
            // Give it a moment to quit gracefully
            setTimeout(() => {
                if (stockfishProcess && !stockfishProcess.killed) {
                    console.log('🔪 [MAIN PROCESS] Force killing Stockfish process');
                    stockfishProcess.kill('SIGTERM');
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ [MAIN PROCESS] Error during Stockfish shutdown:', error);
        }
    }
}

// Test IPC handler - KEEPING EXISTING FUNCTIONALITY
ipcMain.on('stockfish-ipc-test', (event) => {
    console.log('🔨 [MAIN PROCESS] IPC test received from renderer');
    const testData = {
        timestamp: Date.now(),
        mainProcessWorking: true,
        message: 'Main process is responding',
        stockfishStatus: stockfishProcess ? 'running' : 'not running'
    };
    console.log('📤 [MAIN PROCESS] Sending IPC test response:', testData);
    event.reply('stockfish-ipc-test-response', testData);
});

// Status request handler - ENHANCED WITH REAL STATUS
ipcMain.on('stockfish-status-request', (event) => {
    console.log('📊 [MAIN PROCESS] Status request received');
    const status = {
        mainProcessActive: true,
        timestamp: Date.now(),
        stockfishAvailable: !!stockfishProcess,
        stockfishReady: stockfishReady,
        stockfishPid: stockfishProcess ? stockfishProcess.pid : null
    };
    console.log('📊 [MAIN PROCESS] Sending status:', status);
    event.reply('stockfish-process-status', status);
});

// Stockfish command handler - RESTORED REAL FUNCTIONALITY
ipcMain.on('stockfish-command', (event, command) => {
    console.log('🔨 [MAIN PROCESS] Received Stockfish command:', command);
    
    // Send command to real Stockfish process
    const success = sendToStockfish(command);
    
    if (!success) {
        // If Stockfish isn't available, try to restart it
        console.log('🔄 [MAIN PROCESS] Attempting to restart Stockfish...');
        const initSuccess = initializeStockfish();
        
        if (initSuccess) {
            // Try sending the command again after a brief delay
            setTimeout(() => {
                sendToStockfish(command);
            }, 500);
        }
    }
});

// Command sent confirmation - KEEPING EXISTING FUNCTIONALITY
ipcMain.on('stockfish-command-sent', (event, data) => {
    console.log('📝 [MAIN PROCESS] Command sent confirmation:', data);
});

app.whenReady().then(() => {
    console.log('🚀 [MAIN PROCESS] App ready, creating window...');
    createWindow();
    
    // Initialize Stockfish after window is created
    setTimeout(() => {
        console.log('🔧 [MAIN PROCESS] Starting Stockfish initialization...');
        const stockfishSuccess = initializeStockfish();
        
        if (stockfishSuccess) {
            console.log('✅ [MAIN PROCESS] Stockfish initialization started');
        } else {
            console.log('❌ [MAIN PROCESS] Stockfish initialization failed');
        }
    }, 1000);
});

app.on('window-all-closed', () => {
    console.log('🛑 [MAIN PROCESS] All windows closed');
    
    // Shutdown Stockfish before quitting
    shutdownStockfish();
    
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

// Handle app quit
app.on('before-quit', () => {
    console.log('🛑 [MAIN PROCESS] App quitting, shutting down Stockfish...');
    shutdownStockfish();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ [MAIN PROCESS] Uncaught exception:', error);
    shutdownStockfish();
});

console.log('🚀 [MAIN PROCESS] Main.js loaded and ready');