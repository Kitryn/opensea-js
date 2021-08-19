import { OpenSeaPort } from "../../src/index";
import {
  Network,
  OrderSide,
  UnhashedOrder,
  Order,
  OpenSeaCollection,
  OpenSeaAsset,
  OpenSeaAssetBundle,
  FeeMethod,
  Asset,
} from "../../src/types";
import { getOrderHash } from "../../src/utils/utils";
import {
  MYTHEREUM_TOKEN_ID,
  MYTHEREUM_ADDRESS,
  CK_ADDRESS,
  CK_TOKEN_ID,
  MAINNET_API_KEY,
  ALEX_ADDRESS,
  CATS_IN_MECHS_ID,
  SPIRIT_CLASH_TOKEN_ID,
  SPIRIT_CLASH_OWNER,
  DECENTRALAND_ADDRESS,
  DECENTRALAND_ID,
  WETH_ADDRESS,
} from "../constants";
import {
  DEFAULT_BUYER_FEE_BASIS_POINTS,
  DEFAULT_MAX_BOUNTY,
  DEFAULT_SELLER_FEE_BASIS_POINTS,
  ENJIN_ADDRESS,
  ENJIN_COIN_ADDRESS,
  MAINNET_PROVIDER_URL,
  NULL_ADDRESS,
  OPENSEA_FEE_RECIPIENT,
  OPENSEA_SELLER_BOUNTY_BASIS_POINTS,
} from "../../src/constants";
import { BigNumber } from "@0x/utils";
import {
  APIOpenSeaCollection,
  APIOpenSeaNFTAsset,
} from "../../src/api/validators";
import { ethers } from "ethers";

const provider = new ethers.providers.JsonRpcProvider(MAINNET_PROVIDER_URL);
const signer = new ethers.VoidSigner(
  "0x000000000000000000000000000000000000dEaD",
  provider
);

const client = new OpenSeaPort(
  signer,
  {
    networkName: Network.Main,
    // apiKey: MAINNET_API_KEY,
    apiKey: "2f6f419a083c46de9d83ce3dbe7db601",
  },
  (line) => console.info(`MAINNET: ${line}`)
);

let asset: APIOpenSeaNFTAsset;
const expirationTime = Math.round(Date.now() / 1000 + 60 * 60 * 24); // one day from now

