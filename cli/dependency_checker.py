import os
import json
import re
import subprocess
import requests
from typing import List, Dict, Any, Optional
from pathlib import Path


class DependencyChecker:
    def __init__(self, nvd_api_key: Optional[str] = None):
        self.nvd_api_key = nvd_api_key
        self.nvd_base_url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
        self.vulnerabilities = []

    def scan_directory(self, directory: str) -> List[Dict[str, Any]]:
        """
        Scan a directory for dependency files and check for vulnerabilities
        Returns a list of concerning vulnerabilities
        """
        directory_path = Path(directory)
        dependencies = self._discover_dependencies(directory_path)

        if not dependencies:
            return []

        vulnerabilities = []
        for dep in dependencies:
            vuln_data = self._check_vulnerability(dep)
            if vuln_data:
                vulnerabilities.extend(vuln_data)

        return vulnerabilities

    def _discover_dependencies(self, directory: Path) -> List[Dict[str, Any]]:
        """Discover dependencies from various package managers"""
        dependencies = []

        # Node.js - package.json
        package_json = directory / "package.json"
        if package_json.exists():
            deps = self._parse_package_json(package_json)
            dependencies.extend(deps)

        # Python - requirements.txt
        requirements_txt = directory / "requirements.txt"
        if requirements_txt.exists():
            deps = self._parse_requirements_txt(requirements_txt)
            dependencies.extend(deps)

        # Python - pyproject.toml
        pyproject_toml = directory / "pyproject.toml"
        if pyproject_toml.exists():
            deps = self._parse_pyproject_toml(pyproject_toml)
            dependencies.extend(deps)

        # Python - Pipfile
        pipfile = directory / "Pipfile"
        if pipfile.exists():
            deps = self._parse_pipfile(pipfile)
            dependencies.extend(deps)

        # Rust - Cargo.toml
        cargo_toml = directory / "Cargo.toml"
        if cargo_toml.exists():
            deps = self._parse_cargo_toml(cargo_toml)
            dependencies.extend(deps)

        # Go - go.mod
        go_mod = directory / "go.mod"
        if go_mod.exists():
            deps = self._parse_go_mod(go_mod)
            dependencies.extend(deps)

        # Java - pom.xml
        pom_xml = directory / "pom.xml"
        if pom_xml.exists():
            deps = self._parse_pom_xml(pom_xml)
            dependencies.extend(deps)

        # .NET - *.csproj
        for csproj_file in directory.glob("*.csproj"):
            deps = self._parse_csproj(csproj_file)
            dependencies.extend(deps)

        return dependencies

    def _parse_package_json(self, file_path: Path) -> List[Dict[str, Any]]:
        """Parse Node.js package.json file"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)

            deps = []
            for dep_type in ['dependencies', 'devDependencies', 'peerDependencies']:
                if dep_type in data:
                    for name, version in data[dep_type].items():
                        deps.append({
                            'name': name,
                            'version': self._clean_version(version),
                            'package_manager': 'npm',
                            'file': str(file_path)
                        })
            return deps
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            return []

    def _parse_requirements_txt(self, file_path: Path) -> List[Dict[str, Any]]:
        """Parse Python requirements.txt file"""
        try:
            with open(file_path, 'r') as f:
                lines = f.readlines()

            deps = []
            for line in lines:
                line = line.strip()
                if line and not line.startswith('#'):
                    # Parse requirement line (name==version, name>=version, etc.)
                    match = re.match(r'^([a-zA-Z0-9\-_\.]+)([><=!]+)([0-9\.]+.*?)$', line)
                    if match:
                        name, operator, version = match.groups()
                        deps.append({
                            'name': name,
                            'version': version,
                            'package_manager': 'pip',
                            'file': str(file_path)
                        })
                    else:
                        # Just package name without version
                        name_match = re.match(r'^([a-zA-Z0-9\-_\.]+)$', line)
                        if name_match:
                            deps.append({
                                'name': name_match.group(1),
                                'version': 'latest',
                                'package_manager': 'pip',
                                'file': str(file_path)
                            })
            return deps
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            return []

    def _parse_pyproject_toml(self, file_path: Path) -> List[Dict[str, Any]]:
        """Parse Python pyproject.toml file"""
        try:
            import tomllib
        except ImportError:
            try:
                import tomli as tomllib
            except ImportError:
                print("tomllib/tomli not available, skipping pyproject.toml parsing")
                return []

        try:
            with open(file_path, 'rb') as f:
                data = tomllib.load(f)

            deps = []
            if 'project' in data and 'dependencies' in data['project']:
                for dep in data['project']['dependencies']:
                    match = re.match(r'^([a-zA-Z0-9\-_\.]+)([><=!]+)([0-9\.]+.*?)$', dep)
                    if match:
                        name, operator, version = match.groups()
                        deps.append({
                            'name': name,
                            'version': version,
                            'package_manager': 'pip',
                            'file': str(file_path)
                        })

            return deps
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            return []

    def _parse_pipfile(self, file_path: Path) -> List[Dict[str, Any]]:
        """Parse Python Pipfile"""
        try:
            import tomllib
        except ImportError:
            try:
                import tomli as tomllib
            except ImportError:
                print("tomllib/tomli not available, skipping Pipfile parsing")
                return []

        try:
            with open(file_path, 'rb') as f:
                data = tomllib.load(f)

            deps = []
            for section in ['packages', 'dev-packages']:
                if section in data:
                    for name, version_info in data[section].items():
                        if isinstance(version_info, str):
                            version = self._clean_version(version_info)
                        elif isinstance(version_info, dict) and 'version' in version_info:
                            version = self._clean_version(version_info['version'])
                        else:
                            version = 'latest'

                        deps.append({
                            'name': name,
                            'version': version,
                            'package_manager': 'pip',
                            'file': str(file_path)
                        })
            return deps
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            return []

    def _parse_cargo_toml(self, file_path: Path) -> List[Dict[str, Any]]:
        """Parse Rust Cargo.toml file"""
        try:
            import tomllib
        except ImportError:
            try:
                import tomli as tomllib
            except ImportError:
                print("tomllib/tomli not available, skipping Cargo.toml parsing")
                return []

        try:
            with open(file_path, 'rb') as f:
                data = tomllib.load(f)

            deps = []
            for section in ['dependencies', 'dev-dependencies']:
                if section in data:
                    for name, version_info in data[section].items():
                        if isinstance(version_info, str):
                            version = self._clean_version(version_info)
                        elif isinstance(version_info, dict) and 'version' in version_info:
                            version = self._clean_version(version_info['version'])
                        else:
                            version = 'latest'

                        deps.append({
                            'name': name,
                            'version': version,
                            'package_manager': 'cargo',
                            'file': str(file_path)
                        })
            return deps
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            return []

    def _parse_go_mod(self, file_path: Path) -> List[Dict[str, Any]]:
        """Parse Go go.mod file"""
        try:
            with open(file_path, 'r') as f:
                content = f.read()

            deps = []
            # Look for require section
            require_section = re.search(r'require\s*\((.*?)\)', content, re.DOTALL)
            if require_section:
                for line in require_section.group(1).split('\n'):
                    line = line.strip()
                    if line and not line.startswith('//'):
                        parts = line.split()
                        if len(parts) >= 2:
                            name = parts[0]
                            version = parts[1]
                            deps.append({
                                'name': name,
                                'version': version,
                                'package_manager': 'go',
                                'file': str(file_path)
                            })

            # Also look for direct require statements
            for match in re.finditer(r'require\s+([^\s]+)\s+([^\s]+)', content):
                name, version = match.groups()
                deps.append({
                    'name': name,
                    'version': version,
                    'package_manager': 'go',
                    'file': str(file_path)
                })

            return deps
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            return []

    def _parse_pom_xml(self, file_path: Path) -> List[Dict[str, Any]]:
        """Parse Java Maven pom.xml file"""
        try:
            import xml.etree.ElementTree as ET

            tree = ET.parse(file_path)
            root = tree.getroot()

            # Handle namespace
            ns = {'maven': 'http://maven.apache.org/POM/4.0.0'}
            if root.tag.startswith('{'):
                ns_uri = root.tag[1:].split('}')[0]
                ns = {'maven': ns_uri}

            deps = []
            dependencies = root.findall('.//maven:dependency', ns) or root.findall('.//dependency')

            for dep in dependencies:
                group_id = dep.find('maven:groupId', ns) or dep.find('groupId')
                artifact_id = dep.find('maven:artifactId', ns) or dep.find('artifactId')
                version = dep.find('maven:version', ns) or dep.find('version')

                if group_id is not None and artifact_id is not None:
                    name = f"{group_id.text}:{artifact_id.text}"
                    version_text = version.text if version is not None else 'latest'

                    deps.append({
                        'name': name,
                        'version': version_text,
                        'package_manager': 'maven',
                        'file': str(file_path)
                    })

            return deps
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            return []

    def _parse_csproj(self, file_path: Path) -> List[Dict[str, Any]]:
        """Parse .NET .csproj file"""
        try:
            import xml.etree.ElementTree as ET

            tree = ET.parse(file_path)
            root = tree.getroot()

            deps = []
            package_refs = root.findall('.//PackageReference')

            for pkg_ref in package_refs:
                include = pkg_ref.get('Include')
                version = pkg_ref.get('Version')

                if include:
                    deps.append({
                        'name': include,
                        'version': version or 'latest',
                        'package_manager': 'nuget',
                        'file': str(file_path)
                    })

            return deps
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            return []

    def _clean_version(self, version: str) -> str:
        """Clean version string by removing operators and constraints"""
        # Remove common version operators
        cleaned = re.sub(r'^[~^>=<]+', '', version)
        # Take just the version number part
        match = re.match(r'([0-9]+\.[0-9]+(?:\.[0-9]+)?)', cleaned)
        return match.group(1) if match else cleaned

    def _check_vulnerability(self, dependency: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check a dependency for vulnerabilities using NVD API"""
        if not self.nvd_api_key:
            print("Warning: NVD API key not provided, skipping vulnerability check")
            return []

        try:
            # Query NVD API for vulnerabilities related to this package
            headers = {
                'apiKey': self.nvd_api_key
            }

            # Build search query based on package name
            params = {
                'keywordSearch': dependency['name'],
                'resultsPerPage': 10
            }

            response = requests.get(self.nvd_base_url, headers=headers, params=params)

            if response.status_code == 200:
                data = response.json()
                vulnerabilities = []

                if 'vulnerabilities' in data:
                    for vuln in data['vulnerabilities']:
                        cve = vuln.get('cve', {})
                        cve_id = cve.get('id', 'Unknown')
                        descriptions = cve.get('descriptions', [])
                        description = descriptions[0].get('value', 'No description') if descriptions else 'No description'

                        # Get CVSS score if available
                        metrics = cve.get('metrics', {})
                        cvss_score = 'Unknown'
                        severity = 'Unknown'

                        if 'cvssMetricV31' in metrics:
                            cvss_data = metrics['cvssMetricV31'][0]['cvssData']
                            cvss_score = cvss_data.get('baseScore', 'Unknown')
                            severity = cvss_data.get('baseSeverity', 'Unknown')
                        elif 'cvssMetricV30' in metrics:
                            cvss_data = metrics['cvssMetricV30'][0]['cvssData']
                            cvss_score = cvss_data.get('baseScore', 'Unknown')
                            severity = cvss_data.get('baseSeverity', 'Unknown')
                        elif 'cvssMetricV2' in metrics:
                            cvss_data = metrics['cvssMetricV2'][0]['cvssData']
                            cvss_score = cvss_data.get('baseScore', 'Unknown')
                            severity = 'Medium'  # Default for CVSS v2

                        vulnerabilities.append({
                            'package_name': dependency['name'],
                            'package_version': dependency['version'],
                            'package_manager': dependency['package_manager'],
                            'file': dependency['file'],
                            'cve_id': cve_id,
                            'description': description,
                            'cvss_score': cvss_score,
                            'severity': severity,
                            'published_date': cve.get('published', 'Unknown'),
                            'last_modified': cve.get('lastModified', 'Unknown')
                        })

                return vulnerabilities
            else:
                print(f"Error querying NVD API: {response.status_code}")
                return []

        except Exception as e:
            print(f"Error checking vulnerability for {dependency['name']}: {e}")
            return []


def check_dependencies(directory: str, nvd_api_key: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Main function to check dependencies for vulnerabilities

    Args:
        directory: Directory path to scan
        nvd_api_key: NVD API key for vulnerability checking

    Returns:
        List of concerning vulnerabilities
    """
    checker = DependencyChecker(nvd_api_key)
    return checker.scan_directory(directory)


if __name__ == "__main__":
    import argparse
    from dotenv import load_dotenv

    load_dotenv()

    parser = argparse.ArgumentParser(description='Check dependencies for vulnerabilities')
    parser.add_argument('--dir', required=True, help='Directory to scan')
    parser.add_argument('--nvd-api-key', help='NVD API key (can also be set via NVD_API_KEY env var)')

    args = parser.parse_args()

    nvd_key = args.nvd_api_key or os.getenv('NVD_API_KEY')

    vulnerabilities = check_dependencies(args.dir, nvd_key)

    if vulnerabilities:
        print(json.dumps(vulnerabilities, indent=2))
    else:
        print("No vulnerabilities found or no dependencies detected.")