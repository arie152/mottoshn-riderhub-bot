export const SLOT_MIN = 1;
export const SLOT_MAX = 88;

export const config = {
  port: Number(process.env.PORT || 3000),
  adminToken: process.env.ADMIN_TOKEN || 'change-me',
  holdDeadlineIso: process.env.HOLD_DEADLINE_ISO || '2026-04-30T15:59:59Z',
  paynowUen: process.env.PAYNOW_UEN || 'UEN1234567A',
  paynowReferencePrefix: process.env.PAYNOW_REFERENCE_PREFIX || 'RIDER',
};
