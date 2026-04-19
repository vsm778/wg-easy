import { describe, expect, test } from 'vitest';
import {
  isAllowedPhoneNumber,
  normalizeAllowedPhoneNumbers,
  normalizePhoneNumber,
  telegramSessionStates,
  transitionTelegramSessionState,
} from '../../server/utils/telegram';

describe('telegram phone helpers', () => {
  test('normalizes phone numbers to +<digits>', () => {
    expect(normalizePhoneNumber('+46 70-123 45 67')).toBe('+46701234567');
    expect(normalizePhoneNumber('0049 (170) 1234567')).toBe('+00491701234567');
    expect(normalizePhoneNumber('070-123 45 67')).toBe('+0701234567');
  });

  test('normalizes allowed phone numbers and drops empty values', () => {
    expect(
      normalizeAllowedPhoneNumbers([
        '+46 70-123 45 67',
        '',
        '   ',
        '+49 170 1234567',
      ])
    ).toEqual(['+46701234567', '+491701234567']);
  });

  test('matches shared phone numbers against the allowlist', () => {
    const allowedPhoneNumbers = ['+46 70-123 45 67', '+49 170 1234567'];

    expect(isAllowedPhoneNumber('+46701234567', allowedPhoneNumbers)).toBe(
      true
    );
    expect(isAllowedPhoneNumber('491701234567', allowedPhoneNumbers)).toBe(
      true
    );
    expect(isAllowedPhoneNumber('+15551234567', allowedPhoneNumbers)).toBe(
      false
    );
  });

  test('transitions through the basic bot authorization flow', () => {
    const awaitingContact = transitionTelegramSessionState(
      telegramSessionStates.IDLE,
      'start_vpn'
    );
    const authorized = transitionTelegramSessionState(
      awaitingContact,
      'share_contact_allowed'
    );
    const blocked = transitionTelegramSessionState(
      telegramSessionStates.AWAITING_CONTACT,
      'share_contact_denied'
    );
    const restarted = transitionTelegramSessionState(blocked, 'start_vpn');

    expect(awaitingContact).toBe(telegramSessionStates.AWAITING_CONTACT);
    expect(authorized).toBe(telegramSessionStates.AUTHORIZED);
    expect(blocked).toBe(telegramSessionStates.BLOCKED);
    expect(restarted).toBe(telegramSessionStates.AWAITING_CONTACT);
  });
});
