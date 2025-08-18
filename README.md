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

### Example: Using setPatient and addSection

```typescript
import { ComprehensiveIPSCompositionBuilder } from './src/generators/fhir_summary_generator';
import { IPSSections } from './src/structures/ips_sections';

const builder = new ComprehensiveIPSCompositionBuilder()
  .setPatient(patientResource)
  .addSection(IPSSections.ALLERGIES, allergiesArray, 'America/New_York')
  .addSection(IPSSections.MEDICATIONS, medicationsArray, 'America/New_York')
  .addSection(IPSSections.PROBLEMS, problemsArray, 'America/New_York')
  .addSection(IPSSections.IMMUNIZATIONS, immunizationsArray, 'America/New_York');

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
- Use `addSection(sectionType, resources, timezone)` to add each IPS section, or use `read_bundle(fhirBundle, timezone)` to extract all supported sections from a FHIR Bundle.
- Use `build_bundle` to generate the final FHIR Bundle.

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
