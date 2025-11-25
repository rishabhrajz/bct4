import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Pin a file to Pinata IPFS with retry logic
 * @param {Buffer|Stream} fileBuffer - The file buffer or stream
 * @param {string} filename - The filename
 * @returns {Promise<{cid: string, gatewayUrl: string}>}
 */
export async function pinFile(fileBuffer, filename) {
    if (!PINATA_JWT) {
        throw new Error('PINATA_JWT is not configured');
    }

    let lastError;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const formData = new FormData();

            // Convert buffer to stream if needed
            let stream = fileBuffer;
            if (Buffer.isBuffer(fileBuffer)) {
                stream = Readable.from(fileBuffer);
            }

            formData.append('file', stream, { filename });

            const metadata = JSON.stringify({
                name: filename,
                keyvalues: {
                    uploadedBy: 'projecty-backend',
                    timestamp: new Date().toISOString()
                }
            });
            formData.append('pinataMetadata', metadata);

            const options = JSON.stringify({
                cidVersion: 1
            });
            formData.append('pinataOptions', options);

            const response = await axios.post(
                `${PINATA_API_URL}/pinning/pinFileToIPFS`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        Authorization: `Bearer ${PINATA_JWT}`
                    },
                    maxBodyLength: Infinity
                }
            );

            const cid = response.data.IpfsHash;
            const gatewayUrl = `${PINATA_GATEWAY}${cid}`;

            console.log(`✅ File pinned to IPFS: ${cid}`);

            return { cid, gatewayUrl };
        } catch (error) {
            lastError = error;
            console.error(`❌ Pinata pin file attempt ${attempt + 1} failed:`, error.response?.data || error.message);

            if (attempt < MAX_RETRIES - 1) {
                console.log(`   Retrying in ${RETRY_DELAYS[attempt]}ms...`);
                await sleep(RETRY_DELAYS[attempt]);
            }
        }
    }

    throw new Error(`Failed to pin file to Pinata after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

/**
 * Pin JSON object to Pinata IPFS with retry logic
 * @param {object} jsonObject - The JSON object to pin
 * @returns {Promise<{cid: string, gatewayUrl: string}>}
 */
export async function pinJSON(jsonObject) {
    if (!PINATA_JWT) {
        throw new Error('PINATA_JWT is not configured');
    }

    let lastError;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await axios.post(
                `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
                {
                    pinataContent: jsonObject,
                    pinataMetadata: {
                        name: `vc-${Date.now()}.json`,
                        keyvalues: {
                            uploadedBy: 'projecty-backend',
                            timestamp: new Date().toISOString()
                        }
                    },
                    pinataOptions: {
                        cidVersion: 1
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${PINATA_JWT}`
                    }
                }
            );

            const cid = response.data.IpfsHash;
            const gatewayUrl = `${PINATA_GATEWAY}${cid}`;

            console.log(`✅ JSON pinned to IPFS: ${cid}`);

            return { cid, gatewayUrl };
        } catch (error) {
            lastError = error;
            console.error(`❌ Pinata pin JSON attempt ${attempt + 1} failed:`, error.response?.data || error.message);

            if (attempt < MAX_RETRIES - 1) {
                console.log(`   Retrying in ${RETRY_DELAYS[attempt]}ms...`);
                await sleep(RETRY_DELAYS[attempt]);
            }
        }
    }

    throw new Error(`Failed to pin JSON to Pinata after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

/**
 * Fetch content from IPFS via Pinata gateway
 * @param {string} cid - The IPFS CID
 * @returns {Promise<any>}
 */
export async function fetchFromIPFS(cid) {
    try {
        const url = `${PINATA_GATEWAY}${cid}`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching from IPFS:', error.message);
        throw error;
    }
}

console.log('✅ Pinata IPFS service initialized');
