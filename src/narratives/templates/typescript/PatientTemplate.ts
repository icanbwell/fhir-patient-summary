// PatientTemplate.ts - TypeScript replacement for Jinja2 patient.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TPatient } from '../../../types/resources/Patient';
import {ISummaryTemplate} from './interfaces/ITemplate';
import { THumanName } from '../../../types/partials/HumanName';
import { TContactPoint } from '../../../types/partials/ContactPoint';
import { TAddress } from '../../../types/partials/Address';
import { TPatientCommunication } from '../../../types/partials/PatientCommunication';
import { ADDRESS_SIMILARITY_THRESHOLD } from '../../../constants';
import { TComposition } from '../../../types/resources/Composition';

/**
 * Class to generate HTML narrative for Patient resources
 * This replaces the Jinja2 patient.j2 template
 */
export class PatientTemplate implements ISummaryTemplate {
  /**
   * Generate HTML narrative for Patient resources
   * @param resources - FHIR Patient resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    return PatientTemplate.generateStaticNarrative(resources, timezone);
  }

  /**
   * Generate HTML narrative for Patient resources using summary
   * @param resources - FHIR Composition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public generateSummaryNarrative(resources: TComposition[], timezone: string | undefined): string | undefined {
    const templateUtilities = new TemplateUtilities(resources);

    const compositionResources = resources[0];

    const data: Record<string, string> = {}
    for (const rowData of compositionResources.section ?? []){
      for (const columnData of rowData.section ?? []){
        switch (columnData.title){
          case 'Name':
          case 'Address':
          case 'Communication':
            data[columnData.title] = templateUtilities.renderListSectionData(columnData.section ?? []);
            break;
          case 'Telecom':
            {
              const telecomStringParts: string[] = [];
              for (const telecomData of columnData.section ?? []){
                const telecomSystem = telecomData?.title;
                const telecomValue = templateUtilities.renderListSectionData(telecomData.section ?? []);
                if (telecomSystem && telecomValue){
                  telecomStringParts.push(`<li><strong>${telecomSystem}:</strong>${telecomValue}</li>`);
                }
              }
              data["Telecom"] = `<ul>${telecomStringParts.join('')}</ul>`;
              break;
            }
          default:
            if (columnData.title){
              data[columnData.title] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? "");
            }
            break;
        }
      }
    }

    let html = `<p>This section merges all Patient resources into a single combined patient record, preferring non-empty values for each field.</p>`;
    html += `<div>
      <ul>
        <li><strong>Name(s):</strong>${data["Name"] || ''}</li>
        <li><strong>Gender:</strong>${data["Gender"] || ''}</li>
        <li><strong>Date of Birth:</strong>${data["Date of Birth"] || ''}</li>
        <li><strong>Telecom:</strong>${data["Telecom"] || ''}</li>
        <li><strong>Address(es):</strong>${data["Address"] || ''}</li>
        ${data["Marital Status"] ? `<li><strong>Marital Status:</strong>${data["Marital Status"]}</li>` : '' }
        ${data["Deceased"] ? `<li><strong>Deceased:</strong>${data["Deceased"]}</li>` : ''}
        <li><strong>Language(s):</strong>${data["Communication"] || ''}</li>
      </ul>
    </div>`;

    return html;
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resources - FHIR Patient resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static generateStaticNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    const templateUtilities = new TemplateUtilities(resources);
    // For multiple patients, merge their data
    const combinedPatient = this.combinePatients(resources);
    const deceasedText = this.renderDeceased(combinedPatient)
    
    // Start building the HTML
    let html = `<p>This section merges all Patient resources into a single combined patient record, preferring non-empty values for each field.</p>`;
    html += `<div>
      <ul>
        <li><strong>Name(s):</strong>${this.renderNames(combinedPatient)}</li>
        <li><strong>Gender:</strong>${combinedPatient.gender ? this.capitalize(combinedPatient.gender) : ''}</li>
        <li><strong>Date of Birth:</strong>${combinedPatient.birthDate || ''}</li>
        <li><strong>Telecom:</strong><ul>${this.renderTelecom(combinedPatient)}</ul></li>
        <li><strong>Address(es):</strong>${this.renderAddresses(combinedPatient)}</li>
        ${combinedPatient.maritalStatus?.text ? `<li><strong>Marital Status:</strong> ${combinedPatient.maritalStatus.text}</li>` : ''}
        ${deceasedText ? `<li><strong>Deceased:</strong>${deceasedText}</li>` : ''}
        <li><strong>Language(s):</strong>${this.renderCommunication(templateUtilities, combinedPatient)}</li>
      </ul>
    </div>`;
    return html;
  }

  /**
   * Combines multiple patient resources into a single patient object
   * Merges fields, preferring non-empty values
   * @param patients - Array of patient resources
   * @returns Combined patient resource
   */
  private static combinePatients(patients: TPatient[]): TPatient {
    if (patients.length === 1) {
      return patients[0];
    }

    // Start with the first patient as base
    const combined: TPatient = patients[0];

    // Merge arrays that need deduplication
    const allNames = [] as THumanName[];
    const allTelecom = [] as TContactPoint[];
    const allAddresses = [] as TAddress[];
    const allCommunication = [] as TPatientCommunication[];

    patients.forEach(patient => {
      // Merge names
      if (patient.name) {
        allNames.push(...patient.name);
      }

      // Merge telecom
      if (patient.telecom) {
        allTelecom.push(...patient.telecom);
      }

      // Merge addresses
      if (patient.address) {
        allAddresses.push(...patient.address);
      }

      // Merge communication
      if (patient.communication) {
        allCommunication.push(...patient.communication);
      }

      // Merge simple fields (prefer non-empty values)
      if (!combined.gender && patient.gender) {
        combined.gender = patient.gender;
      }
      if (!combined.birthDate && patient.birthDate) {
        combined.birthDate = patient.birthDate;
      }
      if (!combined.maritalStatus && patient.maritalStatus) {
        combined.maritalStatus = patient.maritalStatus;
      }
      if (!combined.deceasedBoolean && patient.deceasedBoolean !== undefined) {
        combined.deceasedBoolean = patient.deceasedBoolean;
      }
      if (!combined.deceasedDateTime && patient.deceasedDateTime) {
        combined.deceasedDateTime = patient.deceasedDateTime;
      }
    });

    // Set combined arrays
    combined.name = allNames;
    combined.telecom = allTelecom;
    combined.address = allAddresses;
    combined.communication = allCommunication;

    return combined;
  }

