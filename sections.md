# Sections of International Patient Summary

Note: All **mandatory** sections must be present in the patient summary

## Patient (Mandatory)
**LOINC Code:** `54126-4` - Patient summary Document

**Resource:** Patient <br>
**Data Table Fields:**
- **Name(s):** `name.text` or `name.given + name.family` (excluding use='old' & all unique only)
- **Gender:** `gender`
- **Date of Birth:** `birthDate`
- **Identifier(s):** `identifier.system + identifier.value`
- **Telecom:** `telecom.system + telecom.value` (grouped by system and unique values for each)
- **Address(es):** `address.text` or concatenated `address.line + address.city + address.country` (all unique only)
- **Marital Status:** `maritalStatus.text`
- **Deceased:** `deceasedBoolean` or `deceasedDateTime`
- **Language(s):** `communication.language` with `communication.preferred` indicator

## Problem List (Mandatory)
**LOINC Code:** `11450-4` - Problem List

This section contains the list of all the active/current issues the patient is suffering from.

**Resource:** Condition <br>
**Filter:** `clinicalStatus.coding.code` is **not** `inactive` or `resolved`
**Data Table Fields:**
- **Problem:** `code` (CodeableConcept)
- **Severity:** `severity` (CodeableConcept)
- **Onset Date:** `onsetDateTime`
- **Recorded Date:** `recordedDate`
- **Notes:** `note.text`

## Allergies and Intolerances (Mandatory)
**LOINC Code:** `48765-2` - Allergies and Intolerances

This section contains information about the patient's active & resolved allergies and intolerances.

**Resource:** AllergyIntolerance <br>
**Filter:** None <br>
**Missing Data Message:** "There is no information available regarding the subject's allergy conditions."
**Data Table Fields:**
- **Allergen:** `code` (CodeableConcept)
- **Status:** `clinicalStatus` (CodeableConcept)
- **Category:** `category` (array)
- **Reaction:** `reaction.manifestation` (CodeableConcept array)
- **Severity:** `reaction.severity`
- **Onset Date:** `onsetDateTime`
- **Comments:** `note.text`
- **Resolved Date:** `extension[allergyintolerance-resolutionDate].valueDateTime` (for resolved allergies)

## Medication Summary (Mandatory)
**LOINC Code:** `10160-0` - Medication Summary

This section contains information about the patient's current and past medications.

**Resources:** MedicationRequest, MedicationStatement, Medication (for medication name) <br>
**Filter:** None <br>
**Missing Data Message:** "There is no information available about the subject's medication use or administration."
**Data Table Fields:**
- **Type:** Resource type (Request/Statement)
- **Medication:** `medicationReference` or `medicationCodeableConcept` (resolved to medication name)
- **Sig:** `dosageInstruction.text` (MedicationRequest) or `dosage.text` (MedicationStatement)
- **Dispense Quantity:** `dispenseRequest.quantity.value + quantity.unit` (MedicationRequest only)
- **Refills:** `dispenseRequest.numberOfRepeatsAllowed` (MedicationRequest only)
- **Start Date:** `dispenseRequest.validityPeriod.start` or `authoredOn` (MedicationRequest) / `effectiveDateTime` or `effectivePeriod.start` (MedicationStatement)
- **End Date:** `dispenseRequest.validityPeriod.end` (MedicationRequest) / `effectivePeriod.end` (MedicationStatement)
- **Status:** `status`

## Immunizations (Recommended)
**LOINC Code:** `11369-6` - Immunizations

This section contains the patient's immunization history.

