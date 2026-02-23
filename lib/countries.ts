import { getCodeList } from "country-list";

const COUNTRY_CODE_SET = new Set(Object.keys(getCodeList()));

export function isValidCountryCode(code: string) {
  return COUNTRY_CODE_SET.has(code.toUpperCase());
}
