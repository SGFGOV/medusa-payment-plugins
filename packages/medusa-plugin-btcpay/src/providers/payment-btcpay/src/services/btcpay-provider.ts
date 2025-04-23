import BtcpayBase from "../core/btc-pay-base";

class BtcpayProviderService extends BtcpayBase {
    static identifier = BtcpayBase.identifier;

    constructor(_, options) {
        super(_, options);
    }
}

export default BtcpayProviderService;
