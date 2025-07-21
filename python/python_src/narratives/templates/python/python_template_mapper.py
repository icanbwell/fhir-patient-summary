"""
Python Template Mapper

Maps IPS sections to their corresponding Python template classes.
Replaces the TypeScript template mapping system.
"""

from typing import Dict, Any, Optional

# Import from the correct path
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../..'))

from python.python_src.structures.ips_sections import IPSSections


class PythonTemplateMapper:
    """
    Maps IPS sections to their corresponding Python template classes.
    Replaces the TypeScript template mapping system.
    """
    
    @staticmethod
    def generate_narrative(section: IPSSections, bundle_data: Dict[str, Any], timezone: Optional[str] = None) -> str:
        """
        Generate narrative for a specific section.
        
        Args:
            section: IPS section type
            bundle_data: Bundle-like data structure containing resources
            timezone: Optional timezone for date formatting
            
        Returns:
            Generated HTML narrative content
        """
        # For now, create a simple template
        # This would be expanded with actual template implementations
        
        resources = bundle_data.get('entry', [])
        if not resources:
            return ""
        
        # Basic template based on section type - use string comparison to avoid enum instance issues
        section_value = section.value if hasattr(section, 'value') else str(section)
        
        if section_value == 'Patient':
            return PythonTemplateMapper._generate_patient_narrative(resources)
        elif section_value == 'AllergyIntoleranceSection':
            return PythonTemplateMapper._generate_allergies_narrative(resources)
        elif section_value == 'MedicationSection':
            return PythonTemplateMapper._generate_medications_narrative(resources)
        elif section_value == 'ProblemSection':
            return PythonTemplateMapper._generate_problems_narrative(resources)
        elif section_value == 'ImmunizationSection':
            return PythonTemplateMapper._generate_immunizations_narrative(resources)
        else:
            return PythonTemplateMapper._generate_generic_narrative(section, resources)
    
    @staticmethod
    def _generate_patient_narrative(resources: list) -> str:
        """Generate patient narrative."""
        html_parts = ["<h2>Patient Summary</h2>"]
        
        for entry in resources:
            resource = entry.get('resource', {})
            if resource.get('resourceType') == 'Patient':
                html_parts.append("<ul>")
                
                # Name
                names = resource.get('name', [])
                if names:
                    name = names[0]
                    given = ' '.join(name.get('given', []))
                    family = name.get('family', '')
                    full_name = f"{given} {family}".strip()
                    if full_name:
                        html_parts.append(f"<li><strong>Name:</strong> {full_name}</li>")
                
                # Gender
                gender = resource.get('gender', '')
                if gender:
                    html_parts.append(f"<li><strong>Gender:</strong> {gender.capitalize()}</li>")
                
                # Birth date
                birth_date = resource.get('birthDate', '')
                if birth_date:
                    html_parts.append(f"<li><strong>Date of Birth:</strong> {birth_date}</li>")
                
                # Identifiers
                identifiers = resource.get('identifier', [])
                if identifiers:
                    id_list = []
                    for identifier in identifiers:
                        value = identifier.get('value', '')
                        system = identifier.get('system', '')
                        if value:
                            id_list.append(f"{system}: {value}" if system else value)
                    if id_list:
                        html_parts.append(f"<li><strong>Identifier(s):</strong> {', '.join(id_list)}</li>")
                
                html_parts.append("</ul>")
        
        return '\n'.join(html_parts)
    
    @staticmethod
    def _generate_allergies_narrative(resources: list) -> str:
        """Generate allergies narrative."""
        html_parts = ["<h3>Allergies and Adverse Reactions</h3>"]
        
        if not resources:
            html_parts.append("<p>No known allergies.</p>")
            return '\n'.join(html_parts)
        
        html_parts.append("<ul>")
        for entry in resources:
            resource = entry.get('resource', {})
            if resource.get('resourceType') == 'AllergyIntolerance':
                # Get allergen
                code = resource.get('code', {})
                text = code.get('text', '')
                codings = code.get('coding', [])
                if not text and codings:
                    text = codings[0].get('display', '')
                
                # Get criticality
                criticality = resource.get('criticality', '')
                
                allergy_text = text or 'Unknown allergen'
                if criticality:
                    allergy_text += f" ({criticality})"
                
                html_parts.append(f"<li>{allergy_text}</li>")
        
        html_parts.append("</ul>")
        return '\n'.join(html_parts)
    
    @staticmethod
    def _generate_medications_narrative(resources: list) -> str:
        """Generate medications narrative."""
        html_parts = ["<h3>Medications</h3>"]
        
        if not resources:
            html_parts.append("<p>No current medications.</p>")
            return '\n'.join(html_parts)
        
        html_parts.append("<ul>")
        for entry in resources:
            resource = entry.get('resource', {})
            resource_type = resource.get('resourceType', '')
            
            if resource_type in ['MedicationRequest', 'MedicationStatement']:
                # Get medication
                medication = resource.get('medicationCodeableConcept', {})
                text = medication.get('text', '')
                codings = medication.get('coding', [])
                if not text and codings:
                    text = codings[0].get('display', '')
                
                medication_text = text or 'Unknown medication'
                html_parts.append(f"<li>{medication_text}</li>")
        
        html_parts.append("</ul>")
        return '\n'.join(html_parts)
    
    @staticmethod
    def _generate_problems_narrative(resources: list) -> str:
        """Generate problems narrative."""
        html_parts = ["<h3>Problems</h3>"]
        
        if not resources:
            html_parts.append("<p>No active problems.</p>")
            return '\n'.join(html_parts)
        
        html_parts.append("<ul>")
        for entry in resources:
            resource = entry.get('resource', {})
            if resource.get('resourceType') == 'Condition':
                # Get condition
                code = resource.get('code', {})
                text = code.get('text', '')
                codings = code.get('coding', [])
                if not text and codings:
                    text = codings[0].get('display', '')
                
                condition_text = text or 'Unknown condition'
                html_parts.append(f"<li>{condition_text}</li>")
        
        html_parts.append("</ul>")
        return '\n'.join(html_parts)
    
    @staticmethod
    def _generate_immunizations_narrative(resources: list) -> str:
        """Generate immunizations narrative."""
        html_parts = ["<h3>Immunizations</h3>"]
        
        if not resources:
            html_parts.append("<p>No recorded immunizations.</p>")
            return '\n'.join(html_parts)
        
        html_parts.append("<ul>")
        for entry in resources:
            resource = entry.get('resource', {})
            if resource.get('resourceType') == 'Immunization':
                # Get vaccine
                vaccine_code = resource.get('vaccineCode', {})
                text = vaccine_code.get('text', '')
                codings = vaccine_code.get('coding', [])
                if not text and codings:
                    text = codings[0].get('display', '')
                
                # Get date
                occurrence_date = resource.get('occurrenceDateTime', '')
                
                vaccine_text = text or 'Unknown vaccine'
                if occurrence_date:
                    vaccine_text += f" ({occurrence_date})"
                
                html_parts.append(f"<li>{vaccine_text}</li>")
        
        html_parts.append("</ul>")
        return '\n'.join(html_parts)
    
    @staticmethod
    def _generate_generic_narrative(section: IPSSections, resources: list) -> str:
        """Generate generic narrative for other sections."""
        section_name = section.value.replace('Section', '').replace('_', ' ').title()
        html_parts = [f"<h3>{section_name}</h3>"]
        
        if not resources:
            html_parts.append(f"<p>No {section_name.lower()} information available.</p>")
            return '\n'.join(html_parts)
        
        html_parts.append(f"<p>{len(resources)} {section_name.lower()} entries recorded.</p>")
        return '\n'.join(html_parts)
