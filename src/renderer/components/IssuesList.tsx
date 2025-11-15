import React, { useState, useMemo } from 'react';
import { AlertCircle, AlertTriangle, Copy, CheckCircle2, FileText, Sparkles, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { IssueType, IssueWithType } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Input } from './ui/input';

interface IssuesListProps {
	issues: IssueWithType[];
}

export const IssuesList: React.FC<IssuesListProps> = ({ issues }) => {
	const [filter, setFilter] = useState<'all' | IssueType>('all');
	const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
	const [promptCopied, setPromptCopied] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// Filter and search logic
	const { filteredIssues, totalItems } = useMemo(() => {
		// Filter by type
		let issues_filtered = issues.filter((issue) => filter === 'all' || issue.type === filter);

		// Search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			issues_filtered = issues_filtered.filter(
				(issue) =>
					issue.description?.toLowerCase().includes(query) ||
					issue.file?.toLowerCase().includes(query) ||
					issue.file_name?.toLowerCase().includes(query)
			);
		}

		return {
			filteredIssues: issues_filtered,
			totalItems: issues_filtered.length,
		};
	}, [issues, filter, searchQuery]);

	// Pagination logic
	const { paginatedIssues, totalPages, showPagination } = useMemo(() => {
		const total = filteredIssues.length;
		const totalPgs = Math.ceil(total / itemsPerPage);
		const showPag = total > itemsPerPage;

		if (!showPag) {
			return {
				paginatedIssues: filteredIssues,
				totalPages: 1,
				showPagination: false,
			};
		}

		const startIdx = (currentPage - 1) * itemsPerPage;
		const endIdx = startIdx + itemsPerPage;

		const pagIssues = filteredIssues.slice(startIdx, endIdx);

		return {
			paginatedIssues: pagIssues,
			totalPages: totalPgs,
			showPagination: true,
		};
	}, [filteredIssues, currentPage]);

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
				return <AlertCircle className="w-3.5 h-3.5 text-red-600" />;
			case 'warning':
				return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
			case 'dependencies':
				return <FileText className="w-3.5 h-3.5 text-blue-600" />;
		}
	};

	const criticalCount = issues.filter((i) => i.type === 'critical').length;
	const warningCount = issues.filter((i) => i.type === 'warning').length;
	const dependenciesCount = issues.filter((i) => i.type === 'dependencies').length;
	const hasRelevantIssues = criticalCount > 0 || warningCount > 0;

	return (
		<div className="flex-1 overflow-hidden flex flex-col animate-fade-in min-h-0">
			<Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="flex-1 flex flex-col min-h-0">
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-1.5">
						<h2 className="text-sm font-semibold text-slate-900">Issues</h2>
						{totalItems > 0 && (
							<Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-700 border-slate-200 px-1.5 py-0">
								{totalItems} {searchQuery ? 'found' : 'total'}
							</Badge>
						)}
					</div>
					<div className="flex items-center gap-2">
					{hasRelevantIssues && (
						<Button
							onClick={generateAIFixPrompt}
							size="default"
							variant="outline"
							className="border-2 border-purple-400 bg-gradient-to-r from-purple-200 to-pink-200 hover:from-purple-300 hover:to-pink-300 text-purple-900 font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 text-sm h-10 px-4"
						>
							{promptCopied ? (
								<>
									<CheckCircle2 className="w-4 h-4 mr-2" />
									Copied!
								</>
							) : (
								<>
									<Sparkles className="w-5 h-5 mr-2" />
									Generate AI Fix Prompt
								</>
							)}
						</Button>
					)}
						<TabsList className="bg-slate-100 p-0.5 border border-slate-200 h-8">
							<TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium text-[11px] px-2 py-1">
								All
							</TabsTrigger>
							<TabsTrigger value="critical" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium text-[11px] px-2 py-1">
								Critical {criticalCount > 0 && <Badge className="ml-1 text-[9px] bg-red-100 text-red-700 border-red-200 px-1 py-0">{criticalCount}</Badge>}
							</TabsTrigger>
							<TabsTrigger value="warning" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium text-[11px] px-2 py-1">
								Warnings {warningCount > 0 && <Badge className="ml-1 text-[9px] bg-amber-100 text-amber-700 border-amber-200 px-1 py-0">{warningCount}</Badge>}
							</TabsTrigger>
							<TabsTrigger value="dependencies" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium text-[11px] px-2 py-1">
								Dependencies {dependenciesCount > 0 && <Badge className="ml-1 text-[9px] bg-blue-100 text-blue-700 border-blue-200 px-1 py-0">{dependenciesCount}</Badge>}
							</TabsTrigger>
						</TabsList>
					</div>
				</div>

				{/* Search Bar */}
				<div className="mb-2">
					<div className="relative">
						<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
						<Input
							type="text"
							placeholder="Search issues by description or file name..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-8 bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400 h-8 text-xs"
						/>
					</div>
				</div>

				<Separator className="mb-2" />

				<TabsContent value={filter} className="flex-1 mt-0 flex flex-col min-h-0">
					<ScrollArea className="flex-1 pr-4 h-full">
						{paginatedIssues.length === 0 ? (
							<Card className="border-dashed border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
								<CardContent className="flex flex-col items-center justify-center py-10 p-4">
									<div className="relative mb-4">
										<div className="absolute inset-0 bg-emerald-200/40 blur-xl rounded-full" />
										<CheckCircle2 className="w-12 h-12 text-emerald-600 relative" />
										<Sparkles className="w-6 h-6 text-emerald-500 absolute -top-1 -right-1 animate-pulse" />
									</div>
									<h3 className="text-lg font-bold mb-1 text-slate-900">All Clear!</h3>
									<p className="text-slate-600 text-xs">
										No {filter === 'all' ? '' : filter} issues detected
									</p>
								</CardContent>
							</Card>
						) : (
							<div className="space-y-2 pb-2">
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
										<CardHeader className="pb-1.5 p-3">
											<div className="flex items-start gap-2">
												<div className={`p-1.5 rounded-lg border ${
													issue.type === 'critical' ? 'bg-red-100 border-red-200' :
													issue.type === 'warning' ? 'bg-amber-100 border-amber-200' :
													'bg-blue-100 border-blue-200'
												}`}>
													{getIssueIcon(issue.type)}
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-1.5 mb-1">
														<Badge 
															className={`text-[9px] font-semibold px-1.5 py-0 ${
																issue.type === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
																issue.type === 'warning' ? 'bg-amber-100 text-amber-700 border-amber-200' :
																'bg-blue-100 text-blue-700 border-blue-200'
															}`}
														>
															{issue.type.toUpperCase()}
														</Badge>
													</div>
													<CardTitle className="text-xs font-medium break-words leading-snug text-slate-900">
														{issue.description || 'No description'}
													</CardTitle>
												</div>
											</div>
										</CardHeader>
										<CardContent className="pt-0 p-3">
											<div className="flex items-center gap-1.5 p-1.5 rounded-md bg-slate-50 border border-slate-200">
												<FileText className="w-3 h-3 shrink-0 text-slate-500" />
												<span className="truncate flex-1 text-[11px] text-slate-700 font-mono" title={issue.file}>
													{formatFilePath(issue.file || 'Unknown file')}
												</span>
												<Button
													variant="ghost"
													size="icon"
													className="h-6 w-6 hover:bg-slate-100"
													onClick={() => copyToClipboard(issue.file || '', `issue-${idx}`)}
													title="Copy file path"
												>
													{copiedIndex === `issue-${idx}` ? (
														<CheckCircle2 className="w-3 h-3 text-emerald-600" />
													) : (
														<Copy className="w-3 h-3" />
													)}
												</Button>
											</div>
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
