import React, { useState, useEffect } from 'react';
import { Settings, Key } from 'lucide-react';
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

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (apiKey: string) => Promise<void>;
	currentApiKey?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
	isOpen,
	onClose,
	onSave,
	currentApiKey,
}) => {
	const [apiKey, setApiKey] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (isOpen) {
			setApiKey(currentApiKey || '');
			setError('');
		}
	}, [isOpen, currentApiKey]);

	const handleSave = async () => {
		if (!apiKey.trim()) {
			setError('API key is required');
			return;
		}

		setIsLoading(true);
		setError('');
		try {
			await onSave(apiKey.trim());
			onClose();
		} catch (err) {
			setError('Failed to save API key');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[550px] bg-white border-2 border-slate-300 shadow-2xl">
				<DialogHeader>
					<div className="flex items-center gap-3 mb-2">
						<div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
							<Settings className="w-6 h-6 text-white" />
						</div>
						<DialogTitle className="text-2xl font-bold text-slate-900">Settings</DialogTitle>
					</div>
					<DialogDescription className="text-base text-slate-600">
						Configure your Gemini API Key to enable security analysis
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-3 p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
						<div className="flex items-center gap-2 mb-2">
							<Key className="w-4 h-4 text-slate-700" />
							<label htmlFor="api-key" className="text-sm font-semibold text-slate-900">
								Gemini API Key
							</label>
						</div>
						<Input
							id="api-key"
							type="password"
							placeholder="Enter your Gemini API key"
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
							className={`bg-white border-2 text-slate-900 placeholder:text-slate-400 ${
								error ? 'border-red-500 focus:border-red-600' : 'border-slate-300 focus:border-blue-500'
							}`}
						/>
						{error && (
							<div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
								<p className="text-sm font-medium text-red-700">{error}</p>
							</div>
						)}
						<div className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded">
							<svg className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
							</svg>
							<p className="text-xs font-medium text-blue-700">
								Your API key is stored securely on your device and never shared
							</p>
						</div>
					</div>
				</div>

				<DialogFooter className="gap-2">
					<Button 
						variant="outline" 
						onClick={onClose} 
						disabled={isLoading}
						className="bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 font-medium"
					>
						Cancel
					</Button>
					<Button 
						onClick={handleSave} 
						disabled={isLoading}
						className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg border-0"
					>
						{isLoading ? 'Saving...' : 'Save Settings'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

