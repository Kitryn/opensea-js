import { OpenSeaPort } from "../../src/index";
import {
  Network,
  OrderJSON,
  OrderSide,
  Order,
  SaleKind,
  UnhashedOrder,
  UnsignedOrder,
  Asset,
  WyvernSchemaName,
} from "../../src/types";
import {
  orderFromJSON,
  getOrderHash,
  estimateCurrentPrice,
  assignOrdersToSides,
  makeBigNumber,
} from "../../src/utils/utils";
import * as ordersJSONFixture from "../fixtures/orders.json";
import { BigNumber } from "@0x/utils";
import {
  ALEX_ADDRESS,
  CRYPTO_CRYSTAL_ADDRESS,
  DIGITAL_ART_CHAIN_ADDRESS,
  DIGITAL_ART_CHAIN_TOKEN_ID,
  MYTHEREUM_TOKEN_ID,
  MYTHEREUM_ADDRESS,
  CK_ADDRESS,
  DEVIN_ADDRESS,
  ALEX_ADDRESS_2,
  CK_TOKEN_ID,
  MAINNET_API_KEY,
  RINKEBY_API_KEY,
  CK_RINKEBY_ADDRESS,
  CK_RINKEBY_TOKEN_ID,
  CATS_IN_MECHS_ID,
  CRYPTOFLOWERS_CONTRACT_ADDRESS_WITH_BUYER_FEE,
  DISSOLUTION_TOKEN_ID,
  ENS_HELLO_NAME,
  ENS_HELLO_TOKEN_ID,
  ENS_RINKEBY_TOKEN_ADDRESS,
  ENS_RINKEBY_SHORT_NAME_OWNER,
  WETH_ADDRESS,
} from "../constants";
import { testFeesMakerOrder } from "./fees.test";
import {
  ENJIN_ADDRESS,
  INVERSE_BASIS_POINT,
  MAINNET_PROVIDER_URL,
  NULL_ADDRESS,
  OPENSEA_FEE_RECIPIENT,
  RINKEBY_PROVIDER_URL,
} from "../../src/constants";
import { ethers } from "ethers";

const ordersJSON = ordersJSONFixture as any;
const englishSellOrderJSON = ordersJSON[0] as OrderJSON;

const provider = new ethers.providers.JsonRpcProvider(MAINNET_PROVIDER_URL);
const rinkebyProvider = new ethers.providers.JsonRpcProvider(
  RINKEBY_PROVIDER_URL
);
const signer = new ethers.VoidSigner(NULL_ADDRESS, provider);
const rinkebySigner = new ethers.VoidSigner(NULL_ADDRESS, rinkebyProvider);

const client = new OpenSeaPort(
  signer,
  {
    networkName: Network.Main,
    apiKey: MAINNET_API_KEY,
  },
  (line) => console.info(`MAINNET: ${line}`)
);

const rinkebyClient = new OpenSeaPort(
  rinkebySigner,
  {
    networkName: Network.Rinkeby,
    apiKey: RINKEBY_API_KEY,
  },
  (line) => console.info(`RINKEBY: ${line}`)
);

const assetsForBundleOrder = [
  { tokenId: MYTHEREUM_TOKEN_ID.toString(), tokenAddress: MYTHEREUM_ADDRESS },
  {
    tokenId: DIGITAL_ART_CHAIN_TOKEN_ID.toString(),
    tokenAddress: DIGITAL_ART_CHAIN_ADDRESS,
  },
];

const assetsForBulkTransfer = assetsForBundleOrder;

let manaAddress: string;
let daiAddress: string;

