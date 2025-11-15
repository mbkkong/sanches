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

						<div className="flex items-center gap-3">
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

							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										onClick={onRunScan}
										size="lg"
										disabled={!canStartAnalysis}
										className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all h-11 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<Zap className="w-5 h-5 mr-2" />
										Start Analysis
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>
										{!hasApiKey
											? 'API key required'
											: !hasProjects
											? 'Add a project first'
											: 'Start security analysis'}
									</p>
								</TooltipContent>
							</Tooltip>
						</div>
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

					<div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white border-2 border-slate-300 shadow-sm hover:border-slate-400 transition-all">
						<label htmlFor="global-watch" className="text-sm font-semibold cursor-pointer text-slate-900 select-none">
							Watch Mode
						</label>
						<Switch
							checked={globalWatchEnabled}
							onCheckedChange={onToggleWatch}
							id="global-watch"
							aria-label="Toggle watch mode"
						/>
					</div>
				</div>
				</div>
			</header>
		</TooltipProvider>
	);
};
