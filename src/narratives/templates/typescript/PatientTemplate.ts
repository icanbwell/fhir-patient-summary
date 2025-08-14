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
  generateNarrative(resource: TBundle, timezone: string | undefined): string {
    return PatientTemplate.generateStaticNarrative(resource, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resource - FHIR Bundle containing Patient resource
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static generateStaticNarrative(resource: TBundle, timezone: string | undefined): string {
    const templateUtilities = new TemplateUtilities(resource);
    let html = '';

    // Loop through bundle entries to find Patient resources
    for (const entry of resource.entry || []) {
      if (entry.resource?.resourceType === 'Patient') {
        const patient = entry.resource as TPatient;

        html += `
        <div>
          <ul>
            <li><strong>Name(s):</strong>${this.renderNames(patient)}</li>
            <li><strong>Gender:</strong>${patient.gender ? this.capitalize(patient.gender) : ''}</li>
            <li><strong>Date of Birth:</strong>${patient.birthDate || ''}</li>
            <li><strong>Identifier(s):</strong>${this.renderIdentifiers(patient)}</li>
            <li><strong>Telecom:</strong><ul>${this.renderTelecom(patient)}</ul></li>
            <li><strong>Address(es):</strong>${this.renderAddresses(patient)}</li>
            <li><strong>Marital Status:</strong> ${patient.maritalStatus?.text || ''}</li>
            <li><strong>Deceased:</strong>${this.renderDeceased(patient)}</li>
            <li><strong>Language(s):</strong>${this.renderCommunication(templateUtilities, patient)}</li>
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

    const uniqueNames = new Set<string>();

    patient.name.forEach(name => {
      if (name.use !== 'old') {
        const nameText = name.text ||
          ((name.given || []).join(' ') + ' ' + (name.family || '')).trim();
        uniqueNames.add(nameText);
      }
    });

    return Array.from(uniqueNames)
        .map(nameText => `<ul><li>${nameText}</li></ul>`)
        .join('');
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
      return `<ul><li>${system}: ${value}</li></ul>`;
    }).join('');
  }

  /**
   * Renders patient telecom information grouped by system
   * @param patient - Patient resource
   * @returns HTML string grouped by system
   */
  private static renderTelecom(patient: TPatient): string {
    if (!patient.telecom || patient.telecom.length === 0) {
      return '';
    }

    const systemPriority = ['email', 'phone', 'pager', 'sms', 'fax', 'url', 'other'];
    const telecomBySystem = new Map<string, Set<string>>();

    // Group unique values by system
    patient.telecom.forEach(telecom => {
      if (telecom.system && telecom.value) {
        const system = telecom.system.toLowerCase();
        if (!telecomBySystem.has(system)) {
          telecomBySystem.set(system, new Set<string>());
        }
        telecomBySystem.get(system)!.add(telecom.value);
      }
    });

    // Sort systems by priority and render
    return Array.from(telecomBySystem.entries())
      .sort(([systemA], [systemB]) => {
        const priorityA = systemPriority.indexOf(systemA);
        const priorityB = systemPriority.indexOf(systemB);
        
        // If both are in priority list, sort by priority
        if (priorityA !== -1 && priorityB !== -1) {
          return priorityA - priorityB;
        }
        // If only one is in priority list, prioritize it
        if (priorityA !== -1) return -1;
        if (priorityB !== -1) return 1;
        // If neither is in priority list, sort alphabetically
        return systemA.localeCompare(systemB);
      })
      .map(([system, values]) => {
        const systemLabel = this.capitalize(system);
        const valueList = Array.from(values)
          .map(value => `<li>${value}</li>`)
          .join('');
        return `<li><strong>${systemLabel}:</strong><ul>${valueList}</ul></li>`;
      })
      .join('');
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

    const uniqueAddresses = new Set<string>();

    patient.address.forEach(address => {
      const addressText = address.text ||
        ((address.line || []).join(', ') + ', ' + (address.city || '') + ', ' + (address.country || '')).trim();
      
      if (addressText) {
        uniqueAddresses.add(addressText);
      }
    });

    return Array.from(uniqueAddresses)
      .map(addressText => `<ul><li>${addressText}</li></ul>`)
      .join('');
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
      return `<ul><li>${language}${preferred}</li></ul>`;
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
