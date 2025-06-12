import {IpsNarrativeUtility} from "./IpsNarrativeUtility";
import {TDomainResource} from "../types/resources/DomainResource";

export abstract class IpsNarrativeGenerator<T extends TDomainResource> {
    protected resource: T;
    protected utility: IpsNarrativeUtility;

    constructor(resource: T) {
        this.resource = resource;
        this.utility = new IpsNarrativeUtility();
    }

    abstract generateNarrative(): string;
}