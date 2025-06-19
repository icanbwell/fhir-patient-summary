// TemplateUtilities.ts - TypeScript replacement for Jinja2 utility-fragments.j2
import {TCodeableConcept} from '../../../types/partials/CodeableConcept';
import {TReference} from '../../../types/partials/Reference';
import {TDevice} from '../../../types/resources/Device';
import {TOrganization} from '../../../types/resources/Organization';
import {TMedication} from '../../../types/resources/Medication';
import {TImmunization} from "../../../types/resources/Immunization";
import {TMedicationStatement} from "../../../types/resources/MedicationStatement";
import {TQuantity} from "../../../types/partials/Quantity";
import {TObservation} from "../../../types/resources/Observation";
import {TObservationComponent} from "../../../types/partials/ObservationComponent";
import {TBundle} from "../../../types/resources/Bundle";
import {TDomainResource} from "../../../types/resources/DomainResource";
import {TExtension} from "../../../types/partials/Extension";
import {TResourceContainer} from "../../../types/simpleTypes/ResourceContainer";
import {TInstant} from "../../../types/simpleTypes/Instant";
import {DateTime, DateTimeFormatOptions} from "luxon";

type ObservationValueType =
    | string
    | number
    | boolean
    | TQuantity
    | { code?: string; text?: string }
    | Date;

/**
 * Utility class containing methods for formatting and rendering FHIR resources
 * This replaces the Jinja2 utility-fragments.j2 macros
 */
export class TemplateUtilities {
    private readonly bundle: TBundle;

    /**
     * Constructor to initialize the TemplateUtilities with a FHIR Bundle
     * @param bundle - FHIR Bundle containing resources
     */
    constructor(bundle: TBundle) {
        this.bundle = bundle;
    }

