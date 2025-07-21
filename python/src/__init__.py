"""
FHIR Patient Summary Python Package

This package provides tools for generating International Patient Summary (IPS) 
documents from FHIR resources, converted from TypeScript.
"""

try:
    from .generators.fhir_summary_generator import ComprehensiveIPSCompositionBuilder
    from .generators.narrative_generator import NarrativeGenerator
except ImportError:
    # Handle import errors gracefully during development
    ComprehensiveIPSCompositionBuilder = None
    NarrativeGenerator = None

def my_package(taco: str = '') -> str:
    """Package test function."""
    return f"{taco} from my package"

__all__ = [
    'ComprehensiveIPSCompositionBuilder',
    'NarrativeGenerator', 
    'my_package'
]
