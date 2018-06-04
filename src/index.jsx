import React, { Component } from 'react';
import PropTypes from 'prop-types';
import HdKey from 'ethereumjs-wallet/hdkey';

import TrezorConnect from './connect';
import { DEFAULT_KD_PATH } from './constants';
import { signTransaction, signMessage, verifyMessage } from './signing';

export default class TrezorReactContainer extends Component {
  constructor(props) {
    super(props);
    this.state = { error: false, ready: false, showAddresses: false, trezor: {} };
    this.connectToTrezor = this.connectToTrezor.bind(this);
  }

  componentWillMount() {
    const { wallet } = this.state.trezor;
    const { getAddresses } = this.props;
    if (!wallet && getAddresses) {
      console.log('mounting');
      this.connectToTrezor();
    }
  }

  // componentDidMount() {
  //   const { onReady } = this.props;
  //   if (onReady) {
  //     console.log('on ready');
  //     onReady(this.getChildProps());
  //   }
  // }

  getChildProps = () => {
    const { trezor, error } = this.state;
    return {
      trezor,
      config: null,
      signTransaction: this.handleSignTransaction,
      signMessage: this.handleSignMessage,
      verifyMessage: this.verifyMessage,
      reconnect: this.connectToTrezor,
      error,
    };
  };

  getErrorProps = () => {
    const { error, trezor } = this.state;
    return {
      reconnect: this.connectToTrezor,
      error,
      trezor,
    };
  };

  connectToTrezor() {
    const { expect } = this.props;
    const { kdPath } = expect || {};
    TrezorConnect.getXPubKey(
      kdPath || `${DEFAULT_KD_PATH}0`,
      response => {
        if (response.success) {
          const wallet = HdKey.fromExtendedKey(response.xpubkey);
          // const addresses = [];
          // for (let i = 0; i <= 5; i++) {
          //   const wallet = hdWallet.deriveChild(i).getWallet();
          //   const address = `${i} - 0x${wallet.getAddress().toString('hex')}`;
          //   // console.log(address);
          //   addresses.push(address);
          // }
          this.setState({ trezor: { wallet }, showAddresses: true });
        } else {
          this.setState({ error: response.error, trezor: undefined });
        }
        // document.getElementById('response').innerHTML = JSON.stringify(response, undefined, 2);
      },
      '1.4.0'
    ); // 1.4.0 is first firmware that supports ethereum
  }

  handleSignTransaction(kdPath, txData) {
    // const { ethLedger } = this;
    return signTransaction(kdPath, txData);
    // return this.pausePollingForPromise(() => signTransaction({ ethLedger, kdPath, txData }));
  }
  handleSignMessage(kdPath, txData) {
    // const { ethLedger } = this;
    // return this.pausePollingForPromise(() => signMessage({ ethLedger, kdPath, txData }));
    return signMessage(kdPath, txData);
  }

  handleVerifyMessage(kdPath, txData) {
    // const { ethLedger } = this;
    // return this.pausePollingForPromise(() => signMessage({ ethLedger, kdPath, txData }));
    return verifyMessage(kdPath, txData);
  }

  renderReady = () => this.props.renderReady(this.getChildProps());

  renderAddresses = () => this.props.getAddresses(this.getChildProps());

  renderError = () => {
    const { error } = this.state;
    if (error) {
      return this.props.renderError(this.getErrorProps());
    }
    return null;
  };

  renderLoading = () => {
    const { renderLoading } = this.props;
    if (renderLoading) {
      this.props.renderLoading();
    }
    return null;
  };

  render() {
    const { showAddresses, error } = this.state;

    if (showAddresses) return this.renderAddresses();

    if (this.props.renderReady) this.props.renderReady(this.getChildProps());

    if (this.props.onReady) this.props.onReady(this.getChildProps());

    if (error) return this.renderError();

    return this.renderLoading();
  }
}

TrezorReactContainer.propTypes = {
  renderReady: PropTypes.func.isRequired,
  getAddresses: PropTypes.func,
  renderLoading: PropTypes.func,
  renderError: PropTypes.func,
  onReady: PropTypes.func,
  expect: PropTypes.shape({
    kdPath: PropTypes.string,
    address: PropTypes.string,
  }),
};
