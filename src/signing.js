import EthTx from 'ethereumjs-tx';
import util, { addHexPrefix } from 'ethereumjs-util';

// import TrezorConnect from './connect';
import { sanitizeAddress, hex } from './helpers';
// import { SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION } from 'constants';

export function signTransaction(trezor, kdPath, txData) {
  const { to, nonce, gasPrice, value, gas, data } = txData;

  const sanitizedTxData = {
    to: util.addHexPrefix(to),
    nonce: util.addHexPrefix(nonce === '0x0' ? '00' : nonce),
    gasPrice: util.addHexPrefix(gasPrice), // `0${util.stripHexPrefix(gasPrice)}`,
    value: util.addHexPrefix(value),
    data: data !== '' ? util.addHexPrefix(data) : null,
    gasLimit: util.addHexPrefix(gas),
    chainId: txData.chainId || 1,
  };

  return new Promise((resolve, reject) => {
    trezor.ethereumSignTx(
      kdPath,
      hex(util.stripHexPrefix(sanitizedTxData.nonce)),
      hex(util.stripHexPrefix(sanitizedTxData.gasPrice)),
      hex(util.stripHexPrefix(sanitizedTxData.gasLimit)),
      util.stripHexPrefix(sanitizedTxData.to),
      hex(util.stripHexPrefix(sanitizedTxData.value)),
      util.stripHexPrefix(sanitizedTxData.data),
      sanitizedTxData.chainId,
      response => {
        if (response.success) {
          const tx = new EthTx(sanitizedTxData);

          tx.v = addHexPrefix(response.v);
          tx.r = addHexPrefix(response.r);
          tx.s = addHexPrefix(response.s);
          // sanity check
          const sender = tx.getSenderAddress().toString('hex');
          // TrezorConnect.close();
          if (txData.from && sanitizeAddress(sender) !== sanitizeAddress(txData.from)) {
            return reject('Signing address does not match sender');
          }
          // format the signed transaction for web3
          const signedTx = addHexPrefix(tx.serialize().toString('hex'));
          return resolve(signedTx);
        }
        return reject(response.error);
      }
    );
  });
}

export function trezorEthereumGetAddress(trezor, kdPath) {
  return new Promise((resolve, reject) => {
    trezor.ethereumGetAddress(kdPath, response => {
      if (response.success) {
        return resolve(response);
      }
      return reject(response.error);
    });
  });
}

export function signMessage(trezor, kdPath, txData) {
  return new Promise((resolve, reject) => {
    trezor.ethereumSignMessage(kdPath, txData, response => {
      if (response.success) {
        // address.value = response.address;
        // messageV.value = message.value;
        // signature.value = response.signature;
        const signature = addHexPrefix(response.signature);
        return resolve(signature);
      }
      // address.value = '';
      // messageV.value = '';
      // signature.value = '';
      return reject(response.error);
    });
  });
}

export function verifyMessage(trezor, kdPath, txData) {
  trezor.ethereumVerifyMessage(kdPath, txData.signature, txData.Messsage, response => response);
}
