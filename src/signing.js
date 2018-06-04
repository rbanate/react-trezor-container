import EthTx from 'ethereumjs-tx';
import util, { rlp, addHexPrefix } from 'ethereumjs-util';

import TrezorConnect from './connect';
import { sanitizeAddress, decimalToHex } from './helpers';
import { SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION } from 'constants';

const concatSig = signature => {
  let v = signature.v;
  let r = signature.r;
  let s = signature.s;
  r = util.fromSigned(r);
  s = util.fromSigned(s);
  v = util.bufferToInt(v);
  r = util.setLengthLeft(util.toUnsigned(r), 32).toString('hex');
  s = util.setLengthLeft(util.toUnsigned(s), 32).toString('hex');
  v = util.stripHexPrefix(util.intToHex(v));
  return util.addHexPrefix(r.concat(s, v).toString('hex'));
};

export function signTransaction(kdPath, txData) {
  const { to, nonce, gasPrice, value, gas, data } = txData;

  const sanitizedTxData = {
    to: util.stripHexPrefix(to),
    nonce: util.stripHexPrefix(nonce) !== '0' ? util.stripHexPrefix(nonce) : '00',
    gasPrice: `0${util.stripHexPrefix(gasPrice)}`,
    value: util.stripHexPrefix(value),
    data: data ? util.stripHexPrefix(data) : null,
    gas: util.stripHexPrefix(gas), // 'a43f',
    chainId: txData.chainId || 1,
  };

  // const rawHash = rlp.encode(sanitizedTxData);

  return new Promise((resolve, reject) => {
    TrezorConnect.ethereumSignTx(
      `m/${kdPath}`,
      sanitizedTxData.nonce,
      sanitizedTxData.gasPrice,
      sanitizedTxData.gas,
      sanitizedTxData.to,
      sanitizedTxData.value,
      sanitizedTxData.data,
      sanitizedTxData.chainId,
      response => {
        if (response.success) {
          // console.log('Signature V (recovery parameter):', response.v); // number
          // console.log('Signature R component:', response.r); // bytes
          // console.log('Signature S component:', response.s); // bytes

          // console.log('sanitized data', Buffer.from(sanitizedTxData.to));
          const sTx = new EthTx({
            nonce: sanitizedTxData.nonce,
            gasPrice: sanitizedTxData.gasPrice,
            to: addHexPrefix(txData.to),
            data: sanitizedTxData.data,
            value: sanitizedTxData.value,
            r: addHexPrefix(response.r),
            s: addHexPrefix(response.s),
            v: addHexPrefix(decimalToHex(response.v)),
          });

          // sanity check
          const sender = sTx.getSenderAddress().toString('hex');
          if (txData.from && sanitizeAddress(sender) !== sanitizeAddress(txData.from)) {
            return reject('Signing address does not match sender');
          }
          // format the signed transaction for web3
          const signedTx = addHexPrefix(sTx.serialize().toString('hex'));
          return resolve(signedTx);
        }
        return reject(response.error);
      }
    );
  });
}

export function signMessage(kdPath, txData) {
  TrezorConnect.ethereumSignMessage(
    kdPath,
    txData,
    response => {
      if (response.success) {
        // address.value = response.address;
        // messageV.value = message.value;
        // signature.value = response.signature;
        return response.signature;
      }
      // address.value = '';
      // messageV.value = '';
      // signature.value = '';
      return null;
    },
    '1.5.1'
  );
}

export function verifyMessage(kdPath, txData) {
  TrezorConnect.ethereumVerifyMessage(
    kdPath,
    txData.signature,
    txData.Messsage,
    response => response,
    '1.5.1'
  );
}
