# FHIR to CSV Conversion

### Usage Instructions for Pure JavaScript Projects

To use this package in a pure JavaScript project, follow these steps:

1. Install the package using npm or yarn.
2. Import the `FHIRBundleConverter` class using `require`.
3. Use the `convertBundleToDictionaries` method to extract data from a FHIR bundle.
4. Use the `convertToCSV` method to convert the extracted data to CSV format.

### Code Examples for Pure JavaScript Projects

### Note on Dependency Installation

After adding this package to your project, ensure that you install the required dependencies by running `npm install` or `yarn install`.


## Making changes to existing converters
If you need to make changes to existing converters, follow these steps:
1. Identify the converter you want to modify in the `src/converters` directory.
2. Make the necessary changes to the converter code.
3. Test the changes by running the test suite to ensure that the modified converter works as expected.
4. Commit the changes and push them to the repository.
5. Create a pull request to merge the changes into the main branch.
6. Once the pull request is approved, merge the changes into the main branch.
7. Deploy the updated code to the production environment.

## Adding new converters
If you need to add new converters for additional FHIR resources, follow these steps:
1. Create a new file in the `src/converters` directory for the new converter.
2. Implement the converter logic in the new file, following the structure and conventions used in existing converters.
3. Add the new converter to the `FHIRBundleConverter` class so that it can be used to convert the new resource type.
4. Write units for testing the new converter by running the test suite to ensure that it works as expected.
5. Commit the changes and push them to the repository.