describe("seaport: orders", () => {
  beforeAll(async () => {
    daiAddress = (await client.api.getPaymentTokens({ symbol: "DAI" }))
      .tokens[0].address;
    manaAddress = (await client.api.getPaymentTokens({ symbol: "MANA" }))
      .tokens[0].address;
  });

  ordersJSON.map((orderJSON: OrderJSON, index: number) => {
    test("Order #" + index + " has correct types", () => {
      const order = orderFromJSON(orderJSON);
      expect(order.basePrice).toBeInstanceOf(BigNumber);
      expect(typeof order.hash).toEqual("string");
      expect(typeof order.maker).toEqual("string");
      expect(+order.quantity).toEqual(1);
    });
  });

  ordersJSON.map((orderJSON: OrderJSON, index: number) => {
    test("Order #" + index + " has correct hash", () => {
      const order = orderFromJSON(orderJSON);
      expect(order.hash).toEqual(getOrderHash(order));
    });
  });

  test("Correctly sets decimals on fungible order", async () => {
    const accountAddress = ALEX_ADDRESS;
    const tokenId = DISSOLUTION_TOKEN_ID.toString();
    const tokenAddress = ENJIN_ADDRESS;
    const quantity = 1;
    const decimals = 2;

    const order = await client._makeSellOrder({
      asset: {
        tokenAddress,
        tokenId,
        decimals,
        schemaName: WyvernSchemaName.ERC1155,
      },
      quantity,
      accountAddress,
      startAmount: 2,
      extraBountyBasisPoints: 0,
      buyerAddress: NULL_ADDRESS,
      expirationTime: 0,
      paymentTokenAddress: NULL_ADDRESS,
      waitForHighestBid: false,
    });

    expect(order.quantity.toNumber()).toEqual(
      quantity * Math.pow(10, decimals)
    );
  });

  test("Correctly errors for invalid sell order price parameters", async () => {
    const accountAddress = ALEX_ADDRESS;
    const expirationTime = Math.round(Date.now() / 1000 + 60); // one minute from now
    const paymentTokenAddress = manaAddress;
    const tokenId = MYTHEREUM_TOKEN_ID.toString();
    const tokenAddress = MYTHEREUM_ADDRESS;

    try {
      await client._makeSellOrder({
        asset: { tokenAddress, tokenId },
        quantity: 1,
        accountAddress,
        startAmount: 2,
        extraBountyBasisPoints: 0,
        buyerAddress: NULL_ADDRESS,
        expirationTime: 0,
        paymentTokenAddress,
        waitForHighestBid: true,
      });
      throw new Error();
    } catch (error) {
      expect(error.message).toMatch(
        "English auctions must have an expiration time"
      );
    }

    try {
      await client._makeSellOrder({
        asset: { tokenAddress, tokenId },
        quantity: 1,
        accountAddress,
        startAmount: 2,
        endAmount: 1, // Allow declining minimum bid
        extraBountyBasisPoints: 0,
        buyerAddress: NULL_ADDRESS,
        expirationTime,
        paymentTokenAddress: NULL_ADDRESS,
        waitForHighestBid: true,
      });
      throw new Error();
    } catch (error) {
      expect(error.message).toMatch("English auctions must use wrapped ETH");
    }

    try {
      await client._makeSellOrder({
        asset: { tokenAddress, tokenId },
        quantity: 1,
        accountAddress,
        startAmount: 2,
        endAmount: 3,
        extraBountyBasisPoints: 0,
        buyerAddress: NULL_ADDRESS,
        expirationTime,
        paymentTokenAddress: NULL_ADDRESS,
        waitForHighestBid: false,
      });
      throw new Error();
    } catch (error) {
      expect(error.message).toMatch(
        "End price must be less than or equal to the start price"
      );
    }

    try {
      await client._makeSellOrder({
        asset: { tokenAddress, tokenId },
        quantity: 1,
        accountAddress,
        startAmount: 2,
        endAmount: 1,
        extraBountyBasisPoints: 0,
        buyerAddress: NULL_ADDRESS,
        expirationTime: 0,
        paymentTokenAddress: NULL_ADDRESS,
        waitForHighestBid: false,
      });
      throw new Error();
    } catch (error) {
      expect(error.message).toMatch(
        "Expiration time must be set if order will change in price"
      );
    }

    try {
      await client._makeSellOrder({
        asset: { tokenAddress, tokenId },
        quantity: 1,
        accountAddress,
        startAmount: 2,
        listingTime: Math.round(Date.now() / 1000 - 60),
        extraBountyBasisPoints: 0,
        buyerAddress: NULL_ADDRESS,
        expirationTime: 0,
        paymentTokenAddress: NULL_ADDRESS,
        waitForHighestBid: false,
      });
      throw new Error();
    } catch (error) {
      expect(error.message).toMatch("Listing time cannot be in the past");
    }

    try {
      await client._makeSellOrder({
        asset: { tokenAddress, tokenId },
        quantity: 1,
        accountAddress,
        startAmount: 2,
        listingTime: Math.round(Date.now() / 1000 + 20),
        extraBountyBasisPoints: 0,
        buyerAddress: NULL_ADDRESS,
        expirationTime,
        paymentTokenAddress,
        waitForHighestBid: true,
      });
      throw new Error();
    } catch (error) {
      expect(error.message).toMatch(
        "Cannot schedule an English auction for the future"
      );
    }

    try {
      await client._makeSellOrder({
        asset: { tokenAddress, tokenId },
        quantity: 1,
        accountAddress,
        startAmount: 2,
        extraBountyBasisPoints: 0,
        buyerAddress: NULL_ADDRESS,
        expirationTime,
        paymentTokenAddress,
        waitForHighestBid: false,
        englishAuctionReservePrice: 1,
      });
      throw new Error();
    } catch (error) {
      expect(error.message).toMatch(
        "Reserve prices may only be set on English auctions"
      );
    }

    try {
      await client._makeSellOrder({
        asset: { tokenAddress, tokenId },
        quantity: 1,
        accountAddress,
        startAmount: 2,
        extraBountyBasisPoints: 0,
        buyerAddress: NULL_ADDRESS,
        expirationTime,
        paymentTokenAddress,
        waitForHighestBid: true,
        englishAuctionReservePrice: 1,
      });
      throw new Error();
    } catch (error) {
      expect(error.message).toMatch(
        "Reserve price must be greater than or equal to the start amount"
      );
    }
  });

  test("Correctly errors for invalid buy order price parameters", async () => {
    const accountAddress = ALEX_ADDRESS_2;
    const expirationTime = Math.round(Date.now() / 1000 + 60); // one minute from now
    const tokenId = MYTHEREUM_TOKEN_ID.toString();
    const tokenAddress = MYTHEREUM_ADDRESS;

    try {
      await client._makeBuyOrder({
        asset: { tokenAddress, tokenId },
        quantity: 1,
        accountAddress,
        startAmount: 2,
        extraBountyBasisPoints: 0,
        expirationTime,
        paymentTokenAddress: NULL_ADDRESS,
      });
      throw new Error();
    } catch (error) {
      expect(error.message).toMatch(
        "Offers must use wrapped ETH or an ERC-20 token"
      );
    }
  });

  test("Cannot yet match a new English auction sell order, bountied", async () => {
    const accountAddress = ALEX_ADDRESS;
    const takerAddress = ALEX_ADDRESS_2;
    const amountInToken = 1.2;
    const paymentTokenAddress = WETH_ADDRESS;
    const expirationTime = Math.round(Date.now() / 1000 + 60); // one minute from now
    const bountyPercent = 1.1;

    const tokenId = MYTHEREUM_TOKEN_ID.toString();
    const tokenAddress = MYTHEREUM_ADDRESS;

    const asset = await client.api.getAsset({ tokenAddress, tokenId });

    const order = await client._makeSellOrder({
      asset: { tokenAddress, tokenId },
      quantity: 1,
      accountAddress,
      startAmount: amountInToken,
      paymentTokenAddress,
      extraBountyBasisPoints: bountyPercent * 100,
      buyerAddress: NULL_ADDRESS,
      expirationTime,
      waitForHighestBid: true,
    });

    expect(order.taker).toEqual(NULL_ADDRESS);
    expect(order.basePrice.toNumber()).toEqual(
      Math.pow(10, 18) * amountInToken
    );
    expect(order.extra.toNumber()).toEqual(0);
    // Make sure there's gap time to expire it
    expect(order.expirationTime.toNumber()).toEqual(expirationTime);
    // Make sure it's listed in the future
    expect(order.listingTime.toNumber()).toEqual(expirationTime);

    await client._sellOrderValidationAndApprovals({ order, accountAddress });
    // Make sure match is impossible
    try {
      await testMatchingNewOrder(order, takerAddress, expirationTime + 100);
      throw new Error();
    } catch (error) {
      expect(error.message).toMatch(
        "Buy-side order is set in the future or expired"
      );
    }
  });

  test.skip("Can match a finished English auction sell order", async () => {
    const makerAddress = ALEX_ADDRESS_2;
    const takerAddress = ALEX_ADDRESS;
    const matcherAddress = DEVIN_ADDRESS;
    const now = Math.round(Date.now() / 1000);
    // Get bid from server
    const paymentTokenAddress = WETH_ADDRESS;
    const { orders } = await rinkebyClient.api.getOrders({
      side: OrderSide.Buy,
      asset_contract_address: CK_RINKEBY_ADDRESS,
      token_id: CK_RINKEBY_TOKEN_ID,
      payment_token_address: paymentTokenAddress,
      maker: makerAddress,
    });
    const buy = orders[0];

    expect(buy).toBeDefined();
    expect(buy.asset).toBeDefined();
    if (!buy || !buy.asset) {
      return;
    }
    // Make sure it's listed in the past
    expect(buy.listingTime.toNumber()).toBeLessThan(now);
    testFeesMakerOrder(buy, buy.asset.collection);

    const sell = orderFromJSON(englishSellOrderJSON);
    expect(+sell.quantity).toEqual(1);
    expect(sell.feeRecipient).toEqual(NULL_ADDRESS);
    expect(sell.paymentToken).toEqual(paymentTokenAddress);

    /* Requirements in Wyvern contract for funds transfer. */
    expect(buy.takerRelayerFee.toNumber()).toBeLessThanOrEqual(
      sell.takerRelayerFee.toNumber()
    );
    expect(buy.takerProtocolFee.toNumber()).toBeLessThanOrEqual(
      sell.takerProtocolFee.toNumber()
    );
    const sellPrice = await rinkebyClient.getCurrentPrice(sell);
    const buyPrice = await rinkebyClient.getCurrentPrice(buy);
    expect(buyPrice.toNumber()).toBeGreaterThanOrEqual(sellPrice.toNumber());
    console.info(
      `Matching two orders that differ in price by ${
        buyPrice.toNumber() - sellPrice.toNumber()
      }`
    );

    await rinkebyClient._buyOrderValidationAndApprovals({
      order: buy,
      accountAddress: makerAddress,
    });
    await rinkebyClient._sellOrderValidationAndApprovals({
      order: sell,
      accountAddress: takerAddress,
    });

    const gas = await rinkebyClient._estimateGasForMatch({
      buy,
      sell,
      accountAddress: matcherAddress,
    });
    expect(gas || 0).toBeGreaterThan(0);
    console.info(`Match gas cost: ${gas}`);
  });

  test("Ensures buy order compatibility with an English sell order", async () => {
    const accountAddress = ALEX_ADDRESS_2;
    const takerAddress = ALEX_ADDRESS;
    const paymentTokenAddress = WETH_ADDRESS;
    const amountInToken = 0.01;
    const expirationTime = Math.round(Date.now() / 1000 + 60 * 60 * 24); // one day from now
    const extraBountyBasisPoints = 1.1 * 100;

    const tokenId = MYTHEREUM_TOKEN_ID.toString();
    const tokenAddress = MYTHEREUM_ADDRESS;

    const asset = await client.api.getAsset({ tokenAddress, tokenId });

    const sellOrder = await client._makeSellOrder({
      asset: { tokenAddress, tokenId },
      quantity: 1,
      accountAddress: takerAddress,
      startAmount: amountInToken,
      paymentTokenAddress,
      expirationTime,
      extraBountyBasisPoints,
      buyerAddress: NULL_ADDRESS,
      waitForHighestBid: true,
    });

    const buyOrder = await client._makeBuyOrder({
      asset: { tokenAddress, tokenId, schemaName: WyvernSchemaName.ERC721 },
      quantity: 1,
      accountAddress,
      paymentTokenAddress,
      startAmount: amountInToken,
      expirationTime: 0,
      extraBountyBasisPoints: 0,
      sellOrder,
    });

    testFeesMakerOrder(buyOrder, asset.collection);
    expect(sellOrder.taker).toEqual(NULL_ADDRESS);
    expect(buyOrder.taker).toEqual(sellOrder.maker);
    expect(buyOrder.makerRelayerFee.toNumber()).toEqual(
      sellOrder.makerRelayerFee.toNumber()
    );
    expect(buyOrder.takerRelayerFee.toNumber()).toEqual(
      sellOrder.takerRelayerFee.toNumber()
    );
    expect(buyOrder.makerProtocolFee.toNumber()).toEqual(
      sellOrder.makerProtocolFee.toNumber()
    );
    expect(buyOrder.takerProtocolFee.toNumber()).toEqual(
      sellOrder.takerProtocolFee.toNumber()
    );

    await client._buyOrderValidationAndApprovals({
      order: buyOrder,
      accountAddress,
    });
    await client._sellOrderValidationAndApprovals({
      order: sellOrder,
      accountAddress: takerAddress,
    });
  });

  test.skip("Creates ENS name buy order", async () => {
    const paymentTokenAddress = WETH_ADDRESS;
    const buyOrder = await rinkebyClient._makeBuyOrder({
      asset: {
        tokenId: ENS_HELLO_TOKEN_ID,
        tokenAddress: ENS_RINKEBY_TOKEN_ADDRESS,
        name: ENS_HELLO_NAME,
        schemaName: WyvernSchemaName.ENSShortNameAuction,
      },
      quantity: 1,
      accountAddress: ENS_RINKEBY_SHORT_NAME_OWNER,
      paymentTokenAddress,
      startAmount: 0.01,
      expirationTime: Math.round(Date.now() / 1000 + 60 * 60 * 24), // one day from now
      extraBountyBasisPoints: 0,
    });
    // TODO (joshuawu): Fill this test out after backend supports ENS short names.
    // expect(buyOrder).toEqual({})
  });

  test("Matches a private sell order, doesn't for wrong taker", async () => {
    const accountAddress = ALEX_ADDRESS;
    const takerAddress = ALEX_ADDRESS_2;
    const amountInToken = 2;
    const bountyPercent = 0;

    const tokenId = MYTHEREUM_TOKEN_ID.toString();
    const tokenAddress = MYTHEREUM_ADDRESS;

    const asset = await client.api.getAsset({ tokenAddress, tokenId });

    const order = await client._makeSellOrder({
      asset: { tokenAddress, tokenId },
      quantity: 1,
      accountAddress,
      startAmount: amountInToken,
      extraBountyBasisPoints: bountyPercent * 100,
      buyerAddress: takerAddress,
      expirationTime: 0,
      paymentTokenAddress: NULL_ADDRESS,
      waitForHighestBid: false,
    });

    expect(order.paymentToken).toEqual(NULL_ADDRESS);
    expect(order.basePrice.toNumber()).toEqual(
      Math.pow(10, 18) * amountInToken
    );
    expect(order.extra.toNumber()).toEqual(0);
    expect(order.expirationTime.toNumber()).toEqual(0);
    testFeesMakerOrder(order, asset.collection, bountyPercent * 100);

    await client._sellOrderValidationAndApprovals({ order, accountAddress });
    // Make sure match is valid
    await testMatchingNewOrder(order, takerAddress);
    // Make sure no one else can take it
    try {
      await testMatchingNewOrder(order, DEVIN_ADDRESS);
    } catch (e) {
      // It works!
      return;
    }
    throw new Error();
  });

  test("Matches a new dutch sell order of a small amount of ERC-20 item (DAI) for ETH", async () => {
    const accountAddress = ALEX_ADDRESS;
    const takerAddress = ALEX_ADDRESS_2;
    const amountInEth = 0.012;

    const tokenId = null;
    const tokenAddress = daiAddress;
    const expirationTime = Math.round(Date.now() / 1000 + 60 * 60 * 24);

    const order = await client._makeSellOrder({
      asset: { tokenAddress, tokenId, schemaName: WyvernSchemaName.ERC20 },
      quantity: Math.pow(10, 18) * 0.01,
      accountAddress,
      startAmount: amountInEth,
      endAmount: 0,
      paymentTokenAddress: NULL_ADDRESS,
      extraBountyBasisPoints: 0,
      buyerAddress: NULL_ADDRESS,
      expirationTime, // one day from now,
      waitForHighestBid: false,
    });

    expect(order.basePrice.toNumber()).toEqual(Math.pow(10, 18) * amountInEth);
    expect(order.extra.toNumber()).toEqual(Math.pow(10, 18) * amountInEth);
    expect(order.expirationTime.toNumber()).toEqual(expirationTime);

    await client._sellOrderValidationAndApprovals({ order, accountAddress });
    // Make sure match is valid
    await testMatchingNewOrder(order, takerAddress);
  });

  test("Matches a new sell order of an 1155 item for ETH", async () => {
    const accountAddress = ALEX_ADDRESS;
    const takerAddress = ALEX_ADDRESS_2;
    const amountInEth = 2;

    const tokenId = CATS_IN_MECHS_ID;
    const tokenAddress = ENJIN_ADDRESS;

    const asset = await client.api.getAsset({ tokenAddress, tokenId });

    const order = await client._makeSellOrder({
      asset: { tokenAddress, tokenId, schemaName: WyvernSchemaName.ERC1155 },
      quantity: 1,
      accountAddress,
      startAmount: amountInEth,
      paymentTokenAddress: NULL_ADDRESS,
      extraBountyBasisPoints: 0,
      buyerAddress: NULL_ADDRESS,
      expirationTime: 0,
      waitForHighestBid: false,
    });

    expect(order.basePrice.toNumber()).toEqual(Math.pow(10, 18) * amountInEth);
    expect(order.extra.toNumber()).toEqual(0);
    expect(order.expirationTime.toNumber()).toEqual(0);
    testFeesMakerOrder(order, asset.collection);

    await client._sellOrderValidationAndApprovals({ order, accountAddress });
    // Make sure match is valid
    await testMatchingNewOrder(order, takerAddress);
  });

  test("Matches a buy order of an 1155 item for W-ETH", async () => {
    const accountAddress = ALEX_ADDRESS_2;
    const takerAddress = ALEX_ADDRESS;
    const paymentToken = WETH_ADDRESS;
    const amountInToken = 0.01;

    const tokenId = DISSOLUTION_TOKEN_ID;
    const tokenAddress = ENJIN_ADDRESS;

    const asset = await client.api.getAsset({ tokenAddress, tokenId });

    const order = await client._makeBuyOrder({
      asset: { tokenAddress, tokenId, schemaName: WyvernSchemaName.ERC1155 },
      quantity: 1,
      accountAddress,
      startAmount: amountInToken,
      paymentTokenAddress: paymentToken,
      expirationTime: 0,
      extraBountyBasisPoints: 0,
    });

    expect(order.taker).toEqual(NULL_ADDRESS);
    expect(order.paymentToken).toEqual(paymentToken);
    expect(order.basePrice.toNumber()).toEqual(
      Math.pow(10, 18) * amountInToken
    );
    expect(order.extra.toNumber()).toEqual(0);
    expect(order.expirationTime.toNumber()).toEqual(0);
    testFeesMakerOrder(order, asset.collection);

    await client._buyOrderValidationAndApprovals({ order, accountAddress });
    // Make sure match is valid
    await testMatchingNewOrder(order, takerAddress);
  });

  test("Matches a new bountied sell order for an ERC-20 token (MANA)", async () => {
    const accountAddress = ALEX_ADDRESS;
    const takerAddress = ALEX_ADDRESS_2;
    const paymentToken = (await client.api.getPaymentTokens({ symbol: "MANA" }))
      .tokens[0];
    const amountInToken = 5000;
    const bountyPercent = 1;

    const tokenId = MYTHEREUM_TOKEN_ID.toString();
    const tokenAddress = MYTHEREUM_ADDRESS;

    const asset = await client.api.getAsset({ tokenAddress, tokenId });

    const order = await client._makeSellOrder({
      asset: { tokenAddress, tokenId },
      quantity: 1,
      accountAddress,
      startAmount: amountInToken,
      paymentTokenAddress: paymentToken.address,
      extraBountyBasisPoints: bountyPercent * 100,
      buyerAddress: NULL_ADDRESS, // Check that null doesn't trigger private orders
      expirationTime: 0,
      waitForHighestBid: false,
    });

    expect(order.paymentToken).toEqual(paymentToken.address);
    expect(order.basePrice.toNumber()).toEqual(
      Math.pow(10, paymentToken.decimals) * amountInToken
    );
    expect(order.extra.toNumber()).toEqual(0);
    expect(order.expirationTime.toNumber()).toEqual(0);
    testFeesMakerOrder(order, asset.collection, bountyPercent * 100);

    await client._sellOrderValidationAndApprovals({ order, accountAddress });
    // Make sure match is valid
    await testMatchingNewOrder(order, takerAddress);
  });

  test("Matches a buy order with an ERC-20 token (DAI)", async () => {
    const accountAddress = ALEX_ADDRESS;
    const takerAddress = ALEX_ADDRESS_2;
    const paymentToken = (await client.api.getPaymentTokens({ symbol: "DAI" }))
      .tokens[0];
    const amountInToken = 3;

    const tokenId = CK_TOKEN_ID.toString();
    const tokenAddress = CK_ADDRESS;

    const asset = await client.api.getAsset({ tokenAddress, tokenId });

    const order = await client._makeBuyOrder({
      asset: { tokenAddress, tokenId },
      quantity: 1,
      accountAddress,
      startAmount: amountInToken,
      paymentTokenAddress: paymentToken.address,
      expirationTime: 0,
      extraBountyBasisPoints: 0,
    });

    expect(order.taker).toEqual(NULL_ADDRESS);
    expect(order.paymentToken).toEqual(paymentToken.address);
    expect(order.basePrice.toNumber()).toEqual(
      Math.pow(10, paymentToken.decimals) * amountInToken
    );
    expect(order.extra.toNumber()).toEqual(0);
    expect(order.expirationTime.toNumber()).toEqual(0);
    testFeesMakerOrder(order, asset.collection);

    await client._buyOrderValidationAndApprovals({ order, accountAddress });
    // Make sure match is valid
    await testMatchingNewOrder(order, takerAddress);
  });

  test("Serializes payment token and matches most recent ERC-20 sell order", async () => {
    const takerAddress = ALEX_ADDRESS;

    const order = await client.api.getOrder({
      side: OrderSide.Sell,
      payment_token_address: manaAddress,
    });

    expect(order.paymentTokenContract).not.toBeNull();
    if (!order.paymentTokenContract) {
      return;
    }
    expect(order.paymentTokenContract.address).toEqual(manaAddress);
    expect(order.paymentToken).toEqual(manaAddress);
    // TODO why can't we test atomicMatch?
    await testMatchingOrder(order, takerAddress, false);
  });

  test("Bulk transfer", async () => {
    const accountAddress = ALEX_ADDRESS;
    const takerAddress = ALEX_ADDRESS_2;

    const gas = await client._estimateGasForTransfer({
      assets: assetsForBulkTransfer,
      fromAddress: accountAddress,
      toAddress: takerAddress,
    });

    expect(gas).toBeGreaterThan(0);
  });

  test("Fungible tokens filter", async () => {
    const manaTokens = (await client.api.getPaymentTokens({ symbol: "MANA" }))
      .tokens;
    expect(manaTokens.length).toEqual(1);
    const mana = manaTokens[0];
    expect(mana).not.toBeNull();
    expect(mana.name).toEqual("Decentraland MANA");
    expect(mana.address).toEqual("0x0f5d2fb29fb7d3cfee444a200298f468908cc942");
    expect(mana.decimals).toEqual(18);

    const dai = (await client.api.getPaymentTokens({ symbol: "DAI" }))
      .tokens[0];
    expect(dai).not.toBeNull();
    expect(dai.name).toEqual("Dai Stablecoin");
    expect(dai.decimals).toEqual(18);

    const all = await client.api.getPaymentTokens();
    expect(all.tokens.length).toBeGreaterThan(0);
  });

  test("orderToJSON computes correct current price for Dutch auctions", async () => {
    const { orders } = await client.api.getOrders({
      sale_kind: SaleKind.DutchAuction,
    });
    expect(orders.length).toEqual(client.api.pageSize);
    orders.map((order) => {
      expect(order.currentPrice).not.toBeNull();
      const buyerFeeBPS = order.asset
        ? order.asset.assetContract.buyerFeeBasisPoints
        : order.assetBundle && order.assetBundle.assetContract
        ? order.assetBundle.assetContract.buyerFeeBasisPoints
        : null;
      if (!order.currentPrice || buyerFeeBPS) {
        // Skip checks with buyer fees
        return;
      }
      const multiple =
        order.side == OrderSide.Sell
          ? +order.takerRelayerFee / INVERSE_BASIS_POINT + 1
          : 1;
      // Possible race condition
      expect(order.currentPrice.toPrecision(3)).toEqual(
        estimateCurrentPrice(order).toPrecision(3)
      );
      expect(order.basePrice.times(multiple).toNumber()).toBeGreaterThanOrEqual(
        order.currentPrice.toNumber()
      );
    });
  });

  test("orderToJSON current price includes buyer fee", async () => {
    const { orders } = await client.api.getOrders({
      sale_kind: SaleKind.FixedPrice,
      asset_contract_address: CRYPTOFLOWERS_CONTRACT_ADDRESS_WITH_BUYER_FEE,
      bundled: false,
      side: OrderSide.Sell,
      is_english: false,
    });
    expect(orders.length).toBeGreaterThan(0);
    orders.map((order) => {
      expect(order.currentPrice).not.toBeNull();
      expect(order.asset).not.toBeNull();
      if (!order.currentPrice || !order.asset) {
        return;
      }
      const buyerFeeBPS = order.takerRelayerFee;
      const multiple = +buyerFeeBPS / INVERSE_BASIS_POINT + 1;
      expect(order.basePrice.times(multiple).toNumber()).toEqual(
        estimateCurrentPrice(order).toNumber()
      );
    });
  });

  test("orderToJSON current price does not include buyer fee for English auctions", async () => {
    const { orders } = await client.api.getOrders({
      side: OrderSide.Sell,
      is_english: true,
    });
    expect(orders.length).toBeGreaterThan(0);
    orders.map((order) => {
      expect(order.currentPrice).not.toBeNull();
      expect(order.asset).not.toBeNull();
      if (!order.currentPrice || !order.asset) {
        return;
      }
      expect(order.basePrice.toNumber()).toEqual(
        estimateCurrentPrice(order).toNumber()
      );
    });
  });

  test.skip("Matches first buy order in book", async () => {
    const order = await client.api.getOrder({ side: OrderSide.Buy });
    expect(order).not.toBeNull();
    if (!order) {
      return;
    }
    const assetOrBundle = order.asset || order.assetBundle;
    expect(assetOrBundle).not.toBeNull();
    if (!assetOrBundle) {
      return;
    }
    const takerAddress = order.maker;
    // Taker might not have all approval permissions so only test match
    await testMatchingOrder(order, takerAddress, false);
  });

  test("Matches a buy order and estimates gas on fulfillment", async () => {
    // Need to use a taker who has created a proxy and approved W-ETH already
    const takerAddress = ALEX_ADDRESS;

    const order = await client.api.getOrder({
      side: OrderSide.Buy,
      owner: takerAddress,
      // Use a token that has already been approved via approve-all
      asset_contract_address: DIGITAL_ART_CHAIN_ADDRESS,
    });
    expect(order).not.toBeNull();
    if (!order) {
      return;
    }
    expect(order.asset).not.toBeNull();
    if (!order.asset) {
      return;
    }
    await testMatchingOrder(order, takerAddress, true);
  });

  test("Matches a referred order via sell_orders and getAssets", async () => {
    const { assets } = await client.api.getAssets({
      asset_contract_address: CRYPTO_CRYSTAL_ADDRESS,
      order_by: "current_price",
      order_direction: "desc",
    });

    const asset = assets.filter((a) => !!a.sellOrders)[0];
    expect(asset).not.toBeNull();
    if (!asset || !asset.sellOrders) {
      return;
    }

    const order = asset.sellOrders[0];
    expect(order).not.toBeNull();
    if (!order) {
      return;
    }
    // Make sure match is valid
    const takerAddress = ALEX_ADDRESS;
    const referrerAddress = ALEX_ADDRESS_2;
    await testMatchingOrder(order, takerAddress, true, referrerAddress);
  });
});

