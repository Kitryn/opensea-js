"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeProxyCall = exports.encodeTransferCall = exports.encodeAtomicizedTransfer = exports.encodeDefaultCall = exports.encodeBuy = exports.encodeAtomicizedBuy = exports.encodeAtomicizedSell = exports.encodeSell = exports.encodeCall = exports.encodeReplacementPattern = exports.AbiType = void 0;
const bignumber_js_1 = require("bignumber.js");
const ethABI = require("ethereumjs-abi");
const wyvern_js_1 = require("wyvern-js");
const types_1 = require("wyvern-schemas/dist/types");
var wyvern_schemas_1 = require("wyvern-schemas");
Object.defineProperty(exports, "AbiType", { enumerable: true, get: function () { return wyvern_schemas_1.AbiType; } });
const types_2 = require("../types");
const Proxy_1 = require("../abi/Proxy");
exports.encodeReplacementPattern = wyvern_js_1.WyvernProtocol.encodeReplacementPattern;
const encodeCall = (abi, parameters) => {
    const inputTypes = abi.inputs.map(i => i.type);
    return '0x' + Buffer.concat([
        ethABI.methodID(abi.name, inputTypes),
        ethABI.rawEncode(inputTypes, parameters),
    ]).toString('hex');
};
exports.encodeCall = encodeCall;
const encodeSell = (schema, asset, address) => {
    const transfer = schema.functions.transfer(asset);
    return {
        target: transfer.target,
        calldata: exports.encodeDefaultCall(transfer, address),
        replacementPattern: exports.encodeReplacementPattern(transfer),
    };
};
exports.encodeSell = encodeSell;
const encodeAtomicizedSell = (schemas, assets, address, wyvernProtocol, networkName) => {
    const atomicizer = wyvernProtocol.wyvernAtomicizer;
    const { atomicizedCalldata, atomicizedReplacementPattern } = encodeAtomicizedCalldata(atomicizer, schemas, assets, address, types_2.OrderSide.Sell);
    return {
        calldata: atomicizedCalldata,
        replacementPattern: atomicizedReplacementPattern,
        target: wyvern_js_1.WyvernProtocol.getAtomicizerContractAddress(networkName)
    };
};
exports.encodeAtomicizedSell = encodeAtomicizedSell;
const encodeAtomicizedBuy = (schemas, assets, address, wyvernProtocol, networkName) => {
    const atomicizer = wyvernProtocol.wyvernAtomicizer;
    const { atomicizedCalldata, atomicizedReplacementPattern } = encodeAtomicizedCalldata(atomicizer, schemas, assets, address, types_2.OrderSide.Buy);
    return {
        calldata: atomicizedCalldata,
        replacementPattern: atomicizedReplacementPattern,
        target: wyvern_js_1.WyvernProtocol.getAtomicizerContractAddress(networkName)
    };
};
exports.encodeAtomicizedBuy = encodeAtomicizedBuy;
const encodeBuy = (schema, asset, address) => {
    const transfer = schema.functions.transfer(asset);
    const replaceables = transfer.inputs.filter((i) => i.kind === types_1.FunctionInputKind.Replaceable);
    const ownerInputs = transfer.inputs.filter((i) => i.kind === types_1.FunctionInputKind.Owner);
    // Validate
    if (replaceables.length !== 1) {
        throw new Error('Only 1 input can match transfer destination, but instead ' + replaceables.length + ' did');
    }
    // Compute calldata
    const parameters = transfer.inputs.map((input) => {
        switch (input.kind) {
            case types_1.FunctionInputKind.Replaceable:
                return address;
            case types_1.FunctionInputKind.Owner:
                return wyvern_js_1.WyvernProtocol.generateDefaultValue(input.type);
            default:
                try {
                    return input.value.toString();
                }
                catch (e) {
                    console.error(schema);
                    console.error(asset);
                    throw e;
                }
        }
    });
    const calldata = exports.encodeCall(transfer, parameters);
    // Compute replacement pattern
    let replacementPattern = '0x';
    if (ownerInputs.length > 0) {
        replacementPattern = exports.encodeReplacementPattern(transfer, types_1.FunctionInputKind.Owner);
    }
    return {
        target: transfer.target,
        calldata,
        replacementPattern,
    };
};
exports.encodeBuy = encodeBuy;
const encodeDefaultCall = (abi, address) => {
    const parameters = abi.inputs.map(input => {
        switch (input.kind) {
            case types_1.FunctionInputKind.Replaceable:
                return wyvern_js_1.WyvernProtocol.generateDefaultValue(input.type);
            case types_1.FunctionInputKind.Owner:
                return address;
            case types_1.FunctionInputKind.Asset:
            default:
                return input.value;
        }
    });
    return exports.encodeCall(abi, parameters);
};
exports.encodeDefaultCall = encodeDefaultCall;
/**
 * Encode the atomicized transfer of many assets
 * @param schema Wyvern Schema for the assets
 * @param assets List of assets to transfer
 * @param from Current address owning the assets
 * @param to Destination address
 * @param atomicizer Wyvern Atomicizer instance
 */