  /**
   * Renders patient names as HTML list items
   * @param patient - Patient resources
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
        if (nameText) {
          uniqueNames.add(nameText);
        }
      }
    });

    const namesHtml = Array.from(uniqueNames)
        .map(nameText => `<li>${nameText}</li>`)
        .join('');
    return `<ul>${namesHtml}</ul>`;
  }

  /**
   * Renders patient telecom information grouped by system
   * @param patient - Patient resources
   * @returns HTML string grouped by system
   */
  private static renderTelecom(patient: TPatient): string {
    if (!patient.telecom || patient.telecom.length === 0) {
      return '';
    }

    const systemPriority = ['email', 'phone', 'pager', 'sms', 'fax', 'url', 'other'];
    const numberSystems = ['phone', 'pager', 'sms', 'fax'];
    const telecomBySystem = new Map<string, Set<string>>();

    // Group unique values by system
    patient.telecom.forEach(telecom => {
      if (telecom.system && telecom.value && telecom.use !== 'old') {
        const system = telecom.system.toLowerCase();
        if (!telecomBySystem.has(system)) {
          telecomBySystem.set(system, new Set<string>());
        }
        telecomBySystem.get(system)!.add(telecom.value);
      }
    });
    
    // Remove duplicate numbers with country code
    for (const system of numberSystems) {
      const currentNumbers = Array.from(telecomBySystem.get(system) || []);
      if (currentNumbers.length <= 1) continue;

      // Extract only digits from numbers and create mapping
      const numbersWithCleaned = currentNumbers.map(num => ({
        original: num,
        cleaned: num.replace(/\D/g, ''),
      }));

      // Find duplicates where one number is a suffix of another (indicating country code difference)
      const toRemove = new Set<string>();

      for (let i = 0; i < numbersWithCleaned.length; i++) {
        for (let j = i + 1; j < numbersWithCleaned.length; j++) {
          const num1 = numbersWithCleaned[i];
          const num2 = numbersWithCleaned[j];

          // If one cleaned number ends with the other, keep the longer one (with country code)
          if (num1.cleaned.endsWith(num2.cleaned)) {
            toRemove.add(num2.original);
          } else if (num2.cleaned.endsWith(num1.cleaned)) {
            toRemove.add(num1.original);
          }
        }
      }

      // Remove duplicates from the set
      toRemove.forEach(numberToRemove => {
        telecomBySystem.get(system)?.delete(numberToRemove);
      });
    }

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
   * @param patient - Patient resources
   * @returns HTML string of list items
   */
  private static renderAddresses(patient: TPatient): string {
    if (!patient.address || patient.address.length === 0) {
      return '';
    }

    const uniqueAddresses = new Set<string>();

    patient.address.forEach(address => {
      if (address.use === 'old') {
        return;
      }
      const addressArray = [];
      if (address.text) {
        addressArray.push(address.text);
      } else {
        if (address.line) {
          addressArray.push(...address.line);
        }
        if (address.city) {
          addressArray.push(address.city);
        }
        if (address.district) {
          addressArray.push(address.district);
        }
        if (address.state) {
          addressArray.push(address.state);
        }
        if (address.country) {
          addressArray.push(address.country);
        }
        if (address.postalCode) {
          addressArray.push(address.postalCode);
        }
      }
      const addressText = addressArray.join(', ').trim();

      if (addressText) {
        uniqueAddresses.add(addressText);
      }
    });

    // deduplicate similar addresses
    const deduplicatedAddresses = this.deduplicateSimilarAddresses(Array.from(uniqueAddresses));

    const addressesHtml = deduplicatedAddresses
      .map(addressText => `<li>${addressText}</li>`)
      .join('');
    return `<ul>${addressesHtml}</ul>`;
  }

  /**
   * Calculates the similarity between two strings using Levenshtein distance
   * Returns a percentage (0-100) indicating how similar the strings are
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Similarity percentage (0-100)
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 100.0;
    }
    
    const editDistance = this.levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return ((longer.length - editDistance) / longer.length) * 100;
  }

  /**
   * Calculates the Levenshtein distance between two strings
   * @param str1 - First string
   * @param str2 - Second string
   * @returns The Levenshtein distance
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Initialize the matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill in the matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Deduplicates addresses that are more than ADDRESS_SIMILARITY_THRESHOLD% similar
   * @param addresses - Array of address strings
   * @returns Array of deduplicated addresses
   */
  private static deduplicateSimilarAddresses(addresses: string[]): string[] {
    if (addresses.length <= 1) {
      return addresses;
    }

    const deduplicated: string[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < addresses.length; i++) {
      if (processed.has(i)) {
        continue;
      }

      let keepAddress = addresses[i];
      processed.add(i);

      // Check if any remaining addresses are similar
      for (let j = i + 1; j < addresses.length; j++) {
        if (processed.has(j)) {
          continue;
        }

        const similarity = this.calculateStringSimilarity(addresses[i], addresses[j]);
        
        if (similarity > ADDRESS_SIMILARITY_THRESHOLD) {
          // Mark as processed and keep the longer/more complete address
          processed.add(j);
          if (addresses[j].length > keepAddress.length) {
            keepAddress = addresses[j];
          }
        }
      }

      deduplicated.push(keepAddress);
    }

    return deduplicated;
  }

  /**
   * Renders patient deceased status
   * @param patient - Patient resources
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
   * @param patient - Patient resources
   * @returns HTML string of list items
   */
  private static renderCommunication(templateUtilities: TemplateUtilities, patient: TPatient): string {
    if (!patient.communication || patient.communication.length === 0) {
      return '';
    }
    const uniqueLanguages = new Set<string>();
    const preferredLanguages = new Set<string>();

    patient.communication.forEach(comm => {
      const language = templateUtilities.renderTextAsHtml(templateUtilities.codeableConceptDisplay(comm.language));
      if (language) {
        if (comm.preferred) {
          preferredLanguages.add(language);
        }
        uniqueLanguages.add(language);
      }
    });

     const languagesHtml = Array.from(uniqueLanguages)
      .map(language => `<li>${language}${preferredLanguages.has(language) ? ' (preferred)' : ''}</li>`)
      .join('');
    return `<ul>${languagesHtml}</ul>`;
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
