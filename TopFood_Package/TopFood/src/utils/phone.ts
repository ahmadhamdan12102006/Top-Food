const DEFAULT_COUNTRY_CODE = '+970';

export const normalizePhoneDigits = (value: string) => value.replace(/\D/g, '');

export const buildFullPhoneNumber = (
  countryCode: string = DEFAULT_COUNTRY_CODE,
  rawPhone: string
) => {
  const digits = normalizePhoneDigits(rawPhone);
  const countryDigits = normalizePhoneDigits(countryCode);

  if (!digits) return '';

  if (digits.startsWith(countryDigits)) {
    return `+${digits}`;
  }

  const localPhone = digits.replace(/^0+/, '');
  return `+${countryDigits}${localPhone}`;
};

export const buildPhoneSearchCandidates = (
  rawPhone: string,
  countryCode: string = DEFAULT_COUNTRY_CODE
) => {
  const digits = normalizePhoneDigits(rawPhone);
  const countryDigits = normalizePhoneDigits(countryCode);
  const e164 = buildFullPhoneNumber(countryCode, rawPhone);

  if (!digits && !e164) return [];

  const nationalDigits = digits.startsWith(countryDigits)
    ? digits.slice(countryDigits.length)
    : digits;

  const localWithZero =
    nationalDigits && !nationalDigits.startsWith('0')
      ? `0${nationalDigits}`
      : nationalDigits;

  const candidates = new Set<string>();

  [rawPhone, digits, nationalDigits, localWithZero, e164].forEach((value) => {
    if (value) {
      candidates.add(value);
    }
  });

  if (localWithZero) {
    candidates.add(`${countryCode}${localWithZero}`);
  }

  return Array.from(candidates).slice(0, 10);
};

export const normalizePhoneForStorage = (
  rawPhone: string,
  countryCode: string = DEFAULT_COUNTRY_CODE
) => {
  const candidates = buildPhoneSearchCandidates(rawPhone, countryCode);
  return candidates.find((value) => value.startsWith('0')) || rawPhone;
};
