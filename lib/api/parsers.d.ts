import { APIOpenSeaAccount, APIOpenSeaAssetContract, APIOpenSeaAssetTrait, APIOpenSeaCollection, APIOpenSeaCollectionTrait, APIOpenSeaNFTAsset, APIOpenSeaOrder, APIOpenSeaPaymentAsset, APIOpenSeaSale } from "./validators";
/**
 * Fails silently if numericTraits or stringTraits don't exist on json
 * @param json: { numericTraits: Array() | undefined, stringTraits: Array() | undefined }
 */
export declare function parseCollectionTraits(json: any): APIOpenSeaCollectionTrait[];
export declare function parseCollection(json: any): APIOpenSeaCollection;
/**
 * Fails silently if json is undefined
 * @param json
 */
export declare function parseAssetTraits(json: any[]): APIOpenSeaAssetTrait[];
export declare function parseAccount(json: any): APIOpenSeaAccount;
export declare function parseAssetContract(json: any): APIOpenSeaAssetContract;
export declare function parsePaymentAsset(json: any): APIOpenSeaPaymentAsset;
export declare function parseSale(json: any | undefined | null): APIOpenSeaSale | null;
export declare function parseAsk(json: any): APIOpenSeaOrder | null;
export declare function parseBid(json: any): APIOpenSeaOrder | null;
export declare function parseNFTAsset(json: any): APIOpenSeaNFTAsset;
