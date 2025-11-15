import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
	sendNotification: (title: string, body: string, options?: any) =>
		ipcRenderer.invoke('send-notification', { title, body, options }),

	getSettings: () => ipcRenderer.invoke('get-settings'),

	saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),

	runScan: () => ipcRenderer.invoke('run-scan'),

	getProjects: () => ipcRenderer.invoke('get-projects'),

	addProject: (projectPath: string) => ipcRenderer.invoke('add-project', projectPath),

	deleteProject: (projectId: string) => ipcRenderer.invoke('delete-project', projectId),

	setActiveProject: (projectId: string) => ipcRenderer.invoke('set-active-project', projectId),

	getGlobalWatch: () => ipcRenderer.invoke('get-global-watch'),

	setGlobalWatch: (enabled: boolean) => ipcRenderer.invoke('set-global-watch', enabled),

	toggleProjectWatch: (projectId: string, enabled: boolean) => 
		ipcRenderer.invoke('toggle-project-watch', projectId, enabled),

	getApiKey: () => ipcRenderer.invoke('get-api-key'),

	saveApiKey: (apiKey: string) => ipcRenderer.invoke('save-api-key', apiKey),

	onNotificationSent: (callback: (data: any) => void) => {
		ipcRenderer.on('notification-sent', (_event, data) => callback(data));
	},

	onScanResult: (callback: (data: any) => void) => {
		ipcRenderer.on('scan-result', (_event, data) => callback(data));
	},
});

// Type definitions for TypeScript
export interface ElectronAPI {
	sendNotification: (title: string, body: string, options?: any) => Promise<{ success: boolean }>;
	getSettings: () => Promise<any>;
	saveSettings: (settings: any) => Promise<{ success: boolean }>;
	runScan: () => Promise<any>;
	getProjects: () => Promise<any>;
	addProject: (projectPath: string) => Promise<any>;
	deleteProject: (projectId: string) => Promise<any>;
	setActiveProject: (projectId: string) => Promise<any>;
	getGlobalWatch: () => Promise<boolean>;
	setGlobalWatch: (enabled: boolean) => Promise<any>;
	toggleProjectWatch: (projectId: string, enabled: boolean) => Promise<any>;
	getApiKey: () => Promise<string | undefined>;
	saveApiKey: (apiKey: string) => Promise<{ success: boolean }>;
	onNotificationSent: (callback: (data: any) => void) => void;
	onScanResult: (callback: (data: any) => void) => void;
}

declare global {
	interface Window {
		electronAPI: ElectronAPI;
	}
}
