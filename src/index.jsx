import React, { Component } from 'react';
import PropTypes from 'prop-types';
import HdKey from 'ethereumjs-wallet/hdkey';

import TrezorConnect from './connect';
import { DEFAULT_KD_PATH } from './constants';
import { signTransaction, signMessage, verifyMessage } from './signing';

export default class TrezorReactContainer extends Component {
  constructor(props) {
    super(props);
    this.state = { error: false, ready: false, showAddresses: false, trezor: {}, loading: true };
    this.handleSignTransaction = this.handleSignTransaction.bind(this);
    this.handleSignMessage = this.handleSignMessage.bind(this);
    this.getTrezor = this.getTrezor.bind(this);
    this.ethTrezor = this.getTrezor();
  }

  componentWillMount() {
    const { wallet } = this.state.trezor;
    const { getAddresses } = this.props;
    if (!wallet && getAddresses) {
      this.getTrezorWallet();
    }
    this.setState({ showAddresses: false, loading: false, error: undefined });
  }

  getTrezor = () => new TrezorConnect();

  getTrezorWallet = () => {
    this.getDefaultPubKey()
      .then(result => {
        const hdWallet = HdKey.fromExtendedKey(result.xpubkey);
        this.setState({ trezor: { hdWallet }, showAddresses: true, loading: false });
      })
      .catch(error => {
        this.setState({ showAddresses: false, loading: false, error });
        if (this.props.onError) {
          this.props.renderError(error);
          this.props.onError();
        }
      });
  };

  getDefaultPubKey() {
    const { expect } = this.props || {};
    const { kdPath } = expect || {};
    const ethTrezor = new TrezorConnect();
    return new Promise((resolve, reject) => {
      ethTrezor.getXPubKey(
        kdPath || `${DEFAULT_KD_PATH}0`,
        response => {
          if (response.success) {
            resolve(response);
          } else {
            reject(response.error);
          }
        },
        '1.4.0'
      ); // 1.4.0 is first firmware that supports ethereum
    });
  }

  getChildProps = () => {
    const { trezor, error } = this.state;
    return {
      trezor,
      config: null,
      signTransaction: this.handleSignTransaction,
      signMessage: this.handleSignMessage,
      verifyMessage: this.verifyMessage,
      reconnect: this.getTrezorWallet,
      onSuccess: this.props.onSuccess,
      error,
    };
  };

  getErrorProps = () => {
    const { error, trezor } = this.state;
    return {
      reconnect: this.getDefaultPubKey,
      error,
      trezor,
    };
  };

  handleSignTransaction(kdPath, txData) {
    if (!this.ethTrezor) this.ethTrezor = this.getTrezor();
    return signTransaction(this.ethTrezor, kdPath, txData);
  }

  handleSignMessage(kdPath, txData) {
    if (!this.ethTrezor) this.ethTrezor = this.getTrezor();
    return signMessage(this.ethTrezor, kdPath, txData);
  }

  handleVerifyMessage(kdPath, txData) {
    const { ethTrezor } = this;
    return verifyMessage(ethTrezor, kdPath, txData);
  }

  realoadPubKey = () => {
    this.getTrezorWallet();
    return this.renderAddresses();
  };

  renderReady = () => this.props.renderReady(this.getChildProps());

  renderAddresses = () => this.props.getAddresses(this.getChildProps());

  renderError = () => {
    const { error } = this.state;
    if (error && this.props.renderError) {
      return this.props.renderError(this.getErrorProps());
    }
    return null;
  };

  renderLoading = () => {
    const { renderLoading } = this.props;
    if (renderLoading) {
      return this.props.renderLoading();
    }
    return null;
  };

  renderSigningReady = () => {
    const { renderReady, onReady } = this.props;
    if (renderReady) {
      onReady(this.getChildProps());
      return this.props.renderReady(this.getChildProps());
    }
    return <div>Ready to Sign...</div>;
  };

  render() {
    const { error, showAddresses, loading } = this.state;
    const { signed, realoadPubKey } = this.props;
    if (loading) return this.renderLoading();

    if (realoadPubKey) return this.realoadPubKey();

    if (showAddresses) return this.renderAddresses();

    if (!signed && this.props.renderReady) return this.renderSigningReady();

    if (error) return this.renderError();

    return null;
  }
}

TrezorReactContainer.propTypes = {
  renderReady: PropTypes.func,
  getAddresses: PropTypes.func,
  renderLoading: PropTypes.func,
  renderError: PropTypes.func,
  onReady: PropTypes.func,
  signed: PropTypes.bool,
  realoadPubKey: PropTypes.bool,
  onError: PropTypes.func,
  onSuccess: PropTypes.func,
  expect: PropTypes.shape({
    kdPath: PropTypes.string,
    address: PropTypes.string,
  }),
};