    /**
     * Formats a CodeableConcept object
     * @param cc - The CodeableConcept object
     * @param field - Optional specific field to return
     * @returns Formatted string representation
     */
    codeableConcept(cc?: TCodeableConcept | null, field?: string): string {
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

    resolveReference<T extends TDomainResource>(ref: TReference): T | null {
        // find the resource in the bundle that matches the reference
        if (!ref || !this.bundle || !this.bundle.entry) {
            return null;
        }
        // split the reference into referenceResourceType and id on /
        const referenceParts = ref.reference?.split('/');
        if (!referenceParts || referenceParts.length !== 2) {
            return null;
        }
        const referenceResourceType = referenceParts[0];
        const referenceResourceId = referenceParts[1];

        const resource = this.bundle.entry.find(entry => {
            return entry.resource && entry.resource.resourceType === referenceResourceType &&
                entry.resource.id === referenceResourceId;
        });
        return resource ? (resource.resource as T) : null;
    }

    /**
     * Renders a Device reference
     * @param deviceRef - Reference to a Device resource
     * @returns Formatted device description
     */
    renderDevice(deviceRef: TReference): string {
        const device: TDevice | undefined = deviceRef && this.resolveReference(deviceRef) as TDevice;

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
    renderOrganization(orgRef: TReference): string {
        const organization: TOrganization | null = orgRef && this.resolveReference(orgRef);

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
    renderVaccineManufacturer(immunization: TImmunization): string {
        const organization: TOrganization | undefined = immunization.manufacturer && this.resolveReference(immunization.manufacturer) as TOrganization;

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
    renderMedicationStatement(medicationType: TMedicationStatement): string {
        if (typeof medicationType !== 'object' || medicationType === null) {
            return '';
        }

        if (medicationType.medicationCodeableConcept) {
            return this.codeableConcept(medicationType.medicationCodeableConcept);
        } else if (medicationType.medicationReference) {
            return this.renderMedicationRef(medicationType.medicationReference);
        }

        return '';
    }

    /**
     * Renders a medication reference
     * @param medicationRef - Reference to a Medication resource
     * @returns Formatted medication description
     */
    renderMedicationRef(medicationRef: TReference): string {
        const medication = medicationRef && this.resolveReference(medicationRef) as TMedication;

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
    renderMedicationCode(medication: TMedication): string {
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
    renderDoseNumber(doseNumber: any): string {
        if (doseNumber && doseNumber.value !== undefined) {
            return doseNumber.value.toString();
        }

        return '';
    }

    /**
     * Renders the unit of a value
     * @param value - Value object
     * @returns Unit string
     */
    renderValueUnit(value: any): string {
        if (value && value.constructor?.name === 'Quantity' && value.unit) {
            return value.unit;
        }

        return '';
    }

    /**
     * Renders an effective date
     * @param effective - Date value
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns Formatted date string
     */
    renderEffective(effective: any, timezone: string | undefined): string {
        return this.formatDateTime(effective, timezone);
    }

    /**
     * Renders a time value
     * @param time - Time value
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns Formatted time string
     */
    renderTime(time: TInstant | string | undefined, timezone: string | undefined): string {
        return this.formatDateTime(time, timezone);
    }

    /**
     * Renders a date value
     * @param date - Date value
     * @returns Formatted date string (date only, no time component)
     */
    renderDate(date: string | Date | undefined): string {
        return this.formatDateTime(date, undefined, true);
    }

    /**
     * Renders a recorded date
     * @param recorded - Date value
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns Formatted date string
     */
    renderRecorded(recorded: any, timezone: string | undefined): string {
        return this.formatDateTime(recorded, timezone);
    }

    /**
     * Concatenates a list of items, optionally extracting a specific attribute
     * @param list - Array of items
     * @param attr - Optional attribute to extract from each item
     * @returns Comma-separated string of items
     */
    concat(list?: any[] | null, attr?: string): string {
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
    safeConcat(list?: any[] | null, attr?: string): string {
        return this.concat(list || [], attr);
    }

    /**
     * Concatenates text from a list of CodeableConcept objects
     * @param list - Array of CodeableConcept objects
     * @returns Comma-separated string of text values
     */
    concatCodeableConcept(list?: TCodeableConcept[] | null): string {
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
    concatReactionManifestation(list?: any[] | null): string {
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
    concatDoseNumber(list?: any[] | null): string {
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
    concatDosageRoute(list?: any[] | null): string {
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
    firstFromCodeableConceptList(list?: TCodeableConcept[] | null): string {
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
    concatReferenceRange(list?: any[] | null): string {
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
    renderComponent(list?: any[] | null): string {
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

    narrativeLinkExtension(source: TResourceContainer | undefined): TExtension | undefined {
        // If source is undefined or null, return empty string
        if (!source) {
            return undefined;
        }

        // Case 1: Source is a resource with an extensions array
        if (source.extension && Array.isArray(source.extension)) {
            const extension = source.extension.find((ext: any) =>
                ext.url === 'http://hl7.org/fhir/StructureDefinition/narrativeLink'
            );

            if (extension) {
                return extension;
            }
            return undefined;
        }

        // Case 2: Source is the extension itself
        return source;
    }

    /**
     * Extracts narrative link ID from extension or resource
     * @param source - Extension object or resource with extensions array
     * @returns Extracted ID or empty string
     */
    narrativeLinkId(source: any): string {
        const extension = this.narrativeLinkExtension(source);
        // If no extension found, return empty string
        if (!extension) {
            return '';
        }
        // Case 2: Source is the extension itself
        return this.extractIdFromExtension(extension);
    }

    /**
     * Helper method to extract ID from an extension object
     * @param extension - Extension object
     * @returns Extracted ID or empty string
     */
    private extractIdFromExtension(extension: any): string {
        if (typeof extension === 'object' &&
            extension.value &&
            extension.value.value &&
            typeof extension.value.value === 'string' &&
            extension.value.value.includes('#')) {
            return extension.value.value.split('#')[1];
        }
        return '';
    }


    public extractObservationValue(observation: TObservation | TObservationComponent): ObservationValueType | null {
        // Check all possible value fields in order
        const valueFields = [
            'valueString',
            'valueInteger',
            'valueBoolean',
            'valueQuantity',
            'valueCodeableConcept',
            'valueDateTime',
            'valueTime',
            'valuePeriod'
        ];

        for (const field of valueFields) {
            // @ts-expect-error accessing dynamic field
            const observationElement = observation[`${field}`];
            if (observationElement !== undefined) {
                switch (field) {
                    case 'valueQuantity':
                        // For quantity, return a string representation
                        return this.formatQuantityValue(observationElement);
                    case 'valueCodeableConcept':
                        // For codeable concept, return code or text
                        return this.formatCodeableConceptValue(observationElement);
                    default:
                        return observationElement;
                }
            }
        }

        // Check component values if no direct value found
        // @ts-expect-error accessing dynamic field
        if (observation?.component && observation.component.length > 0) {
            // @ts-expect-error accessing dynamic field
            for (const component of observation.component) {
                const componentValue = this.extractObservationValue(component);
                if (componentValue !== null) {
                    return componentValue;
                }
            }
        }

        // Check for data absent reason if no value found
        if (observation.dataAbsentReason) {
            return this.formatCodeableConceptValue(observation.dataAbsentReason);
        }

        return null;
    }

    private formatQuantityValue(quantity: TQuantity): string {
        if (!quantity) return '';

        const parts = [];
        if (quantity.comparator) parts.push(quantity.comparator);
        if (quantity.value !== undefined) parts.push(quantity.value.toString());
        if (quantity.unit) parts.push(quantity.unit);

        return parts.join(' ').trim();
    }

    private formatCodeableConceptValue(concept: any): string {
        if (!concept) return '';

        // Prefer text if available
        if (concept.text) return concept.text;

        // Otherwise, use the first coding's display or code
        if (concept.coding && concept.coding.length > 0) {
            return concept.coding[0].display || concept.coding[0].code || '';
        }

        return '';
    }

    public extractObservationValueUnit(observation: TObservation | TObservationComponent): string {
        // Check if the observation has a valueQuantity field
        if (observation.valueQuantity && observation.valueQuantity.unit) {
            return observation.valueQuantity.unit;
        }

        // If no valueQuantity, check components
        // @ts-expect-error accessing dynamic field
        if (observation.component && observation.component.length > 0) {
            // @ts-expect-error accessing dynamic field
            for (const component of observation.component) {
                const unit = this.extractObservationValueUnit(component);
                if (unit) {
                    return unit;
                }
            }
        }

        // If no unit found, return empty string
        return '';
    }

    /**
     * Gets the medication name from various types of medication references or resources
     * @param medicationSource - Can be a Reference to Medication, a CodeableConcept, or a Medication resource
     * @returns The medication name as a string
     */
    getMedicationName(medicationSource: TReference | TCodeableConcept | TMedication | null | undefined): string {
        if (!medicationSource) {
            return '';
        }

        // Case 1: It's a Medication resource
        if (typeof medicationSource === 'object' && 'resourceType' in medicationSource && medicationSource.resourceType === 'Medication') {
            return this.renderMedicationCode(medicationSource);
        }

        // Case 2: It's a CodeableConcept (medicationCodeableConcept)
        if (typeof medicationSource === 'object' && ('coding' in medicationSource || 'text' in medicationSource)) {
            return this.codeableConcept(medicationSource as TCodeableConcept);
        }

        // Case 3: It's a Reference to a Medication resource (medicationReference)
        if (typeof medicationSource === 'object' && 'reference' in medicationSource) {
            const medication = this.resolveReference<TMedication>(medicationSource);
            if (medication && medication.code) {
                return this.codeableConcept(medication.code);
            }
        }

        return '';
    }

    /**
     * Helper method to format dates with Luxon
     * @param dateValue - The date value to format
     * @param timezone - Optional timezone
     * @param dateOnly - Whether to format as date only (without time)
     * @returns Formatted date string
     * @private
     */
    private formatDateTime(dateValue: any, timezone?: string, dateOnly = false): string {
        if (!dateValue) return '';

        try {
            let dateTime: DateTime;

            // Handle different input types
            if (dateValue instanceof Date) {
                dateTime = DateTime.fromJSDate(dateValue);
            } else if (typeof dateValue === 'string') {
                // Luxon can handle ISO format dates correctly
                dateTime = DateTime.fromISO(dateValue);

                // For date-only strings (YYYY-MM-DD), use date-only formatting
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                    dateOnly = true;
                }
            } else {
                dateTime = DateTime.fromISO(String(dateValue));
            }

            if (!dateTime.isValid) {
                return String(dateValue);
            }

            // Set timezone if provided
            if (timezone && !dateOnly) {
                dateTime = dateTime.setZone(timezone);
            }

            // Format options
            const formatOptions: DateTimeFormatOptions = dateOnly ?
                { year: 'numeric', month: '2-digit', day: '2-digit' } :
                {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true,
                    timeZoneName: 'short'
                };

            return dateTime.toLocaleString(formatOptions);
        } catch {
            return String(dateValue);
        }
    }
}
