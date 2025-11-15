import React from 'react';
import { Loader2 } from 'lucide-react';

interface ScanningLoaderProps {
	isVisible: boolean;
}

export const ScanningLoader: React.FC<ScanningLoaderProps> = ({ isVisible }) => {
	if (!isVisible) return null;

	return (
		<div className="flex items-center gap-2 animate-fade-in">
			<Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
			<span className="text-sm font-medium text-blue-600">Scanning...</span>
		</div>
	);
};

