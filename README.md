# FHIR Patient Summary Generator

This project provides utilities to generate patient summaries from FHIR Bundles, including narrative generation and section extraction, following the International Patient Summary (IPS) specification.

## Installation

Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd fhir-patient-summary
npm install
```

## Usage

You can use the `ComprehensiveIPSCompositionBuilder` in your TypeScript or JavaScript project to generate an IPS-compliant FHIR Bundle from a FHIR Bundle input.

### Example

```typescript
import { ComprehensiveIPSCompositionBuilder } from './src/generators/fhir_summary_generator';
import testBundle from './test/fhir-summary-bundle/fixtures/test-bundle.json';

const patientResource = testBundle.entry.find(e => e.resource.resourceType === 'Patient').resource;
const builder = new ComprehensiveIPSCompositionBuilder(patientResource);
builder.read_bundle(testBundle, 'Europe/London');
const bundle = builder.build_bundle('org-1', 'Example Hospital', 'https://example.com/fhir', 'Europe/London');
console.log(JSON.stringify(bundle, null, 2));
```

- `ComprehensiveIPSCompositionBuilder` is the main class for building IPS Compositions and Bundles.
- Use `read_bundle` to extract and organize resources from your FHIR Bundle.
- Use `build_bundle` to generate a new FHIR Bundle with the IPS Composition and all referenced resources.

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
