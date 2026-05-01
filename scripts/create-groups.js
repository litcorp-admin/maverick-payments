require('dotenv').config();
const hubspot = require('@hubspot/api-client');

const hubspotClient = new hubspot.Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

const objectTypes = ['contacts', 'companies', 'deals', 'leads'];

const groups = [
  {
    name: 'pipedrivemigration',
    label: 'Pipedrive Migration',
    displayOrder: -1
  },
  {
    name: 'marketinginformation',
    label: 'Marketing Information',
    displayOrder: -1
  }
];

async function createGroupsForObject(objectType) {
  console.log(`\n${objectType.toUpperCase()}:`);
  
  for (const group of groups) {
    try {
      await hubspotClient.crm.properties.groupsApi.create(objectType, group);
      console.log(`✓ Created group: ${group.name}`);
    } catch (error) {
      if (error.code === 409) {
        console.log(`⊘ Group already exists: ${group.name}`);
      } else {
        console.error(`✗ Failed to create ${group.name}: ${error.message}`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function main() {
  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    console.error('Error: HUBSPOT_ACCESS_TOKEN not set in .env file');
    process.exit(1);
  }
  
  console.log(`Environment: ${process.env.ENVIRONMENT || 'not set'}`);
  console.log(`Portal ID: ${process.env.HUBSPOT_PORTAL_ID || 'not set'}`);
  
  for (const objectType of objectTypes) {
    await createGroupsForObject(objectType);
  }
  
  console.log('\nGroup creation complete');
}

main().catch(console.error);
