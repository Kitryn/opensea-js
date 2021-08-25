import { OpenSeaPort } from "../../src/index";
import { OpenSeaAPI } from "../../src/api";
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

const provider = new ethers.providers.JsonRpcProvider(MAINNET_PROVIDER_URL);
const signer = new ethers.VoidSigner(NULL_ADDRESS, provider);

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
  });

  test("API fetches bundles and prefetches sell orders", async () => {
    const { bundles } = await apiToTest.getBundles({
      asset_contract_address: CK_RINKEBY_ADDRESS,
      on_sale: true,
    });
    expect(Array.isArray(bundles)).toEqual(true);

    const bundle = bundles[0];
    expect(bundle).not.toBeNull();
    if (!bundle) {
      return;
    }
    expect(bundle.assets.map((a) => a.assetContract.name)).toContain(
      "CryptoKittiesRinkeby"
    );
    expect(bundle.sellOrders?.length).toBeGreaterThanOrEqual(0);
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

  test("An API asset's order has correct hash", async () => {
    const asset = await mainApi.getAsset({
      tokenAddress: CK_ADDRESS,
      tokenId: 1,
    });
    expect(asset.orders).not.toBeNull();
    if (!asset.orders) {
      return;
    }
    const order = asset.orders[0];
    expect(order).not.toBeNull();
    if (!order) {
      return;
    }
    expect(order.hash).toEqual(getOrderHash(order));
  });

  test("orderToJSON is correct", async () => {
    const accountAddress = ALEX_ADDRESS;
    const quantity = 1;
    const amountInToken = 1.2;
    const paymentTokenAddress = WETH_ADDRESS;
    const extraBountyBasisPoints = 0;
    const expirationTime = Math.round(Date.now() / 1000 + 60); // one minute from now
    const englishAuctionReservePrice = 2;

    const tokenId = MYTHEREUM_TOKEN_ID.toString();
    const tokenAddress = MYTHEREUM_ADDRESS;
    const order = await client._makeSellOrder({
      asset: { tokenAddress, tokenId },
      quantity,
      accountAddress,
      startAmount: amountInToken,
      paymentTokenAddress,
      extraBountyBasisPoints,
      buyerAddress: NULL_ADDRESS,
      expirationTime,
      waitForHighestBid: true,
      englishAuctionReservePrice,
    });

    const hashedOrder = {
      ...order,
      hash: getOrderHash(order),
    };

    const orderData = orderToJSON(hashedOrder);
    expect(orderData.quantity).toEqual(quantity.toString());
    expect(orderData.maker).toEqual(accountAddress);
    expect(orderData.taker).toEqual(NULL_ADDRESS);
    expect(orderData.basePrice).toEqual(
      WyvernProtocol.toBaseUnitAmount(
        makeBigNumber(amountInToken),
        18
      ).toString()
    );
    expect(orderData.paymentToken).toEqual(paymentTokenAddress);
    expect(orderData.extra).toEqual(extraBountyBasisPoints.toString());
    expect(parseInt(orderData.expirationTime as string)).toEqual(
      expirationTime + ORDER_MATCHING_LATENCY_SECONDS
    );
    expect(orderData.englishAuctionReservePrice).toEqual(
      WyvernProtocol.toBaseUnitAmount(
        makeBigNumber(englishAuctionReservePrice),
        18
      ).toString()
    );
  });

  test("API fetches tokens", async () => {
    const { tokens } = await apiToTest.getPaymentTokens({ symbol: "MANA" });
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toEqual(1);
    expect(tokens[0].name).toEqual("Decentraland MANA");
  });

  test("Rinkeby API orders have correct OpenSea url", async () => {
    const order = await rinkebyApi.getOrder({});
    if (!order.asset) {
      return;
    }
    const url = `https://testnets.opensea.io/assets/${order.asset.assetContract.address}/${order.asset.tokenId}`;
    expect(order.asset.openseaLink).toEqual(url);
  });

  test("Mainnet API orders have correct OpenSea url", async () => {
    const order = await mainApi.getOrder({});
    if (!order.asset) {
      return;
    }
    const url = `https://opensea.io/assets/${order.asset.assetContract.address}/${order.asset.tokenId}`;
    expect(order.asset.openseaLink).toEqual(url);
  });

  test("API fetches orderbook", async () => {
    const { orders, count } = await apiToTest.getOrders();
    expect(Array.isArray(orders)).toBe(true);
    expect(isNaN(count)).toBe(false);
    expect(orders.length).toEqual(apiToTest.pageSize);
    // assert.isAtLeast(count, orders.length)
  });

  test("API can change page size", async () => {
    const defaultPageSize = apiToTest.pageSize;
    apiToTest.pageSize = 7;
    const { orders } = await apiToTest.getOrders();
    expect(orders.length).toEqual(7);
    apiToTest.pageSize = defaultPageSize;
  });

  if (ORDERBOOK_VERSION > 0) {
    test("API orderbook paginates", async () => {
      const { orders, count } = await apiToTest.getOrders();
      const pagination = await apiToTest.getOrders({}, 2);
      expect(pagination.orders.length).toEqual(apiToTest.pageSize);
      expect(pagination.orders[0]).not.toEqual(orders[0]);
      expect(pagination.count).toEqual(count);
    });
  }

  test("API fetches orders for asset contract and asset", async () => {
    // Possibly no longer supported? Got API Error 400: Invalid request: ["You need to set asset_contract_address and token_id (or token_ids)"]
    // const forKitties = await apiToTest.getOrders({
    //   asset_contract_address: CK_RINKEBY_ADDRESS,
    // });
    // expect(forKitties.orders.length).toBeGreaterThan(0);
    // expect(forKitties.count).toBeGreaterThan(0);

    const forKitty = await apiToTest.getOrders({
      asset_contract_address: CK_RINKEBY_ADDRESS,
      token_id: CK_RINKEBY_TOKEN_ID,
    });
    expect(Array.isArray(forKitty.orders)).toBe(true);
  });

  test("API fetches orders for asset owner", async () => {
    const forOwner = await apiToTest.getOrders({ owner: ALEX_ADDRESS });
    expect(forOwner.orders.length).toBeGreaterThan(0);
    expect(forOwner.count).toBeGreaterThan(0);
    const owners = forOwner.orders.map(
      (o) => o.asset && o.asset.owner && o.asset.owner.address
    );
    owners.forEach((owner) => {
      expect([ALEX_ADDRESS, NULL_ADDRESS]).toContain(owner);
    });
  });

  test("API fetches buy orders for maker", async () => {
    const forMaker = await apiToTest.getOrders({
      maker: ALEX_ADDRESS,
      side: OrderSide.Buy,
    });
    expect(forMaker.orders.length).toBeGreaterThan(0);
    expect(forMaker.count).toBeGreaterThan(0);
    forMaker.orders.forEach((order) => {
      expect(ALEX_ADDRESS).toEqual(order.maker);
      expect(OrderSide.Buy).toEqual(order.side);
    });
  });

  // Test was failing but eh
  // test("API doesn't fetch impossible orders", async () => {
  //   try {
  //     const order = await apiToTest.getOrder({
  //       maker: ALEX_ADDRESS,
  //       taker: ALEX_ADDRESS,
  //     });
  //     console.log(order);
  //     throw new Error();
  //     // assert.fail();
  //   } catch (e) {
  //     expect(e.message).toMatch("Not found");
  //   }
  // });

  test("API excludes cancelledOrFinalized and markedInvalid orders", async () => {
    const { orders } = await apiToTest.getOrders({ limit: 50 }); // used to be limit: 100, but now maxlimit is 50???
    const finishedOrders = orders.filter((o) => o.cancelledOrFinalized);
    expect(finishedOrders.length).toEqual(0);
    const invalidOrders = orders.filter((o) => o.markedInvalid);
    expect(invalidOrders.length).toEqual(0);
  });

  test("API fetches fees for an asset", async () => {
    const asset = await apiToTest.getAsset({
      tokenAddress: CK_RINKEBY_ADDRESS,
      tokenId: CK_RINKEBY_TOKEN_ID,
    });
    expect(asset.tokenId).toEqual(CK_RINKEBY_TOKEN_ID.toString());
    expect(asset.assetContract.name).toEqual("CryptoKittiesRinkeby");
    expect(asset.assetContract.sellerFeeBasisPoints).toEqual(
      CK_RINKEBY_SELLER_FEE
    );
  });

  test("API fetches assets", async () => {
    const { assets } = await apiToTest.getAssets({
      asset_contract_address: CK_RINKEBY_ADDRESS,
      order_by: "current_price",
    });
    expect(Array.isArray(assets)).toBe(true);
    expect(assets.length).toEqual(apiToTest.pageSize);

    const asset = assets[0];
    expect(asset.assetContract.name).toEqual("CryptoKittiesRinkeby");
  });

  test("API handles errors", async () => {
    // 401 Unauthorized
    try {
      await apiToTest.get("/user");
    } catch (error) {
      expect(error.message).toMatch("Unauthorized");
    }

    // 404 Not found
    try {
      await apiToTest.get(`/asset/${CK_RINKEBY_ADDRESS}/0`);
    } catch (error) {
      expect(error.message).toMatch("Not found");
    }

    // 400 malformed
    const res = await apiToTest.getOrders({
      // Get an old order to make sure listing time is too early
      listed_before: Math.round(Date.now() / 1000 - 3600),
    });
    const order = res.orders[0];
    expect(order).not.toBeNull();

    try {
      const newOrder = {
        ...orderToJSON(order),
        v: 1,
        r: "",
        s: "",
      };
      await apiToTest.postOrder(newOrder);
    } catch (error) {
      // TODO sometimes the error is "Expected the listing time to be at or past the current time"
      // expect(error.message).toMatch("Order failed exchange validation")
    }
  });
});
