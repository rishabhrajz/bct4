import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function migrateVcStore() {
    const vcStorePath = path.join(__dirname, '..', 'vc-store.json');

    console.log('🔄 ProjectY VC Store Migration\n');
    console.log('===============================\n');

    // Check if vc-store.json exists
    if (!fs.existsSync(vcStorePath)) {
        console.log('ℹ️  No vc-store.json found - nothing to migrate');
        return;
    }

    console.log('✅ Found vc-store.json');

    // Backup the old file
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupPath = path.join(backupDir, `vc-store-${timestamp}.json`);

    fs.copyFileSync(vcStorePath, backupPath);
    console.log(`📦 Backed up to: ${backupPath}\n`);

    // Read vc-store.json
    const vcStoreData = JSON.parse(fs.readFileSync(vcStorePath, 'utf8'));

    let insertedProviders = 0;
    let insertedPolicies = 0;
    let skipped = 0;

    console.log('📋 Processing entries...\n');

    // Migrate providers (entries with "provider-" prefix or provider data)
    for (const [key, value] of Object.entries(vcStoreData)) {
        try {
            // Handle provider entries
            if (key.startsWith('provider-') || value.type === 'provider' || value.credentialSubject?.type === 'HealthcareProvider') {
                const providerData = value.credentialSubject || value;
                const providerDid = providerData.id || providerData.providerDid;

                if (!providerDid) {
                    console.log(`⚠️  Skipping invalid provider entry: ${key}`);
                    skipped++;
                    continue;
                }

                // Check if provider already exists
                const existing = await prisma.provider.findUnique({
                    where: { providerDid }
                });

                if (existing) {
                    console.log(`ℹ️  Provider ${providerDid} already exists - skipping`);
                    skipped++;
                    continue;
                }

                // Insert provider
                await prisma.provider.create({
                    data: {
                        providerDid,
                        providerAddress: providerData.address || providerData.providerAddress || '0x0000000000000000000000000000000000000000',
                        name: providerData.name || 'Migrated Provider',
                        licenseCid: providerData.licenseCid || null,
                        licenseUrl: providerData.licenseUrl || null,
                        vcCid: value.vcCid || null,
                        jwt: value.jwt || value.proof?.jwt || null,
                        issuerDid: value.issuer || value.issuerDid || providerDid,
                        issuedAt: value.issuanceDate ? new Date(value.issuanceDate) : new Date()
                    }
                });

                console.log(`✅ Migrated provider: ${providerData.name || providerDid}`);
                insertedProviders++;
            }
            // Handle policy entries
            else if (key.startsWith('policy-') || value.type === 'policy' || value.credentialSubject?.type === 'InsurancePolicy') {
                const policyData = value.credentialSubject || value;
                const onchainPolicyId = policyData.policyId || parseInt(key.replace('policy-', ''));

                if (isNaN(onchainPolicyId)) {
                    console.log(`⚠️  Skipping invalid policy entry: ${key}`);
                    skipped++;
                    continue;
                }

                // Check if policy already exists
                const existing = await prisma.policy.findUnique({
                    where: { onchainPolicyId }
                });

                if (existing) {
                    console.log(`ℹ️  Policy ${onchainPolicyId} already exists - skipping`);
                    skipped++;
                    continue;
                }

                // Find or create a default provider
                let provider = await prisma.provider.findFirst();
                if (!provider) {
                    provider = await prisma.provider.create({
                        data: {
                            providerDid: 'did:ethr:localhost:0x0000000000000000000000000000000000000001',
                            providerAddress: '0x0000000000000000000000000000000000000001',
                            name: 'Default Provider (Migrated)',
                            issuerDid: 'did:ethr:localhost:0x0000000000000000000000000000000000000001',
                            issuedAt: new Date()
                        }
                    });
                }

                // Insert policy
                await prisma.policy.create({
                    data: {
                        onchainPolicyId,
                        policyVcCid: value.vcCid || null,
                        issuerDid: value.issuer || value.issuerDid || provider.issuerDid,
                        beneficiaryAddress: policyData.beneficiary || policyData.beneficiaryAddress || '0x0000000000000000000000000000000000000000',
                        beneficiaryDid: policyData.beneficiaryDid || policyData.id || null,
                        coverageAmount: (policyData.coverageAmount || '1000000000000000000').toString(),
                        startEpoch: policyData.startEpoch || Math.floor(Date.now() / 1000),
                        endEpoch: policyData.endEpoch || Math.floor(Date.now() / 1000) + 31536000,
                        providerId: provider.id
                    }
                });

                console.log(`✅ Migrated policy: ${onchainPolicyId}`);
                insertedPolicies++;
            }
        } catch (error) {
            console.error(`❌ Error migrating entry ${key}:`, error.message);
            skipped++;
        }
    }

    console.log('\n===============================');
    console.log('📊 Migration Summary');
    console.log('===============================');
    console.log(`Providers inserted: ${insertedProviders}`);
    console.log(`Policies inserted:  ${insertedPolicies}`);
    console.log(`Entries skipped:    ${skipped}`);
    console.log('===============================\n');

    console.log('✅ Migration complete!');
    console.log(`   Original file backed up to: ${backupPath}`);
    console.log('   You can now safely delete vc-store.json if desired.\n');
}

migrateVcStore()
    .then(() => {
        prisma.$disconnect();
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Migration failed:', error);
        prisma.$disconnect();
        process.exit(1);
    });
