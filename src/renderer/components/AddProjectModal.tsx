import React, { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { FolderPlus, Check, X, AlertTriangle } from 'lucide-react';
import { Separator } from './ui/separator';

interface AddProjectModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (path: string) => void;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ isOpen, onClose, onSave }) => {
	const [projectPath, setProjectPath] = useState('');
	const [error, setError] = useState('');

	const handleSave = () => {
		if (!projectPath.trim()) {
			setError('Please enter a project path');
			return;
		}
		onSave(projectPath.trim());
		setProjectPath('');
		setError('');
		onClose();
	};

	const handleCancel = () => {
		setProjectPath('');
		setError('');
		onClose();
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			handleCancel();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSave();
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md bg-white">
				<DialogHeader>
					<div className="flex items-center gap-3 mb-2">
						<div className="p-2.5 rounded-xl bg-violet-100 border border-violet-200">
							<FolderPlus className="w-6 h-6 text-violet-600" />
						</div>
						<div>
							<DialogTitle className="text-xl font-bold text-slate-900">Add Project</DialogTitle>
						</div>
					</div>
					<DialogDescription className="text-slate-600">
						Enter the path to your project directory. The folder name will be used as the project name.
					</DialogDescription>
				</DialogHeader>

				<Separator className="my-4" />

				<div className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="project-path" className="text-sm font-semibold text-slate-900 flex items-center gap-2">
							Project Path
							<span className="text-red-600">*</span>
						</label>
						<Input
							id="project-path"
							value={projectPath}
							onChange={(e) => {
								setProjectPath(e.target.value);
								setError('');
							}}
							onKeyDown={handleKeyDown}
							placeholder="/path/to/project"
							className={`h-11 bg-white border-2 focus:border-violet-500 ${error ? 'border-red-300 focus:border-red-500' : 'border-slate-200'}`}
							autoFocus
						/>
						{error && (
							<div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
								<AlertTriangle className="w-4 h-4" />
								<p>{error}</p>
							</div>
						)}
						<p className="text-xs text-slate-500">Example: /Users/yourname/projects/my-app</p>
					</div>
				</div>

				<Separator className="my-4" />

				<DialogFooter className="gap-2 sm:gap-2">
					<Button variant="outline" onClick={handleCancel}>
						<X className="w-4 h-4" />
						Cancel
					</Button>
					<Button 
						onClick={handleSave} 
						variant="default"
					>
						<Check className="w-4 h-4" />
						Add Project
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