describe("seaport: fees", () => {
  beforeAll(async () => {
    const tokenId = MYTHEREUM_TOKEN_ID.toString();
    const tokenAddress = MYTHEREUM_ADDRESS;
    asset = await client.api.getAsset({ tokenAddress, tokenId });
    expect(asset).not.toBeNull();
  });

  test("Computes fees correctly for non-zero-fee asset", async () => {
    const bountyPercent = 1.5;
    const extraBountyBasisPoints = bountyPercent * 100;

    const collection = asset.collection;
    const buyerFeeBasisPoints =
      collection.openseaBuyerFeeBasisPoints + collection.devBuyerFeeBasisPoints;
    const sellerFeeBasisPoints =
      collection.openseaSellerFeeBasisPoints +
      collection.devSellerFeeBasisPoints;

    const buyerFees = await client.computeFees({
      asset,
      extraBountyBasisPoints,
      side: OrderSide.Buy,
    });
    expect(buyerFees.totalBuyerFeeBasisPoints).toEqual(buyerFeeBasisPoints);
    expect(buyerFees.totalSellerFeeBasisPoints).toEqual(sellerFeeBasisPoints);
    expect(buyerFees.devBuyerFeeBasisPoints).toEqual(
      collection.devBuyerFeeBasisPoints
    );
    expect(buyerFees.devSellerFeeBasisPoints).toEqual(
      collection.devSellerFeeBasisPoints
    );
    expect(buyerFees.openseaBuyerFeeBasisPoints).toEqual(
      collection.openseaBuyerFeeBasisPoints
    );
    expect(buyerFees.openseaSellerFeeBasisPoints).toEqual(
      collection.openseaSellerFeeBasisPoints
    );
    expect(buyerFees.sellerBountyBasisPoints).toEqual(0);

    const sellerFees = await client.computeFees({
      asset,
      extraBountyBasisPoints,
      side: OrderSide.Sell,
    });
    expect(sellerFees.totalBuyerFeeBasisPoints).toEqual(buyerFeeBasisPoints);
    expect(sellerFees.totalSellerFeeBasisPoints).toEqual(sellerFeeBasisPoints);
    expect(sellerFees.devBuyerFeeBasisPoints).toEqual(
      collection.devBuyerFeeBasisPoints
    );
    expect(sellerFees.devSellerFeeBasisPoints).toEqual(
      collection.devSellerFeeBasisPoints
    );
    expect(sellerFees.openseaBuyerFeeBasisPoints).toEqual(
      collection.openseaBuyerFeeBasisPoints
    );
    expect(sellerFees.openseaSellerFeeBasisPoints).toEqual(
      collection.openseaSellerFeeBasisPoints
    );
    expect(sellerFees.sellerBountyBasisPoints).toEqual(extraBountyBasisPoints);

    const heterogenousBundleSellerFees = await client.computeFees({
      extraBountyBasisPoints,
      side: OrderSide.Sell,
    });
    expect(heterogenousBundleSellerFees.totalBuyerFeeBasisPoints).toEqual(
      DEFAULT_BUYER_FEE_BASIS_POINTS
    );
    expect(heterogenousBundleSellerFees.totalSellerFeeBasisPoints).toEqual(
      DEFAULT_SELLER_FEE_BASIS_POINTS
    );
    expect(heterogenousBundleSellerFees.devBuyerFeeBasisPoints).toEqual(0);
    expect(heterogenousBundleSellerFees.devSellerFeeBasisPoints).toEqual(0);
    expect(heterogenousBundleSellerFees.openseaBuyerFeeBasisPoints).toEqual(
      DEFAULT_BUYER_FEE_BASIS_POINTS
    );
    expect(heterogenousBundleSellerFees.openseaSellerFeeBasisPoints).toEqual(
      DEFAULT_SELLER_FEE_BASIS_POINTS
    );
    expect(heterogenousBundleSellerFees.sellerBountyBasisPoints).toEqual(
      extraBountyBasisPoints
    );

    const privateSellerFees = await client.computeFees({
      asset,
      extraBountyBasisPoints,
      side: OrderSide.Sell,
      isPrivate: true,
    });
    expect(privateSellerFees.totalBuyerFeeBasisPoints).toEqual(0);
    expect(privateSellerFees.totalSellerFeeBasisPoints).toEqual(0);
    expect(privateSellerFees.devBuyerFeeBasisPoints).toEqual(0);
    expect(privateSellerFees.devSellerFeeBasisPoints).toEqual(0);
    expect(privateSellerFees.openseaBuyerFeeBasisPoints).toEqual(0);
    expect(privateSellerFees.openseaSellerFeeBasisPoints).toEqual(0);
    expect(privateSellerFees.sellerBountyBasisPoints).toEqual(0);

    const privateBuyerFees = await client.computeFees({
      asset,
      extraBountyBasisPoints,
      side: OrderSide.Buy,
      isPrivate: true,
    });
    expect(privateBuyerFees.totalBuyerFeeBasisPoints).toEqual(0);
    expect(privateBuyerFees.totalSellerFeeBasisPoints).toEqual(0);
    expect(privateBuyerFees.devBuyerFeeBasisPoints).toEqual(0);
    expect(privateBuyerFees.devSellerFeeBasisPoints).toEqual(0);
    expect(privateBuyerFees.openseaBuyerFeeBasisPoints).toEqual(0);
    expect(privateBuyerFees.openseaSellerFeeBasisPoints).toEqual(0);
    expect(privateBuyerFees.sellerBountyBasisPoints).toEqual(0);
  });

  test.skip("Computes fees correctly for zero-fee asset", async () => {
    const asset = await client.api.getAsset({
      tokenAddress: DECENTRALAND_ADDRESS,
      tokenId: DECENTRALAND_ID,
    });
    const bountyPercent = 0;

    const buyerFees = await client.computeFees({
      asset,
      extraBountyBasisPoints: bountyPercent * 100,
      side: OrderSide.Buy,
    });
    expect(buyerFees.totalBuyerFeeBasisPoints).toEqual(0);
    expect(buyerFees.totalSellerFeeBasisPoints).toEqual(0);
    expect(buyerFees.devBuyerFeeBasisPoints).toEqual(0);
    expect(buyerFees.devSellerFeeBasisPoints).toEqual(0);
    expect(buyerFees.openseaBuyerFeeBasisPoints).toEqual(0);
    expect(buyerFees.openseaSellerFeeBasisPoints).toEqual(0);
    expect(buyerFees.sellerBountyBasisPoints).toEqual(0);

    const sellerFees = await client.computeFees({
      asset,
      extraBountyBasisPoints: bountyPercent * 100,
      side: OrderSide.Sell,
    });
    expect(sellerFees.totalBuyerFeeBasisPoints).toEqual(0);
    expect(sellerFees.totalSellerFeeBasisPoints).toEqual(0);
    expect(sellerFees.devBuyerFeeBasisPoints).toEqual(0);
    expect(sellerFees.devSellerFeeBasisPoints).toEqual(0);
    expect(sellerFees.openseaBuyerFeeBasisPoints).toEqual(0);
    expect(sellerFees.openseaSellerFeeBasisPoints).toEqual(0);
    expect(sellerFees.sellerBountyBasisPoints).toEqual(bountyPercent * 100);
  });

  test("Errors for computing fees correctly", async () => {
    try {
      await client.computeFees({
        asset,
        extraBountyBasisPoints: 200,
        side: OrderSide.Sell,
      });
      // assert.fail();
      throw new Error();
    } catch (error) {
      if (
        !error.message.includes("bounty exceeds the maximum") ||
        !error.message.includes("OpenSea will add")
      ) {
        // assert.fail(error.message);
        throw error;
      }
    }
  });

  test("First page of orders have valid hashes and fees", async () => {
    const { orders } = await client.api.getOrders();
    expect(orders.length).toBeGreaterThan(0);

    orders.forEach((order) => {
      if (order.asset) {
        expect(order.asset.assetContract).not.toBeNull();
        expect(order.asset.assetContract).not.toBeUndefined();

        expect(order.asset.tokenId).not.toBeFalsy();

        const _collection: APIOpenSeaCollection = {
          name: order.asset.collection.name,
          slug: order.asset.collection.slug,
          devBuyerFeeBasisPoints: order.asset.collection.devBuyerFeeBasisPoints,
          devSellerFeeBasisPoints:
            order.asset.collection.devSellerFeeBasisPoints,
          openseaBuyerFeeBasisPoints:
            order.asset.collection.openseaBuyerFeeBasisPoints,
          openseaSellerFeeBasisPoints:
            order.asset.collection.openseaSellerFeeBasisPoints,
          collectionTraits: undefined,
        };

        testFeesMakerOrder(order, _collection);
      }
      expect(order.paymentTokenContract).not.toBeNull();
      expect(order.paymentTokenContract).not.toBeUndefined();

      const accountAddress = ALEX_ADDRESS;
      const matchingOrder = client._makeMatchingOrder({
        order,
        accountAddress,
        recipientAddress: accountAddress,
      });
      const matchingOrderHash = matchingOrder.hash;

      const { hash, ..._matchingOrderWithoutHash } = matchingOrder;

      const orderHash = getOrderHash(_matchingOrderWithoutHash);
      expect(orderHash).toEqual(matchingOrderHash);
    });
  });

  test("Computes per-transfer fees correctly, Enjin and CK", async () => {
    const asset = await client.api.getAsset({
      tokenAddress: ENJIN_ADDRESS,
      tokenId: CATS_IN_MECHS_ID,
    });

    const zeroTransferFeeAsset = await client.api.getAsset({
      tokenAddress: CK_ADDRESS,
      tokenId: CK_TOKEN_ID,
    });

    const sellerFees = await client.computeFees({
      asset,
      side: OrderSide.Sell,
    });

    const sellerZeroFees = await client.computeFees({
      asset: zeroTransferFeeAsset,
      side: OrderSide.Sell,
    });

    expect(sellerZeroFees.transferFee.toString()).toEqual("0");
    expect(sellerZeroFees.transferFeeTokenAddress).toBeNull();

    expect(sellerFees.transferFee.toString()).toEqual("1000000000000000000");
    expect(sellerFees.transferFeeTokenAddress).toEqual(ENJIN_COIN_ADDRESS);
  });

  // NOTE: Enjin platform limitation:
  // the transfer fee isn't showing as whitelisted (skipped) by Enjin's method
  test.skip("Computes whitelisted Enjin per-transfer fees correctly", async () => {
    const whitelistedAsset = await client.api.getAsset({
      tokenAddress: ENJIN_ADDRESS,
      tokenId: SPIRIT_CLASH_TOKEN_ID,
    });

    const sellerZeroFees = await client.computeFees({
      asset: whitelistedAsset,
      side: OrderSide.Sell,
      accountAddress: SPIRIT_CLASH_OWNER,
    });

    expect(sellerZeroFees.transferFee.toString()).toEqual("0");
    expect(sellerZeroFees.transferFeeTokenAddress).toEqual(ENJIN_COIN_ADDRESS);
  });

  test("_getBuyFeeParameters works for assets", async () => {
    const accountAddress = ALEX_ADDRESS;
    const extraBountyBasisPoints = 0;
    const _asset: Asset = {
      tokenId: asset.tokenId.toString(),
      tokenAddress: asset.assetContract.address,
    };
    const sellOrder = await client._makeSellOrder({
      asset: _asset,
      quantity: 1,
      accountAddress,
      startAmount: 1,
      paymentTokenAddress: NULL_ADDRESS,
      extraBountyBasisPoints,
      buyerAddress: NULL_ADDRESS,
      expirationTime: 0,
      waitForHighestBid: false,
    });

    const { totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints } =
      await client.computeFees({
        asset,
        extraBountyBasisPoints,
        side: OrderSide.Buy,
      });

    const {
      makerRelayerFee,
      takerRelayerFee,
      makerProtocolFee,
      takerProtocolFee,
      makerReferrerFee,
      feeRecipient,
      feeMethod,
    } = client._getBuyFeeParameters(
      totalBuyerFeeBasisPoints,
      totalSellerFeeBasisPoints,
      sellOrder
    );

    expect(totalSellerFeeBasisPoints).toBeGreaterThan(0);

    unitTestFeesBuyOrder({
      makerRelayerFee,
      takerRelayerFee,
      makerProtocolFee,
      takerProtocolFee,
      makerReferrerFee,
      feeRecipient,
      feeMethod,
    });
  });

  test("_getBuyFeeParameters works for English auction assets", async () => {
    const accountAddress = ALEX_ADDRESS;
    const extraBountyBasisPoints = 0;
    const _asset: Asset = {
      tokenId: asset.tokenId.toString(),
      tokenAddress: asset.assetContract.address,
    };
    const sellOrder = await client._makeSellOrder({
      asset: _asset,
      quantity: 1,
      accountAddress,
      startAmount: 1,
      paymentTokenAddress: WETH_ADDRESS,
      extraBountyBasisPoints,
      buyerAddress: NULL_ADDRESS,
      expirationTime,
      waitForHighestBid: true,
    });

    const { totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints } =
      await client.computeFees({
        asset,
        extraBountyBasisPoints,
        side: OrderSide.Buy,
      });

    const {
      makerRelayerFee,
      takerRelayerFee,
      makerProtocolFee,
      takerProtocolFee,
      makerReferrerFee,
      feeRecipient,
      feeMethod,
    } = client._getBuyFeeParameters(
      totalBuyerFeeBasisPoints,
      totalSellerFeeBasisPoints,
      sellOrder
    );

    expect(totalSellerFeeBasisPoints).toBeGreaterThan(0);

    unitTestFeesBuyOrder({
      makerRelayerFee,
      takerRelayerFee,
      makerProtocolFee,
      takerProtocolFee,
      makerReferrerFee,
      feeRecipient,
      feeMethod,
    });
  });
});

