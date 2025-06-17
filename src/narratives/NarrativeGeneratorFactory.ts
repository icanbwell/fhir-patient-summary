// NarrativeGeneratorFactory.ts - Factory to provide appropriate narrative generator

import {NarrativeGenerator} from "../generators/narrative_generator";
import {TypeScriptNarrativeGenerator} from "../generators/typescript_narrative_generator";

/**
 * Template system options
 */
export enum TemplateSystem {
  NUNJUCKS = 'nunjucks',
  TYPESCRIPT = 'typescript'
}

/**
 * Factory class to create the appropriate narrative generator based on configuration
 */
export class NarrativeGeneratorFactory {
  // Default to TypeScript templates
  private static activeSystem: TemplateSystem = TemplateSystem.TYPESCRIPT;

  /**
   * Set the active template system
   * @param system - Template system to use
   */
  static setTemplateSystem(system: TemplateSystem): void {
    this.activeSystem = system;
  }

  /**
   * Get the current template system
   * @returns Active template system
   */
  static getTemplateSystem(): TemplateSystem {
    return this.activeSystem;
  }

  /**
   * Get the appropriate narrative generator based on current configuration
   * @returns Either the Nunjucks-based or TypeScript-based generator
   */
  static getNarrativeGenerator(): typeof NarrativeGenerator | typeof TypeScriptNarrativeGenerator {
    return this.activeSystem === TemplateSystem.NUNJUCKS
      ? NarrativeGenerator
      : TypeScriptNarrativeGenerator;
  }
}
