# Maverick Payments - HubSpot Migration

Property creation automation for Maverick Payments migration from Pipedrive to HubSpot.

## Overview

This repository contains scripts to create custom properties in HubSpot for:
- **Contacts**: 45 properties
- **Companies**: 39 properties  
- **Deals**: 55 properties
- **Leads**: 35 properties

**Total: 174 properties**

## Prerequisites

- Node.js 22+
- HubSpot CLI 8.5.0+
- Private App Access Token with required scopes

## Project Structure
cat > README.md << 'EOF'
# Maverick Payments - HubSpot Migration

Property creation automation for Maverick Payments migration from Pipedrive to HubSpot.

## Overview

This repository contains scripts to create custom properties in HubSpot for:
- **Contacts**: 45 properties
- **Companies**: 39 properties  
- **Deals**: 55 properties
- **Leads**: 35 properties

**Total: 174 properties**

## Prerequisites

- Node.js 22+
- HubSpot CLI 8.5.0+
- Private App Access Token with required scopes

## Project Structure

    maverick-payments/
    ├── scripts/
    │   ├── create-groups.js       # Step 1: Create property groups
    │   ├── create-properties.js   # Step 2: Create properties
    │   ├── delete-properties.js   # Cleanup test portal (pd_* only)
    │   └── delete-groups.js       # Optional: Remove property groups
    ├── config/
    │   ├── contacts.json          # Contact property definitions
    │   ├── companies.json         # Company property definitions
    │   ├── deals.json             # Deal property definitions
    │   └── leads.json             # Lead property definitions
    ├── .env.test                  # Test portal credentials
    ├── .env.prod                  # Production portal credentials
    └── .env.example               # Template for environment variables

## Setup Instructions

### 1. Install HubSpot CLI

    npm install -g @hubspot/cli

### 2. Configure Environment Variables

Copy the example file:

    cp .env.example .env.test

Edit .env.test and add your credentials:

    HUBSPOT_PORTAL_ID=your-test-portal-id
    HUBSPOT_ACCESS_TOKEN=your-test-access-token
    ENVIRONMENT=test
    PRODUCTION_PORTAL_ID=your-prod-portal-id

### 3. Authenticate HubSpot CLI

    hs auth

## Usage

### Create Property Groups (Run First)

    node scripts/create-groups.js

### Create Properties (Run Second)

    node scripts/create-properties.js

### Cleanup Test Portal (Test Only)

Only deletes properties with 'pd_' prefix. Hard-coded production guard prevents running in prod.

    node scripts/delete-properties.js

### Remove Property Groups (Optional)

    node scripts/delete-groups.js

## Security & Compliance

This project follows Maverick Payments security requirements:

**6.3 API Security:**
- Uses Private Apps only (not OAuth)
- Tokens scoped to minimum required permissions
- Credentials stored in .env files (excluded from Git)
- Production portal has hard-coded safeguards
- Delete operations limited to pd_* prefix properties

**Required Scopes:**

    crm.schemas.contacts.write
    crm.schemas.companies.write
    crm.schemas.deals.write
    crm.schemas.leads.write

## Workflow

1. **Test Portal**: Run scripts in test environment
2. **Validation**: Verify all properties created correctly
3. **Security Review**: Submit to Maverick security team
4. **Approval**: Get sign-off from security team
5. **Production**: Deploy to production portal

## Safety Features

- Environment variable validation before execution
- Production portal ID hard-coded in delete scripts
- Only deletes properties with pd_* prefix
- Confirmation prompts for destructive operations
- Separate branches for test and production

## License

Proprietary - Maverick Payments

---

**Last Updated**: April 30, 2026  
**Maintained by**: LitCorp Admin
