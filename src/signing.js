import EthTx from 'ethereumjs-tx';
import util, { addHexPrefix } from 'ethereumjs-util';

import TrezorConnect from './connect';
import { sanitizeAddress, decimalToHex } from './helpers';
// import { SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION } from 'constants';

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

  let newValue = value;
  if (parseInt(value, 16) % 2 !== 0) newValue = `0${parseInt(value, 16)}`;

  const sanitizedTxData = {
    to: util.addHexPrefix(to),
    nonce: util.addHexPrefix(nonce === '0x0' ? '00' : nonce),
    gasPrice: util.addHexPrefix(gasPrice), // `0${util.stripHexPrefix(gasPrice)}`,
    value: util.addHexPrefix(newValue),
    data: data !== '' ? util.addHexPrefix(data) : null,
    gasLimit: util.addHexPrefix(gas),
    chainId: txData.chainId || 1,
  };

  // console.log('txData', txData);
  // console.log('sanitized', sanitizedTxData);

  TrezorConnect.closeAfterSuccess(false);
  TrezorConnect.closeAfterFailure(true);
  return new Promise((resolve, reject) => {
    TrezorConnect.ethereumSignTx(
      `m/${kdPath}`,
      util.stripHexPrefix(sanitizedTxData.nonce),
      `0${util.stripHexPrefix(sanitizedTxData.gasPrice)}`,
      util.stripHexPrefix(sanitizedTxData.gasLimit),
      util.stripHexPrefix(sanitizedTxData.to),
      util.stripHexPrefix(sanitizedTxData.value),
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
          TrezorConnect.close();
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

export function trezorEthereumGetAddress() {
  const path = "m/44'/60'/0'/0/0";

  TrezorConnect.ethereumGetAddress(path, response => {
    console.log('TrezorConnect.ethereumGetAddress', response);
    // document.getElementById("response").innerHTML = JSON.stringify(response, undefined, 2);
  });
}

export function trezorSignTx() {
  // spend one change output
  const address_n = "m/44'/60'/0'/0/0";

  // var address_n = [44 | 0x80000000,
  //                  60 | 0x80000000,
  //                  0  | 0x80000000 ,
  //                  0 ]; // same, in raw form

  const nonce = '03'; // note - it is hex, not number!!!
  const gas_price = '098bca5a00';
  const gas_limit = 'A7D8C0';
  const to = '40c4D853c17fbC5C2666142E0c509e6943f3f018';
  // var value = '01'; // in hexadecimal, in wei - this is 1 wei
  const value = '010000000000000000'; // in hexadecimal, in wei - this is about 18 ETC
  // var data = 'a9059cbb000000000000000000000000dc7359317ef4cc723a3980213a013c0433a338910000000000000000000000000000000000000000000000000000000001312d00'; // some contract data
  const data = null; // for no data
  const chain_id = 67; // 1 for ETH, 61 for ETC

  // const sTx = new EthTx({
  //   nonce,
  //   gasPrice: gas_price,
  //   to,
  //   gasLimit: gas_limit,
  //   data,
  //   value,
  //   chainId: chain_id,
  // });

  // sTx.v = chain_id;

  TrezorConnect.ethereumSignTx(
    address_n,
    nonce,
    gas_price,
    gas_limit,
    to,
    value,
    data,
    chain_id,
    response => {
      if (response.success) {
        // console.log('Signature V (recovery parameter):', response.v); // number
        // console.log('Signature R component:', response.r); // bytes
        // console.log('Signature S component:', response.s); // bytes

        const sTx = new EthTx({
          nonce: addHexPrefix(nonce),
          gasPrice: addHexPrefix(gas_price),
          gasLimit: addHexPrefix(gas_limit),
          to: addHexPrefix(to),
          value: addHexPrefix(value),
          data: addHexPrefix(data),

          // chainId: chain_id,
          v: addHexPrefix(response.v),
          r: addHexPrefix(response.r),
          s: addHexPrefix(response.s),
        });

        // sanity check
        const sender = sTx.getSenderAddress().toString('hex');

        console.log(
          'addHexPrefix(decimalToHex(response.v))',
          addHexPrefix(decimalToHex(response.v)),
          'response.v',
          response.v
        );

        const serialized = `0x${sTx.serialize().toString('hex')}`;

        console.log(`trezor-signer: tx sender is ${sTx.from.toString('hex')}`);
        // console.log('sender', sender, 'from', serialized);
        // if (txData.from && sanitizeAddress(sender) !== sanitizeAddress(txData.from)) {
        //   return reject('Signing address does not match sender');
        // }
      } else {
        console.error('Error:', response.error); // error message
      }
      // document.getElementById('response').innerHTML = JSON.stringify(response, undefined, 2);
    }
  );
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
