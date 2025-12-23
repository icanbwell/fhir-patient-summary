# FHIR Patient Summary Generator

This project provides utilities to generate patient summaries from FHIR Bundles, including narrative generation and section extraction, following the International Patient Summary (IPS) specification.

Detailed explanation of content of each section of IPS is [here](./sections.md)

## Installation

Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd fhir-patient-summary
npm install
```

## Usage

You can use the `ComprehensiveIPSCompositionBuilder` in your TypeScript or JavaScript project to generate an IPS-compliant FHIR Bundle. The builder supports both fluent section addition and a convenient `read_bundle()` method to extract all supported sections from a FHIR Bundle.

### Example: Using setPatient and makeSectionAsync

```typescript
import { ComprehensiveIPSCompositionBuilder } from './src/generators/fhir_summary_generator';
import { IPSSections } from './src/structures/ips_sections';

const builder = new ComprehensiveIPSCompositionBuilder()
  .setPatient(patientResource)
  .makeSectionAsync(IPSSections.ALLERGIES, allergiesArray, 'America/New_York')
  .makeSectionAsync(IPSSections.MEDICATIONS, medicationsArray, 'America/New_York')
  .makeSectionAsync(IPSSections.PROBLEMS, problemsArray, 'America/New_York')
  .makeSectionAsync(IPSSections.IMMUNIZATIONS, immunizationsArray, 'America/New_York');

const bundle = builder.build_bundle(
  'example-organization',
  'Example Organization',
  'https://fhir.icanbwell.com/4_0_0/',
  'America/New_York'
);
console.log(JSON.stringify(bundle, null, 2));
```

### Example: Using read_bundle()

```typescript
import { ComprehensiveIPSCompositionBuilder } from './src/generators/fhir_summary_generator';
import testBundle from './test/fhir-summary-bundle/fixtures/test-bundle.json';

const patientResource = testBundle.entry.find(e => e.resource.resourceType === 'Patient').resource;
const builder = new ComprehensiveIPSCompositionBuilder()
  .setPatient(patientResource)
  .read_bundle(testBundle, 'Europe/London');

const bundle = builder.build_bundle(
  'org-1',
  'Example Hospital',
  'https://example.com/fhir',
  'Europe/London'
);
console.log(JSON.stringify(bundle, null, 2));
```

- Use `setPatient(patientResource)` to set the patient.
- Use `makeSectionAsync(sectionType, resources, timezone)` to add each IPS section, or use `read_bundle(fhirBundle, timezone)` to extract all supported sections from a FHIR Bundle.
- Use `build_bundle` to generate the final FHIR Bundle.

## Patient Summary Composition

When generating patient summaries from FHIR Bundles, the library can use pre-computed summary compositions instead of raw resources. Summary compositions are specially structured FHIR Composition resources that contain curated, filtered, or aggregated data for specific sections.

### How Summary Compositions Work

The `readBundleAsync` method supports a `useSummaryCompositions` parameter. When enabled, the library follows this priority order when processing each IPS section:

1. **IPS-Specific Composition** (highest priority): Compositions with IPS-specific type codes (e.g., `ips_patient_summary_document`, `ips_vital_summary_document`)
2. **Summary Composition** (medium priority): Compositions with summary type codes (e.g., `allergy_summary_document`, `condition_summary_document`, `medication_summary_document`)
3. **Raw Resources** (fallback): Individual FHIR resources when no composition is available

This priority order ensures that the most refined and curated data is used when available, while still supporting raw resource processing as a fallback.

### Environment Variables for enabling Composition Summary

The following environment variables can be used to configure the behavior of the patient summary generator:

#### SUMMARY_IPS_COMPOSITION_SECTIONS

Controls which IPS sections should include IPS-specific composition.

- **Default**: Disabled
- **Format**: Comma-separated list of section names
- **Example**: `SUMMARY_IPS_COMPOSITION_SECTIONS=Patient,VitalSignsSection`

When set to `all`, all supported sections will use IPS composition. To enable only specific sections, provide a comma-separated list of [section names](src/structures/ips_sections.ts).

#### SUMMARY_COMPOSITION_SECTIONS

Controls which IPS sections should include summary composition.

- **Default**: Disabled
- **Format**: Comma-separated list of section names
- **Example**: `SUMMARY_COMPOSITION_SECTIONS=AllergyIntoleranceSection,ProblemSection,MedicationSummarySection`

When set to `all`, all supported sections will use summary composition. To enable only specific sections, provide a comma-separated list of [section names](src/structures/ips_sections.ts).

## Running Tests

To run the test suite:

```bash
npm test
```

## Project Structure

- `src/generators/`: Main logic for summary and narrative generation
- `src/types/`: FHIR resource TypeScript types
- `test/`: Test suites and FHIR bundle fixtures

## License

See [LICENSE](./LICENSE).
