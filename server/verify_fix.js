import FilterGenerator from './llm/filterGenerator.js';

// Mock getFilterCache to avoid dependency issues if possible, 
// strictly speaking we are importing the real one, but usually it works if it just returns a Map.
// The real file imports getFilterCache from '../utils/filterCache.js'. We assume that file exists and works.

const generator = new FilterGenerator();

const mockMetadata = {
    columns: {
        posted_time: 'string',
        // intentionally missing "time_category" or similar to trigger the validation error
    },
    uniqueValues: {
        platform: ['Facebook']
    }
};

async function run() {
    const testQuery = "What is the best time of day to post?";
    console.log(`Testing query: "${testQuery}"`);

    try {
        const result = await generator.generateFilters(testQuery, mockMetadata);

        console.log("---------------------------------------------------");
        console.log("Result keys:", Object.keys(result));

        if (result.alternatives && result.alternatives.length > 0) {
            console.log("✅ PASS: 'alternatives' array is present and populated.");
            console.log("First alternative:", result.alternatives[0]);
        } else {
            console.log("❌ FAIL: 'alternatives' array is MISSING or empty.");
            console.log("Result:", JSON.stringify(result, null, 2));
        }

    } catch (error) {
        console.error("Error running test:", error);
    }
}

run();
