import { addHexPrefix } from 'ethereumjs-util';
import BigNumber from 'bignumber.js';

export function sanitizeAddress(address) {
  return addHexPrefix(address).toLowerCase();
}

export function decimalToHex(dec) {
  return new BigNumber(dec).toString(16);
}

export function hex(val) {
  if (val.length % 2 !== 0) return `0${val}`;

  return val;
}
