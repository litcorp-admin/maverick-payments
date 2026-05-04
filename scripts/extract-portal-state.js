require('dotenv').config();
const fs = require('fs');
const hubspot = require('@hubspot/api-client');

const client = new hubspot.Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });
const OBJECT_TYPES = ['contacts', 'companies', 'deals', 'leads'];
const PREFIX = 'pd_';
const PLANNED_GROUPS = ['pipedrivemigration', 'marketinginformation'];
const COMPARE_FIELDS = ['type', 'fieldType', 'groupName'];

function optionsEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].label !== b[i].label || a[i].value !== b[i].value) return false;
  }
  return true;
}

async function fetchObjectState(objectType) {
  const [groupsRes, propsRes] = await Promise.all([
    client.crm.properties.groupsApi.getAll(objectType),
    client.crm.properties.coreApi.getAll(objectType),
  ]);
  return {
    groups: groupsRes.results.map(g => ({
      name: g.name, label: g.label, displayOrder: g.displayOrder,
    })),
    properties: propsRes.results
      .filter(p => p.name.startsWith(PREFIX))
      .map(p => {
        const out = {
          name: p.name, label: p.label, type: p.type,
          fieldType: p.fieldType, groupName: p.groupName,
        };
        if (p.options && p.options.length) {
          out.options = p.options.map(o => ({ label: o.label, value: o.value }));
        }
        return out;
      }),
  };
}

function compareWithConfig(objectType, portalState) {
  const configPath = `config/${objectType}.json`;
  if (!fs.existsSync(configPath)) {
    return { groups: [], properties: [], portalOnly: [], error: `missing ${configPath}` };
  }
  const planned = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const plannedByName = new Map(planned.map(p => [p.name, p]));
  const portalGroups = new Set(portalState.groups.map(g => g.name));
  const portalProps = new Map(portalState.properties.map(p => [p.name, p]));

  const groups = PLANNED_GROUPS.map(name => ({
    name, status: portalGroups.has(name) ? 'EXISTS' : 'NEW',
  }));

  const properties = planned.map(cfg => {
    const live = portalProps.get(cfg.name);
    if (!live) return { name: cfg.name, status: 'NEW' };
    const diffs = COMPARE_FIELDS
      .filter(k => live[k] !== cfg[k])
      .map(k => ({ field: k, portal: live[k], config: cfg[k] }));
    if (!optionsEqual(live.options, cfg.options)) {
      diffs.push({ field: 'options', portal: live.options || [], config: cfg.options || [] });
    }
    return diffs.length
      ? { name: cfg.name, status: 'CONFLICT', diffs }
      : { name: cfg.name, status: 'MATCH' };
  });

  const portalOnly = [...portalProps.keys()].filter(n => !plannedByName.has(n));

  return { groups, properties, portalOnly };
}

async function main() {
  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    console.error('Error: HUBSPOT_ACCESS_TOKEN not set');
    process.exit(1);
  }
  const portalId = process.env.HUBSPOT_PORTAL_ID || 'unknown';
  const env = process.env.ENVIRONMENT || 'unknown';
  console.log(`Portal: ${portalId} | Env: ${env}\n`);

  const state = {};
  const diff = {};
  for (const objectType of OBJECT_TYPES) {
    process.stdout.write(`Fetching ${objectType}... `);
    state[objectType] = await fetchObjectState(objectType);
    console.log(`groups=${state[objectType].groups.length}, ${PREFIX}properties=${state[objectType].properties.length}`);
    diff[objectType] = compareWithConfig(objectType, state[objectType]);
  }

  fs.mkdirSync('extracts', { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace(/-\d{3}Z$/, 'Z');
  const outPath = `extracts/portal-${portalId}-${ts}.json`;
  fs.writeFileSync(outPath, JSON.stringify({
    portalId, env, capturedAt: new Date().toISOString(),
    prefix: PREFIX, plannedGroups: PLANNED_GROUPS,
    state, diff,
  }, null, 2));
  console.log(`\nExtract saved: ${outPath}\n`);

  let totalConflicts = 0;
  for (const objectType of OBJECT_TYPES) {
    const d = diff[objectType];
    const conflicts = d.properties.filter(p => p.status === 'CONFLICT');
    const news = d.properties.filter(p => p.status === 'NEW').length;
    const matches = d.properties.filter(p => p.status === 'MATCH').length;
    totalConflicts += conflicts.length;

    console.log(`${objectType.toUpperCase()}:`);
    console.log(`  Groups : ${d.groups.map(g => `${g.name}=${g.status}`).join(', ')}`);
    console.log(`  Props  : NEW=${news}, MATCH=${matches}, CONFLICT=${conflicts.length}`);
    if (conflicts.length) {
      conflicts.forEach(c => {
        console.log(`    ! ${c.name}`);
        c.diffs.forEach(d => {
          if (d.field === 'options') {
            const fmt = arr => arr.map(o => `${o.label}|${o.value}`).join(';') || '(none)';
            console.log(`        options:`);
            console.log(`          portal: ${fmt(d.portal)}`);
            console.log(`          config: ${fmt(d.config)}`);
          } else {
            console.log(`        ${d.field}: portal="${d.portal}" vs config="${d.config}"`);
          }
        });
      });
    }
    if (d.portalOnly.length) {
      console.log(`  Portal-only ${PREFIX}properties (not in config): ${d.portalOnly.length}`);
      d.portalOnly.slice(0, 10).forEach(n => console.log(`    - ${n}`));
      if (d.portalOnly.length > 10) console.log(`    ... +${d.portalOnly.length - 10} more`);
    }
    console.log();
  }

  console.log(totalConflicts === 0
    ? 'No conflicts. Safe to run create-groups.js + create-properties.js (existing items will 409-skip).'
    : `${totalConflicts} CONFLICT(s) detected. Resolve before running create-properties.js.`);
  process.exit(totalConflicts === 0 ? 0 : 2);
}

main().catch(e => {
  console.error('\nERROR:', e.message);
  if (/permissions|requires one of/i.test(e.message || '')) {
    console.error('\nThe Account Service Key is missing read scopes. Add these in HubSpot:');
    console.error('  crm.schemas.contacts.read');
    console.error('  crm.schemas.companies.read');
    console.error('  crm.schemas.deals.read');
    console.error('  (leads has no schema-level read scope; the leads write scope grants list access)');
  }
  process.exit(1);
});
