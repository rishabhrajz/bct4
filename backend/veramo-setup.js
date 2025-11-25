import { createAgent } from '@veramo/core';
import { DIDManager } from '@veramo/did-manager';
import { KeyManager } from '@veramo/key-manager';
import { KeyManagementSystem, SecretBox } from '@veramo/kms-local';
import { EthrDIDProvider } from '@veramo/did-provider-ethr';
import { getResolver as ethrDidResolver } from 'ethr-did-resolver';
import { CredentialPlugin } from '@veramo/credential-w3c';
import { DIDResolverPlugin } from '@veramo/did-resolver';
import { Resolver } from 'did-resolver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Environment variables
const KMS_SECRET_KEY = process.env.KMS_SECRET_KEY || 'default-secret-key-change-in-production-32chars';
const KEY_STORAGE_PATH = process.env.VERAMO_KEY_STORAGE_PATH || './veramo_keystore';
const ISSUER_ALIAS = process.env.VERAMO_ISSUER_ALIAS || 'projecty-issuer';
const ETH_RPC = process.env.ETH_RPC || 'http://127.0.0.1:8545';

// Ensure key storage directory exists
const keyStorageDir = path.resolve(KEY_STORAGE_PATH);
if (!fs.existsSync(keyStorageDir)) {
    fs.mkdirSync(keyStorageDir, { recursive: true });
    console.log('✅ Created Veramo key storage directory:', keyStorageDir);
}

// File-based key store for persistence  
const keyStorePath = path.join(keyStorageDir, 'keys.json');

// In-memory store with file backup
class SimplePersistentStore {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = this._load();
    }

    _load() {
        if (fs.existsSync(this.filePath)) {
            try {
                const content = fs.readFileSync(this.filePath, 'utf8');
                return JSON.parse(content);
            } catch (e) {
                console.warn('Could not load store, starting fresh');
                return {};
            }
        }
        return {};
    }

    _save() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error('Error saving store:', e.message);
        }
    }

    async get(args) {
        // Handle different types of queries
        let key;
        if (typeof args === 'string') {
            key = args;
        } else if (args.did) {
            key = args.did; // For DID queries
        } else {
            key = args.kid || args.key; // For key queries
        }
        return this.data[key];
    }

    async set(args) {
        // Use 'did' for DID objects, 'kid' for keys
        const key = args.did || args.kid || args.key;
        this.data[key] = args;
        this._save();
        return true;
    }

    async delete(args) {
        let key;
        if (typeof args === 'string') {
            key = args;
        } else if (args.did) {
            key = args.did;
        } else {
            key = args.kid || args.key;
        }
        delete this.data[key];
        this._save();
        return true;
    }

    async import(args) {
        return this.set(args);
    }

    async list(args = {}) {
        const values = Object.values(this.data);
        let filtered = values;

        // Filter by alias if provided
        if (args.alias) {
            filtered = filtered.filter(v => v.alias === args.alias);
        }

        // Filter by provider if provided
        if (args.provider) {
            filtered = filtered.filter(v => v.provider === args.provider);
        }

        return filtered;
    }
}

// Create stores
const keyStore = new SimplePersistentStore(keyStorePath);
const didStore = new SimplePersistentStore(path.join(keyStorageDir, 'dids.json'));

// Create secret box for encryption
const secretBox = new SecretBox(KMS_SECRET_KEY);

// Create KMS with persistent storage
const kms = new KeyManagementSystem(keyStore, secretBox);

// Create Veramo agent
export const veramoAgent = createAgent({
    plugins: [
        new KeyManager({
            store: keyStore,
            kms: {
                local: kms
            }
        }),
        new DIDManager({
            store: didStore,
            defaultProvider: 'did:ethr:localhost',
            providers: {
                'did:ethr:localhost': new EthrDIDProvider({
                    defaultKms: 'local',
                    network: 'localhost',
                    rpcUrl: ETH_RPC,
                    registry: '0x...' // Will be updated after deployment
                })
            }
        }),
        new DIDResolverPlugin({
            resolver: new Resolver({
                ...ethrDidResolver({ networks: [{ name: 'localhost', rpcUrl: ETH_RPC }] })
            })
        }),
        new CredentialPlugin()
    ]
});

/**
 * Get or create the issuer DID
 * This ensures the same issuer DID is used across restarts
 */
export async function getOrCreateIssuerDid() {
    try {
        // Check if issuer already exists in database
        const existingIssuer = await prisma.veramoIssuer.findUnique({
            where: { alias: ISSUER_ALIAS }
        });

        if (existingIssuer) {
            console.log('✅ Using existing issuer DID:', existingIssuer.did);
            return existingIssuer.did;
        }

        // Create new issuer DID
        console.log('Creating new issuer DID...');

        // First create a key
        const key = await veramoAgent.keyManagerCreate({
            kms: 'local',
            type: 'Secp256k1'
        });

        // Then create a DID using that key
        const identifier = await veramoAgent.didManagerCreate({
            provider: 'did:ethr:localhost',
            kms: 'local',
            alias: ISSUER_ALIAS,
            options: {
                keyType: 'Secp256k1'
            }
        });

        // Store in database
        const issuer = await prisma.veramoIssuer.create({
            data: {
                alias: ISSUER_ALIAS,
                did: identifier.did
            }
        });

        console.log('✅ Created new issuer DID:', issuer.did);
        return issuer.did;
    } catch (error) {
        console.error('Error getting/creating issuer DID:', error);
        throw error;
    }
}

/**
 * Create a Verifiable Credential
 */
export async function createVC(credentialSubject, issuerDid) {
    try {
        const verifiableCredential = await veramoAgent.createVerifiableCredential({
            credential: {
                issuer: { id: issuerDid },
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                type: ['VerifiableCredential'],
                issuanceDate: new Date().toISOString(),
                credentialSubject
            },
            proofFormat: 'jwt',
            save: false
        });

        return verifiableCredential;
    } catch (error) {
        console.error('Error creating VC:', error);
        throw error;
    }
}

/**
 * Verify a Verifiable Credential
 */
export async function verifyVC(vcJwt) {
    try {
        const result = await veramoAgent.verifyCredential({
            credential: vcJwt
        });

        return result;
    } catch (error) {
        console.error('Error verifying VC:', error);
        throw error;
    }
}

console.log('✅ Veramo agent initialized with persistent local keys');
console.log('   Key storage:', keyStorageDir);
