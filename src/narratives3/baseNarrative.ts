import {TDomainResource} from "../types/resources/DomainResource";

export interface BaseNarrativeGenerator<T extends TDomainResource> {
    generateNarrative(allergies: T[]): string;
}