export async function testMatchingOrder(
  order: Order,
  accountAddress: string,
  testAtomicMatch = false,
  referrerAddress?: string
) {
  // Test a separate recipient for sell orders
  const recipientAddress =
    order.side === OrderSide.Sell ? ALEX_ADDRESS_2 : accountAddress;
  const matchingOrder = client._makeMatchingOrder({
    order,
    accountAddress,
    recipientAddress,
  });
  expect(matchingOrder.hash).toEqual(getOrderHash(matchingOrder));

  const { buy, sell } = assignOrdersToSides(order, matchingOrder);

  if (!order.waitingForBestCounterOrder) {
    const isValid = await client._validateMatch({ buy, sell, accountAddress });
    expect(isValid).toBe(true);
  } else {
    console.info(`English Auction detected, skipping validation`);
  }

  if (testAtomicMatch && !order.waitingForBestCounterOrder) {
    const isValid = await client._validateOrder(order);
    expect(isValid).toBe(true);
    const isFulfillable = await client.isOrderFulfillable({
      order,
      accountAddress,
      recipientAddress,
      referrerAddress,
    });
    expect(isFulfillable).toBe(true);
    const gasPrice = await client._computeGasPrice();
    console.info(
      `Gas price to use: ${ethers.utils.formatUnits(
        gasPrice.toFixed(),
        "gwei"
      )} gwei`
    );
  }
}

