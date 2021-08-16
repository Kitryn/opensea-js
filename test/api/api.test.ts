import { OpenSeaAPI, OpenSeaPort } from "../../src/index";
import { WyvernProtocol } from "wyvern-js";
import { Network, Order, OrderSide, OrderJSON } from "../../src/types";
import { orderToJSON } from "../../src";
import {
  mainApi,
  rinkebyApi,
  apiToTest,
  ALEX_ADDRESS,
  ALEX_ADDRESS_2,
  CK_RINKEBY_TOKEN_ID,
  CK_RINKEBY_ADDRESS,
  CK_RINKEBY_SELLER_FEE,
  RINKEBY_API_KEY,
  CK_ADDRESS,
  WETH_ADDRESS,
  MYTHEREUM_TOKEN_ID,
  MYTHEREUM_ADDRESS,
  MAINNET_API_KEY,
} from "../constants";
import { getOrderHash, makeBigNumber } from "../../src/utils/utils";
import {
  ORDERBOOK_VERSION,
  NULL_ADDRESS,
  MAINNET_PROVIDER_URL,
  ORDER_MATCHING_LATENCY_SECONDS,
} from "../../src/constants";
import { ethers } from "ethers";
import { createGetAssetQuery } from "../../src/api/query-builder";

const provider = new ethers.providers.JsonRpcProvider(MAINNET_PROVIDER_URL);
const signer = new ethers.VoidSigner(
  "0x000000000000000000000000000000000000dEaD",
  provider
);

const client = new OpenSeaPort(
  signer,
  {
    networkName: Network.Main,
    apiKey: MAINNET_API_KEY,
  },
  (line) => console.info(`MAINNET: ${line}`)
);

