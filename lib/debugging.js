"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOrderCalldataCanMatch = exports.requireOrdersCanMatch = exports.MAX_ERROR_LENGTH = void 0;
const constants_1 = require("./constants");
exports.MAX_ERROR_LENGTH = 120;
/**
 * This file reproduces Solidity methods to make debugging easier
 */
var Side;
(function (Side) {
    Side[Side["Buy"] = 0] = "Buy";
    Side[Side["Sell"] = 1] = "Sell";
})(Side || (Side = {}));
var SaleKind;
(function (SaleKind) {
    SaleKind[SaleKind["FixedPrice"] = 0] = "FixedPrice";
    SaleKind[SaleKind["DutchAuction"] = 1] = "DutchAuction";
})(SaleKind || (SaleKind = {}));
const SaleKindInterface = {
    Side,
    SaleKind,
    validateParameters(saleKind, expirationTime) {
        return (saleKind === SaleKind.FixedPrice || expirationTime > 0);
    },
    canSettleOrder(listingTime, expirationTime) {
        const now = Math.round(Date.now() / 1000);
        return (listingTime < now) && (expirationTime === 0 || now < expirationTime);
    }
};
/**
 * Debug the `ordersCanMatch` part of Wyvern
 * @param buy Buy order for debugging
 * @param sell Sell order for debugging
 */
async function requireOrdersCanMatch(client, { buy, sell, accountAddress }) {
    const result = await client.wyvernExchange.ordersCanMatch_.callAsync([buy.exchange, buy.maker, buy.taker, buy.feeRecipient, buy.target, buy.staticTarget, buy.paymentToken, sell.exchange, sell.maker, sell.taker, sell.feeRecipient, sell.target, sell.staticTarget, sell.paymentToken], [buy.makerRelayerFee, buy.takerRelayerFee, buy.makerProtocolFee, buy.takerProtocolFee, buy.basePrice, buy.extra, buy.listingTime, buy.expirationTime, buy.salt, sell.makerRelayerFee, sell.takerRelayerFee, sell.makerProtocolFee, sell.takerProtocolFee, sell.basePrice, sell.extra, sell.listingTime, sell.expirationTime, sell.salt], [buy.feeMethod, buy.side, buy.saleKind, buy.howToCall, sell.feeMethod, sell.side, sell.saleKind, sell.howToCall], buy.calldata, sell.calldata, buy.replacementPattern, sell.replacementPattern, buy.staticExtradata, sell.staticExtradata, { from: accountAddress });
    if (result) {
        return;
    }
    if (!(+buy.side == +SaleKindInterface.Side.Buy && +sell.side == +SaleKindInterface.Side.Sell)) {
        throw new Error('Must be opposite-side');
    }
    if (!(buy.feeMethod == sell.feeMethod)) {
        throw new Error('Must use same fee method');
    }
    if (!(buy.paymentToken == sell.paymentToken)) {
        throw new Error('Must use same payment token');
    }
    if (!(sell.taker == constants_1.NULL_ADDRESS || sell.taker == buy.maker)) {
        throw new Error('Sell taker must be null or matching buy maker');
    }
    if (!(buy.taker == constants_1.NULL_ADDRESS || buy.taker == sell.maker)) {
        throw new Error('Buy taker must be null or matching sell maker');
    }
    if (!((sell.feeRecipient == constants_1.NULL_ADDRESS && buy.feeRecipient != constants_1.NULL_ADDRESS) || (sell.feeRecipient != constants_1.NULL_ADDRESS && buy.feeRecipient == constants_1.NULL_ADDRESS))) {
        throw new Error('One order must be maker and the other must be taker');
    }
    if (!(buy.target == sell.target)) {
        throw new Error('Must match target');
    }
    if (!(buy.howToCall == sell.howToCall)) {
        throw new Error('Must match howToCall');
    }
    if (!SaleKindInterface.canSettleOrder(+buy.listingTime, +buy.expirationTime)) {
        throw new Error(`Buy-side order is set in the future or expired`);
    }
    if (!SaleKindInterface.canSettleOrder(+sell.listingTime, +sell.expirationTime)) {
        throw new Error(`Sell-side order is set in the future or expired`);
    }
    // Handle default, which is likely now() being diff than local time
    throw new Error('Error creating your order. Check that your system clock is set to the current date and time before you try again.');
}
exports.requireOrdersCanMatch = requireOrdersCanMatch;
/**
 * Debug the `orderCalldataCanMatch` part of Wyvern
 * @param buy Buy order for debugging
 * @param sell Sell Order for debugging
 */
async function requireOrderCalldataCanMatch(client, { buy, sell }) {
    const result = await client.wyvernExchange.orderCalldataCanMatch.callAsync(buy.calldata, buy.replacementPattern, sell.calldata, sell.replacementPattern);
    if (result) {
        return;
    }
    throw new Error('Unable to match offer data with auction data.');
}
exports.requireOrderCalldataCanMatch = requireOrderCalldataCanMatch;
//# sourceMappingURL=debugging.js.map