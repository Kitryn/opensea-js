import {
  Network,
  OpenSeaAPIConfig,
  OpenSeaAsset,
  OpenSeaAssetBundle,
  OpenSeaAssetBundleQuery,
  OpenSeaAssetQuery,
  OpenSeaFungibleToken,
  OpenSeaFungibleTokenQuery,
  Order,
  OrderJSON,
  OrderQuery,
} from "../types";
import {
  GQL_BASE_MAINNET,
  GQL_BASE_RINKEBY,
  API_BASE_MAINNET,
  API_BASE_RINKEBY,
} from "../constants";
import { OpenSeaAPI as FallbackAPI } from "./fallback_api";
import { APIOpenSeaNFTAsset } from "./validators";
import { createGetAssetQuery } from "./query-builder";
import { ApiError, QueryBody } from "./query-types";
import fetch, { RequestInit, Response } from "node-fetch";
import { parseNFTAsset } from "./parsers";

export class OpenSeaAPI {
  public readonly gqlBaseUrl: string;
  public readonly apiBaseUrl: string;
  public pageSize = 20;

  /**
   * Logger function to use when debugging
   */
  public logger: (arg: string) => void;
  private apiKey: string | undefined;
  private fallBackAPI: FallbackAPI;

  constructor(config: OpenSeaAPIConfig, logger?: (arg: string) => void) {
    this.apiKey = config.apiKey;

    switch (config.networkName) {
      case Network.Rinkeby:
        this.apiBaseUrl = config.apiBaseUrl || API_BASE_RINKEBY;
        this.gqlBaseUrl = GQL_BASE_RINKEBY;
        break;
      case Network.Main:
      default:
        this.apiBaseUrl = config.apiBaseUrl || API_BASE_MAINNET;
        this.gqlBaseUrl = GQL_BASE_MAINNET;
        break;
    }

    // Debugging: default to nothing
    this.logger = logger || ((arg: string) => arg);
    this.fallBackAPI = new FallbackAPI(config, logger);
  }

  /**
   * Send an order to the orderbook.
   * Throws when the order is invalid.
   * IN NEXT VERSION: change order input to Order type
   * @param order Order JSON to post to the orderbook
   * @param retries Number of times to retry if the service is unavailable for any reason
   */
  public async postOrder(order: OrderJSON, retries = 2): Promise<Order> {
    throw new Error("postOrder ==> Not implemented");
  }

  /**
   * Create a whitelist entry for an asset to prevent others from buying.
   * Buyers will have to have verified at least one of the emails
   * on an asset in order to buy.
   * This will throw a 403 if the given API key isn't allowed to create whitelist entries for this contract or asset.
   * @param tokenAddress Address of the asset's contract
   * @param tokenId The asset's token ID
   * @param email The email allowed to buy.
   */
  public async postAssetWhitelist(
    tokenAddress: string,
    tokenId: string | number,
    email: string
  ): Promise<boolean> {
    throw new Error("postAssetWhitelist ==> Not implemented");
  }

  /**
   * Get an order from the orderbook, throwing if none is found.
   * @param query Query to use for getting orders. A subset of parameters
   *  on the `OrderJSON` type is supported
   */
  public async getOrder(query: OrderQuery): Promise<Order> {
    throw new Error("getOrder ==> Not Implemented");
  }

  /**
   * Get a list of orders from the orderbook, returning the page of orders
   *  and the count of total orders found.
   * @param query Query to use for getting orders. A subset of parameters
   *  on the `OrderJSON` type is supported
   * @param page Page number, defaults to 1. Can be overridden by
   * `limit` and `offset` attributes from OrderQuery
   */
  public async getOrders(
    query: OrderQuery = {},
    page = 1
  ): Promise<{ orders: Order[]; count: number }> {
    throw new Error("getOrders ==> Not implemented");
  }

  /**
   * Fetch an asset from the API, throwing if none is found
   * @param tokenAddress Address of the asset's contract
   * @param tokenId The asset's token ID. The old behaviour had it possible to null if ERC-20 -- does this work in GQL? TODO
   * @param retries Number of times to retry if the service is unavailable for any reason
   */
  public async getAsset(
    {
      tokenAddress,
      tokenId,
    }: {
      tokenAddress: string;
      tokenId: string | number;
    },
    retries = 1
  ): Promise<APIOpenSeaNFTAsset> {
    const query = createGetAssetQuery(
      tokenAddress,
      parseInt(`${tokenId}`) // silence typescript and cast to string first
    );

    let json;
    try {
      json = await this.postQuery(query);
    } catch (error) {
      _throwOrContinue(error, retries);
      await delay(1000);
      return this.getAsset({ tokenAddress, tokenId }, retries - 1);
    }

    if (json.errors != null) {
      throw new ApiError(
        `Error in GQL response: ${JSON.stringify(json.errors)}`,
        undefined,
        json.errors
      );
    }

    return parseNFTAsset(json);
  }

