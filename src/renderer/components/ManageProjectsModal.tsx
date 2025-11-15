import React from 'react';
import { Trash2, FolderOpen, Settings as SettingsIcon, Eye, EyeOff } from 'lucide-react';
import type { Project } from '../types';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface ManageProjectsModalProps {
	isOpen: boolean;
	projects: Project[];
	activeProjectId?: string;
	onClose: () => void;
	onDelete: (projectId: string) => void;
	onToggleWatch: (projectId: string, enabled: boolean) => void;
}

export const ManageProjectsModal: React.FC<ManageProjectsModalProps> = ({
	isOpen,
	projects,
	activeProjectId,
	onClose,
	onDelete,
	onToggleWatch,
}) => {
	const handleDelete = (projectId: string, projectName: string) => {
		if (confirm(`Are you sure you want to delete "${projectName}"?`)) {
			onDelete(projectId);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl bg-white">
				<DialogHeader>
					<div className="flex items-center gap-3 mb-2">
						<div className="p-2.5 rounded-xl bg-violet-100 border border-violet-200">
							<SettingsIcon className="w-6 h-6 text-violet-600" />
						</div>
						<div>
							<DialogTitle className="text-xl font-bold text-slate-900">Manage Projects</DialogTitle>
						</div>
					</div>
					<DialogDescription className="text-slate-600">
						Configure your projects, enable/disable watching, and remove projects you no longer need.
					</DialogDescription>
				</DialogHeader>

				<Separator className="my-4" />

				<ScrollArea className="max-h-[450px] pr-4">
					{projects.length === 0 ? (
						<div className="text-center py-16">
							<div className="inline-flex p-5 rounded-full bg-slate-100 mb-4 border border-slate-200">
								<FolderOpen className="w-14 h-14 text-slate-400" />
							</div>
							<p className="text-slate-900 font-semibold text-lg mb-1">No projects yet</p>
							<p className="text-sm text-slate-600">Add a project to get started</p>
						</div>
					) : (
						<TooltipProvider>
							<div className="space-y-3 py-2">
								{projects.map((project, index) => (
									<Card
										key={project.id}
										className={`
											transition-all hover:shadow-md shadow-sm cursor-default
											${project.id === activeProjectId ? 'border-violet-300 bg-violet-50/50' : 'border-slate-200'}
											animate-slide-in
										`}
										style={{ animationDelay: `${index * 50}ms` }}
									>
										<CardContent className="p-5">
											<div className="flex items-start justify-between gap-4">
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2 mb-3 flex-wrap">
														<div className="flex items-center gap-2">
															<div className="p-1.5 rounded-lg bg-violet-100 border border-violet-200">
																<FolderOpen className="w-4 h-4 text-violet-600" />
															</div>
															<h3 className="font-bold text-base text-slate-900">{project.name}</h3>
														</div>
														{project.id === activeProjectId && (
															<Badge className="text-xs bg-violet-100 text-violet-700 border-violet-200 font-semibold">
																Active
															</Badge>
														)}
														{project.watchEnabled && (
															<Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold">
																Watching
															</Badge>
														)}
													</div>
													<div className="mb-4 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
														<p className="text-sm text-slate-700 font-mono truncate" title={project.path}>
															{project.path}
														</p>
													</div>
													<div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
														{project.watchEnabled ? (
															<Eye className="w-5 h-5 text-emerald-600" />
														) : (
															<EyeOff className="w-5 h-5 text-slate-400" />
														)}
														<Switch
															id={`watch-${project.id}`}
															checked={project.watchEnabled}
															onCheckedChange={(checked) => onToggleWatch(project.id, checked)}
															className="cursor-pointer"
														/>
														<label
															htmlFor={`watch-${project.id}`}
															className="text-sm font-semibold cursor-pointer text-slate-900 select-none"
														>
															Watch Mode
														</label>
														<span className="text-xs text-slate-500 ml-auto">
															{project.watchEnabled ? 'Active monitoring' : 'Paused'}
														</span>
													</div>
												</div>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant="destructive"
															size="icon"
															onClick={() => handleDelete(project.id, project.name)}
														>
															<Trash2 className="w-4 h-4" />
														</Button>
													</TooltipTrigger>
													<TooltipContent>
														<p>Delete project</p>
													</TooltipContent>
												</Tooltip>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</TooltipProvider>
					)}
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
};
