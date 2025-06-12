/**
 * Utility class for generating narrative HTML from FHIR resources
 * Implements the functionality found in utility-fragments.html
 */
export class IpsNarrativeUtility {
    /**
     * Resolve a reference and get information from the target resource
     */
    private resolveReference(reference: any): any {
        // In a real implementation, this would resolve the reference
        // For this example, we'll assume the reference is already resolved
        if (reference && reference.reference) {
            return reference.resource || null;
        }
        return null;
    }

    /**
     * Get the display value from a CodeableConcept
     */
    public getCodeableConceptDisplay(concept: any): string {
        if (!concept) return '';

        // Use text if available
        if (concept.text) return concept.text;

        // Otherwise use the first coding
        if (concept.coding && concept.coding.length > 0) {
            const coding = concept.coding[0];
            return coding.display || coding.code || '';
        }

        return '';
    }

    /**
     * Format a date for display
     */
    public formatDate(date: string | undefined): string {
        if (!date) return '';
        try {
            return new Date(date).toLocaleDateString();
        } catch {
            return date;
        }
    }

    /**
     * Render a device reference
     */
    public renderDevice(deviceRef: any): string {
        const device = this.resolveReference(deviceRef);
        if (device && device.resourceType === 'Device') {
            return this.getCodeableConceptDisplay(device.type);
        }
        return '';
    }

    /**
     * Render an organization reference
     */
    public renderOrganization(orgRef: any): string {
        const organization = this.resolveReference(orgRef);
        if (organization && organization.resourceType === 'Organization') {
            return organization.name || '';
        }
        return '';
    }

    /**
     * Render vaccine manufacturer
     */
    public renderVaccineManufacturer(immunization: any): string {
        if (immunization && immunization.manufacturer) {
            const organization = this.resolveReference(immunization.manufacturer);
            if (organization && organization.resourceType === 'Organization') {
                return organization.name || '';
            }
        }
        return '';
    }

    /**
     * Render medication based on type (CodeableConcept or Reference)
     */
    public renderMedication(medicationType: any): string {
        if (!medicationType || !medicationType.getMedication) return '';

        const medication = medicationType.getMedication();
        if (!medication) return '';

        if (medication.constructor.name === 'CodeableConcept') {
            return this.getCodeableConceptDisplay(medication);
        } else if (medication.constructor.name === 'Reference') {
            return this.renderMedicationRef(medicationType);
        }

        return '';
    }

    /**
     * Render medication reference
     */
    public renderMedicationRef(medicationRef: any): string {
        if (!medicationRef || !medicationRef.medication) return '';

        const medication = this.resolveReference(medicationRef.medication);
        if (medication) {
            return this.renderMedicationCode(medication);
        }

        return '';
    }

    /**
     * Render medication code
     */
    public renderMedicationCode(medication: any): string {
        if (medication && medication.code) {
            return this.getCodeableConceptDisplay(medication.code);
        }
        return '';
    }

    /**
     * Render dose number
     */
    public renderDoseNumber(doseNumber: any): string {
        if (!doseNumber) return '';

        if (typeof doseNumber.getValue === 'function') {
            return doseNumber.getValue().toString();
        }

        return '';
    }

    /**
     * Render a value based on its type
     */
    public renderValue(value: any): string {
        if (!value) return '';

        const type = value.constructor.name;

        switch (type) {
            case 'Quantity':
                return value.value?.toString() || '';
            case 'DateTimeType':
                return value.value || '';
            case 'CodeableConcept':
                return this.getCodeableConceptDisplay(value);
            case 'StringType':
                return value.value || '';
            default:
                if (typeof value === 'string') return value;
                if (typeof value === 'number') return value.toString();
                return '';
        }
    }

    /**
     * Render value unit
     */
    public renderValueUnit(value: any): string {
        if (!value) return '';

        const type = value.constructor.name;

        if (type === 'Quantity') {
            return value.unit || '';
        }

        return '';
    }

    /**
     * Render effective date/time
     */
    public renderEffective(effective: any): string {
        if (!effective) return '';

        const type = effective.constructor.name;

        switch (type) {
            case 'DateTimeType':
                return effective.value || '';
            case 'Period':
                return effective.startElement?.value || '';
            default:
                return '';
        }
    }

