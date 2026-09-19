export interface CountryDialingCode {
  name: string;
  code: string; // dialing code including "+"
  iso: string; // ISO 3166-1 alpha-2
  flag: string; // emoji flag
}

/**
 * Dialing codes, ordered with South Africa first (primary market) and the
 * rest alphabetically. Includes all African markets VStarz Championship
 * qualifiers target, plus major diaspora markets.
 */
export const COUNTRY_CODES: CountryDialingCode[] = [
  { name: "South Africa", code: "+27", iso: "ZA", flag: "🇿🇦" },
  { name: "Nigeria", code: "+234", iso: "NG", flag: "🇳🇬" },
  { name: "Kenya", code: "+254", iso: "KE", flag: "🇰🇪" },
  { name: "Ghana", code: "+233", iso: "GH", flag: "🇬🇭" },
  { name: "Tanzania", code: "+255", iso: "TZ", flag: "🇹🇿" },
  { name: "Uganda", code: "+256", iso: "UG", flag: "🇺🇬" },
  { name: "Zimbabwe", code: "+263", iso: "ZW", flag: "🇿🇼" },
  { name: "Zambia", code: "+260", iso: "ZM", flag: "🇿🇲" },
  { name: "Botswana", code: "+267", iso: "BW", flag: "🇧🇼" },
  { name: "Namibia", code: "+264", iso: "NA", flag: "🇳🇦" },
  { name: "Mozambique", code: "+258", iso: "MZ", flag: "🇲🇿" },
  { name: "Malawi", code: "+265", iso: "MW", flag: "🇲🇼" },
  { name: "Ethiopia", code: "+251", iso: "ET", flag: "🇪🇹" },
  { name: "Egypt", code: "+20", iso: "EG", flag: "🇪🇬" },
  { name: "Morocco", code: "+212", iso: "MA", flag: "🇲🇦" },
  { name: "Senegal", code: "+221", iso: "SN", flag: "🇸🇳" },
  { name: "Ivory Coast", code: "+225", iso: "CI", flag: "🇨🇮" },
  { name: "Cameroon", code: "+237", iso: "CM", flag: "🇨🇲" },
  { name: "DR Congo", code: "+243", iso: "CD", flag: "🇨🇩" },
  { name: "Angola", code: "+244", iso: "AO", flag: "🇦🇴" },
  { name: "Rwanda", code: "+250", iso: "RW", flag: "🇷🇼" },
  { name: "Mauritius", code: "+230", iso: "MU", flag: "🇲🇺" },
  { name: "United Kingdom", code: "+44", iso: "GB", flag: "🇬🇧" },
  { name: "United States", code: "+1", iso: "US", flag: "🇺🇸" },
  { name: "Canada", code: "+1", iso: "CA", flag: "🇨🇦" },
  { name: "Australia", code: "+61", iso: "AU", flag: "🇦🇺" },
  { name: "Germany", code: "+49", iso: "DE", flag: "🇩🇪" },
  { name: "France", code: "+33", iso: "FR", flag: "🇫🇷" },
  { name: "Netherlands", code: "+31", iso: "NL", flag: "🇳🇱" },
  { name: "Portugal", code: "+351", iso: "PT", flag: "🇵🇹" },
  { name: "India", code: "+91", iso: "IN", flag: "🇮🇳" },
  { name: "China", code: "+86", iso: "CN", flag: "🇨🇳" },
  { name: "Brazil", code: "+55", iso: "BR", flag: "🇧🇷" },
  { name: "United Arab Emirates", code: "+971", iso: "AE", flag: "🇦🇪" },
];

export function formatDialingLabel(country: CountryDialingCode): string {
  return `${country.flag} ${country.name} (${country.code})`;
}

/**
 * Compose the E.164 identifier from a dialing code and the user-entered
 * national number. Strips spaces, dashes, parentheses and leading zeros
 * (many countries dial a trunk "0" that must not be included in E.164).
 */
export function toE164(dialingCode: string, nationalNumber: string): string {
  const digits = nationalNumber.replace(/[\s\-().]/g, "");
  const withoutTrunkZero = digits.startsWith("0") ? digits.slice(1) : digits;
  return `${dialingCode}${withoutTrunkZero}`;
}
