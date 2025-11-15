import { app, BrowserWindow, Notification, ipcMain, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import { WebSocketServer, WebSocket } from 'ws';

// Define store type
interface StoreType {
  settings?: {
    notifications: boolean;
    sound: boolean;
    startup: boolean;
  };
  notificationInterval?: number;
}

// Initialize electron-store for persisting settings
const store = new Store<StoreType>();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let wss: WebSocketServer | null = null;
let isQuitting = false;

// Create the main application window
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, '../src/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window close - minimize to tray instead
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

// Create system tray
function createTray(): void {
  // Create a simple icon for the tray (you can replace with a proper icon)
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  
  tray = new Tray(nativeImage.createEmpty());
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow?.show();
      },
    },
    {
      label: 'Send Test Notification',
      click: () => {
        sendNotification('Test Notification', 'This is a test notification from Sanches App');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Sanches Notifications');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.isVisible() ? mainWindow.hide() : mainWindow?.show();
  });
}

// Send notification function
function sendNotification(title: string, body: string, options?: Partial<Notification>): void {
  if (!Notification.isSupported()) {
    console.error('Notifications are not supported on this system');
    return;
  }

  const notification = new Notification({
    title,
    body,
    silent: false,
    timeoutType: 'default',
    ...options,
  });

  notification.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  notification.show();

  // Send to renderer process
  mainWindow?.webContents.send('notification-sent', { title, body, timestamp: new Date().toISOString() });
}

// Initialize WebSocket server for real-time notifications
function initializeWebSocketServer(): void {
  const port = 8080;
  wss = new WebSocketServer({ port });

  console.log(`WebSocket server started on port ${port}`);

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket client connected');

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'notification') {
          sendNotification(
            message.title || 'Notification',
            message.body || 'New notification received',
            message.options
          );
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to Sanches Notification Server',
      timestamp: new Date().toISOString(),
    }));
  });
}

// IPC Handlers
ipcMain.handle('send-notification', async (event, { title, body, options }) => {
  sendNotification(title, body, options);
  return { success: true };
});

ipcMain.handle('get-settings', async () => {
  return (store as any).get('settings', {
    notifications: true,
    sound: true,
    startup: false,
  });
});

ipcMain.handle('save-settings', async (event, settings) => {
  (store as any).set('settings', settings);
  return { success: true };
});

// Schedule periodic notifications (demo)
function startPeriodicNotifications(): void {
  const interval = (store as any).get('notificationInterval', 300000) as number; // Default: 5 minutes

  setInterval(() => {
    const settings = (store as any).get('settings', { notifications: true }) as any;
    
    if (settings.notifications) {
      sendNotification(
        'Periodic Reminder',
        `This is an automated notification at ${new Date().toLocaleTimeString()}`,
      );
    }
  }, interval);
}

// App lifecycle
app.whenReady().then(() => {
  // Request notification permissions (important for macOS)
  if (process.platform === 'darwin') {
    app.setAboutPanelOptions({
      applicationName: 'Sanches Notifications',
      applicationVersion: app.getVersion(),
    });
  }

  createWindow();
  createTray();
  initializeWebSocketServer();
  
  // Send initial notification
  setTimeout(() => {
    sendNotification(
      'Welcome to Sanches!',
      'Your notification app is ready. Connect via WebSocket on port 8080.',
    );
  }, 2000);

  // Uncomment to enable periodic notifications
  // startPeriodicNotifications();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  if (wss) {
    wss.close();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