describe("api", () => {
  test("API has correct base url", () => {
    expect(mainApi.apiBaseUrl).toEqual("https://api.opensea.io");
    expect(rinkebyApi.apiBaseUrl).toEqual("https://rinkeby-api.opensea.io");
    expect(mainApi.gqlBaseUrl).toEqual("https://api.opensea.io/graphql/");
    expect(rinkebyApi.gqlBaseUrl).toEqual(
      "https://testnets-api.opensea.io/graphql/"
    );
  });

  test("API fetches bundles and prefetches sell orders", async () => {
    const { bundles } = await apiToTest.getBundles({
      asset_contract_address: CK_RINKEBY_ADDRESS,
      on_sale: true,
    });

    expect(Array.isArray(bundles)).toBe(true);

    const bundle = bundles[0];
    expect(bundle).not.toBeUndefined();
    expect(bundle).not.toBeNull();
    // if (!bundle) {
    //   return;
    // }
    expect(bundle.assets.map((a) => a.assetContract.name)).toContain(
      "CryptoKittiesRinkeby"
    );
    expect(bundle?.sellOrders).not.toBeUndefined();
    // this seems to work, but at the time of writing has 0 sell orders
    // expect(bundle?.sellOrders?.length).toBeGreaterThan(0);
  });

  test("Includes API key in token request", async () => {
    let ran = false;
    const _rinkebyApi = new OpenSeaAPI(
      {
        apiKey: RINKEBY_API_KEY,
        networkName: Network.Rinkeby,
      },
      (log) => {
        if (ran) return;
        ran = true;
        expect(log).toEqual(
          expect.stringContaining(`"X-API-KEY":"${RINKEBY_API_KEY}"`)
        );
      }
    );

    expect(
      _rinkebyApi.getPaymentTokens({ symbol: "WETH" })
    ).resolves.toBeDefined();
  });

  // Commented out because gql api doesnt return order hashes
  // test("An API asset's order has correct hash", async () => {
  //   const asset = await mainApi.getAsset({
  //     tokenAddress: CK_ADDRESS,
  //     tokenId: 1,
  //   });
  //   expect(asset.orders).not.toBeNull()
  //   assert.isNotNull(asset.orders);
  //   if (!asset.orders) {
  //     return;
  //   }
  //   const order = asset.orders[0];
  //   assert.isNotNull(order);
  //   if (!order) {
  //     return;
  //   }
  //   assert.equal(order.hash, getOrderHash(order));
  // });

  // Commented out because we use a different set of validators now. TODO: look into englishAuction stuff
  // test("orderToJSON is correct", async () => {
  //   const accountAddress = ALEX_ADDRESS;
  //   const quantity = 1;
  //   const amountInToken = 1.2;
  //   const paymentTokenAddress = WETH_ADDRESS;
  //   const extraBountyBasisPoints = 0;
  //   const expirationTime = Math.round(Date.now() / 1000 + 60); // one minute from now
  //   const englishAuctionReservePrice = 2;

  //   const tokenId = MYTHEREUM_TOKEN_ID.toString();
  //   const tokenAddress = MYTHEREUM_ADDRESS;
  //   const order = await client._makeSellOrder({
  //     asset: { tokenAddress, tokenId },
  //     quantity,
  //     accountAddress,
  //     startAmount: amountInToken,
  //     paymentTokenAddress,
  //     extraBountyBasisPoints,
  //     buyerAddress: NULL_ADDRESS,
  //     expirationTime,
  //     waitForHighestBid: true,
  //     englishAuctionReservePrice,
  //   });

  //   const hashedOrder = {
  //     ...order,
  //     hash: getOrderHash(order),
  //   };

  //   const orderData = orderToJSON(hashedOrder);
  //   assert.equal(orderData.quantity, quantity.toString());
  //   assert.equal(orderData.maker, accountAddress);
  //   assert.equal(orderData.taker, NULL_ADDRESS);
  //   assert.equal(
  //     orderData.basePrice,
  //     WyvernProtocol.toBaseUnitAmount(
  //       makeBigNumber(amountInToken),
  //       18
  //     ).toString()
  //   );
  //   assert.equal(orderData.paymentToken, paymentTokenAddress);
  //   assert.equal(orderData.extra, extraBountyBasisPoints.toString());
  //   assert.equal(
  //     orderData.expirationTime,
  //     expirationTime + ORDER_MATCHING_LATENCY_SECONDS
  //   );
  //   assert.equal(
  //     orderData.englishAuctionReservePrice,
  //     WyvernProtocol.toBaseUnitAmount(
  //       makeBigNumber(englishAuctionReservePrice),
  //       18
  //     ).toString()
  //   );
  // });

  test("API fetches tokens", async () => {
    const { tokens } = await apiToTest.getPaymentTokens({ symbol: "MANA" });
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBe(1);
    expect(tokens[0].name).toBe("Decentraland MANA");
  });

  // We don't use the rest API anymore
  // test("Rinkeby API orders have correct OpenSea url", async () => {
  //   const order = await rinkebyApi.getOrder({});
  //   if (!order.asset) {
  //     return;
  //   }
  //   const url = `https://rinkeby.opensea.io/assets/${order.asset.assetContract.address}/${order.asset.tokenId}`;
  //   assert.equal(order.asset.openseaLink, url);
  // });

  // test("Mainnet API orders have correct OpenSea url", async () => {
  //   const order = await mainApi.getOrder({});
  //   if (!order.asset) {
  //     return;
  //   }
  //   const url = `https://opensea.io/assets/${order.asset.assetContract.address}/${order.asset.tokenId}`;
  //   assert.equal(order.asset.openseaLink, url);
  // });

  // Not implemented
  // test("API fetches orderbook", async () => {
  //   const { orders, count } = await apiToTest.getOrders();
  //   assert.isArray(orders);
  //   assert.isNumber(count);
  //   assert.equal(orders.length, apiToTest.pageSize);
  //   // assert.isAtLeast(count, orders.length)
  // });

  // test("API can change page size", async () => {
  //   const defaultPageSize = apiToTest.pageSize;
  //   apiToTest.pageSize = 7;
  //   const { orders } = await apiToTest.getOrders();
  //   assert.equal(orders.length, 7);
  //   apiToTest.pageSize = defaultPageSize;
  // });

  // if (ORDERBOOK_VERSION > 0) {
  //   test("API orderbook paginates", async () => {
  //     const { orders, count } = await apiToTest.getOrders();
  //     const pagination = await apiToTest.getOrders({}, 2);
  //     assert.equal(pagination.orders.length, apiToTest.pageSize);
  //     assert.notDeepEqual(pagination.orders[0], orders[0]);
  //     assert.equal(pagination.count, count);
  //   });
  // }

  // test("API fetches orders for asset contract and asset", async () => {
  //   const forKitties = await apiToTest.getOrders({
  //     asset_contract_address: CK_RINKEBY_ADDRESS,
  //   });
  //   assert.isAbove(forKitties.orders.length, 0);
  //   assert.isAbove(forKitties.count, 0);

  //   const forKitty = await apiToTest.getOrders({
  //     asset_contract_address: CK_RINKEBY_ADDRESS,
  //     token_id: CK_RINKEBY_TOKEN_ID,
  //   });
  //   assert.isArray(forKitty.orders);
  // });

  // test("API fetches orders for asset owner", async () => {
  //   const forOwner = await apiToTest.getOrders({ owner: ALEX_ADDRESS });
  //   assert.isAbove(forOwner.orders.length, 0);
  //   assert.isAbove(forOwner.count, 0);
  //   const owners = forOwner.orders.map(
  //     (o) => o.asset && o.asset.owner && o.asset.owner.address
  //   );
  //   owners.forEach((owner) => {
  //     assert.include([ALEX_ADDRESS, NULL_ADDRESS], owner);
  //   });
  // });

  // test("API fetches buy orders for maker", async () => {
  //   const forMaker = await apiToTest.getOrders({
  //     maker: ALEX_ADDRESS,
  //     side: OrderSide.Buy,
  //   });
  //   assert.isAbove(forMaker.orders.length, 0);
  //   assert.isAbove(forMaker.count, 0);
  //   forMaker.orders.forEach((order) => {
  //     assert.equal(ALEX_ADDRESS, order.maker);
  //     assert.equal(OrderSide.Buy, order.side);
  //   });
  // });

  // test("API doesn't fetch impossible orders", async () => {
  //   try {
  //     const order = await apiToTest.getOrder({
  //       maker: ALEX_ADDRESS,
  //       taker: ALEX_ADDRESS,
  //     });
  //     assert.fail();
  //   } catch (e) {
  //     assert.include(e.message, "Not found");
  //   }
  // });

  // test("API excludes cancelledOrFinalized and markedInvalid orders", async () => {
  //   const { orders } = await apiToTest.getOrders({ limit: 100 });
  //   const finishedOrders = orders.filter((o) => o.cancelledOrFinalized);
  //   assert.isEmpty(finishedOrders);
  //   const invalidOrders = orders.filter((o) => o.markedInvalid);
  //   assert.isEmpty(invalidOrders);
  // });

  test("API fetches fees for an asset", async () => {
    const asset = await apiToTest.getAsset({
      tokenAddress: CK_RINKEBY_ADDRESS,
      tokenId: CK_RINKEBY_TOKEN_ID,
    });
    expect(asset.tokenId).toBe(CK_RINKEBY_TOKEN_ID);
    expect(asset.assetContract.name).toBe("CryptoKittiesRinkeby");
    expect(asset.collection.openseaSellerFeeBasisPoints).toEqual(
      CK_RINKEBY_SELLER_FEE
    );
  });

  // test("API fetches assets", async () => {
  //   const { assets } = await apiToTest.getAssets({
  //     asset_contract_address: CK_RINKEBY_ADDRESS,
  //     order_by: "current_price",
  //   });
  //   assert.isArray(assets);
  //   assert.equal(assets.length, apiToTest.pageSize);

  //   const asset = assets[0];
  //   assert.equal(asset.assetContract.name, "CryptoKittiesRinkeby");
  // });

  // test("API handles errors", async () => {
  //   // 401 Unauthorized
  //   try {
  //     await apiToTest.get("/user");
  //   } catch (error) {
  //     assert.include(error.message, "Unauthorized");
  //   }

  //   // 404 Not found
  //   try {
  //     await apiToTest.get(`/asset/${CK_RINKEBY_ADDRESS}/0`);
  //   } catch (error) {
  //     assert.include(error.message, "Not found");
  //   }

  //   // 400 malformed
  //   const res = await apiToTest.getOrders({
  //     // Get an old order to make sure listing time is too early
  //     listed_before: Math.round(Date.now() / 1000 - 3600),
  //   });
  //   const order = res.orders[0];
  //   assert.isNotNull(order);

  //   try {
  //     const newOrder = {
  //       ...orderToJSON(order),
  //       v: 1,
  //       r: "",
  //       s: "",
  //     };
  //     await apiToTest.postOrder(newOrder);
  //   } catch (error) {
  //     // TODO sometimes the error is "Expected the listing time to be at or past the current time"
  //     // assert.include(error.message, "Order failed exchange validation")
  //   }
  // });

});
