import React, { useState, useMemo } from 'react';
import { AlertCircle, AlertTriangle, Package, Copy, CheckCircle2, FileText, Sparkles, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { IssueType, IssueWithType, DependencyIssue } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Input } from './ui/input';

interface IssuesListProps {
	issues: IssueWithType[];
	dependencies: DependencyIssue[];
}

export const IssuesList: React.FC<IssuesListProps> = ({ issues, dependencies }) => {
	const [filter, setFilter] = useState<'all' | IssueType>('all');
	const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
	const [promptCopied, setPromptCopied] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// Filter and search logic
	const { filteredIssues, filteredDeps, totalItems } = useMemo(() => {
		// Filter by type
		let issues_filtered = issues.filter((issue) => filter === 'all' || issue.type === filter);
		let deps_filtered = filter === 'all' || filter === 'dependencies' ? dependencies : [];

		// Search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			issues_filtered = issues_filtered.filter(
				(issue) =>
					issue.description?.toLowerCase().includes(query) ||
					issue.file?.toLowerCase().includes(query) ||
					issue.file_name?.toLowerCase().includes(query)
			);
			deps_filtered = deps_filtered.filter(
				(dep) =>
					dep.description?.toLowerCase().includes(query) ||
					dep.package?.toLowerCase().includes(query) ||
					dep.package_type?.toLowerCase().includes(query)
			);
		}

		return {
			filteredIssues: issues_filtered,
			filteredDeps: deps_filtered,
			totalItems: issues_filtered.length + deps_filtered.length,
		};
	}, [issues, dependencies, filter, searchQuery]);

	// Pagination logic
	const { paginatedIssues, paginatedDeps, totalPages, showPagination } = useMemo(() => {
		const total = filteredIssues.length + filteredDeps.length;
		const totalPgs = Math.ceil(total / itemsPerPage);
		const showPag = total > itemsPerPage;

		if (!showPag) {
			return {
				paginatedIssues: filteredIssues,
				paginatedDeps: filteredDeps,
				totalPages: 1,
				showPagination: false,
			};
		}

		const startIdx = (currentPage - 1) * itemsPerPage;
		const endIdx = startIdx + itemsPerPage;

		// Combine issues and deps for pagination
		const allItems = [...filteredIssues, ...filteredDeps];
		const paginatedItems = allItems.slice(startIdx, endIdx);

		// Split back into issues and deps
		const pagIssues = paginatedItems.filter((item) => 'type' in item) as IssueWithType[];
		const pagDeps = paginatedItems.filter((item) => 'package' in item) as DependencyIssue[];

		return {
			paginatedIssues: pagIssues,
			paginatedDeps: pagDeps,
			totalPages: totalPgs,
			showPagination: true,
		};
	}, [filteredIssues, filteredDeps, currentPage]);

	// Reset to page 1 when filter or search changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: Only reset on filter/search changes
	React.useEffect(() => {
		setCurrentPage(1);
	}, [filter, searchQuery]);

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

	const criticalCount = issues.filter((i) => i.type === 'critical').length;
	const warningCount = issues.filter((i) => i.type === 'warning').length;
	const depsCount = dependencies.length;
	const hasRelevantIssues = criticalCount > 0 || warningCount > 0;

	return (
		<div className="flex-1 overflow-hidden flex flex-col animate-fade-in min-h-0">
			<Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="flex-1 flex flex-col min-h-0">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<h2 className="text-lg font-semibold text-slate-900">Issues</h2>
						{totalItems > 0 && (
							<Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 border-slate-200">
								{totalItems} {searchQuery ? 'found' : 'total'}
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
										<Sparkles className="w-6 h-6 mr-2" />
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

				{/* Search Bar */}
				<div className="mb-4">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
						<Input
							type="text"
							placeholder="Search issues by description, file name, or package..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10 bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400"
						/>
					</div>
				</div>

				<Separator className="mb-4" />

				<TabsContent value={filter} className="flex-1 mt-0 flex flex-col min-h-0">
					<ScrollArea className="flex-1 pr-4 h-full">
						{paginatedIssues.length === 0 && paginatedDeps.length === 0 ? (
							<Card className="border-dashed border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
								<CardContent className="flex flex-col items-center justify-center py-20">
									<div className="relative mb-6">
										<div className="absolute inset-0 bg-emerald-200/40 blur-2xl rounded-full" />
										<CheckCircle2 className="w-20 h-20 text-emerald-600 relative" />
										<Sparkles className="w-10 h-10 text-emerald-500 absolute -top-2 -right-2 animate-pulse" />
									</div>
									<h3 className="text-2xl font-bold mb-2 text-slate-900">All Clear!</h3>
									<p className="text-slate-600 text-base">
										No {filter === 'all' ? '' : filter} issues detected
									</p>
								</CardContent>
							</Card>
						) : (
							<div className="space-y-4 pb-4">
								{paginatedIssues.map((issue, idx) => (
									<Card 
										key={`issue-${currentPage}-${idx}-${issue.file}`} 
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
								{paginatedDeps.map((dep, idx) => (
									<Card 
										key={`dep-${currentPage}-${idx}-${dep.package}`} 
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

					{/* Pagination Controls */}
					{showPagination && (
						<div className="mt-4 flex items-center justify-between border-t pt-4">
							<div className="text-sm text-slate-600">
								Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
								{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} issues
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
									disabled={currentPage === 1}
									className="border-slate-200"
								>
									<ChevronLeft className="w-4 h-4 mr-1" />
									Previous
								</Button>
								<div className="flex items-center gap-1">
									{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
										// Show first page, last page, current page, and pages around current
										const showPage =
											page === 1 ||
											page === totalPages ||
											(page >= currentPage - 1 && page <= currentPage + 1);
										
										if (!showPage && page === currentPage - 2) {
											return <span key={page} className="px-2 text-slate-400">...</span>;
										}
										if (!showPage && page === currentPage + 2) {
											return <span key={page} className="px-2 text-slate-400">...</span>;
										}
										if (!showPage) {
											return null;
										}

										return (
											<Button
												key={page}
												variant={currentPage === page ? 'default' : 'outline'}
												size="sm"
												onClick={() => setCurrentPage(page)}
												className={
													currentPage === page
														? 'bg-blue-600 hover:bg-blue-700 text-white'
														: 'border-slate-200'
												}
											>
												{page}
											</Button>
										);
									})}
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
									disabled={currentPage === totalPages}
									className="border-slate-200"
								>
									Next
									<ChevronRight className="w-4 h-4 ml-1" />
								</Button>
							</div>
						</div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
};
