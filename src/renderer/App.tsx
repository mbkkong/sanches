import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { ProjectSelector } from './components/ProjectSelector';
import { IssuesList } from './components/IssuesList';
import { AddProjectModal } from './components/AddProjectModal';
import { ManageProjectsModal } from './components/ManageProjectsModal';
import { SettingsModal } from './components/SettingsModal';
import { useElectron } from './hooks/useElectron';
import type { IssueWithType } from './types';
import { AlertCircle } from 'lucide-react';
import './styles.css';

export const App: React.FC = () => {
	const {
		projects,
		activeProjectId,
		globalWatchEnabled,
		scanResult,
		apiKey,
		notificationsEnabled,
		addProject,
		deleteProject,
		setActiveProject,
		toggleGlobalWatch,
		toggleProjectWatch,
		runScan,
		loadProjects,
		saveApiKey,
		deleteApiKey,
	} = useElectron();

	const [lastScanTime, setLastScanTime] = useState('--:--:--');
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [isManageModalOpen, setIsManageModalOpen] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);

	// Update last scan time when scan result changes
	useEffect(() => {
		if (scanResult) {
			const now = new Date();
			setLastScanTime(now.toLocaleTimeString());
		}
	}, [scanResult]);

	// Prepare issues with type
	const issuesWithType: IssueWithType[] = [
		...(scanResult?.critical.map((issue) => ({ ...issue, type: 'critical' as const })) || []),
		...(scanResult?.warning.map((issue) => ({ ...issue, type: 'warning' as const })) || []),
	];

	const handleAddProject = async (path: string) => {
		await addProject(path);
	};

	const handleDeleteProject = async (projectId: string) => {
		await deleteProject(projectId);
		await loadProjects();
	};

	const handleToggleWatch = async () => {
		await toggleGlobalWatch(!globalWatchEnabled);
	};

	const hasApiKey = !!apiKey;
	const hasProjects = projects.length > 0;

	return (
		<div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100/50 text-foreground">
			<Header
				globalWatchEnabled={globalWatchEnabled}
				onToggleWatch={handleToggleWatch}
				onRunScan={runScan}
				onOpenSettings={() => setIsSettingsOpen(true)}
				lastScanTime={lastScanTime}
				hasApiKey={hasApiKey}
				hasProjects={hasProjects}
			/>

			<main className="flex-1 overflow-hidden min-h-0">
				<div className="px-6 py-6 h-full flex flex-col gap-6 min-h-0">
					{!hasApiKey && (
						<div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 flex items-center gap-3">
							<AlertCircle className="w-6 h-6 text-yellow-600 shrink-0" />
							<div className="flex-1">
								<h3 className="font-semibold text-yellow-900">⚠️ Gemini API Key Required</h3>
								<p className="text-sm text-yellow-800 mt-1">
									Please configure your Gemini API Key in Settings to start security analysis
								</p>
							</div>
							<button
								onClick={() => setIsSettingsOpen(true)}
								className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md font-medium transition-colors"
							>
								Open Settings
							</button>
						</div>
					)}

					<StatsCards
						criticalCount={scanResult?.critical.length || 0}
						warningCount={scanResult?.warning.length || 0}
						depsCount={scanResult?.dependencies.length || 0}
					/>

					<ProjectSelector
						projects={projects}
						activeProjectId={activeProjectId}
						onSelectProject={setActiveProject}
						onAddProject={() => setIsAddModalOpen(true)}
						onManageProjects={() => setIsManageModalOpen(true)}
					/>

					<IssuesList issues={issuesWithType} dependencies={scanResult?.dependencies || []} />
				</div>
			</main>

			<SettingsModal
				isOpen={isSettingsOpen}
				onClose={() => setIsSettingsOpen(false)}
				onSave={saveApiKey}
				onDeleteApiKey={deleteApiKey}
				currentApiKey={apiKey}
				notificationsEnabled={notificationsEnabled}
			/>

			<AddProjectModal
				isOpen={isAddModalOpen}
				onClose={() => setIsAddModalOpen(false)}
				onSave={handleAddProject}
			/>

			<ManageProjectsModal
				isOpen={isManageModalOpen}
				projects={projects}
				activeProjectId={activeProjectId}
				onClose={() => setIsManageModalOpen(false)}
				onDelete={handleDeleteProject}
				onToggleWatch={toggleProjectWatch}
			/>
		</div>
	);
};
