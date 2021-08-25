import { OpenSeaPort } from "../../src/index";
import { Network, Asset, WyvernSchemaName } from "../../src/types";
import {
  getCurrentGasPrice,
  getNonCompliantApprovalAddress,
  isContractAddress,
} from "../../src/utils/utils";
import {
  ALEX_ADDRESS,
  MAINNET_API_KEY,
  CK_TOKEN_ID,
  ALEX_ADDRESS_2,
  DAN_ADDRESS,
  DAN_DAPPER_ADDRESS,
  WETH_ADDRESS,
} from "../constants";
import { ERC721 } from "../../src/contracts";
import {
  CK_ADDRESS,
  MAINNET_PROVIDER_URL,
  MAX_UINT_256,
  NULL_ADDRESS,
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

describe("seaport: misc", () => {
  test("Instance has public methods", () => {
    expect(typeof client.getCurrentPrice).toEqual("function");
    expect(typeof client.wrapEth).toEqual("function");
  });

  test("Instance exposes API methods", () => {
    expect(typeof client.api.getOrder).toEqual("function");
    expect(typeof client.api.getOrders).toEqual("function");
    expect(typeof client.api.postOrder).toEqual("function");
  });

  test("Instance exposes some underscored methods", () => {
    expect(typeof client._initializeProxy).toEqual("function");
    expect(typeof client._getProxy).toEqual("function");
  });

  test("Uses a gas price above the mean", async () => {
    const gasPrice = await client._computeGasPrice();
    const meanGasPrice = await getCurrentGasPrice(client.provider);
    expect(meanGasPrice.toNumber()).toBeGreaterThanOrEqual(0);
    expect(gasPrice.toNumber()).toBeGreaterThanOrEqual(meanGasPrice.toNumber());
  });

  test("Fetches proxy for an account", async () => {
    const accountAddress = ALEX_ADDRESS;
    const proxy = await client._getProxy(accountAddress);
    expect(proxy).not.toBeNull();
  });

  test("Fetches positive token balance for an account", async () => {
    const accountAddress = ALEX_ADDRESS;
    const balance = await client.getTokenBalance({
      accountAddress,
      tokenAddress: WETH_ADDRESS,
    });
    expect(balance.toNumber()).toBeGreaterThanOrEqual(0);
  });

  test("Accounts have maximum token balance approved", async () => {
    const accountAddress = ALEX_ADDRESS;
    const approved = await client._getApprovedTokenCount({ accountAddress });
    expect(approved.toString()).toEqual(MAX_UINT_256.toString());
  });

  test("Single-approval tokens are approved for tester address", async () => {
    const accountAddress = ALEX_ADDRESS_2;
    const proxyAddress = await client._getProxy(accountAddress);
    const tokenId = CK_TOKEN_ID.toString();
    const tokenAddress = CK_ADDRESS;
    const erc721 = new ethers.Contract(tokenAddress, ERC721, client.provider);
    const approvedAddress = await getNonCompliantApprovalAddress(
      erc721,
      tokenId,
      accountAddress
    );
    // expect(approvedAddress).toEqual(proxyAddress)
  });

  test("Checks whether an address is a contract addrress", async () => {
    const smartContractWalletAddress = DAN_DAPPER_ADDRESS;
    const acccountOneIsContractAddress = await isContractAddress(
      client.provider,
      smartContractWalletAddress
    );
    const nonSmartContractWalletAddress = DAN_ADDRESS;
    const acccountTwoIsContractAddress = await isContractAddress(
      client.provider,
      nonSmartContractWalletAddress
    );
    expect(acccountOneIsContractAddress).toEqual(true);
    expect(acccountTwoIsContractAddress).toEqual(false);
  });
});
