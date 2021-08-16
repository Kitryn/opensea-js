"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNFTAsset = exports.parseBid = exports.parseAsk = exports.parseSale = exports.parsePaymentAsset = exports.parseAssetContract = exports.parseAccount = exports.parseAssetTraits = exports.parseCollection = exports.parseCollectionTraits = void 0;
var types_1 = require("src/types");
var superstruct_1 = require("superstruct");
var query_types_1 = require("./query-types");
var validators_1 = require("./validators");
function parse(type, json) {
    try {
        return superstruct_1.create(json, type);
    }
    catch (error) {
        throw new query_types_1.ApiError("Error parsing json", error.stack);
    }
}
/**
 * Fails silently if numericTraits or stringTraits don't exist on json
 * @param json: { numericTraits: Array() | undefined, stringTraits: Array() | undefined }
 */
function parseCollectionTraits(json) {
    var _a, _b, _c, _d;
    var output = [];
    for (var _i = 0, _e = (_a = json === null || json === void 0 ? void 0 : json.numericTraits) !== null && _a !== void 0 ? _a : []; _i < _e.length; _i++) {
        var numericTrait = _e[_i];
        var data = {
            key: numericTrait === null || numericTrait === void 0 ? void 0 : numericTrait.key,
            kind: "numeric",
            value: {
                min: (_b = numericTrait === null || numericTrait === void 0 ? void 0 : numericTrait.value) === null || _b === void 0 ? void 0 : _b.min,
                max: (_c = numericTrait === null || numericTrait === void 0 ? void 0 : numericTrait.value) === null || _c === void 0 ? void 0 : _c.max,
            },
        };
        output.push(parse(validators_1.APIOpenSeaCollectionTrait, data));
    }
    for (var _f = 0, _g = (_d = json === null || json === void 0 ? void 0 : json.stringTraits) !== null && _d !== void 0 ? _d : []; _f < _g.length; _f++) {
        var stringTrait = _g[_f];
        var data = {
            key: stringTrait.key,
            kind: "string",
            counts: stringTrait.counts,
        };
        output.push(parse(validators_1.APIOpenSeaCollectionTrait, data));
    }
    return output;
}
exports.parseCollectionTraits = parseCollectionTraits;
function parseCollection(json) {
    var collectionTraits = [];
    var numericTraits = json.numericTraits, stringTraits = json.stringTraits, data = __rest(json, ["numericTraits", "stringTraits"]);
    if ((json === null || json === void 0 ? void 0 : json.numericTraits) || (json === null || json === void 0 ? void 0 : json.stringTraits)) {
        collectionTraits = parseCollectionTraits({ numericTraits: numericTraits, stringTraits: stringTraits });
    }
    var output = __assign(__assign({}, data), (collectionTraits.length > 0 ? { collectionTraits: collectionTraits } : {}));
    return parse(validators_1.APIOpenSeaCollection, output);
}
exports.parseCollection = parseCollection;
/**
 * Fails silently if json is undefined
 * @param json
 */
