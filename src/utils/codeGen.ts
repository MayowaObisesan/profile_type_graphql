import blake2 from 'blake2';
import * as crypto from 'crypto';
import { DIGEST_SIZE } from '../config';

class RegistrationCode {
    /**
     * The object that signs and verifies Registration codes
     * Gotten from Python official doc. - hashlib documentation - May 19, 2023.
     */
    static generate(rawData: string, encKey: string): string {
        const key = Buffer.from(encKey, 'utf-8');
        const data = Buffer.from(rawData, 'utf-8');
        const h = blake2.createKeyedHash('blake2b', key)
        h.update(data)

        return h.digest().toString('utf-8')
    }

    static sign(rawData: string, encKey: string): string {
        // Sign the raw data
        const key = Buffer.from(encKey, 'utf-8');
        const data = Buffer.from(rawData, 'utf-8');
        const h = blake2.createKeyedHash('blake2b', key, { digestLength: DIGEST_SIZE });
        h.update(data);
        // h.digest() returns a buffer with 16 bytes
        return h.digest().toString('utf-8');
    }

    static verify(rawData: string, encKey: string, signedData: string): boolean {
        // Verify the signed rawData
        const goodSigned = this.sign(rawData, encKey);
        const a = Buffer.from(goodSigned, 'utf-8');
        const b = Buffer.from(signedData, 'utf-8');
        return crypto.timingSafeEqual(a, b);
    }
}

export default RegistrationCode;