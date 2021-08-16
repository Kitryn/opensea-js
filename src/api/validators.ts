import { Network, OrderSide } from "../types";
import {
  object,
  string,
  number,
  Infer,
  enums,
  nullable,
  assign,
  coerce,
  define,
  union,
  defaulted,
  date,
  optional,
  array,
} from "superstruct";
import { BigNumber } from "@0x/utils";

// ======= OpenSea GQL validation types =======

const validateBN = (val: any): Boolean => {
  const bn = new BigNumber(val);
  return !bn.isNaN();
};

const BigNumberType = define<BigNumber>("BigNumberType", (value) => {
  return validateBN(value) ? true : false;
});

const coerceBigNumberJS = coerce(
  BigNumberType,
  union([string(), number()]),
  (val) => new BigNumber(val)
);

/**
 *
 */
export const APIOpenSeaCollectionTrait = union([
  // String traits
  object({
    key: string(),
    kind: enums(["string"] as const),
    counts: array(
      object({
        count: number(),
        value: string(),
      })
    ),
  }),
  // Numeric traits
  object({
    key: string(),
    kind: enums(["numeric"] as const),
    value: object({
      min: number(),
      max: number(),
    }),
  }),
]);
export type APIOpenSeaCollectionTrait = Infer<typeof APIOpenSeaCollectionTrait>;

/**
 *
 */
export const APIOpenSeaCollection = object({
  name: string(),
  slug: string(),
  devBuyerFeeBasisPoints: number(),
  devSellerFeeBasisPoints: number(),
  openseaBuyerFeeBasisPoints: number(),
  openseaSellerFeeBasisPoints: number(),
  collectionTraits: optional(array(APIOpenSeaCollectionTrait)),
});
export type APIOpenSeaCollection = Infer<typeof APIOpenSeaCollection>;

/**
 *
 */
export const APIOpenSeaAssetTrait = object({
  key: string(),
  kind: enums(["string", "numeric"] as const),
  value: string(),
});
export type APIOpenSeaAssetTrait = Infer<typeof APIOpenSeaAssetTrait>;

/**
 *
 */
export const APIOpenSeaAccount = object({
  address: string(),
  displayName: defaulted(nullable(string()), null),
});
export type APIOpenSeaAccount = Infer<typeof APIOpenSeaAccount>;

/**
 *
 */
export const APIOpenSeaAssetContract = object({
  address: string(),
  chain: string(), // possibly enums(["ETHEREUM"])
  name: string(),
  symbol: string(),
  tokenStandard: string(), // WyvernSchemaName??
});
export type APIOpenSeaAssetContract = Infer<typeof APIOpenSeaAssetContract>;

/**
 *
 */
export const APIOpenSeaPaymentAsset = assign(
  APIOpenSeaAssetContract,
  object({
    decimals: number(),
    usdSpotPrice: number(),
  })
);
export type APIOpenSeaPaymentAsset = Infer<typeof APIOpenSeaPaymentAsset>;

/**
 *
 */
export const APIOpenSeaSale = object({
  timestamp: coerce(date(), string(), (val) => new Date(val)),
  paymentAsset: APIOpenSeaPaymentAsset,
  totalPrice: coerceBigNumberJS,
  totalPriceInEth: coerceBigNumberJS,
});
export type APIOpenSeaSale = Infer<typeof APIOpenSeaSale>;

/**
 *
 */
export const APIOpenSeaOrder = object({
  side: enums([OrderSide.Buy, OrderSide.Sell] as const),
  orderType: string(), // consider enum
  paymentAsset: APIOpenSeaPaymentAsset,
  totalPrice: coerceBigNumberJS,
  totalPriceInEth: coerceBigNumberJS,
  user: APIOpenSeaAccount,
});
export type APIOpenSeaOrder = Infer<typeof APIOpenSeaOrder>;

/**
 *
 */
export const APIOpenSeaNFTAsset = object({
  assetContract: APIOpenSeaAssetContract,
  collection: APIOpenSeaCollection,
  name: string(),
  tokenId: coerce(number(), string(), (val) => parseInt(val)),
  owner: APIOpenSeaAccount,
  traits: optional(array(APIOpenSeaAssetTrait)),
  lastSale: defaulted(nullable(APIOpenSeaSale), null),
  bestAsk: defaulted(nullable(APIOpenSeaOrder), null),
  bestBid: defaulted(nullable(APIOpenSeaOrder), null),
});
export type APIOpenSeaNFTAsset = Infer<typeof APIOpenSeaNFTAsset>;