    /**
     * Render time value in various formats
     */
    public renderTime(time: any): string {
        if (!time) return '';

        const type = time.constructor.name;

        switch (type) {
            case 'DateType':
            case 'DateTimeType':
                return time.getValueAsString?.() || time.value || '';
            case 'Period': {
                const start = time.getStartElement?.()?.getValueAsString() || '';
                const end = time.getEndElement?.()?.getValueAsString() || '';
                if (start && end) return `${start} - ${end}`;
                return start || end;
            }
            case 'Age':
                return time.value?.toString() || '';
            case 'Range': {
                const low = time.getLow?.()?.getValueAsString() || '';
                const high = time.getHigh?.()?.getValueAsString() || '';
                if (low && high) return `${low} - ${high}`;
                return low || high;
            }
            case 'StringType':
                return time.value || '';
            default:
                return '';
        }
    }

    /**
     * Render recorded date
     */
    public renderRecorded(recorded: any): string {
        if (!recorded) return '';

        const type = recorded.constructor.name;

        if (type === 'DateTimeType') {
            return recorded.value || '';
        }

        return '';
    }

    /**
     * Get display value from a list of codings
     */
    public concatCoding(list: any[], attribute: string = 'display'): string {
        if (!list || list.length === 0) return '';

        return list.map(item => {
            if (attribute === 'display') {
                return item.display || '';
            } else if (attribute === 'code') {
                return item.code || '';
            } else if (attribute === 'text') {
                return item.text || '';
            }
            return '';
        }).filter(Boolean).join(', ');
    }

    /**
     * Get display from first item in a CodeableConcept list
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public firstFromCodeableConceptList(list: any[], attribute: string = 'display'): string {
        if (!list || list.length === 0) return '';

        return this.getCodeableConceptDisplay(list[0]);
    }

    /**
     * Concatenate a list of items
     */
    public concat(list: any[], attribute: string = 'value'): string {
        if (!list || list.length === 0) return '';

        return list.map(item => {
            switch (attribute) {
                case 'display':
                    return item.display || '';
                case 'code':
                    return item.code || '';
                case 'text':
                    return item.text || '';
                case 'value':
                    if (typeof item === 'string') return item;
                    return item.value || '';
                case 'severity':
                    return item.severity?.code || '';
                default:
                    return '';
            }
        }).filter(Boolean).join(', ');
    }

    /**
     * Concatenate reaction manifestations
     */
    public concatReactionManifestation(list: any[]): string {
        if (!list || list.length === 0) return '';

        return list.map(item => {
            if (item.description) {
                return item.description;
            } else if (item.manifestation) {
                return this.concatCodeableConcept(item.manifestation);
            }
            return '';
        }).filter(Boolean).join(', ');
    }

    /**
     * Concatenate CodeableConcept values
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public concatCodeableConcept(list: any[], attribute: string = 'display'): string {
        if (!list || list.length === 0) return '';

        return list.map(item => this.getCodeableConceptDisplay(item)).filter(Boolean).join(', ');
    }

    /**
     * Concatenate dosage routes
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public concatDosageRoute(list: any[], attribute: string = 'display'): string {
        if (!list || list.length === 0) return '';

        return list.map(item => this.getCodeableConceptDisplay(item.route)).filter(Boolean).join(', ');
    }

    /**
     * Concatenate dose numbers
     */
    public concatDoseNumber(list: any[]): string {
        if (!list || list.length === 0) return '';

        return list.map(item => this.renderDoseNumber(item.doseNumber)).filter(Boolean).join(', ');
    }

    /**
     * Concatenate reference ranges
     */
    public concatReferenceRange(list: any[]): string {
        if (!list || list.length === 0) return '';

        return list.map(item => {
            if (item.text) {
                return item.text;
            } else if (item.low || item.high) {
                const low = item.low?.value || '';
                const high = item.high?.value || '';
                if (low && high) return `${low}-${high}`;
                return low || high;
            }
            return '';
        }).filter(Boolean).join(', ');
    }

    /**
     * Render observation components
     */
    public renderComponent(list: any[]): string {
        if (!list || list.length === 0) return '';

        return list.map(item => {
            let display = '';

            // Get the component name
            if (item.code?.coding && item.code.coding.length > 0) {
                display = item.code.coding[0].display || item.code.coding[0].code || '';
            }

            // Get the component value
            let value = '';
            if (item.valueQuantity) {
                value = item.valueQuantity.value?.toString() || '';
            } else if (item.valueInteger) {
                value = item.valueInteger.toString();
            } else if (item.valueString) {
                value = item.valueString;
            } else if (item.valueCodeableConcept) {
                value = this.getCodeableConceptDisplay(item.valueCodeableConcept);
            }

            if (display && value) {
                return `${display}: ${value}`;
            } else if (display) {
                return display;
            } else if (value) {
                return value;
            }

            return '';
        }).filter(Boolean).join(', ');
    }
}