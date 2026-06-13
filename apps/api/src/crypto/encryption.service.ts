import { Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

export interface EncryptedPayload {
  v: 1;
  iv: string;
  tag: string;
  data: string;
}

@Injectable()
export class EncryptionService implements OnModuleInit {
  private key!: Buffer;

  onModuleInit() {
    const raw = process.env.FIELD_ENCRYPTION_KEY;
    if (!raw) {
      throw new Error('FIELD_ENCRYPTION_KEY is required (32-byte key as base64)');
    }
    const key = Buffer.from(raw, 'base64');
    if (key.length !== KEY_LENGTH) {
      throw new Error(
        `FIELD_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length})`,
      );
    }
    this.key = key;
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, this.key, iv, { authTagLength: 16 });
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload: EncryptedPayload = {
      v: 1,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      data: enc.toString('base64'),
    };
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  }

  decrypt(blob: string): string {
    const json = Buffer.from(blob, 'base64').toString('utf8');
    const payload = JSON.parse(json) as EncryptedPayload;
    if (payload.v !== 1 || !payload.iv || !payload.tag || !payload.data) {
      throw new Error('Invalid encrypted payload');
    }
    const iv = Buffer.from(payload.iv, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');
    const data = Buffer.from(payload.data, 'base64');
    const decipher = crypto.createDecipheriv(ALGO, this.key, iv, { authTagLength: 16 });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }
}
