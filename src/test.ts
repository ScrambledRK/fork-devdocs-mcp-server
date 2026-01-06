// Simple test script to verify the server can fetch data
import fetch from "node-fetch";

const DEVDOCS_BASE_URL = "https://devdocs.io";
const DEVDOCS_DOCUMENTS_URL = "https://documents.devdocs.io";

async function testFetch() {
  console.log("Testing DevDocs API access...\n");

  try {
    // Test 1: Fetch docs list
    console.log("1. Fetching docs list...");
    const docsResponse = await fetch(`${DEVDOCS_BASE_URL}/docs.json`);
    const docs = await docsResponse.json() as any[];
    console.log(`   ✓ Found ${docs.length} documentation sets`);
    console.log(`   Examples: ${docs.slice(0, 5).map((d: any) => d.name).join(", ")}\n`);

    // Test 2: Fetch a specific index
    console.log("2. Fetching JavaScript index...");
    const indexResponse = await fetch(`${DEVDOCS_DOCUMENTS_URL}/javascript/index.json`);
    const index = await indexResponse.json() as any;
    console.log(`   ✓ Found ${index.entries?.length || 0} entries in JavaScript docs\n`);

    // Test 3: Fetch specific content
    console.log("3. Fetching Array.map documentation...");
    const contentResponse = await fetch(
      `${DEVDOCS_DOCUMENTS_URL}/javascript/global_objects/array/map.html`
    );
    const content = await contentResponse.text();
    console.log(`   ✓ Fetched ${content.length} bytes of content\n`);

    console.log("All tests passed! ✓");
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

testFetch();
