require('dotenv').config();
const hubspot = require('@hubspot/api-client');

const hubspotClient = new hubspot.Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

// Hard allowlist: this script ONLY runs against the test portal.
// To delete properties from any other portal (including production),
// use the HubSpot UI manually. There is intentionally no override flag.
const ALLOWED_PORTAL_ID = '51225486';
const CURRENT_PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;

if (CURRENT_PORTAL_ID !== ALLOWED_PORTAL_ID) {
  console.error('❌ DELETE SCRIPT BLOCKED');
  console.error(`This script only runs against test portal ${ALLOWED_PORTAL_ID}.`);
  console.error(`Current HUBSPOT_PORTAL_ID is "${CURRENT_PORTAL_ID || 'not set'}".`);
  console.error('Use the HubSpot UI to remove properties from any other portal.');
  process.exit(1);
}

const objectTypes = ['contacts', 'companies', 'deals', 'leads'];

async function deletePropertiesForObject(objectType) {
  try {
    const response = await hubspotClient.crm.properties.coreApi.getAll(objectType);
    const pdProperties = response.results.filter(p => p.name.startsWith('pd_'));

    console.log(`\n${objectType.toUpperCase()}: Found ${pdProperties.length} pd_* properties`);

    let deleted = 0, failed = 0;
    for (const prop of pdProperties) {
      try {
        await hubspotClient.crm.properties.coreApi.archive(objectType, prop.name);
        console.log(`✓ Deleted ${objectType}.${prop.name}`);
        deleted++;
      } catch (error) {
        console.error(`✗ Failed to delete ${objectType}.${prop.name}: ${error.message}`);
        failed++;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return { found: pdProperties.length, deleted, failed };
  } catch (error) {
    console.error(`Error fetching ${objectType} properties: ${error.message}`);
    return { found: 0, deleted: 0, failed: 0, error: error.message };
  }
}

async function main() {
  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    console.error('Error: HUBSPOT_ACCESS_TOKEN not set');
    process.exit(1);
  }
  
  console.log('⚠️  DELETE OPERATION');
  console.log(`Environment: ${process.env.ENVIRONMENT || 'not set'}`);
  console.log(`Portal ID: ${CURRENT_PORTAL_ID || 'not set'}`);
  console.log('This will delete all properties starting with pd_*\n');
  
  const totals = { found: 0, deleted: 0, failed: 0 };
  for (const objectType of objectTypes) {
    const r = await deletePropertiesForObject(objectType);
    totals.found += r.found;
    totals.deleted += r.deleted;
    totals.failed += r.failed;
  }

  console.log(`\nDeletion complete: ${totals.deleted} deleted, ${totals.failed} failed (of ${totals.found} found)`);
}

main().catch(console.error);