function encodeAtomicizedTransfer(schemas, assets, from, to, wyvernProtocol, networkName) {
    const atomicizer = wyvernProtocol.wyvernAtomicizer;
    const transactions = assets.map((asset, i) => {
        const schema = schemas[i];
        const transfer = schema.functions.transfer(asset);
        const calldata = encodeTransferCall(transfer, from, to);
        return {
            calldata,
            address: transfer.target,
            value: new bignumber_js_1.BigNumber(0),
        };
    });
    const atomicizedCalldata = atomicizer.atomicize.getABIEncodedTransactionData(transactions.map((t) => t.address), transactions.map((t) => t.value), transactions.map((t) => new bignumber_js_1.BigNumber((t.calldata.length - 2) / 2)), // subtract 2 for '0x', divide by 2 for hex
    transactions.map((t) => t.calldata).reduce((x, current) => x + current.slice(2), '0x'));
    return {
        calldata: atomicizedCalldata,
        target: wyvern_js_1.WyvernProtocol.getAtomicizerContractAddress(networkName)
    };
}
exports.encodeAtomicizedTransfer = encodeAtomicizedTransfer;
/**
 * Encode a transfer call for a Wyvern schema function
 * @param transferAbi Annotated Wyvern ABI
 * @param from From address
 * @param to To address
 */
function encodeTransferCall(transferAbi, from, to) {
    const parameters = transferAbi.inputs.map(input => {
        switch (input.kind) {
            case types_1.FunctionInputKind.Replaceable:
                return to;
            case types_1.FunctionInputKind.Owner:
                return from;
            case types_1.FunctionInputKind.Asset:
            default:
                if (input.value == null) {
                    throw new Error(`Unsupported function input kind: ${input.kind}`);
                }
                return input.value;
        }
    });
    return exports.encodeCall(transferAbi, parameters);
}
exports.encodeTransferCall = encodeTransferCall;
/**
 * Encode a call to a user's proxy contract
 * @param address The address for the proxy to call
 * @param howToCall How to call the addres
 * @param calldata The data to use in the call
 * @param shouldAssert Whether to assert success in the proxy call
 */
function encodeProxyCall(address, howToCall, calldata, shouldAssert = true) {
    const abi = shouldAssert ? Proxy_1.proxyAssertABI : Proxy_1.proxyABI;
    return exports.encodeCall(abi, [address, howToCall, Buffer.from(calldata.slice(2), 'hex')]);
}
exports.encodeProxyCall = encodeProxyCall;
// Helpers for atomicizer
function encodeAtomicizedCalldata(atomicizer, schemas, assets, address, side) {
    const encoder = side === types_2.OrderSide.Sell ? exports.encodeSell : exports.encodeBuy;
    try {
        const transactions = assets.map((asset, i) => {
            const schema = schemas[i];
            const { target, calldata } = encoder(schema, asset, address);
            return {
                calldata,
                abi: schema.functions.transfer(asset),
                address: target,
                value: new bignumber_js_1.BigNumber(0),
            };
        });
        const atomicizedCalldata = atomicizer.atomicize.getABIEncodedTransactionData(transactions.map(t => t.address), transactions.map(t => t.value), transactions.map(t => new bignumber_js_1.BigNumber((t.calldata.length - 2) / 2)), // subtract 2 for '0x', divide by 2 for hex
        transactions.map(t => t.calldata).reduce((x, y) => x + y.slice(2)));
        const kind = side === types_2.OrderSide.Buy ? types_1.FunctionInputKind.Owner : undefined;
        const atomicizedReplacementPattern = wyvern_js_1.WyvernProtocol.encodeAtomicizedReplacementPattern(transactions.map(t => t.abi), kind);
        if (!atomicizedCalldata || !atomicizedReplacementPattern) {
            throw new Error(`Invalid calldata: ${atomicizedCalldata}, ${atomicizedReplacementPattern}`);
        }
        return {
            atomicizedCalldata,
            atomicizedReplacementPattern
        };
    }
    catch (error) {
        console.error({ schemas, assets, address, side });
        throw new Error(`Failed to construct your order: likely something strange about this type of item. OpenSea has been notified. Please contact us in Discord! Original error: ${error}`);
    }
}
//# sourceMappingURL=schema.js.map