"""
Test helper utilities for FHIR Patient Summary tests.

This module corresponds to the original testHelpers.ts
"""

import os
import re
from typing import Optional, List
from bs4 import BeautifulSoup
from python.python_src.types.fhir_types import TBundle, TComposition, TCompositionSection


def beautify_html(html: str) -> str:
    """
    Beautifies HTML using BeautifulSoup.
    
    Args:
        html: The input HTML string to be formatted
        
    Returns:
        Beautifully formatted HTML string
    """
    try:
        # Preprocess HTML to fix specific cases
        # Join empty <ul></ul> elements with their preceding text within table cells
        preprocessed_html = html
        preprocessed_html = re.sub(
            r'(<td>[^<]+?)[\s\r\n]+([ \t]*)<ul></ul>',
            r'\1<ul></ul>',
            preprocessed_html
        )
        preprocessed_html = re.sub(
            r'(<td>[^<]+?)<ul></ul>[\s\r\n]+([ \t]*)</td>',
            r'\1<ul></ul></td>',
            preprocessed_html
        )
        
        # Use BeautifulSoup to format the HTML
        soup = BeautifulSoup(preprocessed_html, 'html.parser')
        return soup.prettify(indent=4)
        
    except Exception as error:
        print(f'Formatting Error: {error}')
        return html


def read_narrative_file(folder: str, code_value: str, section_title: str) -> Optional[str]:
    """
    Reads a narrative file based on the provided folder, code value, and section title.
    
    Args:
        folder: The folder where narrative files are stored
        code_value: The LOINC code value to identify the narrative file
        section_title: The title of the section to create a filename-friendly format
        
    Returns:
        The content of the narrative file or None if not found
        
    Raises:
        Exception: If the narrative file is not found
    """
    # Convert the section title to a filename-friendly format
    safe_section_title = re.sub(r'[^a-zA-Z0-9]', '_', section_title)
    safe_section_title = re.sub(r'_{2,}', '_', safe_section_title)
    filename = f"{code_value}_{safe_section_title}.html"
    file_path = os.path.join(folder, filename)
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except FileNotFoundError as error:
        raise Exception(f"Narrative file not found: {file_path}: {error}")


def compare_narratives(generated_html: Optional[str], expected_html: Optional[str]) -> None:
    """
    Compares generated HTML narratives with expected narratives.
    
    Args:
        generated_html: The generated HTML narrative string
        expected_html: The expected HTML narrative string
        
    Raises:
        Exception: If both HTML narratives are not provided
        AssertionError: If the narratives don't match
    """
    if not generated_html or not expected_html:
        raise Exception('Both generated and expected HTML narratives must be provided for comparison.')
    
    # Beautify both HTML strings for comparison
    generated_formatted_html = beautify_html(generated_html)
    expected_formatted_html = beautify_html(expected_html)
    
    # Compare the formatted HTML strings
    if generated_formatted_html == expected_formatted_html:
        print('Narrative matches expected output.')
    else:
        print('Narrative does not match expected output.')
        print(f"Generated:\n{generated_formatted_html}")
        print(f"Expected:\n{expected_formatted_html}")
    
    assert generated_formatted_html == expected_formatted_html


def compare_bundles(folder: str, bundle: TBundle, expected_bundle: TBundle) -> None:
    """
    Compares two FHIR bundles by checking their sections and narratives.
    
    Args:
        folder: The folder where narrative files are stored
        bundle: The generated FHIR bundle to compare
        expected_bundle: The expected FHIR bundle to compare against
    """
    # Remove the date from the bundle for comparison
    bundle['timestamp'] = expected_bundle.get('timestamp')
    if (bundle.get('entry') and 
        len(bundle['entry']) > 0 and 
        bundle['entry'][0].get('resource', {}).get('date')):
        bundle['entry'][0]['resource']['date'] = (
            expected_bundle.get('entry', [{}])[0]
            .get('resource', {})
            .get('date')
        )
    
    # Compare the text.div of the first Composition resource if available
    generated_composition: Optional[TComposition] = None
    if bundle.get('entry'):
        for entry in bundle['entry']:
            if entry.get('resource', {}).get('resourceType') == 'Composition':
                generated_composition = entry['resource']
                break
    
    expected_composition_div = read_narrative_file(folder, '', 'Composition')
    
    assert expected_composition_div is not None and len(expected_composition_div) > 0
    
    if (generated_composition and 
        generated_composition.get('text', {}).get('div') and 
        expected_composition_div):
        print('======= Comparing Composition narrative ======')
        compare_narratives(
            generated_composition['text']['div'],
            expected_composition_div
        )
    
    # Extract the div from each section and compare
    generated_sections: List[TCompositionSection] = []
    expected_sections: List[TCompositionSection] = []
    
    if bundle.get('entry'):
        for entry in bundle['entry']:
            if entry.get('resource', {}).get('resourceType') == 'Composition':
                sections = entry.get('resource', {}).get('section', [])
                if sections:
                    generated_sections.extend(sections)
    
    if expected_bundle.get('entry'):
        for entry in expected_bundle['entry']:
            if entry.get('resource', {}).get('resourceType') == 'Composition':
                sections = entry.get('resource', {}).get('section', [])
                if sections:
                    expected_sections.extend(sections)
    
    # Compare the div of each section
    assert generated_sections is not None
    assert expected_sections is not None
    
    if generated_sections and expected_sections:
        for i, generated_section in enumerate(generated_sections):
            section_title = generated_section.get('title', 'Unknown')
            print(f"======= Comparing section {section_title} {i + 1}/{len(generated_sections)} ====")
            
            generated_div = generated_section.get('text', {}).get('div')
            
            # Get LOINC code for the section
            code_value = None
            if generated_section.get('code', {}).get('coding'):
                code_value = generated_section['code']['coding'][0].get('code')
            
            assert code_value is not None, "Code value should be defined"
            
            # Read narrative from file
            expected_div = read_narrative_file(folder, code_value, section_title)
            
            assert expected_div is not None and len(expected_div) > 0
            
            print(f"Using narrative from file for {section_title}")
            
            compare_narratives(
                generated_div or '',
                expected_div or ''
            )
