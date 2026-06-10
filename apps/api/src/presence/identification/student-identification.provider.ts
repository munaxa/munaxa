import { Injectable } from '@nestjs/common';
import { TenantRepository } from '../../common/tenant.repository';

/**
 * Resolves a physical identifier (NFC card UID, RFID tag, QR payload, or a manual selection)
 * into a Munaxa studentId. The presence/transport engine depends only on this interface, never on
 * a specific capture method — so NFC/RFID/QR/Manual (and a future Face provider) are interchangeable.
 */
export interface StudentIdentificationProvider {
  readonly method: string;
  /** Return the studentId for the given identifier, or null if it cannot be resolved. */
  resolve(identifier: string): Promise<string | null>;
}

/** MANUAL: the identifier IS the studentId (the attendant tapped a name in the app). */
@Injectable()
export class ManualProvider implements StudentIdentificationProvider {
  readonly method = 'MANUAL';
  resolve(identifier: string): Promise<string | null> {
    return Promise.resolve(identifier || null);
  }
}

/** QR: resolve the student's printed QR code (Student.qrCode) to its id. */
@Injectable()
export class QrProvider extends TenantRepository implements StudentIdentificationProvider {
  readonly method = 'QR';
  resolve(identifier: string): Promise<string | null> {
    return this.run(async (tx) => {
      const s = await tx.student.findFirst({
        where: { qrCode: identifier, deletedAt: null },
        select: { id: true },
      });
      return s?.id ?? null;
    });
  }
}

/**
 * NFC / RFID: a future StudentCard registry will map a card UID → studentId. Until that exists,
 * these accept a studentId passthrough so the offline bus workflow works today; the resolution
 * point is centralised here so adding the registry is a one-class change.
 */
@Injectable()
export class NfcProvider implements StudentIdentificationProvider {
  readonly method = 'NFC';
  resolve(identifier: string): Promise<string | null> {
    return Promise.resolve(identifier || null);
  }
}

@Injectable()
export class RfidProvider implements StudentIdentificationProvider {
  readonly method = 'RFID';
  resolve(identifier: string): Promise<string | null> {
    return Promise.resolve(identifier || null);
  }
}

/** Registry: pick a provider by capture method. */
@Injectable()
export class IdentificationRegistry {
  private readonly providers: Map<string, StudentIdentificationProvider>;

  constructor(manual: ManualProvider, qr: QrProvider, nfc: NfcProvider, rfid: RfidProvider) {
    this.providers = new Map([manual, qr, nfc, rfid].map((p) => [p.method, p] as const));
  }

  get(method: string): StudentIdentificationProvider | undefined {
    return this.providers.get(method);
  }
}
