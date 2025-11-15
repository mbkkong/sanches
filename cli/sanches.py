#!/usr/bin/env python3

"""
Sanches - A coding assist tool that reads files and sends them to Gemini API
"""
import argparse
import json
import os
import pathlib
from typing import Dict, Optional, List, Any
import pathspec
from google import genai
from dependency_checker import check_dependencies
# from google.genai import types


class Sanches:
    def __init__(self, api_key: str):
        # genai.configure(api_key=api_key)
        # self.model = genai.GenerativeModel('gemini-pro')
        self.client = genai.Client(api_key=api_key)

    def read_files(self, path: str) -> Dict[str, str]:
        """Read all files in the given path and return their contents"""
        files_content = {}
        path_obj = pathlib.Path(path)

        if not path_obj.exists():
            raise FileNotFoundError(f"Path {path} does not exist")

        # Common package dependency directories to ignore
        dependency_dirs = {
            'node_modules', '.venv', 'venv', 'env', '.env',
            '__pycache__', '.pytest_cache', '.mypy_cache',
            'dist', 'build', '.egg-info', '.eggs',
            '.tox', 'htmlcov', '.coverage',
            '.next', '.nuxt', 'out', '.vercel',
            'vendor', '.bundle', 'Pods', '.cocoapods',
            'target', 'bin', 'obj',
        }

        # TODO: get Claude to also explicitly ignore .env files

        # Load .gitignore patterns if it exists
        spec = None
        gitignore_path = path_obj / '.gitignore' if path_obj.is_dir() else path_obj.parent / '.gitignore'
        if gitignore_path.exists():
            with open(gitignore_path, 'r', encoding='utf-8') as f:
                patterns = f.read().splitlines()
            spec = pathspec.PathSpec.from_lines('gitwildmatch', patterns)

        def should_ignore(file_path: pathlib.Path) -> bool:
            """Check if file should be ignored based on .gitignore rules or dependency directories"""
            # Check if any part of the path is a known dependency directory
            for part in file_path.parts:
                if part in dependency_dirs:
                    return True

            if spec is None:
                return False
            # Get relative path from the root directory containing .gitignore
            try:
                rel_path = file_path.relative_to(path_obj if path_obj.is_dir() else path_obj.parent)
                return spec.match_file(str(rel_path))
            except ValueError:
                return False

        if path_obj.is_file():
            with open(path_obj, 'r', encoding='utf-8') as f:
                files_content[str(path_obj)] = f.read()
        else:
            for file_path in path_obj.rglob('*'):
                if file_path.is_file() and not should_ignore(file_path):
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            files_content[str(file_path)] = f.read()
                    except (UnicodeDecodeError, PermissionError):
                        files_content[str(file_path)] = "[Binary file or permission denied]"

        return files_content

    def send_to_gemini(self, files_content: Dict[str, str]) -> Optional[str]:
        """Send file contents to Gemini and get JSON response"""
        
        # Define the JSON schema for structured output
        response_schema = {
            "type": "object",
            "properties": {
                "directory": {
                    "type": "string",
                    "description": "The project root path"
                },
                "critical": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "file_name": {"type": "string"},
                            "file_path": {"type": "string"},
                            "description": {"type": "string"}
                        },
                        "required": ["file_name", "file_path", "description"]
                    }
                },
                "warning": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "file_name": {"type": "string"},
                            "file_path": {"type": "string"},
                            "description": {"type": "string"}
                        },
                        "required": ["file_name", "file_path", "description"]
                    }
                },
                "suggestion": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "file_name": {"type": "string"},
                            "file_path": {"type": "string"},
                            "description": {"type": "string"}
                        },
                        "required": ["file_name", "file_path", "description"]
                    }
                }
            },
            "required": ["directory", "critical", "warning", "suggestion"]
        }
        
        prompt = f"""
        You are an experienced application security engineer and static analysis expert.

        Your task:
        Analyse a set of source code files and configuration files located under a given directory (the "project root") and identify security vulnerabilities and risks.

        You MUST:
        - Act as a senior cybersecurity specialist with deep knowledge of OWASP, secure coding, and common vulnerability patterns.
        - Perform static analysis ONLY on the content provided in this request. Do not invent files or paths that are not given.
        - Return results STRICTLY in the JSON format described below and NOTHING ELSE (no prose before or after, no comments, no trailing commas).

        -----------------------------
        SCOPE OF ANALYSIS
        -----------------------------
        Consider the following as in-scope when present in the provided files:

        - Security vulnerabilities and weaknesses, including but not limited to:
        - Injection issues (SQL injection, command injection, LDAP injection, etc.)
        - Cross-Site Scripting (XSS), CSRF, open redirects
        - Authentication and authorization problems (broken auth, missing checks)
        - Insecure direct object references
        - Insecure cryptography usage, hardcoded keys, insecure random
        - Insecure deserialization
        - Insecure file handling, path traversal, unsafe temp files
        - SSRF and unsafe network calls
        - Insecure logging of secrets or sensitive data
        - Race conditions and TOCTOU vulnerabilities when relevant

        - Secrets / credentials / sensitive info:
        - Hardcoded API keys, tokens, passwords, private keys, certificates
        - Database connection strings with credentials
        - Cloud provider keys (AWS, GCP, Azure, etc.)
        - Anything that appears to be a secret, even if you are not 100% sure (mark appropriately in severity)

        - Dependency issues:
        - Known vulnerable or obviously outdated packages (if version information is present)
        - Clearly insecure or deprecated libraries and frameworks
        - Suspicious dependencies that are commonly used for malicious purposes

        - Configuration issues:
        - Insecure defaults in config files (YAML, JSON, .env, etc.)
        - Debug mode enabled in production-like configs
        - Wide-open CORS, overly permissive firewall or access rules
        - Missing or insecure HTTPS / TLS configurations
        - Logging of sensitive data, or overly verbose logging

        You may see code in multiple languages (e.g. Python, JavaScript/TypeScript, Node.js, Java, Go, C/C++, shell scripts, Dockerfiles, Terraform, etc.). Analyse each file according to best practices for that language and typical security issues.

        Skip analysis of:
        - Binary files or obviously non-code assets (images, videos, fonts).
        - Large minified bundles where no meaningful static security assessment is possible (unless patterns are clearly evident).

        -----------------------------
        SEVERITY LEVELS
        -----------------------------
        You MUST classify each issue into exactly ONE of the following categories:

        1. "critical"
        Use this for issues that:
        - Are highly likely to be exploited OR
        - Directly expose secrets, credentials, or private keys OR
        - Lead to severe impact (remote code execution, data exfiltration, complete account takeover, etc.)
        Examples:
        - Hardcoded production API keys or passwords
        - Unsanitized user input directly used in SQL queries or system commands
        - Publicly exposed admin endpoints without auth
        - Storing passwords in plain text

        2. "warning"
        Use this for:
        - Medium risk vulnerabilities
        - Misconfigurations that could be exploitable under certain conditions
        - Questionable patterns that are not clearly catastrophic but are still unsafe
        Examples:
        - Weak or outdated cryptographic algorithms
        - Excessive permissions (e.g., S3 bucket world-readable)
        - Missing input validation or output encoding in non-critical paths

        3. "suggestion"
        Use this for:
        - Low risk issues
        - Code smells with potential security implications
        - Hardening or best-practice improvements
        Examples:
        - Improving error handling to avoid information leakage
        - Using parameterized queries when it is unclear if the current pattern is unsafe
        - Refactoring repeated security checks into a centralized helper
        - Logging hygiene suggestions, minor config tightening

        If you are unsure between levels, choose the LOWER severity (e.g., prefer "warning" over "critical", "suggestion" over "warning") and clearly explain your reasoning in the description.

        -----------------------------
        APPROACH & STYLE
        -----------------------------
        For each issue you report:
        - Point directly to the specific file where the issue appears via "file_name" and "file_path".
        - In "description":
        - Be specific about what is wrong and why it is risky.
        - Avoid unnecessary verbosity; one to three clear sentences is ideal.
        - Optionally mention known vulnerability classes or standards (e.g., "Potential SQL injection (OWASP A03:2021)").

        If you find multiple distinct vulnerabilities in the same file, create separate entries (even with the same file_path) so they are individually trackable.

        Now read the provided files and return ONLY the JSON report in the described format.



        The below code files are one project.

        Files:
        {json.dumps(files_content, indent=2)}
        """

        # response = self.model.generate_content(prompt)
        response = self.client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': response_schema
            }
        )
        return response.text

    def check_dependencies(self, path: str) -> List[Dict[str, Any]]:
        """Check dependencies for vulnerabilities using dependency_checker"""
        try:
            vulnerabilities = check_dependencies(path)
            
            # Format vulnerabilities into the expected output format
            formatted_deps = []
            for vuln in vulnerabilities:
                formatted_deps.append({
                    'package_type': vuln.get('package_manager', 'unknown'),
                    'package': vuln.get('package_name', 'unknown'),
                    'description': f"{vuln.get('cve_id', 'Unknown CVE')}: {vuln.get('description', 'No description')} (Severity: {vuln.get('severity', 'Unknown')}, CVSS: {vuln.get('cvss_score', 'N/A')})"
                })
            
            return formatted_deps
        except Exception as e:
            print(f"Warning: Error checking dependencies: {e}", flush=True)
            return []

    def process(self, path: str) -> Optional[str]:
        """Main processing function"""
        files_content = self.read_files(path)
        response = self.send_to_gemini(files_content)
        
        # Parse the Gemini response
        try:
            gemini_result = json.loads(response) if response else {}
        except json.JSONDecodeError:
            gemini_result = {}
        
        # Check dependencies using dependency_checker
        dependencies = self.check_dependencies(path)
        
        # Merge results
        final_result = {
            'directory': gemini_result.get('directory', path),
            'critical': gemini_result.get('critical', []),
            'warning': gemini_result.get('warning', []),
            'dependencies': dependencies  # Always include dependencies (empty array if none found)
        }
        
        return json.dumps(final_result)


def main():
    parser = argparse.ArgumentParser(description='Sanches - Coding assist tool')
    parser.add_argument('--dir', required=True, help='Path to file or directory to analyze')
    parser.add_argument('--api-key', help='Gemini API key (or set GEMINI_API_KEY env var)')

    args = parser.parse_args()

    api_key = args.api_key or os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("Error: Please provide API key via --api-key or GEMINI_API_KEY environment variable")
        return 1

    try:
        sanches = Sanches(api_key)
        result = sanches.process(args.dir)
        print(result)
        return 0
    except Exception as e:
        print(f"Error: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
