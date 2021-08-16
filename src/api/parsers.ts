import { OrderSide } from "src/types";
import { create, Struct } from "superstruct";
import { ApiError } from "./query-types";
import {
  APIOpenSeaAccount,
  APIOpenSeaAssetContract,
  APIOpenSeaAssetTrait,
  APIOpenSeaCollection,
  APIOpenSeaCollectionTrait,
  APIOpenSeaNFTAsset,
  APIOpenSeaOrder,
  APIOpenSeaPaymentAsset,
  APIOpenSeaSale,
} from "./validators";

function parse<T>(type: Struct<T>, json: any): T {
  try {
    return create(json, type);
  } catch (error) {
    throw new ApiError("Error parsing json", error.stack);
  }
}

/**
 * Fails silently if numericTraits or stringTraits don't exist on json
 * @param json: { numericTraits: Array() | undefined, stringTraits: Array() | undefined }
 */
export function parseCollectionTraits(json: any): APIOpenSeaCollectionTrait[] {
  const output: APIOpenSeaCollectionTrait[] = [];

  for (const numericTrait of json?.numericTraits ?? []) {
    const data: APIOpenSeaCollectionTrait = {
      key: numericTrait?.key,
      kind: "numeric",
      value: {
        min: numericTrait?.value?.min,
        max: numericTrait?.value?.max,
      },
    };
    output.push(
      parse<APIOpenSeaCollectionTrait>(APIOpenSeaCollectionTrait, data)
    );
  }

  for (const stringTrait of json?.stringTraits ?? []) {
    const data: APIOpenSeaCollectionTrait = {
      key: stringTrait.key,
      kind: "string",
      counts: stringTrait.counts,
    };
    output.push(
      parse<APIOpenSeaCollectionTrait>(APIOpenSeaCollectionTrait, data)
    );
  }

  return output;
}

export function parseCollection(json: any): APIOpenSeaCollection {
  let collectionTraits: APIOpenSeaCollectionTrait[] = [];
  const { numericTraits, stringTraits, ...data } = json;
  if (json?.numericTraits || json?.stringTraits) {
    collectionTraits = parseCollectionTraits({ numericTraits, stringTraits });
  }

  const output: APIOpenSeaCollection = {
    ...data,
    ...(collectionTraits.length > 0 ? { collectionTraits } : {}),
  };

  return parse<APIOpenSeaCollection>(APIOpenSeaCollection, output);
}

/**
 * Fails silently if json is undefined
 * @param json
 */
export function parseAssetTraits(json: any[]): APIOpenSeaAssetTrait[] {
  const output: APIOpenSeaAssetTrait[] = [];
  for (const trait of json ?? []) {
    const node = trait.node;
    const data: APIOpenSeaAssetTrait = {
      key: node.traitType,
      kind: node.intValue ? "numeric" : "string",
      value: node.intValue ? node.intValue : node.value,
    };
    output.push(parse<APIOpenSeaAssetTrait>(APIOpenSeaAssetTrait, data));
  }
  return output;
}

export function parseAccount(json: any): APIOpenSeaAccount {
  return parse<APIOpenSeaAccount>(APIOpenSeaAccount, json);
}

export function parseAssetContract(json: any): APIOpenSeaAssetContract {
  return parse<APIOpenSeaAssetContract>(APIOpenSeaAssetContract, json);
}

export function parsePaymentAsset(json: any): APIOpenSeaPaymentAsset {
  const assetContract = parseAssetContract(json?.assetContract);
  const output: APIOpenSeaPaymentAsset = {
    ...assetContract,
    symbol: json.symbol || assetContract.symbol,
    decimals: json.decimals,
    usdSpotPrice: json.usdSpotPrice,
  };
  return parse<APIOpenSeaPaymentAsset>(APIOpenSeaPaymentAsset, output);
}

export function parseSale(json: any | undefined | null): APIOpenSeaSale | null {
  if (json == null) return null;

  const paymentAsset = parsePaymentAsset(json?.totalPriceQuantity?.asset);
  const output: APIOpenSeaSale = {
    paymentAsset,
    timestamp: json?.timestamp,
    totalPrice: json?.totalPriceQuantity?.quantity,
    totalPriceInEth: json?.totalPriceQuantity?.quantityInEth,
  };
  return parse<APIOpenSeaSale>(APIOpenSeaSale, output);
}

function parseOrder(side: OrderSide, json: any): APIOpenSeaOrder | null {
  if (json == null) return null;

  const _bundle =
    side == OrderSide.Sell ? json?.takerAssetBundle : json?.makerAssetBundle;
  const _node = _bundle?.assetQuantities?.edges[0]?.node;
  const paymentAsset = parsePaymentAsset(_node?.asset);

  const user = parseAccount(json?.maker);

  const output: APIOpenSeaOrder = {
    side,
    orderType: json?.orderType, // TODO: Does not account for english/dutch auction prices etc and their final or reserve prices etc
    paymentAsset,
    totalPrice: _node.quantity,
    totalPriceInEth: _node.quantityInEth,
    user,
  };
  return parse<APIOpenSeaOrder>(APIOpenSeaOrder, output);
}

export function parseAsk(json: any): APIOpenSeaOrder | null {
  return parseOrder(OrderSide.Sell, json);
}

export function parseBid(json: any): APIOpenSeaOrder | null {
  return parseOrder(OrderSide.Buy, json);
}

export function parseNFTAsset(json: any): APIOpenSeaNFTAsset {
  const _asset = json?.data?.archetype?.asset;
  const assetContract = parseAssetContract(_asset?.assetContract);
  const collection = parseCollection(_asset?.collection);
  const owner = parseAccount(_asset?.assetOwners?.edges[0]?.node?.owner);
  const lastSale = parseSale(_asset?.assetEventData?.lastSale);

  const _tradeSummary = json?.data?.tradeSummary;
  const bestAsk = parseAsk(_tradeSummary?.bestAsk);
  const bestBid = parseBid(_tradeSummary?.bestBid);

  const output: APIOpenSeaNFTAsset = {
    assetContract,
    collection,
    name: _asset.name,
    tokenId: _asset.tokenId,
    owner,
    lastSale,
    bestAsk,
    bestBid,
    ...((_asset?.traits?.edges ?? []).length > 0
      ? { traits: parseAssetTraits(_asset.traits.edges) }
      : {}),
  };

  return parse<APIOpenSeaNFTAsset>(APIOpenSeaNFTAsset, output);
}
