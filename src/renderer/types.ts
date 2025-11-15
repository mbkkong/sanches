export interface Project {
	id: string;
	name: string;
	path: string;
	watchEnabled: boolean;
}

export interface ScanResult {
	directory: string;
	critical: SecurityIssue[];
	warning: SecurityIssue[];
	dependencies: DependencyIssue[];
}

export interface SecurityIssue {
	file_name?: string;
	file: string;
	description: string;
}

export interface DependencyIssue {
	package_type: string;
	package: string;
	description: string;
}

export type IssueType = 'critical' | 'warning' | 'dependencies';

export interface IssueWithType extends SecurityIssue {
	type: IssueType;
}

