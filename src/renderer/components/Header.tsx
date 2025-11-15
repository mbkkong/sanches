import React from 'react';
import { Shield, PlayCircle, Activity, Clock, Settings, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface HeaderProps {
	globalWatchEnabled: boolean;
	onToggleWatch: () => void;
	onRunScan: () => void;
	onOpenSettings: () => void;
	lastScanTime: string;
	hasApiKey: boolean;
	hasProjects: boolean;
}

export const Header: React.FC<HeaderProps> = ({
	globalWatchEnabled,
	onToggleWatch,
	onRunScan,
	onOpenSettings,
	lastScanTime,
	hasApiKey,
	hasProjects,
}) => {
	const canStartAnalysis = hasApiKey && hasProjects;
	return (
		<TooltipProvider>
			<header className="border-b border-slate-200 bg-white shadow-sm">
				<div className="px-6 py-5">
					<div className="flex items-center justify-between mb-5">
						<div className="flex items-center gap-4">
							<div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/90 shadow-lg shadow-primary/20">
								<Shield className="w-8 h-8 text-white" />
							</div>
							<div>
								<h1 className="text-2xl font-bold text-slate-900">
									Sanches
								</h1>
								<p className="text-sm text-slate-600 font-medium">Security Monitor</p>
							</div>
						</div>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									onClick={onRunScan}
									size="lg"
									className="bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all h-11 px-6"
								>
									<PlayCircle className="w-5 h-5 mr-2" />
									Run Scan
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Start a security scan</p>
							</TooltipContent>
						</Tooltip>
					</div>

					<Separator className="mb-4" />

					<div className="flex items-center gap-4 flex-wrap">
						<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
							<Activity
								className={`w-5 h-5 ${globalWatchEnabled ? 'text-emerald-600 animate-pulse-slow' : 'text-red-600'}`}
							/>
							<Badge
								className={
									globalWatchEnabled
										? 'bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold'
										: 'bg-red-100 text-red-700 border-red-200 font-semibold'
								}
							>
								{globalWatchEnabled ? 'Active' : 'Stopped'}
							</Badge>
						</div>

						<Separator orientation="vertical" className="h-6" />

						<div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
							<Clock className="w-4 h-4 text-slate-500" />
							<span>Last scan: {lastScanTime}</span>
						</div>

						<Separator orientation="vertical" className="h-6" />

						<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
							<Switch
								checked={globalWatchEnabled}
								onCheckedChange={onToggleWatch}
								id="global-watch"
							/>
							<label htmlFor="global-watch" className="text-sm font-medium cursor-pointer text-slate-700">
								Watch Mode
							</label>
						</div>
					</div>
				</div>
			</header>
		</TooltipProvider>
	);
};