function parseAssetTraits(json) {
    var output = [];
    for (var _i = 0, _a = json !== null && json !== void 0 ? json : []; _i < _a.length; _i++) {
        var trait = _a[_i];
        var node = trait.node;
        var data = {
            key: node.traitType,
            kind: node.intValue ? "numeric" : "string",
            value: node.intValue ? node.intValue : node.value,
        };
        output.push(parse(validators_1.APIOpenSeaAssetTrait, data));
    }
    return output;
}
exports.parseAssetTraits = parseAssetTraits;
function parseAccount(json) {
    return parse(validators_1.APIOpenSeaAccount, json);
}
exports.parseAccount = parseAccount;
function parseAssetContract(json) {
    return parse(validators_1.APIOpenSeaAssetContract, json);
}
exports.parseAssetContract = parseAssetContract;
function parsePaymentAsset(json) {
    var assetContract = parseAssetContract(json === null || json === void 0 ? void 0 : json.assetContract);
    var output = __assign(__assign({}, assetContract), { symbol: json.symbol || assetContract.symbol, decimals: json.decimals, usdSpotPrice: json.usdSpotPrice });
    return parse(validators_1.APIOpenSeaPaymentAsset, output);
}
exports.parsePaymentAsset = parsePaymentAsset;
function parseSale(json) {
    var _a, _b, _c;
    if (json == null)
        return null;
    var paymentAsset = parsePaymentAsset((_a = json === null || json === void 0 ? void 0 : json.totalPriceQuantity) === null || _a === void 0 ? void 0 : _a.asset);
    var output = {
        paymentAsset: paymentAsset,
        timestamp: json === null || json === void 0 ? void 0 : json.timestamp,
        totalPrice: (_b = json === null || json === void 0 ? void 0 : json.totalPriceQuantity) === null || _b === void 0 ? void 0 : _b.quantity,
        totalPriceInEth: (_c = json === null || json === void 0 ? void 0 : json.totalPriceQuantity) === null || _c === void 0 ? void 0 : _c.quantityInEth,
    };
    return parse(validators_1.APIOpenSeaSale, output);
}
exports.parseSale = parseSale;
function parseOrder(side, json) {
    var _a, _b;
    if (json == null)
        return null;
    var _bundle = side == types_1.OrderSide.Sell ? json === null || json === void 0 ? void 0 : json.takerAssetBundle : json === null || json === void 0 ? void 0 : json.makerAssetBundle;
    var _node = (_b = (_a = _bundle === null || _bundle === void 0 ? void 0 : _bundle.assetQuantities) === null || _a === void 0 ? void 0 : _a.edges[0]) === null || _b === void 0 ? void 0 : _b.node;
    var paymentAsset = parsePaymentAsset(_node === null || _node === void 0 ? void 0 : _node.asset);
    var user = parseAccount(json === null || json === void 0 ? void 0 : json.maker);
    var output = {
        side: side,
        orderType: json === null || json === void 0 ? void 0 : json.orderType,
        paymentAsset: paymentAsset,
        totalPrice: _node.quantity,
        totalPriceInEth: _node.quantityInEth,
        user: user,
    };
    return parse(validators_1.APIOpenSeaOrder, output);
}
function parseAsk(json) {
    return parseOrder(types_1.OrderSide.Sell, json);
}
exports.parseAsk = parseAsk;
function parseBid(json) {
    return parseOrder(types_1.OrderSide.Buy, json);
}
exports.parseBid = parseBid;
function parseNFTAsset(json) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    var _asset = (_b = (_a = json === null || json === void 0 ? void 0 : json.data) === null || _a === void 0 ? void 0 : _a.archetype) === null || _b === void 0 ? void 0 : _b.asset;
    var assetContract = parseAssetContract(_asset === null || _asset === void 0 ? void 0 : _asset.assetContract);
    var collection = parseCollection(_asset === null || _asset === void 0 ? void 0 : _asset.collection);
    var owner = parseAccount((_e = (_d = (_c = _asset === null || _asset === void 0 ? void 0 : _asset.assetOwners) === null || _c === void 0 ? void 0 : _c.edges[0]) === null || _d === void 0 ? void 0 : _d.node) === null || _e === void 0 ? void 0 : _e.owner);
    var lastSale = parseSale((_f = _asset === null || _asset === void 0 ? void 0 : _asset.assetEventData) === null || _f === void 0 ? void 0 : _f.lastSale);
    var _tradeSummary = (_g = json === null || json === void 0 ? void 0 : json.data) === null || _g === void 0 ? void 0 : _g.tradeSummary;
    var bestAsk = parseAsk(_tradeSummary === null || _tradeSummary === void 0 ? void 0 : _tradeSummary.bestAsk);
    var bestBid = parseBid(_tradeSummary === null || _tradeSummary === void 0 ? void 0 : _tradeSummary.bestBid);
    var output = __assign({ assetContract: assetContract, collection: collection, name: _asset.name, tokenId: _asset.tokenId, owner: owner, lastSale: lastSale, bestAsk: bestAsk, bestBid: bestBid }, (((_j = (_h = _asset === null || _asset === void 0 ? void 0 : _asset.traits) === null || _h === void 0 ? void 0 : _h.edges) !== null && _j !== void 0 ? _j : []).length > 0
        ? { traits: parseAssetTraits(_asset.traits.edges) }
        : {}));
    return parse(validators_1.APIOpenSeaNFTAsset, output);
}
exports.parseNFTAsset = parseNFTAsset;
//# sourceMappingURL=parsers.js.map