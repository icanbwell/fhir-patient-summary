import { NarrativeGenerator } from "../../src";
import { IPSSections } from "../../src/structures/ips_sections";
import { TCarePlan } from "../../src/types/resources/CarePlan";

/**
 * Clinical free text routinely carries comparator values such as "<10" or
 * "<= 5 mg/dL". A "<" that is not the start of a tag is literal text, but left
 * unescaped the minifier's parser reads it as a malformed tag and rejects the
 * whole narrative.
 */
describe('Narrative minification of comparator text', () => {
    // One case per character class that can follow a literal "<": digit,
    // "=", and whitespace.
    const COMPARATOR_TEXTS = [
        '<10',
        '<2 servings',
        '<=5',
        '<=3.5 mg/dL and stable',
        'Value < 15, repeat test',
        '< 20 units',
        '<=4 or >8 outside reference range',
    ];

    describe('minifyHtmlAsync', () => {
        it.each(COMPARATOR_TEXTS)(
            'minifies a table cell containing %j instead of failing',
            async (text) => {
                const result = await NarrativeGenerator.minifyHtmlAsync(`<td>${text}</td>`);

                expect(result).not.toMatch(/Parse Error/);
                // The text survives, with the stray "<" escaped. Compared with
                // runs of whitespace collapsed, since that is exactly what
                // collapseWhitespace is meant to do.
                const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
                expect(collapse(result)).toContain(collapse(text.replace(/</g, '&lt;')));
            }
        );

        it('leaves real tags untouched', async () => {
            const result = await NarrativeGenerator.minifyHtmlAsync(
                '<table><tbody><tr><td>ok</td></tr></tbody></table>'
            );

            expect(result).toContain('<table>');
            expect(result).toContain('<td>ok</td>');
        });

        it('never logs the content or the error when minification fails', async () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            // "<b" is a well-formed tag start, so escaping cannot rescue it and
            // the minifier still throws — this exercises the failure handler.
            const sentinel = 'CONTENT_MUST_NOT_BE_LOGGED';
            const unparseable = `<td>${sentinel} <banana</td>`;

            try {
                await NarrativeGenerator.minifyHtmlAsync(unparseable);

                expect(warnSpy).toHaveBeenCalled();
                const logged = warnSpy.mock.calls.flat().map(String).join(' ');
                // The minifier echoes a fragment of its input in the message,
                // so neither the content nor the error may be logged.
                expect(logged).not.toContain(sentinel);
                expect(logged).not.toContain('banana');
            } finally {
                warnSpy.mockRestore();
            }
        });

        it('falls back to the unminified content, not the error message', async () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            const unparseable = '<td>some text <banana</td>';

            try {
                const result = await NarrativeGenerator.minifyHtmlAsync(unparseable);

                expect(result).toBe(unparseable);
                expect(result).not.toMatch(/Parse Error/);
            } finally {
                warnSpy.mockRestore();
            }
        });
    });

    describe('end-to-end narrative generation', () => {
        it('renders a CarePlan note containing "< 15" as a valid narrative', async () => {
            const carePlan: TCarePlan = {
                resourceType: 'CarePlan',
                id: 'cp-1',
                status: 'active',
                intent: 'plan',
                description: 'Insulin sliding scale',
                note: [{ text: 'If glucose < 15, decrease 2 units' }],
            } as TCarePlan;

            const narrative = await NarrativeGenerator.generateNarrativeAsync(
                IPSSections.CARE_PLAN,
                [carePlan],
                'America/New_York'
            );

            expect(narrative).toBeDefined();
            expect(narrative!.div).not.toMatch(/Parse Error/);
            expect(narrative!.div).toContain('Insulin sliding scale');
            expect(narrative!.div).toContain('If glucose &lt; 15, decrease 2 units');
        });
    });
});
