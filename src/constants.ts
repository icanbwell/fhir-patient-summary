export const ADDRESS_SIMILARITY_THRESHOLD = 70; // Percentage threshold for address similarity

export const LAB_LOINC_MAP = {
  // METABOLIC PANELS (VERY COMMONLY ORDERED)
  'Basic Metabolic Panel': [
    '24321-2', // Basic metabolic 2000 panel - Serum or Plasma
    '51990-0', // Basic metabolic 2000 panel - Blood
  ],
  'Comprehensive Metabolic Panel': [
    '24323-8', // Comprehensive metabolic 2000 panel - Serum or Plasma
  ],
  // CBC COMPONENTS
  Hemoglobin: [
    '718-7', // Hemoglobin [Mass/volume] in Blood
  ],
  Hematocrit: [
    '4544-3', // Hematocrit [Volume Fraction] of Blood by Automated count
  ],
  'White Blood Cell Count': [
    '6690-2', // Leukocytes [///volume] in Blood by Automated count
  ],
  'Platelet Count': [
    '777-3', // Platelets [///volume] in Blood by Automated count
  ],
  'Complete Blood Count': [
    '58410-2', // CBC panel - Blood by Automated count
    '57021-8', // CBC W Auto Differential panel - Blood
    '69738-3', // CBC W Auto Differential panel - Blood by Automated count
  ],
  // CHEMISTRY - GLUCOSE
  Glucose: [
    '2345-7', // Glucose [Mass/volume] in Serum or Plasma
    '1558-6', // Fasting glucose [Mass/volume] in Serum or Plasma
    '2339-0', // Glucose [Mass/volume] in Blood
  ],
  // RENAL FUNCTION
  Creatinine: [
    '2160-0', // Creatinine [Mass/volume] in Serum or Plasma
  ],
  'Blood Urea Nitrogen': [
    '3094-0', // Urea nitrogen [Mass/volume] in Serum or Plasma
    '6299-2', // Urea nitrogen [Mass/volume] in Blood
  ],
  // ELECTROLYTES
  Sodium: [
    '2951-2', // Sodium [Moles/volume] in Serum or Plasma
  ],
  Potassium: [
    '2823-3', // Potassium [Moles/volume] in Serum or Plasma
  ],
  Chloride: [
    '2075-0', // Chloride [Moles/volume] in Serum or Plasma
  ],
  Calcium: [
    '17861-6', // Calcium [Mass/volume] in Serum or Plasma
    '1994-3', // Calcium.ionized [Moles/volume] in Serum or Plasma
  ],
  Magnesium: [
    '19123-9', // Magnesium [Mass/volume] in Serum or Plasma
  ],
  Phosphate: [
    '14879-1', // Phosphate [Mass/volume] in Serum or Plasma
  ],
  // PROTEINS
  Albumin: [
    '1751-7', // Albumin [Mass/volume] in Serum or Plasma
  ],
  'Total Protein': [
    '2885-2', // Protein [Mass/volume] in Serum or Plasma
  ],
  // LIVER FUNCTION
  Bilirubin: [
    '1975-2', // Bilirubin.total [Mass/volume] in Serum or Plasma
    '1968-7', // Bilirubin.direct [Mass/volume] in Serum or Plasma
    '1971-1', // Bilirubin.indirect [Mass/volume] in Serum or Plasma
  ],
  'Alkaline Phosphatase': [
    '6768-6', // Alkaline phosphatase [Enzymatic activity/volume] in Serum or Plasma
  ],
  AST: [
    '1920-8', // Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma
  ],
  ALT: [
    '1742-6', // Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma
  ],
  GGT: [
    '2324-2', // Gamma glutamyl transferase [Enzymatic activity/volume] in Serum or Plasma
  ],
  // ENDOCRINE
  TSH: [
    '3016-3', // Thyrotropin [Units/volume] in Serum or Plasma
  ],
  'Free T4': [
    '3024-7', // Thyroxine (T4) free [Mass/volume] in Serum or Plasma
  ],
  'Total T4': [
    '3026-2', // Thyroxine (T4) [Mass/volume] in Serum or Plasma
  ],
  'Free T3': [
    '3051-0', // Triiodothyronine (T3) free [Mass/volume] in Serum or Plasma
  ],
  'Total T3': [
    '3053-6', // Triiodothyronine (T3) [Mass/volume] in Serum or Plasma
  ],
  HbA1c: [
    '4548-4', // Hemoglobin A1c/Hemoglobin.total in Blood
    '17856-6', // Hemoglobin A1c/Hemoglobin.total in Blood by HPLC
  ],
  // LIPID PANEL
  'Lipid Panel': [
    '24331-1', // Lipid 1996 panel - Serum or Plasma
    '57698-3', // Lipid panel with direct LDL - Serum or Plasma
  ],
  'Cholesterol Total': [
    '2093-3', // Cholesterol [Mass/volume] in Serum or Plasma
  ],
  'HDL Cholesterol': [
    '2085-9', // Cholesterol in HDL [Mass/volume] in Serum or Plasma
  ],
  'LDL Cholesterol': [
    '13457-7', // Cholesterol in LDL [Mass/volume] in Serum or Plasma by calculation
    '18262-6', // Cholesterol in LDL [Mass/volume] in Serum or Plasma by Direct assay
  ],
  Triglycerides: [
    '2571-8', // Triglyceride [Mass/volume] in Serum or Plasma
  ],
  // COAGULATION STUDIES (COMMONLY MISSING!)
  PT: [
    '5902-2', // Prothrombin time (PT)
  ],
  INR: [
    '6301-6', // INR in Platelet poor plasma by Coagulation assay
  ],
  PTT: [
    '3173-2', // aPTT in Blood by Coagulation assay
    '14979-9', // aPTT in Platelet poor plasma by Coagulation assay
  ],
  Fibrinogen: [
    '3255-7', // Fibrinogen [Mass/volume] in Platelet poor plasma by Coagulation assay
  ],
  'D-Dimer': [
    '48065-7', // D-dimer FEU [Mass/volume] in Platelet poor plasma
    '48066-5', // D-dimer DDU [Mass/volume] in Platelet poor plasma
  ],
  // CARDIAC MARKERS (CRITICAL FOR ER!)
  'Troponin I': [
    '10839-9', // Troponin I.cardiac [Mass/volume] in Serum or Plasma
    '42757-5', // Troponin I.cardiac [Mass/volume] in Blood
    '89579-7', // Troponin I.cardiac [Mass/volume] in Serum or Plasma by High sensitivity method
  ],
  'Troponin T': [
    '6598-7', // Troponin T.cardiac [Mass/volume] in Serum or Plasma
    '48425-3', // Troponin T.cardiac [Mass/volume] in Serum or Plasma by High sensitivity method
  ],
  BNP: [
    '30934-4', // BNP [Mass/volume] in Serum or Plasma
  ],
  'NT-proBNP': [
    '33762-6', // NT-proBNP [Mass/volume] in Serum or Plasma
  ],
  'CK-MB': [
    '13969-1', // Creatine kinase.MB [Mass/volume] in Serum or Plasma
  ],
  // INFLAMMATORY MARKERS
  CRP: [
    '1988-5', // C reactive protein [Mass/volume] in Serum or Plasma
    '30522-7', // C reactive protein [Mass/volume] in Serum or Plasma by High sensitivity method
  ],
  ESR: [
    '30341-2', // Erythrocyte sedimentation rate by Westergren method
    '4537-7', // Erythrocyte sedimentation rate
  ],
  // VITAMINS & MINERALS (VERY HIGH VOLUME!)
  'Vitamin D': [
    '1990-1', // Vitamin D [Mass/volume] in Serum or Plasma (obsolete, but still used)
    '14635-7', // 25-Hydroxyvitamin D3 [Mass/volume] in Serum or Plasma
    '62292-8', // 25-Hydroxyvitamin D2+D3 [Mass/volume] in Serum or Plasma
  ],
  'Vitamin B12': [
    '2132-9', // Cobalamin (Vitamin B12) [Mass/volume] in Serum or Plasma
  ],
  Folate: [
    '2284-8', // Folate [Mass/volume] in Serum or Plasma
    '15152-2', // Folate [Mass/volume] in Red Blood Cells
  ],
  Iron: [
    '2498-4', // Iron [Mass/volume] in Serum or Plasma
  ],
  Ferritin: [
    '2276-4', // Ferritin [Mass/volume] in Serum or Plasma
  ],
  TIBC: [
    '2500-7', // Iron binding capacity [Mass/volume] in Serum or Plasma
  ],
  // OTHER COMMON TESTS
  PSA: [
    '2857-1', // Prostate specific Ag [Mass/volume] in Serum or Plasma
    '10886-0', // Prostate specific Ag Free [Mass/volume] in Serum or Plasma
  ],
  'Uric Acid': [
    '3084-1', // Urate [Mass/volume] in Serum or Plasma
  ],
  LDH: [
    '2532-0', // Lactate dehydrogenase [Enzymatic activity/volume] in Serum or Plasma
    '14804-9',
    // Lactate dehydrogenase [Enzymatic activity/volume] in Serum or Plasma by Lactate to pyruvate reaction
  ],
  Amylase: [
    '1798-8', // Amylase [Enzymatic activity/volume] in Serum or Plasma
  ],
  Lipase: [
    '3040-3', // Lipase [Enzymatic activity/volume] in Serum or Plasma
  ],
  hCG: [
    '21198-7', // Choriogonadotropin.beta subunit [Units/volume] in Serum or Plasma
    '2118-8', // Choriogonadotropin (pregnancy test) [Presence] in Serum or Plasma
    '2106-3', // Choriogonadotropin (pregnancy test) [Presence] in Urine
  ],
  // URINALYSIS
  Urinalysis: [
    '24357-6', // Urinalysis macro (dipstick) panel - Urine
    '24356-8', // Urinalysis complete panel - Urine
  ],
};
