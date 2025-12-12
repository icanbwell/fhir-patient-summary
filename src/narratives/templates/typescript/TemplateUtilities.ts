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
import {TDomainResource} from "../../../types/resources/DomainResource";
import {TExtension} from "../../../types/partials/Extension";
import {TResourceContainer} from "../../../types/simpleTypes/ResourceContainer";
import {TInstant} from "../../../types/simpleTypes/Instant";
import {DateTime, DateTimeFormatOptions} from "luxon";
import {TAnnotation} from "../../../types/partials/Annotation";
import {TPeriod} from "../../../types/partials/Period";
import {TRange} from "../../../types/partials/Range";
import {TRatio} from "../../../types/partials/Ratio";
import { BLOOD_PRESSURE_LOINC_CODES, PREGNANCY_LOINC_CODES } from '../../../structures/ips_section_loinc_codes';
import { TCoding } from '../../../types/partials/Coding';
import CODING_SYSTEM_DISPLAY_NAMES from '../../../structures/codingSystemDisplayNames';

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
    private readonly resources: TDomainResource[];

    /**
     * Constructor to initialize the TemplateUtilities with a FHIR resources
     * @param resources - FHIR resources
     */
    constructor(resources: TDomainResource[]) {
        this.resources = resources;
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

        // Always append code (SystemName) if coding exists
        let codeSystemDisplay = '';
        if (cc.coding && cc.coding[0]) {
            const coding = cc.coding[0];
            const code = coding.code || '';
            const system = coding.system || '';
            const systemDisplay = CODING_SYSTEM_DISPLAY_NAMES[system] || system;
            if (code) {
                codeSystemDisplay = `<span class="CodeSystemBlock"><span class="Code">${code}</span> <span class="System">(${systemDisplay})</span></span>`;
            }
        }

        if (cc.text) {
            return codeSystemDisplay ? `<span class="ConceptText">${cc.text}</span> ${codeSystemDisplay}` : `<span class="ConceptText">${cc.text}</span>`;
        } else if (cc.coding && cc.coding[0]) {
            const coding = cc.coding[0];
            if (coding.display) {
                return codeSystemDisplay ? `<span class="ConceptText">${coding.display}</span> ${codeSystemDisplay}` : `<span class="ConceptText">${coding.display}</span>`;
            } else if (codeSystemDisplay) {
                return codeSystemDisplay;
            }
        }

        return '';
    }

    resolveReference<T extends TDomainResource>(ref: TReference): T | null {
        // find the resource that matches the reference
        if (!ref || !this.resources) {
            return null;
        }
        // split the reference into referenceResourceType and id on /
        const referenceParts = ref.reference?.split('/');
        if (!referenceParts || referenceParts.length !== 2) {
            return null;
        }
        const referenceResourceType = referenceParts[0];
        const referenceResourceId = referenceParts[1];

        const resource = this.resources.find(entry => {
            return entry.resourceType === referenceResourceType &&
                entry.id === referenceResourceId;
        });
        return resource ? (resource as T) : null;
    }

    /**
     * Renders a Device reference
     * @param deviceRef - Reference to a Device resource
     * @returns Formatted device description
     */
    renderDevice(deviceRef: TReference): string {
        const device: TDevice | undefined = deviceRef && this.resolveReference(deviceRef) as TDevice;

        if (device && device.resourceType === 'Device' && device.deviceName && device.deviceName.length > 0) {
            return this.safeConcat(device.deviceName, 'name');
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
            return this.renderTextAsHtml(organization.name);
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
            return this.renderTextAsHtml(organization.name);
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
            return this.renderTextAsHtml(this.codeableConcept(medication.code, 'display'));
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
            return this.renderTextAsHtml(doseNumber.value.toString());
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
            return this.renderTextAsHtml(value.unit);
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
        return this.formatDateTime(date, 'UTC', true);
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
        return this.renderTextAsHtml(this.concat(list || [], attr));
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

        return this.renderTextAsHtml(items.join(', '));
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
            if (item && item.manifestation && item.manifestation[0]){ 
                if (item.manifestation[0].text) {
                  texts.push(item.manifestation[0].text);
                } else if (
                  item.manifestation[0].coding &&
                  item.manifestation[0].coding[0]?.display
                ) {
                  texts.push(item.manifestation[0].coding[0].display);
                }
            }
        }

        return this.renderTextAsHtml(texts.join(', '));
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

        return this.renderTextAsHtml(doseNumbers.join(', '));
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

        return this.renderTextAsHtml(routes.join(', '));
    }

    /**
     * Returns the first item from a list of CodeableConcept objects
     * @param list - Array of CodeableConcept objects
     * @returns Display text from the first item
     */
    firstFromCodeableConceptList(list?: TCodeableConcept[] | null): string {
        if (list && Array.isArray(list) && list[0]) {
            return this.renderTextAsHtml(this.codeableConcept(list[0], 'display'));
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

        return this.renderTextAsHtml(texts.join(', '));
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
        // additional handling for extracting blood pressure
        if (
          observation.code &&
          observation.code.coding &&
          'component' in observation &&
          Array.isArray((observation as TObservation).component)
        ) {
          const bpCode = observation.code.coding.find(
            (c: TCoding) => c.code === BLOOD_PRESSURE_LOINC_CODES.OBSERVATION
          );
          if (bpCode) {
            // If blood pressure code is found, extract systolic and diastolic values
            const systolicComponent = (
              observation as TObservation
            ).component?.find(c =>
              c.code?.coding?.some(
                cc => cc.code === BLOOD_PRESSURE_LOINC_CODES.SYSTOLIC
              )
            );
            const diastolicComponent = (
              observation as TObservation
            ).component?.find(c =>
              c.code?.coding?.some(
                cc => cc.code === BLOOD_PRESSURE_LOINC_CODES.DIASTOLIC
              )
            );
            if (systolicComponent && diastolicComponent) {
              const systolic = this.extractObservationValue(systolicComponent);
              const diastolic =
                this.extractObservationValue(diastolicComponent);
              return `${systolic}/${diastolic}`;
            }
          }
        }

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

    public extractPregnancyStatus(observation: TObservation): string {
        let status = '';
        // extract pregnancy status from the observation
        observation.code?.coding?.forEach((c: TCoding) => {
            if (c.code && Object.keys(PREGNANCY_LOINC_CODES.PREGNANCY_STATUS).includes(c.code)) {
                status = PREGNANCY_LOINC_CODES.PREGNANCY_STATUS[c.code as keyof typeof PREGNANCY_LOINC_CODES.PREGNANCY_STATUS];
            }
        });

        // check valueCodeableConcept for outcome codes
        if (observation.valueCodeableConcept) {
            observation.valueCodeableConcept.coding?.forEach((c: TCoding) => {
                if (c.code && Object.keys(PREGNANCY_LOINC_CODES.PREGNANCY_OUTCOME).includes(c.code)) {
                    if (status) {
                        status += ' - ';
                    }
                    status += PREGNANCY_LOINC_CODES.PREGNANCY_OUTCOME[c.code as keyof typeof PREGNANCY_LOINC_CODES.PREGNANCY_OUTCOME];
                }
            });
        }
        return status;
    }

    private formatFloatValue(value: any): string {
        // Format to maximum 2 decimal places, removing trailing zeros
        if (typeof value === 'number') {
            return value.toFixed(2).replace(/\.?0+$/, '');
        } else if (typeof value === 'string' && !isNaN(Number(value))) {
            return parseFloat(value).toFixed(2).replace(/\.?0+$/, '');
        }
        return value;
    }

    public extractObservationSummaryValue(data: Record<string, any>, timezone: string | undefined): string {
        // valueQuantity
        if (data["valueQuantity.value"] !== undefined) {
            let value = data["valueQuantity.value"];
            value = this.formatFloatValue(value);
            const unit = data["valueQuantity.unit"];
            return unit ? `${value} ${unit}` : `${value}`;
        }

        // valueCodeableConcept
        if (data["valueCodeableConcept.text"] !== undefined) {
            return data["valueCodeableConcept.text"];
        }
        if (data["valueCodeableConcept.coding.display"] !== undefined) {
            return data["valueCodeableConcept.coding.display"];
        }

        // valueString
        if (data["valueString"] !== undefined) {
            return data["valueString"];
        }

        // valueBoolean
        if (data["valueBoolean"] !== undefined) {
            return String(data["valueBoolean"]);
        }

        // valueInteger
        if (data["valueInteger"] !== undefined) {
            let value = String(data["valueInteger"]);
            value = this.formatFloatValue(value);
            return value;
        }

        // valueDateTime
        if (data["valueDateTime"] !== undefined) {
            return this.renderTime(data["valueDateTime"], timezone);
        }

        // valuePeriod
        if (data["valuePeriod.start"] !== undefined || data["valuePeriod.end"] !== undefined) {
            const start = this.renderTime(data["valuePeriod.start"], timezone);
            const end = this.renderTime(data["valuePeriod.end"], timezone);
            if (start && end) {
                return `${start} - ${end}`;
            } else if (start) {
                return `${start}`;
            } else if (end) {
                return `${end}`;
            }
        }

        // valueTime
        if (data["valueTime"] !== undefined) {
            return this.renderTime(data["valueTime"], timezone);
        }

        // valueSampledData
        if (data["valueSampledData.origin.value"] !== undefined || data["valueSampledData.origin.unit"] !== undefined) {
            let originValue = data["valueSampledData.origin.value"];
            originValue = this.formatFloatValue(originValue);
            const originUnit = data["valueSampledData.origin.unit"];
            let result = '';
            if (originValue !== undefined && originUnit !== undefined) {
                result = `${originValue} ${originUnit}`;
            } else if (originValue !== undefined) {
                result = `${originValue}`;
            } else if (originUnit !== undefined) {
                result = `${originUnit}`;
            }
            // Add other sampledData fields if present
            const period = this.formatFloatValue(data["valueSampledData.period"]);
            const factor = this.formatFloatValue(data["valueSampledData.factor"]);
            const lowerLimit = this.formatFloatValue(data["valueSampledData.lowerLimit"]);
            const upperLimit = this.formatFloatValue(data["valueSampledData.upperLimit"]);
            const sampledData = data["valueSampledData.data"];
            const extras: string[] = [];
            if (period !== undefined) extras.push(`period: ${period}`);
            if (factor !== undefined) extras.push(`factor: ${factor}`);
            if (lowerLimit !== undefined) extras.push(`lowerLimit: ${lowerLimit}`);
            if (upperLimit !== undefined) extras.push(`upperLimit: ${upperLimit}`);
            if (sampledData !== undefined) extras.push(`data: ${sampledData}`);
            if (extras.length > 0) {
                result += ` (${extras.join(', ')})`;
            }
            return result;
        }

        // valueRange
        if (data["valueRange.low.value"] !== undefined || data["valueRange.high.value"] !== undefined) {
            let referenceRange = '';
            if (data["valueRange.low.value"] !== undefined) {
                referenceRange += `${data["valueRange.low.value"]}`;
                if (data["valueRange.low.unit"] !== undefined) {
                    referenceRange += ` ${data["valueRange.low.unit"]}`;
                }
                referenceRange = referenceRange.trim();
                if (data["valueRange.high.value"] !== undefined) {
                    referenceRange += ' - ';
                }
            }
            if (data["valueRange.high.value"] !== undefined) {
                referenceRange += `${data["valueRange.high.value"]}`;
                if (data["valueRange.high.unit"] !== undefined) {
                    referenceRange += ` ${data["valueRange.high.unit"]}`;
                }
            }
            return referenceRange.trim();
        }

        // valueRatio
        if (data["valueRatio.numerator.value"] !== undefined || data["valueRatio.denominator.value"] !== undefined) {
            let ratio = '';
            if (data["valueRatio.numerator.value"] !== undefined) {
                ratio += `${this.formatFloatValue(data["valueRatio.numerator.value"])}`;
                if (data["valueRatio.numerator.unit"] !== undefined) {
                    ratio += ` ${data["valueRatio.numerator.unit"]}`;
                }
            }
            if (data["valueRatio.denominator.value"] !== undefined) {
                ratio += ' / ';
                ratio += `${this.formatFloatValue(data["valueRatio.denominator.value"])}`;
                if (data["valueRatio.denominator.unit"] !== undefined) {
                    ratio += ` ${data["valueRatio.denominator.unit"]}`;
                }
            }
            return ratio.trim();
        }

        // If nothing matched, return empty string
        return '';
    }

    public extractObservationSummaryReferenceRange(data: Record<string, any>): string {
        let referenceRange = '';
        if (data["referenceRange.low.value"]) {
            referenceRange += `${data["referenceRange.low.value"]} ${data["referenceRange.low.unit"]}`;
            referenceRange.trim();
            if (data["referenceRange.high.value"]) {
                referenceRange += ' - ';
            }
        }
        if (data["referenceRange.high.value"]) {
            referenceRange += `${data["referenceRange.high.value"]} ${data["referenceRange.high.unit"]}`;
        }
        return referenceRange.trim();
    }

    public extractObservationSummaryEffectiveTime(data: Record<string, any>, timezone: string | undefined): string {
        if (data["effectiveDateTime"]) {
            return this.renderTime(data["effectiveDateTime"], timezone);
        }
        let effectiveTimePeriod = '';
        if (data["effectivePeriod.start"]) {
            effectiveTimePeriod += this.renderTime(data["effectivePeriod.start"], timezone);
        }
        if (data["effectivePeriod.end"]) {
            effectiveTimePeriod += ` - ${this.renderTime(data["effectivePeriod.end"], timezone)}`;
        }
        return effectiveTimePeriod.trim();
    }

    private formatQuantityValue(quantity: TQuantity): string {
        if (!quantity) return '';

        const parts = [];
        // Escape special characters in comparator for Minify HTML
        if (quantity.comparator) parts.push(`${quantity.comparator}`.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
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
     * Public method to render plain text as HTML, escaping special characters and replacing newlines with <br />.
     * This method should be used whenever displaying user-supplied or FHIR resource text in HTML to prevent XSS vulnerabilities
     * and to preserve formatting. Use this in templates or UI components that need to safely display multi-line or arbitrary text.
     * @param text - The text to render as HTML
     * @returns The HTML-safe string with newlines converted to <br />
     */
    public renderTextAsHtml(text: string | undefined | null): string {
        if (!text || text.trim() === '') {
            return '';
        }
        const escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return escapedText.replace(/\n/g, '<br />');
    }

    /**
     * Renders note elements from a FHIR resource in a standardized format
     * Can render as simple comma-separated text or as styled HTML with timestamps
     *
     * @param notes - Array of note objects (or undefined/null)
     * @param timezone - Optional timezone to use for date formatting
     * @param options - Rendering options
     * @returns Formatted string representation of notes
     */
    renderNotes(notes: Array<TAnnotation> | null | undefined,
                timezone: string | undefined,
                options: {
                    styled?: boolean;
                    warning?: boolean;
                } = {}): string {

        if (!notes || !Array.isArray(notes) || notes.length === 0) {
            return '';
        }

        // Simple text-only rendering (comma-separated)
        if (!options.styled) {
            return notes.map(n => this.renderTextAsHtml(n.text)).join('<br />');
        }

        // Styled HTML rendering with timestamps
        let noteHtml = '<ul>';

        for (const note of notes) {
            if (note.text) {
                const noteType = note.authorString || 'Overview';

                noteHtml += `<li class="Note"><span class="NoteTitle">${noteType} (${this.renderTime(note.time, timezone)}):</span><br />`;

                // Optional warning message about formatting
                if (options.warning) {
                    noteHtml += `<span class="WarningMsg"><em>Formatting of this note might be different from the original.</em></span><br />`;
                }

                noteHtml += `<span class="NoteText">${this.renderTextAsHtml(note.text)}<br /></span></li>`;
            }
        }

        noteHtml += '</ul>';
        return noteHtml;
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

                // For date-only strings (YYYY-MM-DD), use date-only formatting
                if (!dateValue.includes('T')) {
                    dateOnly = true;
                    dateTime = DateTime.fromISO(dateValue, { zone: 'utc' });
                } else {
                    dateTime = DateTime.fromISO(dateValue);
                }
            } else {
                dateTime = DateTime.fromISO(String(dateValue));
            }

            if (!dateTime.isValid) {
                return this.renderTextAsHtml(String(dateValue));
            }

            // Always use UTC for dateOnly formatting to ensure consistency
            if (dateOnly) {
                dateTime = dateTime.toUTC();
            } else if (timezone) {
                dateTime = dateTime.toUTC().setZone(timezone);
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

            return this.renderTextAsHtml(dateTime.toLocaleString(formatOptions));
        } catch {
            return this.renderTextAsHtml(String(dateValue));
        }
    }

    /**
     * Renders the onset age in a human-readable format
     * @param onsetAge - The onset age value, which can be a string, number, or an object with value and unit
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    renderOnset(onsetAge: TQuantity, timezone: string | undefined) {
        if (!onsetAge) {
            return '';
        }

        // Check if onsetAge is a valid object with value and unit
        if (typeof onsetAge === 'object' && 'value' in onsetAge && 'unit' in onsetAge) {
            // Format the value and unit
            return `${onsetAge.value} ${onsetAge.unit}`;
        }

        return '';
    }

    /**
     * Renders a period of time in a human-readable format
     * @param effectivePeriod - The effective period object containing start and end dates
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     */
    renderPeriod(effectivePeriod: TPeriod, timezone: string | undefined) {
        if (!effectivePeriod || !effectivePeriod.start || !effectivePeriod.end) {
            return '';
        }

        // Format start and end dates using the renderTime method
        const start = this.renderTime(effectivePeriod.start, timezone);
        const end = this.renderTime(effectivePeriod.end, timezone);

        // Return the formatted period string
        return `${start} - ${end}`;
    }

    /**
     * Renders a reference to a FHIR resource
     * @param itemReference - The reference object containing the resource type and ID
     */
    renderReference(itemReference: TReference) {
        // check if the type of reference is Condition, Observation
        if (itemReference && itemReference.reference) {
            const parts = itemReference.reference.split('/');
            if (parts.length === 2) {
                const resourceType = parts[0];
                const resourceId = parts[1];

                // Find the resource
                const resource = this.resources?.find(resource => resource.resourceType === resourceType && resource.id === resourceId);
                if (resource) {
                    return `${resourceType}/${resourceId}`;
                }
            }
        }
    }

    /**
     * Formats a range of values in a human-readable format
     * @param valueRange - The range object containing low and high values
     */
    formatRange(valueRange: TRange) {
        if (!valueRange || !valueRange.low || !valueRange.high) {
            return '';
        }

        // Format low and high values
        const low = valueRange.low.value !== undefined ? valueRange.low.value.toString() : '';
        const high = valueRange.high.value !== undefined ? valueRange.high.value.toString() : '';

        // Include units if available
        const lowUnit = valueRange.low.unit ? ` ${valueRange.low.unit}` : '';
        const highUnit = valueRange.high.unit ? ` ${valueRange.high.unit}` : '';

        return `${low}${lowUnit} - ${high}${highUnit}`;
    }

    /**
     * Formats a ratio value in a human-readable format
     * @param valueRatio - The ratio object containing numerator and denominator values
     */
    formatRatio(valueRatio: TRatio) {
        if (!valueRatio || !valueRatio.numerator || !valueRatio.denominator) {
            return '';
        }

        // Format numerator and denominator values
        const numerator = valueRatio.numerator.value !== undefined ? valueRatio.numerator.value.toString() : '';
        const denominator = valueRatio.denominator.value !== undefined ? valueRatio.denominator.value.toString() : '';

        // Include units if available
        const numeratorUnit = valueRatio.numerator.unit ? ` ${valueRatio.numerator.unit}` : '';
        const denominatorUnit = valueRatio.denominator.unit ? ` ${valueRatio.denominator.unit}` : '';

        return `${numerator}${numeratorUnit} / ${denominator}${denominatorUnit}`;
    }
}
