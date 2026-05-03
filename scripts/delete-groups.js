require('dotenv').config();
const hubspot = require('@hubspot/api-client');

const hubspotClient = new hubspot.Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

// Hard allowlist: this script ONLY runs against the test portal.
// To delete groups from any other portal (including production),
// use the HubSpot UI manually. There is intentionally no override flag.
const ALLOWED_PORTAL_ID = '51225486';
const CURRENT_PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;

if (!process.env.HUBSPOT_ACCESS_TOKEN) {
  console.error('Error: HUBSPOT_ACCESS_TOKEN not set');
  process.exit(1);
}

if (CURRENT_PORTAL_ID !== ALLOWED_PORTAL_ID) {
  console.error('❌ DELETE SCRIPT BLOCKED');
  console.error(`This script only runs against test portal ${ALLOWED_PORTAL_ID}.`);
  console.error(`Current HUBSPOT_PORTAL_ID is "${CURRENT_PORTAL_ID || 'not set'}".`);
  console.error('Use the HubSpot UI to remove groups from any other portal.');
  process.exit(1);
}

const GROUPS_TO_DELETE = ['pipedrivemigration', 'marketinginformation'];
const OBJECT_TYPES = ['contacts', 'companies', 'deals', 'leads'];

async function deleteGroup(objectType, groupName) {
  try {
    await hubspotClient.crm.properties.groupsApi.archive(objectType, groupName);
    console.log(`✓ Deleted group '${groupName}' from ${objectType}`);
    return { deleted: true };
  } catch (error) {
    if (error.code === 404) {
      console.log(`⊘ Group '${groupName}' not found on ${objectType} (already deleted)`);
      return { skipped: true };
    }
    const msg = error.message || 'unknown error';
    console.error(`✗ Failed to delete '${groupName}' from ${objectType}: ${msg}`);
    if (/contains|not empty|propert/i.test(msg)) {
      console.error('   (group still contains properties — run delete-properties.js first)');
    }
    return { failed: true };
  }
}

async function main() {
  console.log('⚠️  GROUP DELETE OPERATION');
  console.log(`Environment: ${process.env.ENVIRONMENT || 'not set'}`);
  console.log(`Portal ID: ${CURRENT_PORTAL_ID}`);
  console.log(`Groups to delete: ${GROUPS_TO_DELETE.join(', ')}\n`);

  const totals = { deleted: 0, skipped: 0, failed: 0 };
  for (const objectType of OBJECT_TYPES) {
    console.log(`\n${objectType.toUpperCase()}:`);
    for (const groupName of GROUPS_TO_DELETE) {
      const r = await deleteGroup(objectType, groupName);
      if (r.deleted) totals.deleted++;
      else if (r.skipped) totals.skipped++;
      else totals.failed++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\nDeletion complete: ${totals.deleted} deleted, ${totals.skipped} not-found, ${totals.failed} failed`);
}

main().catch(error => {
  console.error('Fatal error:', error.message || error);
  process.exit(1);
});