export async function testMatchingNewOrder(
  unhashedOrder: UnhashedOrder,
  accountAddress: string,
  counterOrderListingTime?: number
) {
  const order = {
    ...unhashedOrder,
    hash: getOrderHash(unhashedOrder),
  };

  const matchingOrder = client._makeMatchingOrder({
    order,
    accountAddress,
    recipientAddress: accountAddress,
  });
  if (counterOrderListingTime != null) {
    matchingOrder.listingTime = makeBigNumber(counterOrderListingTime);
    matchingOrder.hash = getOrderHash(matchingOrder);
  }
  expect(matchingOrder.hash).toEqual(getOrderHash(matchingOrder));

  // Test fees
  expect(matchingOrder.makerProtocolFee.toNumber()).toEqual(0);
  expect(matchingOrder.takerProtocolFee.toNumber()).toEqual(0);
  if (order.waitingForBestCounterOrder) {
    expect(matchingOrder.feeRecipient).toEqual(OPENSEA_FEE_RECIPIENT);
  } else {
    expect(matchingOrder.feeRecipient).toEqual(NULL_ADDRESS);
  }
  expect(matchingOrder.makerRelayerFee.toNumber()).toEqual(
    order.makerRelayerFee.toNumber()
  );
  expect(matchingOrder.takerRelayerFee.toNumber()).toEqual(
    order.takerRelayerFee.toNumber()
  );
  expect(matchingOrder.makerReferrerFee.toNumber()).toEqual(
    order.makerReferrerFee.toNumber()
  );

  const v = 27;
  const r = "";
  const s = "";

  let buy: Order;
  let sell: Order;
  if (order.side == OrderSide.Buy) {
    buy = {
      ...order,
      v,
      r,
      s,
    };
    sell = {
      ...matchingOrder,
      v,
      r,
      s,
    };
  } else {
    sell = {
      ...order,
      v,
      r,
      s,
    };
    buy = {
      ...matchingOrder,
      v,
      r,
      s,
    };
  }

  const isValid = await client._validateMatch({ buy, sell, accountAddress });
  expect(isValid).toBe(true);

  // Make sure assets are transferrable
  await Promise.all(
    getAssetsAndQuantities(order).map(async ({ asset, quantity }) => {
      const fromAddress = sell.maker;
      const toAddress = buy.maker;
      const useProxy =
        asset.tokenAddress === CK_ADDRESS ||
        asset.schemaName === WyvernSchemaName.ERC20;
      const isTransferrable = await client.isAssetTransferrable({
        asset,
        quantity,
        fromAddress,
        toAddress,
        useProxy,
      });
      expect(isTransferrable).toBe(true);
      // assert.isTrue(
      //   isTransferrable,
      //   `Not transferrable: ${asset.tokenAddress} # ${asset.tokenId} schema ${asset.schemaName} quantity ${quantity} from ${fromAddress} to ${toAddress} using proxy: ${useProxy}`
      // );
    })
  );
}

function getAssetsAndQuantities(
  order: Order | UnsignedOrder | UnhashedOrder
): Array<{ asset: Asset; quantity: BigNumber }> {
  const wyAssets =
    "bundle" in order.metadata
      ? order.metadata.bundle.assets
      : order.metadata.asset
      ? [order.metadata.asset]
      : [];
  const schemaNames =
    "bundle" in order.metadata && "schemas" in order.metadata.bundle
      ? order.metadata.bundle.schemas
      : "schema" in order.metadata
      ? [order.metadata.schema]
      : [];

  expect(wyAssets.length).toBeGreaterThan(0);
  expect(wyAssets.length).toEqual(schemaNames.length);

  return wyAssets.map((wyAsset, i) => {
    const asset: Asset = {
      tokenId: "id" in wyAsset && wyAsset.id != null ? wyAsset.id : null,
      tokenAddress: wyAsset.address,
      schemaName: schemaNames[i],
    };
    if ("quantity" in wyAsset) {
      return { asset, quantity: new BigNumber(wyAsset.quantity) };
    } else {
      return { asset, quantity: new BigNumber(1) };
    }
  });
}
