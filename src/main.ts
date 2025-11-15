import * as path from 'node:path';
import { app, BrowserWindow, ipcMain, Menu, Notification, nativeImage, Tray } from 'electron';
import Store from 'electron-store';
import { type WebSocket, WebSocketServer } from 'ws';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Define store type
interface Project {
	id: string;
	name: string;
	path: string;
}

interface StoreType {
	settings?: {
		notifications: boolean;
		sound: boolean;
		startup: boolean;
	};
	notificationInterval?: number;
	projects?: Project[];
	activeProjectId?: string;
}

// Initialize electron-store for persisting settings
const store = new Store<StoreType>();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let wss: WebSocketServer | null = null;
let isQuitting = false;
let scanInterval: NodeJS.Timeout | null = null;

// Create the main application window
function createWindow(): void {
	mainWindow = new BrowserWindow({
		width: 420,
		height: 650,
		show: false,
		frame: false,
		resizable: false,
		transparent: false,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: false,
			contextIsolation: true,
		},
		backgroundColor: '#0a0e27',
		skipTaskbar: true,
	});

	mainWindow.loadFile(path.join(__dirname, '../src/index.html'));

	// Open DevTools in development
	if (process.env.NODE_ENV === 'development') {
		mainWindow.webContents.openDevTools();
	}

	mainWindow.on('closed', () => {
		mainWindow = null;
	});

	// Hide when focus is lost
	mainWindow.on('blur', () => {
		if (!mainWindow?.webContents.isDevToolsOpened()) {
			mainWindow?.hide();
		}
	});
}

