import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Package, Copy, CheckCircle2, FileText, Sparkles } from 'lucide-react';
import type { IssueType, IssueWithType, DependencyIssue } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

interface IssuesListProps {
	issues: IssueWithType[];
	dependencies: DependencyIssue[];
}

export const IssuesList: React.FC<IssuesListProps> = ({ issues, dependencies }) => {
	const [filter, setFilter] = useState<'all' | IssueType>('all');
	const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
	const [promptCopied, setPromptCopied] = useState(false);

	const filteredIssues = issues.filter((issue) => filter === 'all' || issue.type === filter);
	const filteredDeps = filter === 'all' || filter === 'dependencies' ? dependencies : [];

	const copyToClipboard = (text: string, index: string) => {
		navigator.clipboard.writeText(text).then(() => {
			setCopiedIndex(index);
			setTimeout(() => setCopiedIndex(null), 1500);
		});
	};

	const generateAIFixPrompt = () => {
		// Group issues by file
		const issuesByFile = new Map<string, IssueWithType[]>();
		
		// Only include critical and warning issues (not dependencies)
		const relevantIssues = issues.filter(i => i.type === 'critical' || i.type === 'warning');
		
		relevantIssues.forEach(issue => {
			const file = issue.file || 'Unknown file';
			if (!issuesByFile.has(file)) {
				issuesByFile.set(file, []);
			}
			issuesByFile.get(file)?.push(issue);
		});

		// Generate the prompt
		let prompt = 'Please fix the following security issues:\n\n';
		
		issuesByFile.forEach((fileIssues, file) => {
			prompt += `Fix security issues in ${file}:\n`;
			fileIssues.forEach((issue, idx) => {
				prompt += `${idx + 1}. [${issue.type.toUpperCase()}] ${issue.description}\n`;
			});
			prompt += '\n';
		});

		// Copy to clipboard
		navigator.clipboard.writeText(prompt).then(() => {
			setPromptCopied(true);
			setTimeout(() => setPromptCopied(false), 2000);
		});
	};

	const formatFilePath = (filepath: string) => {
		const parts = filepath.split('/');
		if (parts.length > 4) {
			return '.../' + parts.slice(-3).join('/');
		}
		return filepath;
	};

	const getIssueIcon = (type: IssueType) => {
		switch (type) {
			case 'critical':
				return <AlertCircle className="w-5 h-5 text-red-600" />;
			case 'warning':
				return <AlertTriangle className="w-5 h-5 text-amber-600" />;
			case 'dependencies':
				return <Package className="w-5 h-5 text-blue-600" />;
		}
	};

	const getIssueBadgeVariant = (type: IssueType) => {
		switch (type) {
			case 'critical':
				return 'destructive';
			case 'warning':
				return 'secondary';
			case 'dependencies':
				return 'default';
		}
	};

	const criticalCount = issues.filter((i) => i.type === 'critical').length;
	const warningCount = issues.filter((i) => i.type === 'warning').length;
	const depsCount = dependencies.length;
	const hasRelevantIssues = criticalCount > 0 || warningCount > 0;

	return (
		<div className="flex-1 overflow-hidden flex flex-col animate-fade-in">
			<Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="flex-1 flex flex-col">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<h2 className="text-lg font-semibold text-slate-900">Issues</h2>
						{(filteredIssues.length > 0 || filteredDeps.length > 0) && (
							<Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 border-slate-200">
								{filteredIssues.length + filteredDeps.length} total
							</Badge>
						)}
					</div>
					<div className="flex items-center gap-3">
						{hasRelevantIssues && (
							<Button
								onClick={generateAIFixPrompt}
								size="sm"
								variant="outline"
								className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-purple-700 font-medium shadow-sm"
							>
								{promptCopied ? (
									<>
										<CheckCircle2 className="w-4 h-4 mr-2" />
										Copied!
									</>
								) : (
									<>
										<Sparkles className="w-4 h-4 mr-2" />
										Generate AI Fix Prompt
									</>
								)}
							</Button>
						)}
						<TabsList className="bg-slate-100 p-1 border border-slate-200">
							<TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium">
								All
							</TabsTrigger>
							<TabsTrigger value="critical" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium">
								Critical {criticalCount > 0 && <Badge className="ml-2 text-xs bg-red-100 text-red-700 border-red-200">{criticalCount}</Badge>}
							</TabsTrigger>
							<TabsTrigger value="warning" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium">
								Warnings {warningCount > 0 && <Badge className="ml-2 text-xs bg-amber-100 text-amber-700 border-amber-200">{warningCount}</Badge>}
							</TabsTrigger>
							<TabsTrigger value="dependencies" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium">
								Deps {depsCount > 0 && <Badge className="ml-2 text-xs bg-blue-100 text-blue-700 border-blue-200">{depsCount}</Badge>}
							</TabsTrigger>
						</TabsList>
					</div>
				</div>

				<Separator className="mb-4" />

				<TabsContent value={filter} className="flex-1 mt-0">
					<ScrollArea className="h-full pr-4">
						{filteredIssues.length === 0 && filteredDeps.length === 0 ? (
							<Card className="border-dashed border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
								<CardContent className="flex flex-col items-center justify-center py-20">
									<div className="relative mb-6">
										<div className="absolute inset-0 bg-emerald-200/40 blur-2xl rounded-full" />
										<CheckCircle2 className="w-20 h-20 text-emerald-600 relative" />
										<Sparkles className="w-7 h-7 text-emerald-500 absolute -top-2 -right-2 animate-pulse" />
									</div>
									<h3 className="text-2xl font-bold mb-2 text-slate-900">All Clear!</h3>
									<p className="text-slate-600 text-base">
										No {filter === 'all' ? '' : filter} issues detected
									</p>
								</CardContent>
							</Card>
						) : (
							<div className="space-y-4 pb-4">
								{filteredIssues.map((issue, idx) => (
									<Card 
										key={idx} 
										className={`
											hover:shadow-lg transition-all shadow-sm
											border-l-4 
											${issue.type === 'critical' 
												? 'border-l-red-500 bg-gradient-to-r from-red-50 to-white border-red-200' 
												: issue.type === 'warning' 
												? 'border-l-amber-500 bg-gradient-to-r from-amber-50 to-white border-amber-200' 
												: 'border-l-blue-500 bg-gradient-to-r from-blue-50 to-white border-blue-200'}
											animate-slide-in
										`}
									>
										<CardHeader className="pb-3">
											<div className="flex items-start gap-3">
												<div className={`p-2.5 rounded-xl border ${
													issue.type === 'critical' ? 'bg-red-100 border-red-200' :
													issue.type === 'warning' ? 'bg-amber-100 border-amber-200' :
													'bg-blue-100 border-blue-200'
												}`}>
													{getIssueIcon(issue.type)}
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2 mb-2">
														<Badge 
															className={`text-xs font-semibold ${
																issue.type === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
																issue.type === 'warning' ? 'bg-amber-100 text-amber-700 border-amber-200' :
																'bg-blue-100 text-blue-700 border-blue-200'
															}`}
														>
															{issue.type.toUpperCase()}
														</Badge>
													</div>
													<CardTitle className="text-base font-medium break-words leading-snug text-slate-900">
														{issue.description || 'No description'}
													</CardTitle>
												</div>
											</div>
										</CardHeader>
										<CardContent className="pt-0">
											<div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
												<FileText className="w-4 h-4 shrink-0 text-slate-500" />
												<span className="truncate flex-1 text-sm text-slate-700 font-mono" title={issue.file}>
													{formatFilePath(issue.file || 'Unknown file')}
												</span>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 hover:bg-slate-100"
													onClick={() => copyToClipboard(issue.file || '', `issue-${idx}`)}
													title="Copy file path"
												>
													{copiedIndex === `issue-${idx}` ? (
														<CheckCircle2 className="w-4 h-4 text-emerald-600" />
													) : (
														<Copy className="w-4 h-4" />
													)}
												</Button>
											</div>
										</CardContent>
									</Card>
								))}
								{filteredDeps.map((dep, idx) => (
									<Card 
										key={`dep-${idx}`} 
										className="hover:shadow-lg transition-all shadow-sm border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white border-blue-200 animate-slide-in"
									>
										<CardHeader className="pb-3">
											<div className="flex items-start gap-3">
												<div className="p-2.5 rounded-xl bg-blue-100 border border-blue-200">
													{getIssueIcon('dependencies')}
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2 mb-2 flex-wrap">
														<Badge className="bg-blue-100 text-blue-700 border-blue-200 font-semibold">
															DEPENDENCY
														</Badge>
														<Badge variant="outline" className="text-xs border-slate-200 text-slate-600">
															{dep.package_type || 'N/A'}
														</Badge>
													</div>
													<CardTitle className="text-base font-semibold text-blue-700 break-words">
														{dep.package || 'Unknown Package'}
													</CardTitle>
												</div>
											</div>
										</CardHeader>
										<CardContent className="pt-0">
											<CardDescription className="break-words leading-relaxed text-slate-600">
												{dep.description || 'No description'}
											</CardDescription>
										</CardContent>
									</Card>
								))}
							</div>
						)}
					</ScrollArea>
				</TabsContent>
			</Tabs>
		</div>
	);
};
