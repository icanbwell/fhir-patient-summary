// PatientTemplate.ts - TypeScript replacement for Jinja2 patient.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TPatient } from '../../../types/resources/Patient';
import { ITemplate } from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Patient resources
 * This replaces the Jinja2 patient.j2 template
 */
export class PatientTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Patient resource
   * @param resource - FHIR Bundle containing Patient resource
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resource: TBundle, timezone?: string): string {
    return PatientTemplate.generateStaticNarrative(resource, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resource - FHIR Bundle containing Patient resource
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static generateStaticNarrative(resource: TBundle, timezone?: string): string {
    const templateUtilities = new TemplateUtilities(resource);
    let html = '';

    // Loop through bundle entries to find Patient resources
    for (const entry of resource.entry || []) {
      if (entry.resource?.resourceType === 'Patient') {
        const patient = entry.resource as TPatient;

        html += `
        <div>
          <h2>Patient Summary</h2>
          <p>Gender: ${patient.gender || ''}</p>
          <ul>
            <li><strong>Name(s):</strong>
              <ul>
                ${this.renderNames(patient)}
              </ul>
            </li>
            <li><strong>Gender:</strong> ${patient.gender ? this.capitalize(patient.gender) : ''}</li>
            <li><strong>Date of Birth:</strong> ${patient.birthDate || ''}</li>
            <li><strong>Identifier(s):</strong>
              <ul>
                ${this.renderIdentifiers(patient)}
              </ul>
            </li>
            <li><strong>Telecom:</strong>
              <ul>
                ${this.renderTelecom(patient)}
              </ul>
            </li>
            <li><strong>Address(es):</strong>
              <ul>
                ${this.renderAddresses(patient)}
              </ul>
            </li>
            <li><strong>Marital Status:</strong> ${patient.maritalStatus?.text || ''}</li>
            <li><strong>Deceased:</strong>
              ${this.renderDeceased(patient)}
            </li>
            <li><strong>Language(s):</strong>
              <ul>
                ${this.renderCommunication(templateUtilities, patient)}
              </ul>
            </li>
          </ul>
        </div>`;
      }
    }

    return html;
  }

  /**
   * Renders patient names as HTML list items
   * @param patient - Patient resource
   * @returns HTML string of list items
   */
  private static renderNames(patient: TPatient): string {
    if (!patient.name || patient.name.length === 0) {
      return '';
    }

    return patient.name.map(name => {
      const nameText = name.text ||
        ((name.given || []).join(' ') + ' ' + (name.family || '')).trim();
      return `<li>${nameText}</li>`;
    }).join('');
  }

  /**
   * Renders patient identifiers as HTML list items
   * @param patient - Patient resource
   * @returns HTML string of list items
   */
  private static renderIdentifiers(patient: TPatient): string {
    if (!patient.identifier || patient.identifier.length === 0) {
      return '';
    }

    return patient.identifier.map(id => {
      const system = id.system || '';
      const value = id.value || '';
      return `<li>${system}: ${value}</li>`;
    }).join('');
  }

  /**
   * Renders patient telecom information as HTML list items
   * @param patient - Patient resource
   * @returns HTML string of list items
   */
  private static renderTelecom(patient: TPatient): string {
    if (!patient.telecom || patient.telecom.length === 0) {
      return '';
    }

    return patient.telecom.map(telecom => {
      const system = telecom.system ? this.capitalize(telecom.system) : '';
      const value = telecom.value || '';
      const use = telecom.use ? ` (${telecom.use})` : '';
      return `<li>${system}: ${value}${use}</li>`;
    }).join('');
  }

  /**
   * Renders patient addresses as HTML list items
   * @param patient - Patient resource
   * @returns HTML string of list items
   */
  private static renderAddresses(patient: TPatient): string {
    if (!patient.address || patient.address.length === 0) {
      return '';
    }

    return patient.address.map(address => {
      const addressText = address.text ||
        ((address.line || []).join(', ') + ', ' + (address.city || '') + ', ' + (address.country || '')).trim();
      return `<li>${addressText}</li>`;
    }).join('');
  }

  /**
   * Renders patient deceased status
   * @param patient - Patient resource
   * @returns HTML string for deceased status
   */
  private static renderDeceased(patient: TPatient): string {
    if (patient.deceasedBoolean !== undefined) {
      return patient.deceasedBoolean ? 'Yes' : 'No';
    }
    if (patient.deceasedDateTime) {
      return patient.deceasedDateTime;
    }
    return '';
  }

  /**
   * Renders patient communication preferences as HTML list items
   * @param templateUtilities - Instance of TemplateUtilities for utility functions
   * @param patient - Patient resource
   * @returns HTML string of list items
   */
  private static renderCommunication(templateUtilities: TemplateUtilities, patient: TPatient): string {
    if (!patient.communication || patient.communication.length === 0) {
      return '';
    }

    return patient.communication.map(comm => {
      if (!comm.language) return '';

      const language = templateUtilities.codeableConcept(comm.language);
      const preferred = comm.preferred ? ' (preferred)' : '';
      return `<li>${language}${preferred}</li>`;
    }).join('');
  }

  /**
   * Capitalizes first letter of a string
   * @param str - String to capitalize
   * @returns Capitalized string
   */
  private static capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
