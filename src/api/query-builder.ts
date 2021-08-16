import fs from "fs";
import path from "path";
import { GetAssetQueryBody, QueryBody } from "./query-types";

const getAssetQueryString: string = fs.readFileSync(
  path.resolve(__dirname, "./gql/GetAsset.gql"),
  "utf-8"
);

export function createQuery(id: string, queryString: string): QueryBody {
  return {
    id,
    query: queryString,
  };
}

export function createGetAssetQuery(
  assetContractAddress: string,
  tokenId: number
): GetAssetQueryBody {
  return {
    ...createQuery("getAsset", getAssetQueryString),
    variables: {
      assetContractAddress,
      tokenId,
    },
  };
}
