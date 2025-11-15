#!/bin/bash
# Wrapper script for sanches.py that uses the virtual environment

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Run the Python script using the venv Python
"${SCRIPT_DIR}/venv/bin/python" "${SCRIPT_DIR}/sanches.py" "$@"
