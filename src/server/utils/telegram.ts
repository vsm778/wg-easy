export type TelegramReplyMarkup = {
  keyboard?: Array<Array<{ text: string; request_contact?: boolean }>>;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  remove_keyboard?: boolean;
};

export const telegramSessionStates = {
  IDLE: 'idle',
  AWAITING_CONTACT: 'awaiting_contact',
  AUTHORIZED: 'authorized',
  BLOCKED: 'blocked',
} as const;

export type TelegramSessionState =
  (typeof telegramSessionStates)[keyof typeof telegramSessionStates];

export type TelegramSessionEvent =
  | 'start_vpn'
  | 'share_contact_allowed'
  | 'share_contact_denied'
  | 'reset';

export function transitionTelegramSessionState(
  state: TelegramSessionState,
  event: TelegramSessionEvent
): TelegramSessionState {
  switch (state) {
    case telegramSessionStates.IDLE:
      if (event === 'start_vpn') {
        return telegramSessionStates.AWAITING_CONTACT;
      }

      return telegramSessionStates.IDLE;

    case telegramSessionStates.AWAITING_CONTACT:
      switch (event) {
        case 'start_vpn':
          return telegramSessionStates.AWAITING_CONTACT;
        case 'share_contact_allowed':
          return telegramSessionStates.AUTHORIZED;
        case 'share_contact_denied':
          return telegramSessionStates.BLOCKED;
        case 'reset':
          return telegramSessionStates.IDLE;
      }
      break;

    case telegramSessionStates.AUTHORIZED:
      switch (event) {
        case 'share_contact_denied':
          return telegramSessionStates.BLOCKED;
        case 'reset':
          return telegramSessionStates.IDLE;
        default:
          return telegramSessionStates.AUTHORIZED;
      }

    case telegramSessionStates.BLOCKED:
      switch (event) {
        case 'start_vpn':
          return telegramSessionStates.AWAITING_CONTACT;
        case 'reset':
          return telegramSessionStates.IDLE;
        default:
          return telegramSessionStates.BLOCKED;
      }
  }

  return telegramSessionStates.IDLE;
}

export function normalizePhoneNumber(phoneNumber: string) {
  const normalized = phoneNumber.replace(/[^\d+]/g, '');

  if (normalized.startsWith('+')) {
    return `+${normalized.slice(1).replace(/\D/g, '')}`;
  }

  return `+${normalized.replace(/\D/g, '')}`;
}

export function normalizeAllowedPhoneNumbers(phoneNumbers: string[]) {
  return phoneNumbers
    .map((phoneNumber) => normalizePhoneNumber(phoneNumber))
    .filter((phoneNumber) => phoneNumber !== '+');
}

export function isAllowedPhoneNumber(
  phoneNumber: string,
  allowedPhoneNumbers: string[]
) {
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

  return normalizeAllowedPhoneNumbers(allowedPhoneNumbers).includes(
    normalizedPhoneNumber
  );
}
