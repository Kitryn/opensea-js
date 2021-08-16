import { OpenSeaAPIConfig, OpenSeaAsset, OpenSeaAssetBundle, OpenSeaAssetBundleQuery, OpenSeaAssetQuery, OpenSeaFungibleToken, OpenSeaFungibleTokenQuery, Order, OrderJSON, OrderQuery } from "../types";
import { APIOpenSeaNFTAsset } from "./validators";
import { QueryBody } from "./query-types";
export declare class OpenSeaAPI {
    readonly gqlBaseUrl: string;
    readonly apiBaseUrl: string;
    pageSize: number;
    /**
     * Logger function to use when debugging
     */
    logger: (arg: string) => void;
    private apiKey;
    private fallBackAPI;
    constructor(config: OpenSeaAPIConfig, logger?: (arg: string) => void);
    /**
     * Send an order to the orderbook.
     * Throws when the order is invalid.
     * IN NEXT VERSION: change order input to Order type
     * @param order Order JSON to post to the orderbook
     * @param retries Number of times to retry if the service is unavailable for any reason
     */
    postOrder(order: OrderJSON, retries?: number): Promise<Order>;
    /**
     * Create a whitelist entry for an asset to prevent others from buying.
     * Buyers will have to have verified at least one of the emails
     * on an asset in order to buy.
     * This will throw a 403 if the given API key isn't allowed to create whitelist entries for this contract or asset.
     * @param tokenAddress Address of the asset's contract
     * @param tokenId The asset's token ID
     * @param email The email allowed to buy.
     */
    postAssetWhitelist(tokenAddress: string, tokenId: string | number, email: string): Promise<boolean>;
    /**
     * Get an order from the orderbook, throwing if none is found.
     * @param query Query to use for getting orders. A subset of parameters
     *  on the `OrderJSON` type is supported
     */
    getOrder(query: OrderQuery): Promise<Order>;
    /**
     * Get a list of orders from the orderbook, returning the page of orders
     *  and the count of total orders found.
     * @param query Query to use for getting orders. A subset of parameters
     *  on the `OrderJSON` type is supported
     * @param page Page number, defaults to 1. Can be overridden by
     * `limit` and `offset` attributes from OrderQuery
     */
    getOrders(query?: OrderQuery, page?: number): Promise<{
        orders: Order[];
        count: number;
    }>;
    /**
     * Fetch an asset from the API, throwing if none is found
     * @param tokenAddress Address of the asset's contract
     * @param tokenId The asset's token ID. The old behaviour had it possible to null if ERC-20 -- does this work in GQL? TODO
     * @param retries Number of times to retry if the service is unavailable for any reason
     */
    getAsset({ tokenAddress, tokenId, }: {
        tokenAddress: string;
        tokenId: string | number;
    }, retries?: number): Promise<APIOpenSeaNFTAsset>;
    /**
     * Fetch list of assets from the API, returning the page of assets and the count of total assets
     * @param query Query to use for getting orders. A subset of parameters on the `OpenSeaAssetJSON` type is supported
     * @param page Page number, defaults to 1. Can be overridden by
     * `limit` and `offset` attributes from OpenSeaAssetQuery
     */
    getAssets(query?: OpenSeaAssetQuery, page?: number): Promise<{
        assets: OpenSeaAsset[];
        estimatedCount: number;
    }>;
    /**
     * Fetch list of fungible tokens from the API matching paramters
     * @param query Query to use for getting orders. A subset of parameters on the `OpenSeaAssetJSON` type is supported
     * @param page Page number, defaults to 1. Can be overridden by
     * `limit` and `offset` attributes from OpenSeaFungibleTokenQuery
     * @param retries Number of times to retry if the service is unavailable for any reason
     */
    getPaymentTokens(query?: OpenSeaFungibleTokenQuery, page?: number, retries?: number): Promise<{
        tokens: OpenSeaFungibleToken[];
    }>;
    /**
     * Fetch an bundle from the API, return null if it isn't found
     * @param slug The bundle's identifier
     */
    getBundle({ slug, }: {
        slug: string;
    }): Promise<OpenSeaAssetBundle | null>;
    /**
     * Fetch list of bundles from the API, returning the page of bundles and the count of total bundles
     * @param query Query to use for getting orders. A subset of parameters on the `OpenSeaAssetBundleJSON` type is supported
     * @param page Page number, defaults to 1. Can be overridden by
     * `limit` and `offset` attributes from OpenSeaAssetBundleQuery
     */
    getBundles(query?: OpenSeaAssetBundleQuery, page?: number): Promise<{
        bundles: OpenSeaAssetBundle[];
        estimatedCount: number;
    }>;
    postQuery(query: QueryBody): Promise<any>;
    private _handleApiResponse;
}
