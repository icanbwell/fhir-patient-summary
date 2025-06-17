// TemplateUtilities.ts - TypeScript replacement for Jinja2 utility-fragments.j2
import { TCodeableConcept } from '../../../types/partials/CodeableConcept';
import { TReference } from '../../../types/partials/Reference';
import { TDevice } from '../../../types/resources/Device';
import { TOrganization } from '../../../types/resources/Organization';
import { TMedication } from '../../../types/resources/Medication';

/**
 * Utility class containing methods for formatting and rendering FHIR resources
 * This replaces the Jinja2 utility-fragments.j2 macros
 */
export class TemplateUtilities {
  /**
   * Formats a CodeableConcept object
   * @param cc - The CodeableConcept object
   * @param field - Optional specific field to return
   * @returns Formatted string representation
   */
  static codeableConcept(cc?: TCodeableConcept | null, field?: string): string {
    if (!cc) {
      return '';
    }

    // If a specific field is requested, use it if available
    if (field) {
      if (cc[field as keyof TCodeableConcept]) {
        return cc[field as keyof TCodeableConcept] as string;
      } else if (cc.coding && cc.coding[0] && cc.coding[0][field as keyof typeof cc.coding[0]]) {
        return cc.coding[0][field as keyof typeof cc.coding[0]] as string;
      }
    }

    // Default order: text, display, code, coding[0].display, coding[0].code
    if (cc.text) {
      return cc.text;
    } else if ('display' in cc && cc.display) {
      return cc.display as string;
    } else if (cc.coding && cc.coding[0]) {
      if (cc.coding[0].display) {
        return cc.coding[0].display;
      } else if (cc.coding[0].code) {
        return cc.coding[0].code;
      }
    }

    return '';
  }

  /**
   * Renders a Device reference
   * @param deviceRef - Reference to a Device resource
   * @returns Formatted device description
   */
  static renderDevice(deviceRef: TReference): string {
    const device = deviceRef && typeof deviceRef.resolve === 'function' ? deviceRef.resolve() as TDevice : null;

    if (device && device.resourceType === 'Device' && device.type) {
      return this.codeableConcept(device.type, 'display');
    }

    return '';
  }

  /**
   * Renders an Organization reference
   * @param orgRef - Reference to an Organization resource
   * @returns Organization name
   */
  static renderOrganization(orgRef: TReference): string {
    const organization = orgRef && typeof orgRef.resolve === 'function' ?
      orgRef.resolve() as TOrganization : null;

    if (organization && organization.resourceType === 'Organization' && organization.name) {
      return organization.name;
    }

    return '';
  }

  /**
   * Renders a vaccine manufacturer
   * @param immunization - Immunization resource
   * @returns Manufacturer name
   */
  static renderVaccineManufacturer(immunization: any): string {
    const organization = immunization.manufacturer && typeof immunization.manufacturer.resolve === 'function' ?
      immunization.manufacturer.resolve() as TOrganization : null;

    if (organization && organization.resourceType === 'Organization' && organization.name) {
      return organization.name;
    }

    return '';
  }

  /**
   * Renders a medication
   * @param medicationType - Resource containing medication information
   * @returns Formatted medication description
   */
  static renderMedication(medicationType: any): string {
    if (typeof medicationType !== 'object' || medicationType === null) {
      return '';
    }

    if (medicationType.medicationCodeableConcept) {
      return this.codeableConcept(medicationType.medicationCodeableConcept);
    } else if (medicationType.medicationReference) {
      return this.renderMedicationRef({ medication: medicationType.medicationReference });
    } else if (medicationType.medication) {
      if (medicationType.medication.constructor &&
          medicationType.medication.constructor.name === 'CodeableConcept') {
        return this.codeableConcept(medicationType.medication, 'display');
      } else if (medicationType.medication.constructor &&
                medicationType.medication.constructor.name === 'Reference') {
        return this.renderMedicationRef(medicationType);
      }
    }

    return '';
  }

