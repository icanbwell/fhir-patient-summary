# Glossary

The other docs in this repo (`sections.md`, `ARCHITECTURE.md`,
`adding-a-new-ips-section.md`) assume familiarity with FHIR and IPS terminology.
This is a quick reference for engineers new to healthcare interoperability — skip
it if you already know FHIR.

## FHIR (general)

- **FHIR** — Fast Healthcare Interoperability Resources, an HL7 standard for
  exchanging healthcare data as structured JSON/XML "resources". This repo targets
  **FHIR R4**.
- **Resource** — a single typed record, e.g. `Patient`, `Condition`,
  `AllergyIntolerance`, `Observation`. Every resource has a `resourceType` field.
  This repo's `src/types/resources/` has one hand-maintained TypeScript type per
  FHIR resource (`TPatient`, `TCondition`, …).
- **DomainResource** — the FHIR base type most clinical resources extend; adds a
  `text` (narrative), `extension`, and `contained` to the bare `Resource` base.
  See `TDomainResource` in `src/types/resources/DomainResource.ts`.
- **Bundle** — a container holding a collection of resources (`bundle.entry[].resource`).
  This repo takes a `Bundle` as input and produces a `document`-type `Bundle` as
  output (a `Bundle` whose first entry is a `Composition`).
- **Composition** — a FHIR resource that structures a document: a `title`, a
  `subject` (the patient), and a `section[]` array, where each section has its own
  narrative (`text.div`, HTML) and `entry[]` (references to the resources that
  section is "about"). An IPS **is** a `Composition` with one section per IPS topic
  — this is the primary output type this library builds
  (`src/generators/fhir_summary_generator.ts`).
- **Narrative** (`text.div`) — a human-readable HTML rendering of a resource or
  section, required by the FHIR spec alongside the machine-readable structured
  data. `src/narratives/templates/typescript/*Template.ts` are what generate these
  HTML strings for each IPS section.
- **Reference** — a pointer from one resource to another, e.g.
  `AllergyIntolerance.patient` or `MedicationRequest.medicationReference`, usually
  of the form `"ResourceType/id"`. Resolving a `Reference` to the actual resource
  it points at (by searching the input `Bundle`) is a common template operation —
  see the resolver helpers in `TemplateUtilities`.
- **CodeableConcept** — a value represented by one or more codes from a coding
  system plus optional free-text (`{ coding: [{ system, code, display }], text }`).
  Used everywhere a clinical concept needs to be coded, e.g. `Condition.code`,
  `AllergyIntolerance.code`.
- **Coding** — a single `{ system, code, display }` entry inside a `CodeableConcept`,
  identifying one code from one terminology system (see LOINC/SNOMED below).

## Terminology systems

- **LOINC** — Logical Observation Identifiers Names and Codes. Used here mainly to
  identify *which IPS section* a Composition section is (each IPS section has a
  fixed LOINC code, see `src/structures/ips_section_loinc_codes.ts` and
  `sections.md`), and to identify lab test observations (`LAB_LOINC_MAP` in
  `src/constants.ts`).
- **SNOMED CT** — a general-purpose clinical terminology (diagnoses, procedures,
  findings). Referenced by some section filter predicates in
  `src/structures/ips_section_resource_map.ts` alongside LOINC.

## IPS (International Patient Summary)

- **IPS** — the [HL7 International Patient Summary](http://hl7.org/fhir/uv/ips/)
  implementation guide: a minimal, specialty-agnostic clinical summary meant to be
  understandable across borders/systems. Defines a fixed list of *sections*
  (Problems, Allergies, Medications, …), each with mandatory/recommended status, a
  LOINC code, and expected source resource type(s) — see `sections.md` for this
  repo's copy of that list.
- **Mandatory / Recommended / Optional section** — IPS's own tiering of how
  important a section is. *Mandatory* sections must appear even with no data (with
  a "no information available" placeholder); *recommended* and *optional* sections
  simply don't render if there's nothing to show. See
  `src/structures/ips_mandatory_sections.ts` / `ips_recommended_sections.ts`.
- **Summary composition** — not an official IPS term; this repo's name for a
  pre-aggregated `Composition` (tagged with a "summary type" code) that can stand
  in for raw resources when building a section, if the caller opts in via
  `SUMMARY_COMPOSITION_SECTIONS`. See
  [`ARCHITECTURE.md`](./ARCHITECTURE.md#two-data-source-modes-per-section-raw-resources-vs-summary-compositions).

## This repo's own vocabulary

- **`IPSSections`** — the enum of every section this library knows how to build
  (`src/structures/ips_sections.ts`). The canonical key used to look up LOINC
  codes, resource filters, and narrative templates for a section.
- **`ComprehensiveIPSCompositionBuilder`** — the main entry point / orchestrator
  class (`src/generators/fhir_summary_generator.ts`) that turns input resources
  into the final `Composition` + `Bundle`.
- **Template** — one class per `IPSSections` value
  (`src/narratives/templates/typescript/*Template.ts`) responsible for rendering
  that section's HTML table narrative from its resources.