function unitTestFeesBuyOrder({
  makerRelayerFee,
  takerRelayerFee,
  makerProtocolFee,
  takerProtocolFee,
  makerReferrerFee,
  feeRecipient,
  feeMethod,
}: {
  makerRelayerFee: BigNumber;
  takerRelayerFee: BigNumber;
  makerProtocolFee: BigNumber;
  takerProtocolFee: BigNumber;
  makerReferrerFee: BigNumber;
  feeRecipient: string;
  feeMethod: FeeMethod;
}) {
  expect(+makerRelayerFee).toEqual(asset.collection.openseaBuyerFeeBasisPoints);
  expect(+takerRelayerFee).toEqual(
    asset.collection.openseaSellerFeeBasisPoints
  );
  expect(+makerProtocolFee).toEqual(0);
  expect(+takerProtocolFee).toEqual(0);
  expect(+makerReferrerFee).toEqual(0);
  expect(feeRecipient).toEqual(OPENSEA_FEE_RECIPIENT);
  expect(feeMethod).toEqual(FeeMethod.SplitFee);
}

export function testFeesMakerOrder(
  order: Order | UnhashedOrder,
  collection?: APIOpenSeaCollection,
  makerBountyBPS?: number
) {
  expect(order.makerProtocolFee.toNumber()).toEqual(0);
  expect(order.takerProtocolFee.toNumber()).toEqual(0);
  if (order.waitingForBestCounterOrder) {
    expect(order.feeRecipient).toEqual(NULL_ADDRESS);
  } else {
    expect(order.feeRecipient).toEqual(OPENSEA_FEE_RECIPIENT);
  }
  if (order.taker != NULL_ADDRESS && order.side == OrderSide.Sell) {
    // Private sell order
    expect(order.makerReferrerFee.toNumber()).toEqual(0);
    expect(order.takerRelayerFee.toNumber()).toEqual(0);
    expect(order.makerRelayerFee.toNumber()).toEqual(0);
    return;
  }
  // Public order
  if (makerBountyBPS != null) {
    expect(order.makerReferrerFee.toNumber()).toEqual(makerBountyBPS);
  }
  if (collection) {
    const totalSellerFee =
      collection.devSellerFeeBasisPoints +
      collection.openseaSellerFeeBasisPoints;
    const totalBuyerFeeBasisPoints =
      collection.devBuyerFeeBasisPoints + collection.openseaBuyerFeeBasisPoints;
    // Homogenous sale
    if (order.side == OrderSide.Sell && order.waitingForBestCounterOrder) {
      // Fees may not match the contract's fees, which are changeable.
    } else if (order.side == OrderSide.Sell) {
      expect(order.makerRelayerFee.toNumber()).toEqual(totalSellerFee);
      expect(order.takerRelayerFee.toNumber()).toEqual(
        totalBuyerFeeBasisPoints
      );

      expect(order.makerRelayerFee.toNumber()).toEqual(
        collection.devSellerFeeBasisPoints +
          collection.openseaSellerFeeBasisPoints
      );

      // Check bounty
      if (
        collection.openseaSellerFeeBasisPoints >=
        OPENSEA_SELLER_BOUNTY_BASIS_POINTS
      ) {
        expect(
          OPENSEA_SELLER_BOUNTY_BASIS_POINTS + order.makerReferrerFee.toNumber()
        ).toBeLessThanOrEqual(collection.openseaSellerFeeBasisPoints);
      } else {
        // No extra bounty allowed if < 1%
        expect(order.makerReferrerFee.toNumber()).toEqual(0);
      }
    } else {
      expect(order.makerRelayerFee.toNumber()).toEqual(
        totalBuyerFeeBasisPoints
      );
      expect(order.takerRelayerFee.toNumber()).toEqual(totalSellerFee);

      expect(order.makerRelayerFee.toNumber()).toEqual(
        collection.devBuyerFeeBasisPoints +
          collection.openseaBuyerFeeBasisPoints
      );
    }
  } else {
    // Heterogenous
    if (order.side == OrderSide.Sell) {
      expect(order.makerRelayerFee.toNumber()).toEqual(
        DEFAULT_SELLER_FEE_BASIS_POINTS
      );
      expect(order.takerRelayerFee.toNumber()).toEqual(
        DEFAULT_BUYER_FEE_BASIS_POINTS
      );
      expect(
        OPENSEA_SELLER_BOUNTY_BASIS_POINTS + order.makerReferrerFee.toNumber()
      ).toBeLessThanOrEqual(DEFAULT_MAX_BOUNTY);
    } else {
      expect(order.makerRelayerFee.toNumber()).toEqual(
        DEFAULT_BUYER_FEE_BASIS_POINTS
      );
      expect(order.takerRelayerFee.toNumber()).toEqual(
        DEFAULT_SELLER_FEE_BASIS_POINTS
      );
    }
  }
}
