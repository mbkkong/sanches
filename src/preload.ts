import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  sendNotification: (title: string, body: string, options?: any) =>
    ipcRenderer.invoke('send-notification', { title, body, options }),
  
  getSettings: () => ipcRenderer.invoke('get-settings'),
  
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  
  onNotificationSent: (callback: (data: any) => void) => {
    ipcRenderer.on('notification-sent', (event, data) => callback(data));
  },
});

// Type definitions for TypeScript
export interface ElectronAPI {
  sendNotification: (title: string, body: string, options?: any) => Promise<{ success: boolean }>;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<{ success: boolean }>;
  onNotificationSent: (callback: (data: any) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

