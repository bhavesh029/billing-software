import crypto from 'crypto';

// Prints a 32-byte random key as base64 (for FIELD_ENCRYPTION_KEY).
process.stdout.write(`${crypto.randomBytes(32).toString('base64')}\n`);

