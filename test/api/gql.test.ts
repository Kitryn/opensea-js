jest.mock("node-fetch");
import fetch, { RequestInfo, RequestInit } from "node-fetch";
const { Response } = jest.requireActual("node-fetch");
import { createGetAssetQuery } from "../../src/api/query-builder";
import { ApiError } from "../../src/api/query-types";
import {
  mainApi,
  MAINNET_API_KEY,
  rinkebyApi,
  RINKEBY_API_KEY,
} from "../constants";

describe("GQL API tests", () => {
  describe("postQuery", () => {
    let url: RequestInfo | undefined = undefined;
    let opts: RequestInit | undefined = undefined;
    const testResponse = { testResponse: "reply" };
    const query = createGetAssetQuery("contractAddress", 123);

    beforeEach(() => {
      jest.resetAllMocks();
      url = undefined;
      opts = undefined;
    });

    test("Should send to correct URL with passed in API key and get back correct response", async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
        (_url: RequestInfo, _init?: RequestInit) => {
          url = _url;
          opts = _init;
          return Promise.resolve(new Response(JSON.stringify(testResponse)));
        }
      );

      const gql_mainnet = "https://api.opensea.io/graphql/";
      const gql_testnet = "https://testnets-api.opensea.io/graphql/";

      let response = await mainApi.postQuery(query);
      expect(response).toStrictEqual(testResponse);
      expect(url).toBe(gql_mainnet);

      response = await rinkebyApi.postQuery(query);
      expect(response).toStrictEqual(testResponse);
      expect(url).toBe(gql_testnet);

      let cast_opts = opts as any;
      expect(cast_opts.headers["X-API-KEY"]).toBe(RINKEBY_API_KEY);
    });

    test("Should construct body correctly", async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
        (_url: RequestInfo, _init?: RequestInit) => {
          url = _url;
          opts = _init;
          return Promise.resolve(new Response(JSON.stringify(testResponse)));
        }
      );

      let _ = await mainApi.postQuery(query);

      let cast_opts = opts as any;
      expect(cast_opts.method).toBe("post");
      expect(cast_opts.body).toBe(JSON.stringify(query));
      expect(cast_opts.headers["Content-Type"]).toBe("application/json");
      expect(cast_opts.headers["Accept"]).toBe("application/json");
      expect(cast_opts.headers["X-API-KEY"]).toBe(MAINNET_API_KEY);
    });

    test("Should catch node-fetch thrown errors", async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error("Should fail")
      );

      await expect(mainApi.postQuery(query)).rejects.toThrow("Should fail");
      await expect(mainApi.postQuery(query)).rejects.toThrow(ApiError);
    });

    test("Should throw if status is not ok", async () => {
      const failedResponse = { error: "testError" };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response(JSON.stringify(failedResponse), { status: 404 })
      );
      await expect(mainApi.postQuery(query)).rejects.toThrow(
        "failed with status 404"
      );
      await expect(mainApi.postQuery(query)).rejects.toThrow(ApiError);
    });

    test("Should throw if body is not json", async () => {
      const failedResponse = "failedResponse";
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response(failedResponse)
      );

      await expect(mainApi.postQuery(query)).rejects.toThrow(
        "Error parsing response into JSON"
      );
      await expect(mainApi.postQuery(query)).rejects.toThrow(ApiError);
    });
  });
});
