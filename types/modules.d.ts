declare module "pg";
declare module "nodemailer";
declare module "country-list" {
  export function getData(): Array<{ code: string; name: string }>;
  export function getCodeList(): Record<string, string>;
  export function getNameList(): Record<string, string>;
}
