import React from 'react';
import { Clock, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ScanningLoader } from './ScanningLoader';
import logo from '../../../assets/sanches.png';

interface HeaderProps {
	globalWatchEnabled: boolean;
	onToggleWatch: () => void;
	onRunScan: () => void;
	onOpenSettings: () => void;
	lastScanTime: string;
	hasApiKey: boolean;
	hasProjects: boolean;
	isScanning?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
	globalWatchEnabled,
	onToggleWatch,
	onOpenSettings,
	lastScanTime,
	isScanning = false,
}) => {
	return (
		<TooltipProvider>
			<header className="border-b border-slate-200 bg-white shadow-sm">
				<div className="px-6 py-5">
					<div className="flex items-center justify-between mb-5">
						<div className="flex items-center gap-4">
							<div className="flex items-center justify-center w-14 h-14">
								<img src={logo} alt="Sanches Logo" className="w-14 h-14 object-contain" />
							</div>
							<div>
								<h1 className="text-2xl font-bold text-slate-900">
									Sanches
								</h1>
								<p className="text-sm text-slate-600 font-medium">Security Monitor</p>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<ScanningLoader isVisible={isScanning} />
							
							<Tooltip>
								<TooltipTrigger asChild>
									<div className={`flex items-center gap-3 px-4 py-2 rounded-lg border-2 shadow-sm transition-all ${
										globalWatchEnabled 
											? 'bg-emerald-50 border-emerald-300 hover:border-emerald-400' 
											: 'bg-red-50 border-red-300 hover:border-red-400'
									}`}>
										<label htmlFor="global-watch" className={`text-sm font-semibold cursor-pointer select-none ${
											globalWatchEnabled ? 'text-emerald-700' : 'text-red-700'
										}`}>
											Watch Mode
										</label>
										<Switch
											checked={globalWatchEnabled}
											onCheckedChange={onToggleWatch}
											id="global-watch"
											aria-label="Toggle watch mode"
										/>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>{globalWatchEnabled ? 'Disable watch mode' : 'Enable watch mode'}</p>
								</TooltipContent>
							</Tooltip>

							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										onClick={onOpenSettings}
										size="lg"
										variant="outline"
										className="h-11 px-4 border-2"
									>
										<Settings className="w-5 h-5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Settings</p>
								</TooltipContent>
							</Tooltip>
						</div>
					</div>

					<Separator className="mb-4" />

					<div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
						<Clock className="w-4 h-4 text-slate-500" />
						<span>Last scan: {lastScanTime}</span>
					</div>
				</div>
			</header>
		</TooltipProvider>
	);
};
