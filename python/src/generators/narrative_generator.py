"""
Python Narrative Generator

Generates narrative content for FHIR resources using Python templates.
Replaces the TypeScript-based narrative generator.
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
import minify_html
from ..types.fhir_types import TDomainResource, TNarrative, TBundle, TBundleEntry
from ..structures.ips_sections import IPSSections
from ..narratives.templates.python.python_template_mapper import PythonTemplateMapper


@dataclass
class Narrative:
    """FHIR Narrative interface."""
    status: str  # 'generated' | 'extensions' | 'additional' | 'empty'
    div: str  # XHTML div content


class NarrativeGenerator:
    """
    Generates narrative content for FHIR resources using Python templates.
    Replaces the TypeScript/Nunjucks-based narrative generator.
    """
    
    # Default minification options
    DEFAULT_MINIFY_OPTIONS = {
        'keep_closing_tags': True,
        'keep_html_and_head_opening_tags': True,
        'keep_spaces_between_attributes': True,
        'minify_css': True,
        'minify_js': False,
        'remove_bangs': False,
        'remove_processing_instructions': False
    }
    
    # Aggressive minification options
    AGGRESSIVE_MINIFY_OPTIONS = {
        'keep_closing_tags': False,
        'keep_html_and_head_opening_tags': False,
        'keep_spaces_between_attributes': False,
        'minify_css': True,
        'minify_js': True,
        'remove_bangs': True,
        'remove_processing_instructions': True
    }
    
    @staticmethod
    async def generate_narrative_content_async(
        section: IPSSections,
        resources: List[TDomainResource],
        timezone: Optional[str] = None,
        wrap_in_xhtml: bool = True
    ) -> Optional[str]:
        """
        Generates narrative HTML content for a section.
        
        Args:
            section: IPS section type
            resources: Array of domain resources
            timezone: Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
            wrap_in_xhtml: Whether to wrap the content in XHTML div
            
        Returns:
            Generated HTML content or None if no resources
        """
        if not resources:
            return None  # No resources to generate narrative
        
        try:
            # Create a bundle-like structure for the template
            bundle_data = {
                'resourceType': 'Bundle',
                'type': 'collection',
                'entry': [{'resource': resource} for resource in resources]
            }
            
            # Use the Python template mapper to generate HTML
            content = PythonTemplateMapper.generate_narrative(section, bundle_data, timezone)
            if not content:
                return None  # No content generated
                
            if wrap_in_xhtml:
                # If wrapping in XHTML, ensure the content is properly formatted
                return await NarrativeGenerator.wrap_in_xhtml_async(content)
            else:
                return await NarrativeGenerator.minify_html_async(content)
                
        except Exception as error:
            print(f"Error generating narrative for section {section}: {error}")
            return f'<div class="error">Error generating narrative: {str(error)}</div>'
    
    @staticmethod
    async def minify_html_async(html: str, aggressive: bool = False) -> str:
        """
        Minifies HTML content asynchronously using minify-html.
        
        Args:
            html: HTML content to minify
            aggressive: Whether to use more aggressive minification
            
        Returns:
            Minified HTML content
        """
        if not html:
            return html
        
        try:
            options = NarrativeGenerator.AGGRESSIVE_MINIFY_OPTIONS if aggressive else NarrativeGenerator.DEFAULT_MINIFY_OPTIONS
            return minify_html.minify(html, **options)
        except Exception as error:
            print(f'HTML minification failed: {error}')
            return html
    
    @staticmethod
    async def create_narrative_async(content: str, minify: bool = True) -> Narrative:
        """
        Creates a complete FHIR Narrative object asynchronously.
        
        Args:
            content: HTML content
            minify: Whether to minify the HTML content (default: True)
            
        Returns:
            A FHIR Narrative object
        """
        # Strip outer <div> wrappers if present
        if content.startswith('<div') and content.endswith('</div>'):
            # Find the end of the opening tag
            tag_end = content.find('>')
            if tag_end != -1:
                content = content[tag_end + 1:-6]  # Remove opening and closing div tags
        
        # Apply minification if requested
        if minify:
            content = await NarrativeGenerator.minify_html_async(content)
        
        return Narrative(
            status='generated',
            div=f'<div xmlns="http://www.w3.org/1999/xhtml">{content}</div>'
        )
    
    @staticmethod
    async def generate_narrative_async(
        section: IPSSections,
        resources: List[TDomainResource],
        timezone: Optional[str] = None,
        minify: bool = True,
        wrap_in_xhtml: bool = True
    ) -> Optional[Narrative]:
        """
        Generates a complete FHIR Narrative object for a section asynchronously.
        
        Args:
            section: IPS section type
            resources: Array of domain resources
            timezone: Optional timezone to use for date formatting
            minify: Whether to minify the HTML content (default: True)
            wrap_in_xhtml: Whether to wrap the content in XHTML div
            
        Returns:
            A FHIR Narrative object or None if no resources
        """
        content = await NarrativeGenerator.generate_narrative_content_async(
            section, resources, timezone, wrap_in_xhtml
        )
        if not content:
            return None
        return await NarrativeGenerator.create_narrative_async(content, minify)
    
    @staticmethod
    async def wrap_in_xhtml_async(content: str, minify: bool = False) -> str:
        """
        Wrap content in XHTML div with FHIR namespace asynchronously.
        
        Args:
            content: HTML content to wrap
            minify: Whether to minify the HTML content before wrapping (default: False)
            
        Returns:
            XHTML div string
        """
        if minify:
            content = await NarrativeGenerator.minify_html_async(content)
        return f'<div xmlns="http://www.w3.org/1999/xhtml">{content}</div>'