  /**
   * Renders a medication reference
   * @param medicationRef - Reference to a Medication resource
   * @returns Formatted medication description
   */
  static renderMedicationRef(medicationRef: any): string {
    const medication = medicationRef.medication && typeof medicationRef.medication.resolve === 'function' ?
      medicationRef.medication.resolve() as TMedication : null;

    if (medication) {
      return this.renderMedicationCode(medication);
    }

    return '';
  }

  /**
   * Renders a medication code
   * @param medication - Medication resource
   * @returns Formatted medication code
   */
  static renderMedicationCode(medication: TMedication): string {
    if (medication && medication.code) {
      return this.codeableConcept(medication.code, 'display');
    }

    return '';
  }

  /**
   * Renders a dose number
   * @param doseNumber - Dose number object
   * @returns Formatted dose number
   */
  static renderDoseNumber(doseNumber: any): string {
    if (doseNumber && doseNumber.value !== undefined) {
      return doseNumber.value.toString();
    }

    return '';
  }

  /**
   * Renders a value based on its type
   * @param value - Value object (Quantity, DateTime, CodeableConcept, etc.)
   * @returns Formatted value
   */
  static renderValue(value: any): string {
    if (!value) {
      return '';
    }

    const className = value.constructor?.name;

    if (className === 'Quantity' && value.value !== undefined) {
      return value.value.toString();
    } else if (className === 'DateTimeType' && value.value !== undefined) {
      return value.value.toString();
    } else if (className === 'CodeableConcept') {
      return this.codeableConcept(value, 'display');
    } else if (className === 'StringType' && value.value !== undefined) {
      return value.value.toString();
    }

    return '';
  }

  /**
   * Renders the unit of a value
   * @param value - Value object
   * @returns Unit string
   */
  static renderValueUnit(value: any): string {
    if (value && value.constructor?.name === 'Quantity' && value.unit) {
      return value.unit;
    }

    return '';
  }

  /**
   * Renders an effective date
   * @param effective - Date value
   * @returns Formatted date string
   */
  static renderEffective(effective: any): string {
    return effective ? effective.toString() : '';
  }

  /**
   * Renders a time value
   * @param time - Time value
   * @returns Formatted time string
   */
  static renderTime(time: any): string {
    return time ? time.toString() : '';
  }

  /**
   * Renders a recorded date
   * @param recorded - Date value
   * @returns Formatted date string
   */
  static renderRecorded(recorded: any): string {
    return recorded ? recorded.toString() : '';
  }

  /**
   * Concatenates a list of items, optionally extracting a specific attribute
   * @param list - Array of items
   * @param attr - Optional attribute to extract from each item
   * @returns Comma-separated string of items
   */
  static concat(list?: any[] | null, attr?: string): string {
    if (!list || !Array.isArray(list)) {
      return '';
    }

    const items: any[] = [];

    for (const item of list) {
      if (attr && item && typeof item === 'object' && attr in item) {
        items.push(item[attr]);
      } else if (!attr && item !== undefined) {
        items.push(item);
      }
    }

    return items
      .filter(item => typeof item === 'string' || typeof item === 'number')
      .join(', ');
  }

  /**
   * Safely concatenates a list of items, handling undefined/null lists
   * @param list - Array of items (or undefined/null)
   * @param attr - Optional attribute to extract from each item
   * @returns Comma-separated string of items
   */
  static safeConcat(list?: any[] | null, attr?: string): string {
    return this.concat(list || [], attr);
  }

  /**
   * Concatenates text from a list of CodeableConcept objects
   * @param list - Array of CodeableConcept objects
   * @returns Comma-separated string of text values
   */
  static concatCodeableConcept(list?: TCodeableConcept[] | null): string {
    if (!list || !Array.isArray(list)) {
      return '';
    }

    const items: string[] = [];

    for (const item of list) {
      if (item && item.text) {
        items.push(item.text);
      }
    }

    return items.join(', ');
  }

