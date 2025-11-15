import { useEffect, useState, useCallback } from 'react';
import type { Project, ScanResult } from '../types';

interface ElectronAPI {
	runScan: () => Promise<ScanResult | null>;
	getProjects: () => Promise<{ projects: Project[]; activeProjectId?: string }>;
	addProject: (projectPath: string) => Promise<Project>;
	deleteProject: (projectId: string) => Promise<{ success: boolean }>;
	setActiveProject: (projectId: string) => Promise<{ success: boolean }>;
	getGlobalWatch: () => Promise<boolean>;
	setGlobalWatch: (enabled: boolean) => Promise<{ success: boolean }>;
	toggleProjectWatch: (projectId: string, enabled: boolean) => Promise<{ success: boolean }>;
	getApiKey: () => Promise<string | undefined>;
	saveApiKey: (apiKey: string) => Promise<{ success: boolean }>;
	deleteApiKey: () => Promise<{ success: boolean }>;
	getSettings: () => Promise<{ notifications: boolean; sound: boolean; startup: boolean }>;
	saveSettings: (settings: { notifications: boolean; sound: boolean; startup: boolean }) => Promise<{ success: boolean }>;
	onScanResult: (callback: (data: ScanResult) => void) => void;
}

declare global {
	interface Window {
		electronAPI: ElectronAPI;
	}
}

export const useElectron = () => {
	const [projects, setProjects] = useState<Project[]>([]);
	const [activeProjectId, setActiveProjectId] = useState<string | undefined>();
	const [globalWatchEnabled, setGlobalWatchEnabled] = useState(true);
	const [scanResult, setScanResult] = useState<ScanResult | null>(null);
	const [apiKey, setApiKey] = useState<string | undefined>();
	const [notificationsEnabled, setNotificationsEnabled] = useState(true);
	const [isScanning, setIsScanning] = useState(false);

	const loadProjects = useCallback(async () => {
		const { projects, activeProjectId } = await window.electronAPI.getProjects();
		setProjects(projects);
		setActiveProjectId(activeProjectId);
	}, []);

	const loadGlobalWatch = useCallback(async () => {
		const enabled = await window.electronAPI.getGlobalWatch();
		setGlobalWatchEnabled(enabled);
	}, []);

	const loadApiKey = useCallback(async () => {
		const key = await window.electronAPI.getApiKey();
		setApiKey(key);
	}, []);

	const loadSettings = useCallback(async () => {
		const settings = await window.electronAPI.getSettings();
		setNotificationsEnabled(settings.notifications);
	}, []);

	const saveApiKey = useCallback(async (key: string, notifications: boolean) => {
		await window.electronAPI.saveApiKey(key);
		setApiKey(key);
		
		// Save notification settings
		const currentSettings = await window.electronAPI.getSettings();
		await window.electronAPI.saveSettings({
			...currentSettings,
			notifications,
		});
		setNotificationsEnabled(notifications);
	}, []);

	const deleteApiKey = useCallback(async () => {
		await window.electronAPI.deleteApiKey();
		// Reset all state to initial values
		setApiKey(undefined);
		setProjects([]);
		setActiveProjectId(undefined);
		setScanResult(null);
		setGlobalWatchEnabled(true);
		setNotificationsEnabled(true);
	}, []);

	const runScan = useCallback(async () => {
		setIsScanning(true);
		try {
			const result = await window.electronAPI.runScan();
			if (result) {
				setScanResult(result);
			}
		} finally {
			// Add a minimum delay so the loader is visible for at least 1.5 seconds
			setTimeout(() => {
				setIsScanning(false);
			}, 1500);
		}
	}, []);

	const addProject = useCallback(async (path: string) => {
		await window.electronAPI.addProject(path);
		await loadProjects();
		await runScan();
	}, [loadProjects, runScan]);

	const deleteProject = useCallback(async (projectId: string) => {
		// Clear scan results if we're deleting the active project
		if (projectId === activeProjectId) {
			setScanResult(null);
		}
		await window.electronAPI.deleteProject(projectId);
		await loadProjects();
	}, [loadProjects, activeProjectId]);

	const setActiveProject = useCallback(async (projectId: string) => {
		await window.electronAPI.setActiveProject(projectId);
		setActiveProjectId(projectId);
	}, []);

	const toggleGlobalWatch = useCallback(async (enabled: boolean) => {
		await window.electronAPI.setGlobalWatch(enabled);
		setGlobalWatchEnabled(enabled);
	}, []);

	const toggleProjectWatch = useCallback(async (projectId: string, enabled: boolean) => {
		await window.electronAPI.toggleProjectWatch(projectId, enabled);
		await loadProjects();
	}, [loadProjects]);

	useEffect(() => {
		loadProjects();
		loadGlobalWatch();
		loadApiKey();
		loadSettings();
		runScan();

		window.electronAPI.onScanResult((data) => {
			// Handle null results (e.g., when a project is deleted)
			setScanResult(data);
		});
	}, []);

	return {
		projects,
		activeProjectId,
		globalWatchEnabled,
		scanResult,
		apiKey,
		notificationsEnabled,
		isScanning,
		addProject,
		deleteProject,
		setActiveProject,
		toggleGlobalWatch,
		toggleProjectWatch,
		runScan,
		loadProjects,
		saveApiKey,
		deleteApiKey,
	};
};

