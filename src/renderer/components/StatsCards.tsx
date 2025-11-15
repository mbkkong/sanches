import React from 'react';
import { AlertTriangle, AlertCircle, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface StatsCardsProps {
	criticalCount: number;
	warningCount: number;
	dependenciesCount?: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
	criticalCount,
	warningCount,
	dependenciesCount = 0,
}) => {
	return (
		<div className="grid grid-cols-3 gap-3 animate-fade-in">
			<Card className="border-red-200 bg-gradient-to-br from-red-50 to-white hover:shadow-lg hover:border-red-300 transition-all hover:-translate-y-1">
				<CardHeader className="pb-1.5 p-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-[11px] font-medium flex items-center gap-1.5 text-slate-900">
							<div className="p-1 rounded-md bg-red-100 border border-red-200">
								<AlertCircle className="w-3.5 h-3.5 text-red-600" />
							</div>
							<span>Critical Issues</span>
						</CardTitle>
						{criticalCount > 0 ? (
							<Badge className="text-[10px] font-semibold bg-red-100 text-red-700 border-red-200 px-1.5 py-0">
								High
							</Badge>
						) : (
							<Badge className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 border-emerald-200 px-1.5 py-0">
								Clear
							</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent className="p-3 pt-0">
					<div className="flex items-baseline gap-1.5">
						<div className="text-2xl font-bold text-red-600">{criticalCount}</div>
						<span className="text-[10px] text-slate-600 font-medium">found</span>
					</div>
				</CardContent>
			</Card>

			<Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white hover:shadow-lg hover:border-amber-300 transition-all hover:-translate-y-1">
				<CardHeader className="pb-1.5 p-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-[11px] font-medium flex items-center gap-1.5 text-slate-900">
							<div className="p-1 rounded-md bg-amber-100 border border-amber-200">
								<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
							</div>
							<span>Warnings</span>
						</CardTitle>
						{warningCount > 0 ? (
							<Badge className="text-[10px] font-semibold bg-amber-100 text-amber-700 border-amber-200 px-1.5 py-0">
								Medium
							</Badge>
						) : (
							<Badge className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 border-emerald-200 px-1.5 py-0">
								Clear
							</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent className="p-3 pt-0">
					<div className="flex items-baseline gap-1.5">
						<div className="text-2xl font-bold text-amber-600">{warningCount}</div>
						<span className="text-[10px] text-slate-600 font-medium">found</span>
					</div>
				</CardContent>
			</Card>

			<Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-lg hover:border-blue-300 transition-all hover:-translate-y-1">
				<CardHeader className="pb-1.5 p-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-[11px] font-medium flex items-center gap-1.5 text-slate-900">
							<div className="p-1 rounded-md bg-blue-100 border border-blue-200">
								<Package className="w-3.5 h-3.5 text-blue-600" />
							</div>
							<span>Dependencies</span>
						</CardTitle>
						{dependenciesCount > 0 ? (
							<Badge className="text-[10px] font-semibold bg-blue-100 text-blue-700 border-blue-200 px-1.5 py-0">
								Info
							</Badge>
						) : (
							<Badge className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 border-emerald-200 px-1.5 py-0">
								Clear
							</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent className="p-3 pt-0">
					<div className="flex items-baseline gap-1.5">
						<div className="text-2xl font-bold text-blue-600">{dependenciesCount}</div>
						<span className="text-[10px] text-slate-600 font-medium">found</span>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
