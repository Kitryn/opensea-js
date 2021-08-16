import {
  GetAssetResponse,
  collectionTraits,
  expectedCollection,
  expectedCollectionTraits,
  expectedAssetTraits,
  expectedLastSale,
  expectedBestAsk,
  expectedBestBid,
  expectedNFTAsset,
} from "../fixtures/gqlResponses";
import {
  parseAccount,
  parseAsk,
  parseAssetContract,
  parseAssetTraits,
  parseBid,
  parseCollection,
  parseCollectionTraits,
  parseNFTAsset,
  parsePaymentAsset,
  parseSale,
} from "../../src/api/parsers";

describe("GQL response parsers", () => {
  describe("parseCollectionTraits", () => {
    test("Should parse on valid input", () => {
      expect(() => parseCollectionTraits(collectionTraits)).not.toThrow();
      expect(parseCollectionTraits(collectionTraits)).toStrictEqual(
        expectedCollectionTraits
      );
    });
  });

  describe("parseCollection", () => {
    const collection = GetAssetResponse.data.archetype.asset.collection;

    test("Should parse on valid input", () => {
      let result: any;
      expect(() => {
        result = parseCollection(collection);
      }).not.toThrow();
      expect(result).toStrictEqual(expectedCollection);
    });
  });

  describe("parseAssetTraits", () => {
    const assetTraits = GetAssetResponse.data.archetype.asset.traits.edges;

    test("Should parse on valid input", () => {
      let result: any;
      expect(() => {
        result = parseAssetTraits(assetTraits);
      }).not.toThrow();
      expect(result).toStrictEqual(expectedAssetTraits);
    });
  });

  describe("parseAccount", () => {
    const account =
      GetAssetResponse.data.archetype.asset.assetOwners.edges[0].node.owner;
    const expectedAccount = {
      address: "0xd711e8975f248216dba4730c06fc86b9aa765f92",
      displayName: "carys",
    };

    test("Should parse on valid input", () => {
      let result: any;
      expect(() => {
        result = parseAccount(account);
      }).not.toThrow();
      expect(result).toStrictEqual(expectedAccount);
    });
  });

  describe("parseAssetContract", () => {
    const hmContract = GetAssetResponse.data.archetype.asset.assetContract;
    const expectedHmContract = {
      address: "0xc2c747e0f7004f9e8817db2ca4997657a7746928",
      chain: "ETHEREUM",
      name: "Hashmasks",
      symbol: "HM",
      tokenStandard: "ERC721",
    };

    test("Should parse on valid input", () => {
      let result: any;
      expect(() => {
        result = parseAssetContract(hmContract);
      }).not.toThrow();
      expect(result).toStrictEqual(expectedHmContract);
    });
  });

  describe("parsePaymentAsset", () => {
    const paymentAsset =
      GetAssetResponse.data.archetype.asset.assetEventData.lastSale
        .totalPriceQuantity.asset;
    const expectedEth = {
      address: "0x0000000000000000000000000000000000000000",
      chain: "ETHEREUM",
      tokenStandard: "ERC20",
      symbol: "ETH",
      name: "Ether",
      decimals: 18,
      usdSpotPrice: 2783.75,
    };

    test("Should parse on valid input", () => {
      let result: any;

      expect(() => {
        result = parsePaymentAsset(paymentAsset);
      }).not.toThrow();
      expect(result).toStrictEqual(expectedEth);
    });
  });

  describe("parseSale", () => {
    const lastSale =
      GetAssetResponse.data.archetype.asset.assetEventData.lastSale;

    test("Should parse on valid input", () => {
      let result: any;
      expect(() => {
        result = parseSale(lastSale);
      }).not.toThrow();
      expect(result).toStrictEqual(expectedLastSale);
    });
  });

  describe("parseOrder", () => {
    const bestAsk = GetAssetResponse.data.tradeSummary.bestAsk;
    const bestBid = GetAssetResponse.data.tradeSummary.bestBid;

    test("Should parse bestAsk on valid input", () => {
      let result: any;
      expect(() => {
        result = parseAsk(bestAsk);
      }).not.toThrow();
      expect(result).toStrictEqual(expectedBestAsk);
    });

    test("Should parse bestBid on valid input", () => {
      let result: any;
      expect(() => {
        result = parseBid(bestBid);
      }).not.toThrow();
      expect(result).toStrictEqual(expectedBestBid);
    });
  });

  describe("parseNFTAsset", () => {
    test("Should parse on valid input", () => {
      let result: any;
      expect(() => {
        result = parseNFTAsset(GetAssetResponse);
      }).not.toThrow();
      expect(result).toStrictEqual(expectedNFTAsset);
    });
  });
});
