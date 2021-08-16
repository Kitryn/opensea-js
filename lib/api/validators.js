"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIOpenSeaNFTAsset = exports.APIOpenSeaOrder = exports.APIOpenSeaSale = exports.APIOpenSeaPaymentAsset = exports.APIOpenSeaAssetContract = exports.APIOpenSeaAccount = exports.APIOpenSeaAssetTrait = exports.APIOpenSeaCollection = exports.APIOpenSeaCollectionTrait = void 0;
var types_1 = require("../types");
var superstruct_1 = require("superstruct");
var utils_1 = require("@0x/utils");
// ======= OpenSea GQL validation types =======
var validateBN = function (val) {
    var bn = new utils_1.BigNumber(val);
    return !bn.isNaN();
};
var BigNumberType = superstruct_1.define("BigNumberType", function (value) {
    return validateBN(value) ? true : false;
});
var coerceBigNumberJS = superstruct_1.coerce(BigNumberType, superstruct_1.union([superstruct_1.string(), superstruct_1.number()]), function (val) { return new utils_1.BigNumber(val); });
/**
 *
 */
exports.APIOpenSeaCollectionTrait = superstruct_1.union([
    // String traits
    superstruct_1.object({
        key: superstruct_1.string(),
        kind: superstruct_1.enums(["string"]),
        counts: superstruct_1.array(superstruct_1.object({
            count: superstruct_1.number(),
            value: superstruct_1.string(),
        })),
    }),
    // Numeric traits
    superstruct_1.object({
        key: superstruct_1.string(),
        kind: superstruct_1.enums(["numeric"]),
        value: superstruct_1.object({
            min: superstruct_1.number(),
            max: superstruct_1.number(),
        }),
    }),
]);
/**
 *
 */
exports.APIOpenSeaCollection = superstruct_1.object({
    name: superstruct_1.string(),
    slug: superstruct_1.string(),
    devBuyerFeeBasisPoints: superstruct_1.number(),
    devSellerFeeBasisPoints: superstruct_1.number(),
    openseaBuyerFeeBasisPoints: superstruct_1.number(),
    openseaSellerFeeBasisPoints: superstruct_1.number(),
    collectionTraits: superstruct_1.optional(superstruct_1.array(exports.APIOpenSeaCollectionTrait)),
});
/**
 *
 */
exports.APIOpenSeaAssetTrait = superstruct_1.object({
    key: superstruct_1.string(),
    kind: superstruct_1.enums(["string", "numeric"]),
    value: superstruct_1.string(),
});
/**
 *
 */
exports.APIOpenSeaAccount = superstruct_1.object({
    address: superstruct_1.string(),
    displayName: superstruct_1.defaulted(superstruct_1.nullable(superstruct_1.string()), null),
});
/**
 *
 */
exports.APIOpenSeaAssetContract = superstruct_1.object({
    address: superstruct_1.string(),
    chain: superstruct_1.string(),
    name: superstruct_1.string(),
    symbol: superstruct_1.string(),
    tokenStandard: superstruct_1.string(), // WyvernSchemaName??
});
/**
 *
 */
exports.APIOpenSeaPaymentAsset = superstruct_1.assign(exports.APIOpenSeaAssetContract, superstruct_1.object({
    decimals: superstruct_1.number(),
    usdSpotPrice: superstruct_1.number(),
}));
/**
 *
 */
exports.APIOpenSeaSale = superstruct_1.object({
    timestamp: superstruct_1.coerce(superstruct_1.date(), superstruct_1.string(), function (val) { return new Date(val); }),
    paymentAsset: exports.APIOpenSeaPaymentAsset,
    totalPrice: coerceBigNumberJS,
    totalPriceInEth: coerceBigNumberJS,
});
/**
 *
 */
exports.APIOpenSeaOrder = superstruct_1.object({
    side: superstruct_1.enums([types_1.OrderSide.Buy, types_1.OrderSide.Sell]),
    orderType: superstruct_1.string(),
    paymentAsset: exports.APIOpenSeaPaymentAsset,
    totalPrice: coerceBigNumberJS,
    totalPriceInEth: coerceBigNumberJS,
    user: exports.APIOpenSeaAccount,
});
/**
 *
 */
exports.APIOpenSeaNFTAsset = superstruct_1.object({
    assetContract: exports.APIOpenSeaAssetContract,
    collection: exports.APIOpenSeaCollection,
    name: superstruct_1.string(),
    tokenId: superstruct_1.coerce(superstruct_1.number(), superstruct_1.string(), function (val) { return parseInt(val); }),
    owner: exports.APIOpenSeaAccount,
    traits: superstruct_1.optional(superstruct_1.array(exports.APIOpenSeaAssetTrait)),
    lastSale: superstruct_1.defaulted(superstruct_1.nullable(exports.APIOpenSeaSale), null),
    bestAsk: superstruct_1.defaulted(superstruct_1.nullable(exports.APIOpenSeaOrder), null),
    bestBid: superstruct_1.defaulted(superstruct_1.nullable(exports.APIOpenSeaOrder), null),
});
//# sourceMappingURL=validators.js.map