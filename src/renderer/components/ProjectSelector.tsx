import React from 'react';
import { FolderOpen, Plus, Settings, FolderPlus } from 'lucide-react';
import type { Project } from '../types';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface ProjectSelectorProps {
	projects: Project[];
	activeProjectId?: string;
	onSelectProject: (projectId: string) => void;
	onAddProject: () => void;
	onManageProjects: () => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
	projects,
	activeProjectId,
	onSelectProject,
	onAddProject,
	onManageProjects,
}) => {
	// If no projects, show message directly instead of using Select
	if (projects.length === 0) {
		return (
			<TooltipProvider>
				<Card className="p-5 bg-gradient-to-br from-violet-50 to-white border-violet-200 border-dashed border-2 shadow-sm">
					<div className="flex items-center gap-4">
						<div className="p-3 rounded-xl bg-violet-100 border border-violet-200">
							<FolderPlus className="w-6 h-6 text-violet-600" />
						</div>
						<div className="flex-1">
							<p className="font-semibold text-base text-slate-900">No Projects Yet</p>
							<p className="text-sm text-slate-600">Get started by adding your first project</p>
						</div>
						<div className="flex gap-2">
							<Tooltip>
								<TooltipTrigger asChild>
									<Button 
										variant="default" 
										size="default"
										onClick={onAddProject}
									>
										<Plus className="w-4 h-4 mr-2" />
										Add Project
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Add new project</p>
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="outline" size="icon" onClick={onManageProjects}>
										<Settings className="w-4 h-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Manage projects</p>
								</TooltipContent>
							</Tooltip>
						</div>
					</div>
				</Card>
			</TooltipProvider>
		);
	}

	return (
		<TooltipProvider>
			<div className="flex items-center gap-2">
				<div className="p-2 rounded-lg bg-violet-100 border border-violet-200">
					<FolderOpen className="w-5 h-5 text-violet-600" />
				</div>
				<Select value={activeProjectId || undefined} onValueChange={onSelectProject}>
					<SelectTrigger className="flex-1 h-11 bg-white">
						<SelectValue placeholder="Select a project" />
					</SelectTrigger>
					<SelectContent>
						{projects.map((project) => (
							<SelectItem key={project.id} value={project.id} className="cursor-pointer">
								<div className="flex flex-col items-start">
									<span className="font-medium">{project.name}</span>
									<span className="text-xs text-slate-500">{project.path}</span>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant="outline" size="icon" onClick={onAddProject}>
							<Plus className="w-4 h-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Add new project</p>
					</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant="outline" size="icon" onClick={onManageProjects}>
							<Settings className="w-4 h-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Manage projects</p>
					</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	);
};
