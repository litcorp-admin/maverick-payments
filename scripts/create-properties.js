require('dotenv').config();
const fs = require('fs');
const hubspot = require('@hubspot/api-client');

const hubspotClient = new hubspot.Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

const objectTypes = ['contacts', 'companies', 'deals', 'leads'];

async function createProperty(objectType, property) {
  try {
    await hubspotClient.crm.properties.coreApi.create(objectType, property);
    console.log(`✓ Created ${objectType}.${property.name}`);
    return { success: true, property: property.name };
  } catch (error) {
    if (error.code === 409) {
      console.log(`⊘ Already exists: ${objectType}.${property.name}`);
      return { success: true, property: property.name, skipped: true };
    }
    console.error(`✗ Failed ${objectType}.${property.name}: ${error.message}`);
    return { success: false, property: property.name, error: error.message };
  }
}

async function createPropertiesForObject(objectType) {
  const properties = JSON.parse(fs.readFileSync(`config/${objectType}.json`, 'utf8'));
  console.log(`\n${objectType.toUpperCase()}: ${properties.length} properties`);
  
  const results = [];
  for (const prop of properties) {
    const result = await createProperty(objectType, prop);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const created = results.filter(r => r.success && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Summary: ${created} created, ${skipped} skipped, ${failed} failed\n`);
  return results;
}

async function main() {
  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    console.error('Error: HUBSPOT_ACCESS_TOKEN not set in .env file');
    process.exit(1);
  }
  
  console.log(`Environment: ${process.env.ENVIRONMENT || 'not set'}`);
  console.log(`Portal ID: ${process.env.HUBSPOT_PORTAL_ID || 'not set'}`);
  
  const allResults = {};
  
  for (const objectType of objectTypes) {
    allResults[objectType] = await createPropertiesForObject(objectType);
  }
  
  fs.writeFileSync('results.json', JSON.stringify(allResults, null, 2));
  console.log('Results saved to results.json');
}

main().catch(console.error);
