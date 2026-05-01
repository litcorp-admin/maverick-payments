const axios = require('axios');
require('dotenv').config();

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const HUBSPOT_PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;
const ENVIRONMENT = process.env.ENVIRONMENT;
const PRODUCTION_PORTAL_ID = process.env.PRODUCTION_PORTAL_ID;

if (!HUBSPOT_ACCESS_TOKEN || !HUBSPOT_PORTAL_ID) {
  console.error('Error: HUBSPOT_ACCESS_TOKEN or HUBSPOT_PORTAL_ID not set');
  process.exit(1);
}

if (ENVIRONMENT === 'production' && HUBSPOT_PORTAL_ID !== PRODUCTION_PORTAL_ID) {
  console.error('Error: Production portal ID mismatch. Aborting for safety.');
  process.exit(1);
}

const GROUPS_TO_DELETE = ['pipedrivemigration', 'marketinginformation'];
const OBJECTS = ['contacts', 'companies', 'deals', 'leads'];

async function deleteGroup(objectType, groupName) {
  try {
    await axios.delete(
      `https://api.hubapi.com/crm/v3/properties/${objectType}/groups/${groupName}`,
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`✓ Deleted group '${groupName}' from ${objectType}`);
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`⊘ Group '${groupName}' not found on ${objectType} (already deleted)`);
    } else {
      console.error(`✗ Error deleting group '${groupName}' from ${objectType}:`, error.response?.data || error.message);
    }
  }
}

async function main() {
  console.log(`\n🗑️  Starting group deletion (${ENVIRONMENT})\n`);

  for (const objectType of OBJECTS) {
    for (const groupName of GROUPS_TO_DELETE) {
      await deleteGroup(objectType, groupName);
    }
  }

  console.log('\n✓ Group deletion complete\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});