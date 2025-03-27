import { randomInt } from "crypto";
export const generateCode = (saltString?: string): string => {
  const timestamp = Date.now().toString().slice(-5);
  const randomSuffix = randomInt(1000, 9999).toString();
  const randomPrefix = randomInt(100, 999).toString();
  const prependSalt = saltString ? `${saltString}` : "";
  return `${prependSalt}${randomPrefix}${timestamp}${randomSuffix}`;
};
