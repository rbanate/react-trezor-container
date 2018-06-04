import { addHexPrefix } from 'ethereumjs-util';
import BigNumber from 'bignumber.js';

export function sanitizeAddress(address) {
  return addHexPrefix(address).toLowerCase();
}

export function decimalToHex(dec) {
  return new BigNumber(dec).toString(16);
}
