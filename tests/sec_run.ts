import { ComprehensiveIPSCompositionBuilder } from "../src/generators/fhir_summary_generator";
import { IPSSections } from "../src/structures/ips_sections";
import { writeFileSync, readFileSync } from "node:fs";

// const EXAMPLE_BUNDLE_URL =
//     "https://build.fhir.org/ig/HL7/fhir-ips/branches/master/en/Bundle-IPS-examples-Bundle-01.json";

function extractNarrativeDivsFromBundle(bundle: any): string[] {
    const divs: string[] = [];

    const entries = bundle?.entry ?? [];
    for (const e of entries) {
        const r = e?.resource;
        if (!r) continue;

        // Any resource that has text.div
        const textDiv = r?.text?.div;
        if (typeof textDiv === "string" && textDiv.trim()) divs.push(textDiv);

        // Composition section narratives
        if (r.resourceType === "Composition") {
            const sections = r?.section ?? [];
            for (const s of sections) {
                const secDiv = s?.text?.div;
                if (typeof secDiv === "string" && secDiv.trim()) divs.push(secDiv);
            }
        }
    }

    return divs;
}

function stripHtml(html: string): string {
    return (
        html
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p>/gi, "\n")
            .replace(/<\/li>/gi, "\n")
            .replace(/<[^>]*>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+\n/g, "\n")
            .replace(/\n\s+/g, "\n")
            .replace(/[ \t]+/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim()
    );
}

async function main() {
    const timezone = "America/New_York";

    /*
    const resp = await fetch(EXAMPLE_BUNDLE_URL);
    if (!resp.ok) throw new Error(`Failed to download bundle: ${resp.status} ${resp.statusText}`);
    const inputBundle: any = await resp.json();
    */

    // Use local file instead of URL
    const filePath = "../new.json"; //sample json found on the fhir bundles site

    const inputBundle: any = JSON.parse(readFileSync(filePath, "utf-8"));


    const resources = (inputBundle?.entry ?? [])
        .map((e: any) => e?.resource)
        .filter(Boolean);

    // ✅ IMPORTANT: get ALL patients, not just one
    const patients = resources.filter((r: any) => r.resourceType === "Patient");
    if (patients.length === 0) throw new Error("No Patient resources found in input bundle");

    console.log(`Found ${patients.length} patient(s). Generating IPS bundle per patient...`);

    for (const patient of patients) {
        const patientId = patient.id ?? "unknown";

        const builder = new ComprehensiveIPSCompositionBuilder().setPatient(patient);

        // Required by your builder: sets this.patientSummary via PATIENT section narrative
        await builder.makeSectionAsync(IPSSections.PATIENT, [patient], timezone);

        // Builds other sections from the entire input bundle
        await builder.readBundleAsync(inputBundle, timezone);

        // ✅ Correct method name in your codebase
        const outputBundle = await builder.buildBundleAsync(
            "example-organization",
            "Example Organization",
            "https://example.com/fhir",
            timezone,
            false,          // includeSummaryCompositionOnly
            patientId       // primary patient id for composition reference
        );

        const outPath = `tests/ips_output_1.json`;
        writeFileSync(outPath, JSON.stringify(outputBundle, null, 2), "utf-8");
        console.log(`✅ Saved -> ${outPath}`);

        // Append narratives at bottom, but stripped of HTML tags
        const divsHtml = extractNarrativeDivsFromBundle(outputBundle);
        const divsText = divsHtml.map(stripHtml);

        const outWithDivs = {
            ...outputBundle,
            __summarizedDivsCount: divsText.length,
            __summarizedDivsText: divsText,
        };

        const outWithDivsPath = `tests/ips_output_1_with_divs.json`;
        writeFileSync(outWithDivsPath, JSON.stringify(outWithDivs, null, 2), "utf-8");
        console.log(`✅ Saved -> ${outWithDivsPath}`);
    }
}

main().catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
});