  /**
   * Concatenates reaction manifestations
   * @param list - Array of reaction objects
   * @returns Comma-separated string of manifestation texts
   */
  static concatReactionManifestation(list?: any[] | null): string {
    if (!list || !Array.isArray(list)) {
      return '';
    }

    const texts: string[] = [];

    for (const item of list) {
      if (item && item.manifestation && item.manifestation[0] && item.manifestation[0].text) {
        texts.push(item.manifestation[0].text);
      }
    }

    return texts.join(', ');
  }

  /**
   * Concatenates dose numbers
   * @param list - Array of dose objects
   * @returns Comma-separated string of dose numbers
   */
  static concatDoseNumber(list?: any[] | null): string {
    if (!list || !Array.isArray(list)) {
      return '';
    }

    const doseNumbers: string[] = [];

    for (const item of list) {
      if (item && item.doseNumberPositiveInt) {
        doseNumbers.push(item.doseNumberPositiveInt.toString());
      }
    }

    return doseNumbers.join(', ');
  }

  /**
   * Concatenates dosage routes
   * @param list - Array of dosage objects
   * @returns Comma-separated string of route texts
   */
  static concatDosageRoute(list?: any[] | null): string {
    if (!list || !Array.isArray(list)) {
      return '';
    }

    const routes: string[] = [];

    for (const item of list) {
      if (item && item.route && item.route.text) {
        routes.push(item.route.text);
      }
    }

    return routes.join(', ');
  }

  /**
   * Returns the first item from a list of CodeableConcept objects
   * @param list - Array of CodeableConcept objects
   * @returns Display text from the first item
   */
  static firstFromCodeableConceptList(list?: TCodeableConcept[] | null): string {
    if (list && Array.isArray(list) && list[0]) {
      return this.codeableConcept(list[0], 'display');
    }

    return '';
  }

  /**
   * Concatenates reference range texts
   * @param list - Array of reference range objects
   * @returns Comma-separated string of texts
   */
  static concatReferenceRange(list?: any[] | null): string {
    if (!list || !Array.isArray(list)) {
      return '';
    }

    const texts: string[] = [];

    for (const item of list) {
      if (item && item.text) {
        texts.push(item.text);
      }
    }

    return texts.join(', ');
  }

  /**
   * Renders component codes
   * @param list - Array of component objects
   * @returns Comma-separated string of code texts
   */
  static renderComponent(list?: any[] | null): string {
    if (!list || !Array.isArray(list)) {
      return '';
    }

    const texts: string[] = [];

    for (const item of list) {
      if (item && item.code && item.code.text) {
        texts.push(item.code.text);
      }
    }

    return texts.join(', ');
  }

  /**
   * Extracts narrative link ID from extension or resource
   * @param source - Extension object or resource with extensions array
   * @returns Extracted ID or empty string
   */
  static narrativeLinkId(source: any): string {
    // If source is undefined or null, return empty string
    if (!source) {
      return '';
    }

    // Case 1: Source is a resource with an extensions array
    if (source.extension && Array.isArray(source.extension)) {
      const extension = source.extension.find((ext: any) =>
        ext.url === 'http://hl7.org/fhir/StructureDefinition/narrativeLink'
      );

      if (extension) {
        return this.extractIdFromExtension(extension);
      }
      return '';
    }

    // Case 2: Source is the extension itself
    return this.extractIdFromExtension(source);
  }

  /**
   * Helper method to extract ID from an extension object
   * @param extension - Extension object
   * @returns Extracted ID or empty string
   */
  private static extractIdFromExtension(extension: any): string {
    if (typeof extension === 'object' &&
        extension.value &&
        extension.value.value &&
        typeof extension.value.value === 'string' &&
        extension.value.value.includes('#')) {
      return extension.value.value.split('#')[1];
    }
    return '';
  }
}
