import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
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
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<Settings className="w-5 h-5" />
						<DialogTitle>Settings</DialogTitle>
					</div>
					<DialogDescription>
						Configure your Gemini API Key to enable security analysis
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<label htmlFor="api-key" className="text-sm font-medium">
							Gemini API Key
						</label>
						<Input
							id="api-key"
							type="password"
							placeholder="Enter your Gemini API key"
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
							className={error ? 'border-destructive' : ''}
						/>
						{error && (
							<p className="text-sm text-destructive">{error}</p>
						)}
						<p className="text-xs text-muted-foreground">
							Your API key is stored securely and never shared
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isLoading}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={isLoading}>
						{isLoading ? 'Saving...' : 'Save'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

