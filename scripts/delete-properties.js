require('dotenv').config();
const hubspot = require('@hubspot/api-client');

const hubspotClient = new hubspot.Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

const PRODUCTION_PORTAL_ID = process.env.PRODUCTION_PORTAL_ID;
const CURRENT_PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;

if (process.env.ENVIRONMENT === 'production' && CURRENT_PORTAL_ID === PRODUCTION_PORTAL_ID) {
  console.error('PRODUCTION SAFETY CHECK FAILED');
  console.error('Delete operations in production require manual confirmation.');
  console.error('Set CONFIRM_DELETE=yes to proceed.');
  if (process.env.CONFIRM_DELETE !== 'yes') {
    process.exit(1);
  }
}

const objectTypes = ['contacts', 'companies', 'deals', 'leads'];

async function deletePropertiesForObject(objectType) {
  try {
    const response = await hubspotClient.crm.properties.coreApi.getAll(objectType);
    const pdProperties = response.results.filter(p => p.name.startsWith('pd_'));
    
    console.log(`\n${objectType.toUpperCase()}: Found ${pdProperties.length} pd_* properties`);
    
    for (const prop of pdProperties) {
      try {
        await hubspotClient.crm.properties.coreApi.archive(objectType, prop.name);
        console.log(`✓ Deleted ${objectType}.${prop.name}`);
      } catch (error) {
        console.error(`✗ Failed to delete ${objectType}.${prop.name}: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error(`Error fetching ${objectType} properties: ${error.message}`);
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
  
  for (const objectType of objectTypes) {
    await deletePropertiesForObject(objectType);
  }
  
  console.log('\nDeletion complete');
}

main().catch(console.error);
