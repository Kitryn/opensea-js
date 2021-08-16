import { GetAssetQueryBody, QueryBody } from "./query-types";
export declare function createQuery(id: string, queryString: string): QueryBody;
export declare function createGetAssetQuery(assetContractAddress: string, tokenId: number): GetAssetQueryBody;
