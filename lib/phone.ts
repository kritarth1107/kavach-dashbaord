export function normalizePhoneDigits(number: string): string {
  return number.replace(/\D/g, "");
}

export function maskPhoneNumber(countryCode: string, number: string): string {
  const digits = normalizePhoneDigits(number);
  if (digits.length <= 4) {
    return `${countryCode} ${digits}`;
  }

  const visible = digits.slice(-4);
  const masked = digits.slice(0, -4).replace(/\d/g, "•");
  return `${countryCode} ${masked}${visible}`;
}

export function formatPhoneDisplay(countryCode: string, number: string): string {
  const digits = normalizePhoneDigits(number);
  if (digits.length === 10) {
    return `${countryCode} ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return `${countryCode} ${digits}`;
}

export const MOCK_PHONE_OTP = "123456";
