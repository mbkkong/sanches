import json
import subprocess
import time
import re
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from urllib.parse import quote
try:
    import requests
except ImportError:
    requests = None


class DependencyChecker:
    def __init__(self):
        self.nvd_api_base = "https://services.nvd.nist.gov/rest/json/cves/2.0"
        self.request_delay = 0.6  # NVD API rate limit: max 5 requests per 30 seconds without API key

    def scan_directory(self, directory: str) -> List[Dict[str, Any]]:
        """
        Scan a directory for dependency vulnerabilities
        Returns a list of vulnerable dependencies with their descriptions
        """
        directory_path = Path(directory)
        vulnerabilities = []
        seen_vulnerabilities = set()  # Track unique vulnerabilities to avoid duplicates

        # Check for npm vulnerabilities using npm audit
        if (directory_path / "package.json").exists():
            npm_vulns = self._check_npm_vulnerabilities(directory_path)
            for vuln in npm_vulns:
                key = (vuln['package_type'], vuln['package'], vuln['description'])
                if key not in seen_vulnerabilities:
                    vulnerabilities.append(vuln)
                    seen_vulnerabilities.add(key)

        # Check for Python vulnerabilities using pip-audit/safety
        if (directory_path / "requirements.txt").exists():
            python_vulns = self._check_python_vulnerabilities(directory_path)
            for vuln in python_vulns:
                key = (vuln['package_type'], vuln['package'], vuln['description'])
                if key not in seen_vulnerabilities:
                    vulnerabilities.append(vuln)
                    seen_vulnerabilities.add(key)

        # Enhanced NVD checks - parse package files directly and query NVD
        if requests is not None:
            # Check npm packages via NVD
            if (directory_path / "package.json").exists():
                npm_packages = self._parse_package_json(directory_path / "package.json")
                if npm_packages:
                    nvd_npm_vulns = self._check_nvd_vulnerabilities(npm_packages, 'npm')
                    for vuln in nvd_npm_vulns:
                        key = (vuln['package_type'], vuln['package'], vuln['description'])
                        if key not in seen_vulnerabilities:
                            vulnerabilities.append(vuln)
                            seen_vulnerabilities.add(key)

            # Check Python packages via NVD
            if (directory_path / "requirements.txt").exists():
                python_packages = self._parse_requirements_txt(directory_path / "requirements.txt")
                if python_packages:
                    nvd_python_vulns = self._check_nvd_vulnerabilities(python_packages, 'pip')
                    for vuln in nvd_python_vulns:
                        key = (vuln['package_type'], vuln['package'], vuln['description'])
                        if key not in seen_vulnerabilities:
                            vulnerabilities.append(vuln)
                            seen_vulnerabilities.add(key)

        return vulnerabilities

    def _check_npm_vulnerabilities(self, directory: Path) -> List[Dict[str, Any]]:
        """Check npm packages for vulnerabilities using npm audit"""
        try:
            result = subprocess.run(
                ['npm', 'audit', '--json'],
                cwd=str(directory),
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.stdout:
                data = json.loads(result.stdout)
                vulnerabilities = []
                
                # Handle both npm v6 and v7+ formats
                if 'vulnerabilities' in data:
                    # npm v7+ format
                    for pkg_name, vuln_data in data['vulnerabilities'].items():
                        if isinstance(vuln_data, dict):
                            severity = vuln_data.get('severity', 'unknown')
                            via = vuln_data.get('via', [])
                            
                            # Extract vulnerability details
                            description_parts = []
                            for v in via:
                                if isinstance(v, dict):
                                    title = v.get('title', '')
                                    cve = v.get('cve', '')
                                    url = v.get('url', '')
                                    
                                    desc = title
                                    if cve:
                                        desc = f"{cve}: {desc}"
                                    if url:
                                        desc += f" - {url}"
                                    
                                    description_parts.append(desc)
                            
                            if description_parts:
                                vulnerabilities.append({
                                    'package_type': 'npm',
                                    'package': pkg_name,
                                    'description': ' | '.join(description_parts)
                                })
                
                elif 'advisories' in data:
                    # npm v6 format
                    for advisory_id, advisory in data['advisories'].items():
                        vulnerabilities.append({
                            'package_type': 'npm',
                            'package': advisory.get('module_name', 'unknown'),
                            'description': f"{advisory.get('title', 'No title')} - Severity: {advisory.get('severity', 'unknown')}"
                        })
                
                return vulnerabilities
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, json.JSONDecodeError, FileNotFoundError):
            pass
        
        return []

    def _check_python_vulnerabilities(self, directory: Path) -> List[Dict[str, Any]]:
        """Check Python packages for vulnerabilities using pip-audit or safety"""
        vulnerabilities = []
        
        # Try pip-audit first (more modern and accurate)
        try:
            result = subprocess.run(
                ['pip-audit', '--format', 'json', '-r', str(directory / 'requirements.txt')],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.stdout:
                data = json.loads(result.stdout)
                
                if 'dependencies' in data:
                    for dep in data['dependencies']:
                        pkg_name = dep.get('name', 'unknown')
                        vulns = dep.get('vulns', [])
                        
                        for vuln in vulns:
                            cve_id = vuln.get('id', 'Unknown CVE')
                            description = vuln.get('description', 'No description available')
                            
                            vulnerabilities.append({
                                'package_type': 'pip',
                                'package': pkg_name,
                                'description': f"{cve_id}: {description}"
                            })
                
                return vulnerabilities
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, json.JSONDecodeError, FileNotFoundError):
            pass
        
        # Fallback to safety check
        try:
            result = subprocess.run(
                ['safety', 'check', '--json', '-r', str(directory / 'requirements.txt')],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.stdout:
                data = json.loads(result.stdout)
                
                for vuln in data:
                    if isinstance(vuln, list) and len(vuln) >= 4:
                        pkg_name = vuln[0]
                        description = vuln[3]
                        
                        vulnerabilities.append({
                            'package_type': 'pip',
                            'package': pkg_name,
                            'description': description
                        })
                
                return vulnerabilities
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, json.JSONDecodeError, FileNotFoundError):
            pass
        
        return []

    def _parse_package_json(self, package_json_path: Path) -> List[Tuple[str, str]]:
        """
        Parse package.json and extract package names and versions
        Returns list of (package_name, version) tuples
        """
        packages = []
        try:
            with open(package_json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Extract dependencies and devDependencies
            for dep_type in ['dependencies', 'devDependencies']:
                deps = data.get(dep_type, {})
                for pkg_name, version in deps.items():
                    # Clean version string (remove ^, ~, >=, etc.)
                    clean_version = re.sub(r'[\^~>=<]', '', version).strip()
                    packages.append((pkg_name, clean_version))
        except (json.JSONDecodeError, FileNotFoundError, KeyError):
            pass
        
        return packages

    def _parse_requirements_txt(self, requirements_path: Path) -> List[Tuple[str, str]]:
        """
        Parse requirements.txt and extract package names and versions
        Returns list of (package_name, version) tuples
        """
        packages = []
        try:
            with open(requirements_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            for line in lines:
                line = line.strip()
                # Skip comments and empty lines
                if not line or line.startswith('#'):
                    continue
                
                # Parse package==version or package>=version patterns
                match = re.match(r'^([a-zA-Z0-9_-]+)\s*([><=!]+)\s*([0-9.]+)', line)
                if match:
                    pkg_name = match.group(1)
                    version = match.group(3)
                    packages.append((pkg_name, version))
                else:
                    # If no version specified, just add the package name
                    pkg_name = re.match(r'^([a-zA-Z0-9_-]+)', line)
                    if pkg_name:
                        packages.append((pkg_name.group(1), ''))
        except FileNotFoundError:
            pass
        
        return packages

    def _check_nvd_vulnerabilities(self, packages: List[Tuple[str, str]], package_type: str) -> List[Dict[str, Any]]:
        """
        Check packages against NVD (National Vulnerability Database) API
        
        Args:
            packages: List of (package_name, version) tuples
            package_type: 'npm' or 'pip'
        
        Returns:
            List of vulnerability dictionaries
        """
        if requests is None:
            return []
        
        vulnerabilities = []
        
        for pkg_name, version in packages:
            try:
                # Construct search keyword based on package type
                if package_type == 'npm':
                    keyword = f"npm {pkg_name}"
                else:
                    keyword = f"python {pkg_name}"
                
                # Query NVD API
                params = {
                    'keywordSearch': keyword,
                    'resultsPerPage': 5  # Limit results to avoid too much data
                }
                
                response = requests.get(
                    self.nvd_api_base,
                    params=params,
                    timeout=10,
                    headers={'User-Agent': 'Sanches-Dependency-Checker/1.0'}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Parse vulnerabilities from response
                    if 'vulnerabilities' in data and data['vulnerabilities']:
                        for vuln_item in data['vulnerabilities']:
                            cve = vuln_item.get('cve', {})
                            cve_id = cve.get('id', 'Unknown CVE')
                            
                            # Get description
                            descriptions = cve.get('descriptions', [])
                            description = 'No description available'
                            for desc in descriptions:
                                if desc.get('lang') == 'en':
                                    description = desc.get('value', 'No description available')
                                    break
                            
                            # Get severity score if available
                            metrics = cve.get('metrics', {})
                            severity_info = ''
                            
                            # Try CVSS v3.1 first, then v3.0, then v2.0
                            for cvss_version in ['cvssMetricV31', 'cvssMetricV30', 'cvssMetricV2']:
                                if cvss_version in metrics and metrics[cvss_version]:
                                    cvss_data = metrics[cvss_version][0].get('cvssData', {})
                                    base_score = cvss_data.get('baseScore', 'N/A')
                                    severity = cvss_data.get('baseSeverity', 'UNKNOWN')
                                    severity_info = f" [CVSS: {base_score} - {severity}]"
                                    break
                            
                            # Format vulnerability entry
                            vuln_description = f"{cve_id}: {description[:200]}{severity_info}"
                            if version:
                                vuln_description = f"{vuln_description} (Package version: {version})"
                            
                            vulnerabilities.append({
                                'package_type': package_type,
                                'package': pkg_name,
                                'description': vuln_description
                            })
                
                # Respect rate limiting
                time.sleep(self.request_delay)
                
            except (requests.RequestException, json.JSONDecodeError, KeyError):
                # Continue with next package on error
                continue
        
        return vulnerabilities


def check_dependencies(directory: str) -> List[Dict[str, Any]]:
    """
    Main function to check dependencies for vulnerabilities

    Args:
        directory: Directory path to scan

    Returns:
        List of vulnerable dependencies with their descriptions
        Format: [{'package_type': 'npm', 'package': 'lodash', 'description': 'CVE-XXX: ...'}]
    """
    checker = DependencyChecker()
    return checker.scan_directory(directory)


