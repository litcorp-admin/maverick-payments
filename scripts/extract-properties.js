require('dotenv').config();
const fs = require('fs');

const postman = JSON.parse(fs.readFileSync('postman-collection.json', 'utf8'));

const properties = {
  contacts: [],
  companies: [],
  deals: [],
  leads: []
};

postman.item.forEach(item => {
  if (item.request?.body?.raw) {
    try {
      const prop = JSON.parse(item.request.body.raw);
      const objectType = item.request.url.path[item.request.url.path.length - 1];
      if (properties[objectType]) {
        properties[objectType].push(prop);
      }
    } catch (e) {}
  }
});

fs.writeFileSync('config/contacts.json', JSON.stringify(properties.contacts, null, 2));
fs.writeFileSync('config/companies.json', JSON.stringify(properties.companies, null, 2));
fs.writeFileSync('config/deals.json', JSON.stringify(properties.deals, null, 2));
fs.writeFileSync('config/leads.json', JSON.stringify(properties.leads, null, 2));

console.log('Extracted:', Object.entries(properties).map(([k,v]) => `${k}: ${v.length}`).join(', '));