  /**
   * Fetch list of assets from the API, returning the page of assets and the count of total assets
   * @param query Query to use for getting orders. A subset of parameters on the `OpenSeaAssetJSON` type is supported
   * @param page Page number, defaults to 1. Can be overridden by
   * `limit` and `offset` attributes from OpenSeaAssetQuery
   */
  public async getAssets(
    query: OpenSeaAssetQuery = {},
    page = 1
  ): Promise<{ assets: OpenSeaAsset[]; estimatedCount: number }> {
    throw new Error("getAssets ==> Not implemented"); // note: can throw, will bubble up, let caller handle
  }

  /**
   * Fetch list of fungible tokens from the API matching paramters
   * @param query Query to use for getting orders. A subset of parameters on the `OpenSeaAssetJSON` type is supported
   * @param page Page number, defaults to 1. Can be overridden by
   * `limit` and `offset` attributes from OpenSeaFungibleTokenQuery
   * @param retries Number of times to retry if the service is unavailable for any reason
   */
  public async getPaymentTokens(
    query: OpenSeaFungibleTokenQuery = {},
    page = 1,
    retries = 1
  ): Promise<{ tokens: OpenSeaFungibleToken[] }> {
    return this.fallBackAPI.getPaymentTokens(query, page, retries);
  }

  /**
   * Fetch an bundle from the API, return null if it isn't found
   * @param slug The bundle's identifier
   */
  public async getBundle({
    slug,
  }: {
    slug: string;
  }): Promise<OpenSeaAssetBundle | null> {
    return this.fallBackAPI.getBundle({ slug });
  }

  /**
   * Fetch list of bundles from the API, returning the page of bundles and the count of total bundles
   * @param query Query to use for getting orders. A subset of parameters on the `OpenSeaAssetBundleJSON` type is supported
   * @param page Page number, defaults to 1. Can be overridden by
   * `limit` and `offset` attributes from OpenSeaAssetBundleQuery
   */
  public async getBundles(
    query: OpenSeaAssetBundleQuery = {},
    page = 1
  ): Promise<{ bundles: OpenSeaAssetBundle[]; estimatedCount: number }> {
    return this.fallBackAPI.getBundles(query, page);
  }

  // ======== helper methods
  public async postQuery(query: QueryBody): Promise<any> {
    const fetchOpts: RequestInit = {
      method: "post",
      body: JSON.stringify(query),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(this.apiKey ? { "X-API-KEY": this.apiKey } : {}),
      },
    };

    // this.logger({
    //   level: "verbose",
    //   message: `postQuery => id: ${query.id}, variables: ${
    //     query.variables ? JSON.stringify(query.variables) : {}
    //   }`,
    // });

    return fetch(this.gqlBaseUrl, fetchOpts)
      .then((res) => this._handleApiResponse(res))
      .catch((error) => {
        // Catches errors from fetch() (FetchError) and everything within _handleApiResponse
        // this.logger({
        //   level: "error",
        //   message: `postQuery ${query.id} => ${error.name}: ${error.message}`,
        //   ...(error.data ? { data: error.data } : {}),
        // });
        // Re-throws -- caller should handle
        throw new ApiError(
          error.message,
          error.stack ? error.stack : undefined,
          error.data ? error.data : undefined
        );
      });
  }

  private async _handleApiResponse(res: Response): Promise<any> {
    let resultText: string | undefined;
    let resultJson: any;
    try {
      resultText = await res.text();
      resultJson = JSON.parse(resultText);
    } catch {}

    const data: any = resultJson || resultText; // resultJson if resultJson, if not resultText or undefined if neither

    if (!res.ok) {
      // this.logger({
      //   level: "error",
      //   message: `handleApiResponse => HTTP request failed with status ${res.status}`,
      //   ...(data ? { data } : {}),
      // });
      throw new ApiError(
        `HTTP request failed with status ${res.status}`,
        undefined,
        data ?? undefined
      );
    }

    if (resultJson == null) {
      // this.logger({
      //   level: "error",
      //   message: `handleApiResponse => Error parsing response into JSON`,
      //   ...(data ? { data } : {}),
      // });
      throw new ApiError(
        `Error parsing response into JSON`,
        undefined,
        data ?? undefined
      );
    }

    return resultJson;
  }
}

function _throwOrContinue(error: Error, retries: number) {
  const isUnavailable =
    !!error.message &&
    (error.message.includes("503") || error.message.includes("429"));
  if (retries <= 0 || !isUnavailable) {
    throw error;
  }
}

async function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