**Resources:** Immunization, Organization (for Immunization's Org) <br>
**Filter:** `status` is `completed` for Immunization resources; all Organization resources
**Data Table Fields:**
- **Immunization:** `vaccineCode` (CodeableConcept)
- **Status:** `status`
- **Dose Number:** `protocolApplied.doseNumberPositiveInt` or `protocolApplied.doseNumberString`
- **Manufacturer:** Resolved from `manufacturer` reference or `vaccineCode` manufacturer info
- **Lot Number:** `lotNumber`
- **Comments:** `note.text`
- **Date:** `occurrenceDateTime`

## Results Summary (Recommended)
**LOINC Code:** `30954-2` - Results Summary

This section contains diagnostic reports and related observations.

**Resources:** DiagnosticReport, Observation <br>
**Filter:** `status` is `final`
**Data Table Fields:**

### Observations:
- **Code:** `code` (CodeableConcept)
- **Result:** `valueQuantity`, `valueCodeableConcept`, `valueString`, etc.
- **Unit:** `valueQuantity.unit` or `valueQuantity.code`
- **Interpretation:** `interpretation` (CodeableConcept array)
- **Reference Range:** `referenceRange.low` and `referenceRange.high`
- **Comments:** `note.text`
- **Date:** `effectiveDateTime` or `effectivePeriod`

### Diagnostic Reports:
- **Report:** `code` (CodeableConcept)
- **Status:** `status`
- **Category:** `category` (CodeableConcept array)
- **Result:** Count of `result` references
- **Issued:** `issued`

## History of Procedures (Recommended)
**LOINC Code:** `47519-4` - History of Procedures

This section contains information about procedures performed on the patient.

**Resource:** Procedure <br>
**Filter:** `status` is `completed`
**Data Table Fields:**
- **Procedure:** `code` (CodeableConcept)
- **Comments:** `note.text`
- **Date:** `performedDateTime` or `performedPeriod`

## History of Medical Devices (Recommended)
**LOINC Code:** `46264-8` - History of Medical Devices

This section contains information about medical devices used by the patient.

**Resources:** DeviceUseStatement, Device (for device info) <br>
**Filter:** None
**Data Table Fields:**
- **Device:** Resolved device name from `device` reference (Device resource)
- **Status:** `status`
- **Comments:** `note.text`
- **Date Recorded:** `recordedOn`

## Vital Signs (Optional)
**LOINC Code:** `8716-3` - Vital Signs

This section contains the patient's vital signs measurements.

**Resource:** Observation <br>
**Filter:** `category.coding` contains `vital-signs`
**Data Table Fields:**
- **Code:** `code` (CodeableConcept)
- **Result:** `valueQuantity`, `valueCodeableConcept`, `valueString`, etc.
- **Unit:** `valueQuantity.unit` or `valueQuantity.code`
- **Interpretation:** `interpretation` (CodeableConcept array)
- **Component(s):** `component.code` and `component.valueQuantity` (for multi-component observations)
- **Comments:** `note.text`
- **Date:** `effectiveDateTime` or `effectivePeriod`

## Social History (Optional)
**LOINC Code:** `29762-2` - Social History

This section contains social history information including tobacco and alcohol use.

**Resource:** Observation <br>
**Filter:** `code.coding` contains LOINC codes:
- `72166-2` - Tobacco Use
- `74013-4` - Alcohol Use
**Data Table Fields:**
- **Code:** `code` (CodeableConcept)
- **Result:** `valueQuantity`, `valueCodeableConcept`, `valueString`, etc.
- **Unit:** `valueQuantity.unit` or `valueQuantity.code`
- **Comments:** `note.text`
- **Date:** `effectiveDateTime` or `effectivePeriod`

## History of Pregnancies (Optional)
**LOINC Code:** `10162-6` - History of Pregnancies

This section contains pregnancy history information.

**Resource:** Observation <br>
**Filter:** `code.coding` contains pregnancy-related LOINC codes or `valueCodeableConcept.coding` contains pregnancy outcome codes
**Data Table Fields:**
- **Result:** Extracted pregnancy status from `valueCodeableConcept` or related pregnancy codes
- **Comments:** `note.text`
- **Date:** `effectiveDateTime` or `effectivePeriod`

## Functional Status (Optional)
**LOINC Code:** `47420-5` - Functional Status

This section contains information about the patient's functional status.

**Resources:** Condition, ClinicalImpression <br>
**Filter:** Conditions where `clinicalStatus.coding.code` is **not** `inactive` or `resolved` or ClinicalImpression with `status` is `completed`
**Data Table Fields:**

### Conditions:
- **Problem:** `code` (CodeableConcept)
- **Severity:** `severity` (CodeableConcept)
- **Onset Date:** `onsetDateTime`
- **Recorded Date:** `recordedDate`
- **Notes:** `note.text`

### Clinical Impressions:
- **Date:** `date`
- **Status:** `status`
- **Description:** `description`
- **Summary:** `summary`
- **Findings:** `finding.itemCodeableConcept` or `finding.itemReference`
- **Notes:** `note.text`

## History of Past Illness (Optional)
**LOINC Code:** `11348-0` - History of Past Illness

This section contains information about the patient's past medical conditions.

**Resource:** Condition <br>
**Filter:** `clinicalStatus.coding.code` is `inactive` or `resolved`
**Data Table Fields:**
- **Problem:** `code` (CodeableConcept)
- **Severity:** `severity` (CodeableConcept)
- **Onset Date:** `onsetDateTime`
- **Recorded Date:** `recordedDate`
- **Resolved Date:** `abatementDateTime`
- **Notes:** `note.text`

## Plan of Care (Optional)
**LOINC Code:** `18776-5` - Plan of Care

This section contains the patient's care plan information.

**Resource:** CarePlan <br>
**Filter:** `status` is `active`
**Data Table Fields:**
- **Description:** `description` or `title`
- **Intent:** `intent`
- **Comments:** `note.text`
- **Planned Start:** `period.start`
- **Planned End:** `period.end`

## Advance Directives (Optional)
**LOINC Code:** `42348-3` - Advance Directives

This section contains information about the patient's advance directives.

**Resource:** Consent <br>
**Filter:** `status` is `active`
**Data Table Fields:**
- **Scope:** `scope` (CodeableConcept)
- **Status:** `status`
- **Action Controlled:** `provision.action` (CodeableConcept array)
- **Date:** `dateTime`
