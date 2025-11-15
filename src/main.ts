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
	watchEnabled: boolean;
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
	globalWatchEnabled?: boolean;
	geminiApiKey?: string;
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
		width: 1200,
		height: 800,
		minWidth: 800,
		minHeight: 600,
		show: false, // Don't show on startup - only show when user clicks menu bar
		frame: true, // Show title bar and window controls
		resizable: true,
		transparent: false,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true,
			webSecurity: true,
		},
		backgroundColor: '#0a0e27',
		skipTaskbar: false, // Show in dock
		title: 'Sanches - Security Monitor',
	});

	mainWindow.loadFile(path.join(__dirname, '../dist-react/index.html'));

	// Open DevTools in development
	if (process.env.NODE_ENV === 'development') {
		mainWindow.webContents.openDevTools();
	}

	// Prevent closing - hide instead to run in background
	mainWindow.on('close', (event) => {
		if (!isQuitting) {
			event.preventDefault();
			mainWindow?.hide();
		}
	});

	mainWindow.on('closed', () => {
		mainWindow = null;
	});
}

// Create system tray for menu bar
function createTray(): void {
	// Create a template icon for the menu bar
	// macOS will automatically use @2x versions for retina displays
	const iconPath = app.isPackaged
		? path.join(process.resourcesPath, 'assets', 'sanchesDark.png')
		: path.join(__dirname, '..', 'assets', 'sanchesDark.png');
	
	console.log('Tray icon path:', iconPath);
	const icon = nativeImage.createFromPath(iconPath);
	
	if (icon.isEmpty()) {
		console.error('Failed to load tray icon from:', iconPath);
	}
	
	icon.setTemplateImage(true); // This makes it adapt to light/dark menu bar

	tray = new Tray(icon);
	tray.setToolTip('Sanches - Security Monitor');

	const contextMenu = Menu.buildFromTemplate([
		{
			label: 'Show Sanches',
			click: () => {
				if (mainWindow) {
					mainWindow.show();
					mainWindow.focus();
				}
			},
		},
		{ type: 'separator' },
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
			label: 'Quit Sanches',
			click: () => {
				isQuitting = true;
				app.quit();
			},
		},
	]);

	tray.setContextMenu(contextMenu);
	
	// Don't show window on direct click - only via menu
}

// Update tray icon to show notification state
function updateTrayIcon(hasIssues: boolean): void {
	if (!tray) return;

	const iconName = hasIssues ? 'sanchesUpdateDark.png' : 'sanchesDark.png';
	const iconPath = app.isPackaged
		? path.join(process.resourcesPath, 'assets', iconName)
		: path.join(__dirname, '..', 'assets', iconName);
	
	const icon = nativeImage.createFromPath(iconPath);
	
	if (icon.isEmpty()) {
		console.error('Failed to load update icon from:', iconPath);
		return;
	}
	
	icon.setTemplateImage(true);
	tray.setImage(icon);
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

ipcMain.handle('add-project', async (_event, projectPath: string) => {
	const projects = (store as any).get('projects', []) as Project[];
	
	// Extract folder name from path
	const folderName = path.basename(projectPath);
	
	const newProject: Project = {
		id: Date.now().toString(),
		name: folderName,
		path: projectPath,
		watchEnabled: true, // Enable watch by default
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

ipcMain.handle('get-global-watch', async () => {
	return (store as any).get('globalWatchEnabled', true) as boolean;
});

ipcMain.handle('set-global-watch', async (_event, enabled: boolean) => {
	(store as any).set('globalWatchEnabled', enabled);
	
	if (enabled) {
		startSecurityScans();
	} else {
		if (scanInterval) {
			clearInterval(scanInterval);
			scanInterval = null;
		}
	}
	
	return { success: true };
});

ipcMain.handle('toggle-project-watch', async (_event, projectId: string, enabled: boolean) => {
	const projects = (store as any).get('projects', []) as Project[];
	const project = projects.find(p => p.id === projectId);
	
	if (project) {
		project.watchEnabled = enabled;
		(store as any).set('projects', projects);
	}
	
	return { success: true };
});

ipcMain.handle('get-api-key', async () => {
	return (store as any).get('geminiApiKey') as string | undefined;
});

ipcMain.handle('save-api-key', async (_event, apiKey: string) => {
	(store as any).set('geminiApiKey', apiKey);
	return { success: true };
});

// Run Sanches CLI and get security scan results
async function runSanchesScan(): Promise<any> {
	try {
		// Check if API key is set
		const apiKey = (store as any).get('geminiApiKey') as string | undefined;
		if (!apiKey) {
			console.log('API key not set, skipping scan');
			return null;
		}
		
		const globalWatchEnabled = (store as any).get('globalWatchEnabled', true) as boolean;
		if (!globalWatchEnabled) {
			return null;
		}
		
		const activeProjectId = (store as any).get('activeProjectId') as string;
		const projects = ((store as any).get('projects', []) as Project[]);
		const activeProject = projects.find(p => p.id === activeProjectId);
		
		// Check if project watch is enabled
		if (!activeProject || !activeProject.watchEnabled) {
			return null;
		}
		
		const sanchesPath = path.join(__dirname, '../sanches');
		const projectPath = activeProject?.path || process.cwd();
		
		// Execute Sanches CLI with --dir and --api flags
		const command = `${sanchesPath} --dir "${projectPath}" --api "${apiKey}"`;
		const { stdout, stderr } = await execAsync(command);
		
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
	// Clear existing interval if any
	if (scanInterval) {
		clearInterval(scanInterval);
		scanInterval = null;
	}
	
	const globalWatchEnabled = (store as any).get('globalWatchEnabled', true) as boolean;
	if (!globalWatchEnabled) {
		return;
	}
	
	// Run initial scan
	runSanchesScan().then((result) => {
		if (result) {
			mainWindow?.webContents.send('scan-result', result);
			
			// Update tray icon based on initial scan results
			const criticalCount = result.critical?.length || 0;
			const highCount = result.high?.length || 0;
			const mediumCount = result.medium?.length || 0;
			const hasIssues = criticalCount > 0 || highCount > 0 || mediumCount > 0;
			updateTrayIcon(hasIssues);
		}
	});

	// Run scan every 1 minute
	scanInterval = setInterval(async () => {
		const result = await runSanchesScan();
		if (result) {
			mainWindow?.webContents.send('scan-result', result);
			
			// Check if there are any issues
			const criticalCount = result.critical?.length || 0;
			const highCount = result.high?.length || 0;
			const mediumCount = result.medium?.length || 0;
			const hasIssues = criticalCount > 0 || highCount > 0 || mediumCount > 0;
			
			// Update tray icon to show notification state
			updateTrayIcon(hasIssues);
			
			// Send notification if critical issues found
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
			applicationName: 'Sanches',
			applicationVersion: app.getVersion(),
		});
	}
	
	// Set app name
	app.setName('Sanches');

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
