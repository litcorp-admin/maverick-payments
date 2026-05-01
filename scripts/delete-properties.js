require('dotenv').config();
const hubspot = require('@hubspot/api-client');

const hubspotClient = new hubspot.Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

const PRODUCTION_PORTAL_ID = process.env.PRODUCTION_PORTAL_ID;
const CURRENT_PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;

// CRITICAL SAFETY CHECK - Never delete from production without explicit override
if (CURRENT_PORTAL_ID === PRODUCTION_PORTAL_ID && !process.env.ALLOW_PROD_DELETE) {
  console.error('❌ DELETE SCRIPT BLOCKED ON PRODUCTION PORTAL');
  console.error(`Portal ID ${CURRENT_PORTAL_ID} matches PRODUCTION_PORTAL_ID`);
  console.error('This script will NOT run on production without explicit override.');
  console.error('To proceed, set: ALLOW_PROD_DELETE=yes');
  process.exit(1);
}

// Secondary check for ENVIRONMENT variable
if (process.env.ENVIRONMENT === 'production') {
  console.warn('⚠️  WARNING: ENVIRONMENT=production detected');
  console.warn('Double-check you intended to run this on production.');
  if (!process.env.ALLOW_PROD_DELETE) {
    console.error('Set ALLOW_PROD_DELETE=yes to proceed.');
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
