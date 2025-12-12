# Running test with real data
1. Create a .env.local file at the top level
2. Set `BEARER_TOKEN` in .env.local with a valid token
3. Set person id in `downloadSummary.ts`
3. Run `downloadSummary.ts` to download the resource bundle into `tests_integration/production_record/fixtures/production/bundle.json`
4. Run `split_bundle.ts` to split the resource bundle into individual files (this is just for troubleshooting)
5. Run `production_record.test.ts` to run the test against the downloaded data
6. View the resulting markdown file in `tests_integration/production_record/temp/output.md`

The `tests_integration/production_record/fixtures/production` folder and `.env.local` are excluded from GitHub.

Be sure to delete the files in the `tests_integration/production_record/fixtures/production` as soon as you're done testing.