// Create system tray for menu bar
function createTray(): void {
	// Create a template icon for the menu bar
	const icon = nativeImage.createFromDataURL(
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAIRlWElmTU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAACCgAwAEAAAAAQAAACAAAAAAQWxvbmdBAAAJcEhEUgAAACAAAAAg+/////8ACCAeJElEQVRIDe2XB3SUVRbHf99M'
	);
	icon.setTemplateImage(true);

	tray = new Tray(icon);
	tray.setToolTip('Sanches Security Monitor');

	const contextMenu = Menu.buildFromTemplate([
		{
			label: 'Run Scan Now',
			click: () => {
				runSanchesScan().then((result) => {
					if (result) {
						mainWindow?.webContents.send('scan-result', result);
					}
				});
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

	tray.setContextMenu(contextMenu);

	// Toggle window on click
	tray.on('click', () => {
		toggleWindow();
	});
}

// Toggle window visibility and position it below the tray icon
function toggleWindow(): void {
	if (!mainWindow) return;

	if (mainWindow.isVisible()) {
		mainWindow.hide();
	} else {
		showWindow();
	}
}

// Show window positioned below tray icon
function showWindow(): void {
	if (!mainWindow || !tray) return;

	const trayBounds = tray.getBounds();
	const windowBounds = mainWindow.getBounds();

	// Calculate position (center below tray icon)
	const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
	const y = Math.round(trayBounds.y + trayBounds.height);

	mainWindow.setPosition(x, y, false);
	mainWindow.show();
	mainWindow.focus();
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
	mainWindow?.webContents.send('notification-sent', {
		title,
		body,
		timestamp: new Date().toISOString(),
	});
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
						message.options,
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
		ws.send(
			JSON.stringify({
				type: 'connected',
				message: 'Connected to Sanches Notification Server',
				timestamp: new Date().toISOString(),
			}),
		);
	});
}

// IPC Handlers
ipcMain.handle('send-notification', async (_event, { title, body, options }) => {
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

ipcMain.handle('save-settings', async (_event, settings) => {
	(store as any).set('settings', settings);
	return { success: true };
});

ipcMain.handle('run-scan', async () => {
	const result = await runSanchesScan();
	return result;
});

ipcMain.handle('get-projects', async () => {
	const projects = (store as any).get('projects', []) as Project[];
	const activeProjectId = (store as any).get('activeProjectId') as string | undefined;
	return { projects, activeProjectId };
});

ipcMain.handle('add-project', async (_event, project: Omit<Project, 'id'>) => {
	const projects = (store as any).get('projects', []) as Project[];
	const newProject: Project = {
		...project,
		id: Date.now().toString(),
	};
	projects.push(newProject);
	(store as any).set('projects', projects);
	
	// Set as active if it's the first project
	if (projects.length === 1) {
		(store as any).set('activeProjectId', newProject.id);
	}
	
	return newProject;
});

ipcMain.handle('delete-project', async (_event, projectId: string) => {
	const projects = (store as any).get('projects', []) as Project[];
	const filtered = projects.filter(p => p.id !== projectId);
	(store as any).set('projects', filtered);
	
	// If deleted project was active, set first project as active
	const activeProjectId = (store as any).get('activeProjectId') as string;
	if (activeProjectId === projectId && filtered.length > 0) {
		(store as any).set('activeProjectId', filtered[0].id);
	}
	
	return { success: true };
});

ipcMain.handle('set-active-project', async (_event, projectId: string) => {
	(store as any).set('activeProjectId', projectId);
	
	// Run a scan immediately after switching projects
	const result = await runSanchesScan();
	if (result) {
		mainWindow?.webContents.send('scan-result', result);
	}
	
	return { success: true };
});

// Run Sanches CLI and get security scan results
async function runSanchesScan(): Promise<any> {
	try {
		const activeProjectId = (store as any).get('activeProjectId') as string;
		const projects = ((store as any).get('projects', []) as Project[]);
		const activeProject = projects.find(p => p.id === activeProjectId);
		
		const sanchesPath = path.join(__dirname, '../sanches');
		const projectPath = activeProject?.path || process.cwd();
		
		const { stdout, stderr } = await execAsync(sanchesPath, {
			cwd: projectPath
		});
		
		if (stderr) {
			console.error('Sanches CLI error:', stderr);
		}
		
		const result = JSON.parse(stdout);
		return result;
	} catch (error) {
		console.error('Failed to run Sanches scan:', error);
		return null;
	}
}

// Start periodic security scans
function startSecurityScans(): void {
	// Run initial scan
	runSanchesScan().then((result) => {
		if (result) {
			mainWindow?.webContents.send('scan-result', result);
		}
	});

	// Run scan every 1 minute
	scanInterval = setInterval(async () => {
		const result = await runSanchesScan();
		if (result) {
			mainWindow?.webContents.send('scan-result', result);

			// Send notification if critical issues found
			const criticalCount = result.critical?.length || 0;
			if (criticalCount > 0) {
				sendNotification(
					'🚨 Critical Security Issues Detected',
					`Found ${criticalCount} critical security ${criticalCount === 1 ? 'issue' : 'issues'} in your files!`,
				);
			}
		}
	}, 60000); // 60000ms = 1 minute
}

// Schedule periodic notifications (demo)
function _startPeriodicNotifications(): void {
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
	// Hide dock icon on macOS
	if (process.platform === 'darwin') {
		app.dock?.hide();
		app.setAboutPanelOptions({
			applicationName: 'Sanches Security Monitor',
			applicationVersion: app.getVersion(),
		});
	}

	createWindow();
	createTray();
	initializeWebSocketServer();

	// Start security scans
	setTimeout(() => {
		startSecurityScans();
		sendNotification(
			'🛡️ Sanches Security Monitor Active',
			'Running security scans every minute to protect your files.',
		);
	}, 2000);

	app.on('activate', () => {
		if (mainWindow === null) {
			createWindow();
		}
	});
});

// Don't quit when all windows are closed (menu bar app)
app.on('window-all-closed', () => {
	// Keep app running in menu bar
});

app.on('before-quit', () => {
	isQuitting = true;
	if (wss) {
		wss.close();
	}
	if (scanInterval) {
		clearInterval(scanInterval);
	}
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
	console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
	console.error('Unhandled rejection:', error);
});
