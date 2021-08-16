import { createGetAssetQuery, createQuery } from "../../src/api/query-builder";
import fs from "fs";
import path from "path";

const fullGetAssetQueryPath = path.resolve(
  __dirname,
  "./../../src/api",
  "gql/GetAsset.gql"
);

describe("Query Builder tests", () => {
  test("GQL query files should exist", () => {
    const getAssetQueryString = fs.readFileSync(fullGetAssetQueryPath, "utf-8");

    expect(getAssetQueryString).not.toBeFalsy();
    expect(typeof getAssetQueryString).toBe("string");
  });

  test("Should build valid base query", () => {
    const query = createQuery("queryId", "queryString");
    expect(query).toEqual({
      id: "queryId",
      query: "queryString",
    });
  });

  test("Should build valid GetAssetQuery", () => {
    const getAssetQueryString = fs.readFileSync(fullGetAssetQueryPath, "utf-8");
    const getAssetQuery = createGetAssetQuery("testAddress", 123);
    expect(getAssetQuery.id).toBe("getAsset");
    expect(getAssetQuery.query).toBe(getAssetQueryString);
    expect(getAssetQuery.variables.assetContractAddress).toBe("testAddress");
    expect(getAssetQuery.variables.tokenId).toBe(123);
  });
});
