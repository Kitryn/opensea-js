"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenSeaPort = void 0;
const bignumber_js_1 = require("bignumber.js");
const ethereumjs_util_1 = require("ethereumjs-util");
const fbemitter_1 = require("fbemitter");
const _ = require("lodash");
const Web3 = require("web3");
const wyvern_js_1 = require("wyvern-js");
const WyvernSchemas = require("wyvern-schemas");
const api_1 = require("./api");
const constants_1 = require("./constants");
const contracts_1 = require("./contracts");
const debugging_1 = require("./debugging");
const types_1 = require("./types");
const schema_1 = require("./utils/schema");
const utils_1 = require("./utils/utils");
class OpenSeaPort {
    /**
     * Your very own seaport.
     * Create a new instance of OpenSeaJS.
     * @param provider Web3 Provider to use for transactions. For example:
     *  `const provider = new Web3.providers.HttpProvider('https://mainnet.infura.io')`
     * @param apiConfig configuration options, including `networkName`
     * @param logger logger, optional, a function that will be called with debugging
     *  information
     */
    constructor(provider, apiConfig, logger) {
        // Extra gwei to add to the mean gas price when making transactions
        this.gasPriceAddition = new bignumber_js_1.BigNumber(3);
        // Multiply gas estimate by this factor when making transactions
        this.gasIncreaseFactor = constants_1.DEFAULT_GAS_INCREASE_FACTOR;
        // API config
        apiConfig.networkName = apiConfig.networkName || types_1.Network.Main;
        apiConfig.gasPrice = apiConfig.gasPrice;
        this.api = new api_1.OpenSeaAPI(apiConfig, logger);
        this._networkName = apiConfig.networkName;
        // const readonlyProvider = new Web3.providers.HttpProvider(this._networkName == Network.Main ? MAINNET_PROVIDER_URL : RINKEBY_PROVIDER_URL)
        // We want to use our own endpoints even for the "readonly" providers. Note that this makes them no-longer readonly
        // Web3 Config
        this.web3 = new Web3(provider);
        this.web3ReadOnly = new Web3(provider);
        // WyvernJS config
        this._wyvernProtocol = new wyvern_js_1.WyvernProtocol(provider, {
            network: this._networkName,
        });
        // We want to use our own endpoints even for the "readonly" providers. Note that this makes them no-longer readonly
        // WyvernJS config for readonly (optimization for infura calls)
        this._wyvernProtocolReadOnly = new wyvern_js_1.WyvernProtocol(provider, {
            network: this._networkName,
        });
        // WrappedNFTLiquidationProxy Config
        this._wrappedNFTFactoryAddress = this._networkName == types_1.Network.Main ? constants_1.WRAPPED_NFT_FACTORY_ADDRESS_MAINNET : constants_1.WRAPPED_NFT_FACTORY_ADDRESS_RINKEBY;
        this._wrappedNFTLiquidationProxyAddress = this._networkName == types_1.Network.Main ? constants_1.WRAPPED_NFT_LIQUIDATION_PROXY_ADDRESS_MAINNET : constants_1.WRAPPED_NFT_LIQUIDATION_PROXY_ADDRESS_RINKEBY;
        this._uniswapFactoryAddress = this._networkName == types_1.Network.Main ? constants_1.UNISWAP_FACTORY_ADDRESS_MAINNET : constants_1.UNISWAP_FACTORY_ADDRESS_RINKEBY;
        // Emit events
        this._emitter = new fbemitter_1.EventEmitter();
        // Debugging: default to nothing
        this.logger = logger || ((arg) => arg);
    }
    /**
     * Add a listener to a marketplace event
     * @param event An event to listen for
     * @param listener A callback that will accept an object with event data
     * @param once Whether the listener should only be called once
     */
    addListener(event, listener, once = false) {
        const subscription = once
            ? this._emitter.once(event, listener)
            : this._emitter.addListener(event, listener);
        return subscription;
    }
    /**
     * Remove an event listener, included here for completeness.
     * Simply calls `.remove()` on a subscription
     * @param subscription The event subscription returned from `addListener`
     */
    removeListener(subscription) {
        subscription.remove();
    }
    /**
     * Remove all event listeners. Good idea to call this when you're unmounting
     * a component that listens to events to make UI updates
     * @param event Optional EventType to remove listeners for
     */
    removeAllListeners(event) {
        this._emitter.removeAllListeners(event);
    }
    /**
     * Wraps an arbirary group of NFTs into their corresponding WrappedNFT ERC20 tokens.
     * Emits the `WrapAssets` event when the transaction is prompted.
     * @param param0 __namedParameters Object
     * @param assets An array of objects with the tokenId and tokenAddress of each of the assets to bundle together.
     * @param accountAddress Address of the user's wallet
     */
    async wrapAssets({ assets, accountAddress }) {
        const schema = this._getSchema(types_1.WyvernSchemaName.ERC721);
        const wyAssets = assets.map(a => utils_1.getWyvernAsset(schema, a));
        // Separate assets out into two arrays of tokenIds and tokenAddresses
        const tokenIds = wyAssets.map(a => a.id);
        const tokenAddresses = wyAssets.map(a => a.address);
        // Check if all tokenAddresses match. If not, then we have a mixedBatch of
        // NFTs from different NFT core contracts
        const isMixedBatchOfAssets = !tokenAddresses.every((val, i, arr) => val === arr[0]);
        this._dispatch(types_1.EventType.WrapAssets, { assets: wyAssets, accountAddress });
        const txHash = await utils_1.sendRawTransaction(this.web3, {
            from: accountAddress,
            to: this._wrappedNFTLiquidationProxyAddress,
            value: 0,
            data: schema_1.encodeCall(contracts_1.getMethod(contracts_1.WrappedNFTLiquidationProxy, 'wrapNFTs'), [tokenIds, tokenAddresses, isMixedBatchOfAssets])
        }, error => {
            this._dispatch(types_1.EventType.TransactionDenied, { error, accountAddress });
        });
        await this._confirmTransaction(txHash, types_1.EventType.WrapAssets, "Wrapping Assets");
    }
    /**
     * Unwraps an arbirary group of NFTs from their corresponding WrappedNFT ERC20 tokens back into ERC721 tokens.
     * Emits the `UnwrapAssets` event when the transaction is prompted.
     * @param param0 __namedParameters Object
     * @param assets An array of objects with the tokenId and tokenAddress of each of the assets to bundle together.
     * @param destinationAddresses Addresses that each resulting ERC721 token will be sent to. Must be the same length as `tokenIds`. Each address corresponds with its respective token ID in the `tokenIds` array.
     * @param accountAddress Address of the user's wallet
     */
    async unwrapAssets({ assets, destinationAddresses, accountAddress }) {
        if (!assets || !destinationAddresses || assets.length != destinationAddresses.length) {
            throw new Error("The 'assets' and 'destinationAddresses' arrays must exist and have the same length.");
        }
        const schema = this._getSchema(types_1.WyvernSchemaName.ERC721);
        const wyAssets = assets.map(a => utils_1.getWyvernAsset(schema, a));
        // Separate assets out into two arrays of tokenIds and tokenAddresses
        const tokenIds = wyAssets.map(a => a.id);
        const tokenAddresses = wyAssets.map(a => a.address);
        // Check if all tokenAddresses match. If not, then we have a mixedBatch of
        // NFTs from different NFT core contracts
        const isMixedBatchOfAssets = !tokenAddresses.every((val, i, arr) => val === arr[0]);
        this._dispatch(types_1.EventType.UnwrapAssets, { assets: wyAssets, accountAddress });
        const txHash = await utils_1.sendRawTransaction(this.web3, {
            from: accountAddress,
            to: this._wrappedNFTLiquidationProxyAddress,
            value: 0,
            data: schema_1.encodeCall(contracts_1.getMethod(contracts_1.WrappedNFTLiquidationProxy, 'unwrapNFTs'), [tokenIds, tokenAddresses, destinationAddresses, isMixedBatchOfAssets]),
        }, error => {
            this._dispatch(types_1.EventType.TransactionDenied, { error, accountAddress });
        });
        await this._confirmTransaction(txHash, types_1.EventType.UnwrapAssets, "Unwrapping Assets");
    }
    /**
     * Liquidates an arbirary group of NFTs by atomically wrapping them into their
     * corresponding WrappedNFT ERC20 tokens, and then immediately selling those
     * ERC20 tokens on their corresponding Uniswap exchange.
     * Emits the `LiquidateAssets` event when the transaction is prompted.
     * @param param0 __namedParameters Object
     * @param assets An array of objects with the tokenId and tokenAddress of each of the assets to bundle together.
     * @param accountAddress Address of the user's wallet
     * @param uniswapSlippageAllowedInBasisPoints The amount of slippage that a user will tolerate in their Uniswap trade; if Uniswap cannot fulfill the order without more slippage, the whole function will revert.
     */
    async liquidateAssets({ assets, accountAddress, uniswapSlippageAllowedInBasisPoints }) {
        // If no slippage parameter is provided, use a sane default value
        const uniswapSlippage = uniswapSlippageAllowedInBasisPoints === 0 ? constants_1.DEFAULT_WRAPPED_NFT_LIQUIDATION_UNISWAP_SLIPPAGE_IN_BASIS_POINTS : uniswapSlippageAllowedInBasisPoints;
        const schema = this._getSchema(types_1.WyvernSchemaName.ERC721);
        const wyAssets = assets.map(a => utils_1.getWyvernAsset(schema, a));
        // Separate assets out into two arrays of tokenIds and tokenAddresses
        const tokenIds = wyAssets.map(a => a.id);
        const tokenAddresses = wyAssets.map(a => a.address);
        // Check if all tokenAddresses match. If not, then we have a mixedBatch of
        // NFTs from different NFT core contracts
        const isMixedBatchOfAssets = !tokenAddresses.every((val, i, arr) => val === arr[0]);
        this._dispatch(types_1.EventType.LiquidateAssets, { assets: wyAssets, accountAddress });
        const txHash = await utils_1.sendRawTransaction(this.web3, {
            from: accountAddress,
            to: this._wrappedNFTLiquidationProxyAddress,
            value: 0,
            data: schema_1.encodeCall(contracts_1.getMethod(contracts_1.WrappedNFTLiquidationProxy, 'liquidateNFTs'), [tokenIds, tokenAddresses, isMixedBatchOfAssets, uniswapSlippage]),
        }, error => {
            this._dispatch(types_1.EventType.TransactionDenied, { error, accountAddress });
        });
        await this._confirmTransaction(txHash, types_1.EventType.LiquidateAssets, "Liquidating Assets");
    }
    /**
     * Purchases a bundle of WrappedNFT tokens from Uniswap and then unwraps them into ERC721 tokens.
     * Emits the `PurchaseAssets` event when the transaction is prompted.
     * @param param0 __namedParameters Object
     * @param numTokensToBuy The number of WrappedNFT tokens to purchase and unwrap
     * @param amount The estimated cost in wei for tokens (probably some ratio above the minimum amount to avoid the transaction failing due to frontrunning, minimum amount is found by calling UniswapExchange(uniswapAddress).getEthToTokenOutputPrice(numTokensToBuy.mul(10**18));
     * @param contractAddress Address of the corresponding NFT core contract for these NFTs.
     * @param accountAddress Address of the user's wallet
     */
    async purchaseAssets({ numTokensToBuy, amount, contractAddress, accountAddress }) {
        const token = WyvernSchemas.tokens[this._networkName].canonicalWrappedEther;
        this._dispatch(types_1.EventType.PurchaseAssets, { amount, contractAddress, accountAddress });
        const txHash = await utils_1.sendRawTransaction(this.web3, {
            from: accountAddress,
            to: this._wrappedNFTLiquidationProxyAddress,
            value: amount,
            data: schema_1.encodeCall(contracts_1.getMethod(contracts_1.WrappedNFTLiquidationProxy, 'purchaseNFTs'), [numTokensToBuy, contractAddress]),
        }, error => {
            this._dispatch(types_1.EventType.TransactionDenied, { error, accountAddress });
        });
        await this._confirmTransaction(txHash, types_1.EventType.PurchaseAssets, "Purchasing Assets");
    }
    /**
     * Gets the estimated cost or payout of either buying or selling NFTs to Uniswap using either purchaseAssts() or liquidateAssets()
     * @param param0 __namedParameters Object
     * @param numTokens The number of WrappedNFT tokens to either purchase or sell
     * @param isBuying A bool for whether the user is buying or selling
     * @param contractAddress Address of the corresponding NFT core contract for these NFTs.
     */
    async getQuoteFromUniswap({ numTokens, isBuying, contractAddress }) {
        // Get UniswapExchange for WrappedNFTContract for contractAddress
        const wrappedNFTFactoryContract = this.web3.eth.contract(contracts_1.WrappedNFTFactory);
        const wrappedNFTFactory = await wrappedNFTFactoryContract.at(this._wrappedNFTFactoryAddress);
        const wrappedNFTAddress = await wrappedNFTFactory.nftContractToWrapperContract(contractAddress);
        const wrappedNFTContract = this.web3.eth.contract(contracts_1.WrappedNFT);
        const wrappedNFT = await wrappedNFTContract.at(wrappedNFTAddress);
        const uniswapFactoryContract = this.web3.eth.contract(contracts_1.UniswapFactory);
        const uniswapFactory = await uniswapFactoryContract.at(this._uniswapFactoryAddress);
        const uniswapExchangeAddress = await uniswapFactory.getExchange(wrappedNFTAddress);
        const uniswapExchangeContract = this.web3.eth.contract(contracts_1.UniswapExchange);
        const uniswapExchange = await uniswapExchangeContract.at(uniswapExchangeAddress);
        // Convert desired WNFT to wei
        const amount = wyvern_js_1.WyvernProtocol.toBaseUnitAmount(utils_1.makeBigNumber(numTokens), wrappedNFT.decimals());
        // Return quote from Uniswap
        if (isBuying) {
            return parseInt(await uniswapExchange.getEthToTokenOutputPrice(amount));
        }
        else {
            return parseInt(await uniswapExchange.getTokenToEthInputPrice(amount));
        }
    }
    /**
     * Wrap ETH into W-ETH.
     * W-ETH is needed for placing buy orders (making offers).
     * Emits the `WrapEth` event when the transaction is prompted.
     * @param param0 __namedParameters Object
     * @param amountInEth How much ether to wrap
     * @param accountAddress Address of the user's wallet containing the ether
     */
    async wrapEth({ amountInEth, accountAddress }) {
        const token = WyvernSchemas.tokens[this._networkName].canonicalWrappedEther;
        const amount = wyvern_js_1.WyvernProtocol.toBaseUnitAmount(utils_1.makeBigNumber(amountInEth), token.decimals);
        this._dispatch(types_1.EventType.WrapEth, { accountAddress, amount });
        const txHash = await utils_1.sendRawTransaction(this.web3, {
            from: accountAddress,
            to: token.address,
            value: amount,
            data: schema_1.encodeCall(contracts_1.getMethod(contracts_1.CanonicalWETH, 'deposit'), []),
        }, error => {
            this._dispatch(types_1.EventType.TransactionDenied, { error, accountAddress });
        });
        await this._confirmTransaction(txHash, types_1.EventType.WrapEth, "Wrapping ETH");
    }
    /**
     * Unwrap W-ETH into ETH.
     * Emits the `UnwrapWeth` event when the transaction is prompted.
     * @param param0 __namedParameters Object
     * @param amountInEth How much W-ETH to unwrap
     * @param accountAddress Address of the user's wallet containing the W-ETH
     */
    async unwrapWeth({ amountInEth, accountAddress }) {
        const token = WyvernSchemas.tokens[this._networkName].canonicalWrappedEther;
        const amount = wyvern_js_1.WyvernProtocol.toBaseUnitAmount(utils_1.makeBigNumber(amountInEth), token.decimals);
        this._dispatch(types_1.EventType.UnwrapWeth, { accountAddress, amount });
        const txHash = await utils_1.sendRawTransaction(this.web3, {
            from: accountAddress,
            to: token.address,
            value: 0,
            data: schema_1.encodeCall(contracts_1.getMethod(contracts_1.CanonicalWETH, 'withdraw'), [amount.toString()]),
        }, error => {
            this._dispatch(types_1.EventType.TransactionDenied, { error, accountAddress });
        });
        await this._confirmTransaction(txHash, types_1.EventType.UnwrapWeth, "Unwrapping W-ETH");
    }
    /**
     * Create a buy order to make an offer on a bundle or group of assets.
     * Will throw an 'Insufficient balance' error if the maker doesn't have enough W-ETH to make the offer.
     * If the user hasn't approved W-ETH access yet, this will emit `ApproveCurrency` before asking for approval.
     * @param param0 __namedParameters Object
     * @param assets Array of Asset objects to bid on
     * @param collection Optional collection for computing fees, required only if all assets belong to the same collection
     * @param quantities The quantity of each asset to sell. Defaults to 1 for each.
     * @param accountAddress Address of the maker's wallet
     * @param startAmount Value of the offer, in units of the payment token (or wrapped ETH if no payment token address specified)
     * @param expirationTime Expiration time for the order, in seconds. An expiration time of 0 means "never expire"
     * @param paymentTokenAddress Optional address for using an ERC-20 token in the order. If unspecified, defaults to W-ETH
     * @param sellOrder Optional sell order (like an English auction) to ensure fee and schema compatibility
     * @param referrerAddress The optional address that referred the order
     */
    async createBundleBuyOrder({ assets, collection, quantities, accountAddress, startAmount, expirationTime = 0, paymentTokenAddress, sellOrder, referrerAddress }) {
        // Default to 1 of each asset
        quantities = quantities || assets.map(a => 1);
        paymentTokenAddress = paymentTokenAddress || WyvernSchemas.tokens[this._networkName].canonicalWrappedEther.address;
        const order = await this._makeBundleBuyOrder({
            assets,
            collection,
            quantities,
            accountAddress,
            startAmount,
            expirationTime,
            paymentTokenAddress,
            extraBountyBasisPoints: 0,
            sellOrder,
            referrerAddress
        });
        // NOTE not in Wyvern exchange code:
        // frontend checks to make sure
        // token is approved and sufficiently available
        await this._buyOrderValidationAndApprovals({ order, accountAddress });
        const hashedOrder = {
            ...order,
            hash: utils_1.getOrderHash(order)
        };
        let signature;
        try {
            signature = await this._authorizeOrder(hashedOrder);
        }
        catch (error) {
            console.error(error);
            throw new Error("You declined to authorize your offer");
        }
        const orderWithSignature = {
            ...hashedOrder,
            ...signature
        };
        return this.validateAndPostOrder(orderWithSignature);
    }
    /**
     * Create a buy order to make an offer on an asset.
     * Will throw an 'Insufficient balance' error if the maker doesn't have enough W-ETH to make the offer.
     * If the user hasn't approved W-ETH access yet, this will emit `ApproveCurrency` before asking for approval.
     * @param param0 __namedParameters Object
     * @param asset The asset to trade
     * @param accountAddress Address of the maker's wallet
     * @param startAmount Value of the offer, in units of the payment token (or wrapped ETH if no payment token address specified)
     * @param quantity The number of assets to bid for (if fungible or semi-fungible). Defaults to 1. In units, not base units, e.g. not wei.
     * @param expirationTime Expiration time for the order, in seconds. An expiration time of 0 means "never expire"
     * @param paymentTokenAddress Optional address for using an ERC-20 token in the order. If unspecified, defaults to W-ETH
     * @param sellOrder Optional sell order (like an English auction) to ensure fee and schema compatibility
     * @param referrerAddress The optional address that referred the order
     */
    async createBuyOrder({ asset, accountAddress, startAmount, quantity = 1, expirationTime = 0, paymentTokenAddress, sellOrder, referrerAddress }) {
        paymentTokenAddress = paymentTokenAddress || WyvernSchemas.tokens[this._networkName].canonicalWrappedEther.address;
        const order = await this._makeBuyOrder({
            asset,
            quantity,
            accountAddress,
            startAmount,
            expirationTime,
            paymentTokenAddress,
            extraBountyBasisPoints: 0,
            sellOrder,
            referrerAddress
        });
        // NOTE not in Wyvern exchange code:
        // frontend checks to make sure
        // token is approved and sufficiently available
        await this._buyOrderValidationAndApprovals({ order, accountAddress });
        const hashedOrder = {
            ...order,
            hash: utils_1.getOrderHash(order)
        };
        let signature;
        try {
            signature = await this._authorizeOrder(hashedOrder);
        }
        catch (error) {
            console.error(error);
            throw new Error("You declined to authorize your offer");
        }
        const orderWithSignature = {
            ...hashedOrder,
            ...signature
        };
        return this.validateAndPostOrder(orderWithSignature);
    }
    /**
     * Create a sell order to auction an asset.
     * Will throw a 'You do not own enough of this asset' error if the maker doesn't have the asset or not enough of it to sell the specific `quantity`.
     * If the user hasn't approved access to the token yet, this will emit `ApproveAllAssets` (or `ApproveAsset` if the contract doesn't support approve-all) before asking for approval.
     * @param param0 __namedParameters Object
     * @param tokenId DEPRECATED: Token ID. Use `asset` instead.
     * @param tokenAddress DEPRECATED: Address of the token's contract. Use `asset` instead.
     * @param asset The asset to trade
     * @param accountAddress Address of the maker's wallet
     * @param startAmount Price of the asset at the start of the auction. Units are in the amount of a token above the token's decimal places (integer part). For example, for ether, expected units are in ETH, not wei.
     * @param endAmount Optional price of the asset at the end of its expiration time. Units are in the amount of a token above the token's decimal places (integer part). For example, for ether, expected units are in ETH, not wei.
     * @param quantity The number of assets to sell (if fungible or semi-fungible). Defaults to 1. In units, not base units, e.g. not wei.
     * @param listingTime Optional time when the order will become fulfillable, in UTC seconds. Undefined means it will start now.
     * @param expirationTime Expiration time for the order, in UTC seconds. An expiration time of 0 means "never expire."
     * @param waitForHighestBid If set to true, this becomes an English auction that increases in price for every bid. The highest bid wins when the auction expires, as long as it's at least `startAmount`. `expirationTime` must be > 0.
     * @param englishAuctionReservePrice Optional price level, below which orders may be placed but will not be matched.  Orders below the reserve can be manually accepted but will not be automatically matched.
     * @param paymentTokenAddress Address of the ERC-20 token to accept in return. If undefined or null, uses Ether.
     * @param extraBountyBasisPoints Optional basis points (1/100th of a percent) to reward someone for referring the fulfillment of this order
     * @param buyerAddress Optional address that's allowed to purchase this item. If specified, no other address will be able to take the order, unless its value is the null address.
     * @param buyerEmail Optional email of the user that's allowed to purchase this item. If specified, a user will have to verify this email before being able to take the order.
     */
    async createSellOrder({ asset, accountAddress, startAmount, endAmount, quantity = 1, listingTime, expirationTime = 0, waitForHighestBid = false, englishAuctionReservePrice, paymentTokenAddress, extraBountyBasisPoints = 0, buyerAddress, buyerEmail }) {
        const order = await this._makeSellOrder({
            asset,
            quantity,
            accountAddress,
            startAmount,
            endAmount,
            listingTime,
            expirationTime,
            waitForHighestBid,
            englishAuctionReservePrice,
            paymentTokenAddress: paymentTokenAddress || constants_1.NULL_ADDRESS,
            extraBountyBasisPoints,
            buyerAddress: buyerAddress || constants_1.NULL_ADDRESS
        });
        await this._sellOrderValidationAndApprovals({ order, accountAddress });
        if (buyerEmail) {
            await this._createEmailWhitelistEntry({ order, buyerEmail });
        }
        const hashedOrder = {
            ...order,
            hash: utils_1.getOrderHash(order)
        };
        let signature;
        try {
            signature = await this._authorizeOrder(hashedOrder);
        }
        catch (error) {
            console.error(error);
            throw new Error("You declined to authorize your auction");
        }
        const orderWithSignature = {
            ...hashedOrder,
            ...signature
        };
        return this.validateAndPostOrder(orderWithSignature);
    }
    /**
     * Create multiple sell orders in bulk to auction assets out of an asset factory.
     * Will throw a 'You do not own this asset' error if the maker doesn't own the factory.
     * Items will mint to users' wallets only when they buy them. See https://docs.opensea.io/docs/opensea-initial-item-sale-tutorial for more info.
     * If the user hasn't approved access to the token yet, this will emit `ApproveAllAssets` (or `ApproveAsset` if the contract doesn't support approve-all) before asking for approval.
     * @param param0 __namedParameters Object
     * @param assets Which assets you want to post orders for. Use the tokenAddress of your factory contract
     * @param accountAddress Address of the factory owner's wallet
     * @param startAmount Price of the asset at the start of the auction, or minimum acceptable bid if it's an English auction. Units are in the amount of a token above the token's decimal places (integer part). For example, for ether, expected units are in ETH, not wei.
     * @param endAmount Optional price of the asset at the end of its expiration time. If not specified, will be set to `startAmount`. Units are in the amount of a token above the token's decimal places (integer part). For example, for ether, expected units are in ETH, not wei.
     * @param quantity The number of assets to sell at one time (if fungible or semi-fungible). Defaults to 1. In units, not base units, e.g. not wei.
     * @param listingTime Optional time when the order will become fulfillable, in UTC seconds. Undefined means it will start now.
     * @param expirationTime Expiration time for the order, in seconds. An expiration time of 0 means "never expire."
     * @param waitForHighestBid If set to true, this becomes an English auction that increases in price for every bid. The highest bid wins when the auction expires, as long as it's at least `startAmount`. `expirationTime` must be > 0.
     * @param paymentTokenAddress Address of the ERC-20 token to accept in return. If undefined or null, uses Ether.
     * @param extraBountyBasisPoints Optional basis points (1/100th of a percent) to reward someone for referring the fulfillment of each order
     * @param buyerAddress Optional address that's allowed to purchase each item. If specified, no other address will be able to take each order.
     * @param buyerEmail Optional email of the user that's allowed to purchase each item. If specified, a user will have to verify this email before being able to take each order.
     * @param numberOfOrders Number of times to repeat creating the same order for each asset. If greater than 5, creates them in batches of 5. Requires an `apiKey` to be set during seaport initialization in order to not be throttled by the API.
     * @returns The number of orders created in total
     */
    async createFactorySellOrders({ assets, accountAddress, startAmount, endAmount, quantity = 1, listingTime, expirationTime = 0, waitForHighestBid = false, paymentTokenAddress, extraBountyBasisPoints = 0, buyerAddress, buyerEmail, numberOfOrders = 1 }) {
        if (numberOfOrders < 1) {
            throw new Error('Need to make at least one sell order');
        }
        if (!assets || !assets.length) {
            throw new Error('Need at least one asset to create orders for');
        }
        if (_.uniqBy(assets, a => a.tokenAddress).length !== 1) {
            throw new Error('All assets must be on the same factory contract address');
        }
        // Validate just a single dummy order but don't post it
        const dummyOrder = await this._makeSellOrder({
            asset: assets[0],
            quantity,
            accountAddress,
            startAmount,
            endAmount,
            listingTime,
            expirationTime,
            waitForHighestBid,
            paymentTokenAddress: paymentTokenAddress || constants_1.NULL_ADDRESS,
            extraBountyBasisPoints,
            buyerAddress: buyerAddress || constants_1.NULL_ADDRESS
        });
        await this._sellOrderValidationAndApprovals({ order: dummyOrder, accountAddress });
        const _makeAndPostOneSellOrder = async (asset) => {
            const order = await this._makeSellOrder({
                asset,
                quantity,
                accountAddress,
                startAmount,
                endAmount,
                listingTime,
                expirationTime,
                waitForHighestBid,
                paymentTokenAddress: paymentTokenAddress || constants_1.NULL_ADDRESS,
                extraBountyBasisPoints,
                buyerAddress: buyerAddress || constants_1.NULL_ADDRESS
            });
            if (buyerEmail) {
                await this._createEmailWhitelistEntry({ order, buyerEmail });
            }
            const hashedOrder = {
                ...order,
                hash: utils_1.getOrderHash(order)
            };
            let signature;
            try {
                signature = await this._authorizeOrder(hashedOrder);
            }
            catch (error) {
                console.error(error);
                throw new Error("You declined to authorize your auction, or your web3 provider can't sign using personal_sign. Try 'web3-provider-engine' and make sure a mnemonic is set. Just a reminder: there's no gas needed anymore to mint tokens!");
            }
            const orderWithSignature = {
                ...hashedOrder,
                ...signature
            };
            return this.validateAndPostOrder(orderWithSignature);
        };
        const range = _.range(numberOfOrders * assets.length);
        const batches = _.chunk(range, constants_1.SELL_ORDER_BATCH_SIZE);
        let numOrdersCreated = 0;
        for (const subRange of batches) {
            // subRange = e.g. [5, 6, 7, 8, 9]
            // batches of assets = e.g. [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, ... 10]
            // Will block until all SELL_ORDER_BATCH_SIZE orders
            // have come back in parallel
            const batchOrdersCreated = await Promise.all(subRange.map(async (assetOrderIndex) => {
                const assetIndex = Math.floor(assetOrderIndex / numberOfOrders);
                return _makeAndPostOneSellOrder(assets[assetIndex]);
            }));
            this.logger(`Created and posted a batch of ${batchOrdersCreated.length} orders in parallel.`);
            numOrdersCreated += batchOrdersCreated.length;
            // Don't overwhelm router
            await utils_1.delay(500);
        }
        return numOrdersCreated;
    }
    /**
     * Create a sell order to auction a bundle of assets.
     * Will throw a 'You do not own this asset' error if the maker doesn't have one of the assets.
     * If the user hasn't approved access to any of the assets yet, this will emit `ApproveAllAssets` (or `ApproveAsset` if the contract doesn't support approve-all) before asking for approval for each asset.
     * @param param0 __namedParameters Object
     * @param bundleName Name of the bundle
     * @param bundleDescription Optional description of the bundle. Markdown is allowed.
     * @param bundleExternalLink Optional link to a page that adds context to the bundle.
     * @param assets An array of objects with the tokenId and tokenAddress of each of the assets to bundle together.
     * @param collection Optional collection for computing fees, required only if all assets belong to the same collection
     * @param quantities The quantity of each asset to sell. Defaults to 1 for each.
     * @param accountAddress The address of the maker of the bundle and the owner of all the assets.
     * @param startAmount Price of the asset at the start of the auction, or minimum acceptable bid if it's an English auction.
     * @param endAmount Optional price of the asset at the end of its expiration time. If not specified, will be set to `startAmount`.
     * @param listingTime Optional time when the order will become fulfillable, in UTC seconds. Undefined means it will start now.
     * @param expirationTime Expiration time for the order, in seconds. An expiration time of 0 means "never expire."
     * @param waitForHighestBid If set to true, this becomes an English auction that increases in price for every bid. The highest bid wins when the auction expires, as long as it's at least `startAmount`. `expirationTime` must be > 0.
     * @param englishAuctionReservePrice Optional price level, below which orders may be placed but will not be matched.  Orders below the reserve can be manually accepted but will not be automatically matched.
     * @param paymentTokenAddress Address of the ERC-20 token to accept in return. If undefined or null, uses Ether.
     * @param extraBountyBasisPoints Optional basis points (1/100th of a percent) to reward someone for referring the fulfillment of this order
     * @param buyerAddress Optional address that's allowed to purchase this bundle. If specified, no other address will be able to take the order, unless it's the null address.
     */
    async createBundleSellOrder({ bundleName, bundleDescription, bundleExternalLink, assets, collection, quantities, accountAddress, startAmount, endAmount, expirationTime = 0, listingTime, waitForHighestBid = false, englishAuctionReservePrice, paymentTokenAddress, extraBountyBasisPoints = 0, buyerAddress }) {
        // Default to one of each asset
        quantities = quantities || assets.map(a => 1);
        const order = await this._makeBundleSellOrder({
            bundleName,
            bundleDescription,
            bundleExternalLink,
            assets,
            collection,
            quantities,
            accountAddress,
            startAmount,
            endAmount,
            listingTime,
            expirationTime,
            waitForHighestBid,
            englishAuctionReservePrice,
            paymentTokenAddress: paymentTokenAddress || constants_1.NULL_ADDRESS,
            extraBountyBasisPoints,
            buyerAddress: buyerAddress || constants_1.NULL_ADDRESS,
        });
        await this._sellOrderValidationAndApprovals({ order, accountAddress });
        const hashedOrder = {
            ...order,
            hash: utils_1.getOrderHash(order)
        };
        let signature;
        try {
            signature = await this._authorizeOrder(hashedOrder);
        }
        catch (error) {
            console.error(error);
            throw new Error("You declined to authorize your auction");
        }
        const orderWithSignature = {
            ...hashedOrder,
            ...signature
        };
        return this.validateAndPostOrder(orderWithSignature);
    }
    /**
     * Fullfill or "take" an order for an asset, either a buy or sell order
     * @param param0 __namedParamaters Object
     * @param order The order to fulfill, a.k.a. "take"
     * @param accountAddress The taker's wallet address
     * @param recipientAddress The optional address to receive the order's item(s) or curriencies. If not specified, defaults to accountAddress.
     * @param referrerAddress The optional address that referred the order
     * @returns Transaction hash for fulfilling the order
     */
    async fulfillOrder({ order, accountAddress, recipientAddress, referrerAddress }) {
        const matchingOrder = this._makeMatchingOrder({
            order,
            accountAddress,
            recipientAddress: recipientAddress || accountAddress
        });
        const { buy, sell } = utils_1.assignOrdersToSides(order, matchingOrder);
        const metadata = this._getMetadata(order, referrerAddress);
        const transactionHash = await this._atomicMatch({ buy, sell, accountAddress, metadata });
        await this._confirmTransaction(transactionHash, types_1.EventType.MatchOrders, "Fulfilling order", async () => {
            const isOpen = await this._validateOrder(order);
            return !isOpen;
        });
        return transactionHash;
    }
    /**
     * Cancel an order on-chain, preventing it from ever being fulfilled.
     * @param param0 __namedParameters Object
     * @param order The order to cancel
     * @param accountAddress The order maker's wallet address
     */
    async cancelOrder({ order, accountAddress }) {
        this._dispatch(types_1.EventType.CancelOrder, { order, accountAddress });
        const transactionHash = await this._wyvernProtocol.wyvernExchange.cancelOrder_.sendTransactionAsync([order.exchange, order.maker, order.taker, order.feeRecipient, order.target, order.staticTarget, order.paymentToken], [order.makerRelayerFee, order.takerRelayerFee, order.makerProtocolFee, order.takerProtocolFee, order.basePrice, order.extra, order.listingTime, order.expirationTime, order.salt], order.feeMethod, order.side, order.saleKind, order.howToCall, order.calldata, order.replacementPattern, order.staticExtradata, order.v || 0, order.r || constants_1.NULL_BLOCK_HASH, order.s || constants_1.NULL_BLOCK_HASH, { from: accountAddress });
        await this._confirmTransaction(transactionHash.toString(), types_1.EventType.CancelOrder, "Cancelling order", async () => {
            const isOpen = await this._validateOrder(order);
            return !isOpen;
        });
    }
    /**
     * Approve a non-fungible token for use in trades.
     * Requires an account to be initialized first.
     * Called internally, but exposed for dev flexibility.
     * Checks to see if already approved, first. Then tries different approval methods from best to worst.
     * @param param0 __namedParamters Object
     * @param tokenId Token id to approve, but only used if approve-all isn't
     *  supported by the token contract
     * @param tokenAddress The contract address of the token being approved
     * @param accountAddress The user's wallet address
     * @param proxyAddress Address of the user's proxy contract. If not provided,
     *  will attempt to fetch it from Wyvern.
     * @param tokenAbi ABI of the token's contract. Defaults to a flexible ERC-721
     *  contract.
     * @param skipApproveAllIfTokenAddressIn an optional list of token addresses that, if a token is approve-all type, will skip approval
     * @param schemaName The Wyvern schema name corresponding to the asset type
     * @returns Transaction hash if a new transaction was created, otherwise null
     */
    async approveSemiOrNonFungibleToken({ tokenId, tokenAddress, accountAddress, proxyAddress, tokenAbi = contracts_1.ERC721, skipApproveAllIfTokenAddressIn = new Set(), schemaName = types_1.WyvernSchemaName.ERC721 }) {
        const schema = this._getSchema(schemaName);
        const tokenContract = this.web3.eth.contract(tokenAbi);
        const contract = await tokenContract.at(tokenAddress);
        if (!proxyAddress) {
            proxyAddress = await this._getProxy(accountAddress) || undefined;
            if (!proxyAddress) {
                throw new Error('Uninitialized account');
            }
        }
        const approvalAllCheck = async () => {
            // NOTE:
            // Use this long way of calling so we can check for method existence on a bool-returning method.
            const isApprovedForAllRaw = await utils_1.rawCall(this.web3ReadOnly, {
                from: accountAddress,
                to: contract.address,
                data: contract.isApprovedForAll.getData(accountAddress, proxyAddress)
            });
            return parseInt(isApprovedForAllRaw);
        };
        const isApprovedForAll = await approvalAllCheck();
        if (isApprovedForAll == 1) {
            // Supports ApproveAll
            this.logger('Already approved proxy for all tokens');
            return null;
        }
        if (isApprovedForAll == 0) {
            // Supports ApproveAll
            //  not approved for all yet
            if (skipApproveAllIfTokenAddressIn.has(tokenAddress)) {
                this.logger('Already approving proxy for all tokens in another transaction');
                return null;
            }
            skipApproveAllIfTokenAddressIn.add(tokenAddress);
            try {
                this._dispatch(types_1.EventType.ApproveAllAssets, {
                    accountAddress,
                    proxyAddress,
                    contractAddress: tokenAddress
                });
                const txHash = await utils_1.sendRawTransaction(this.web3, {
                    from: accountAddress,
                    to: contract.address,
                    data: contract.setApprovalForAll.getData(proxyAddress, true),
                }, error => {
                    this._dispatch(types_1.EventType.TransactionDenied, { error, accountAddress });
                });
                await this._confirmTransaction(txHash, types_1.EventType.ApproveAllAssets, 'Approving all tokens of this type for trading', async () => {
                    const result = await approvalAllCheck();
                    return result == 1;
                });
                return txHash;
            }
            catch (error) {
                console.error(error);
                throw new Error("Couldn't get permission to approve these tokens for trading. Their contract might not be implemented correctly. Please contact the developer!");
            }
        }
        // Does not support ApproveAll (ERC721 v1 or v2)
        this.logger('Contract does not support Approve All');
        const approvalOneCheck = async () => {
            // Note: approvedAddr will be '0x' if not supported
            let approvedAddr = await utils_1.promisifyCall(c => contract.getApproved.call(tokenId, c));
            if (approvedAddr == proxyAddress) {
                this.logger('Already approved proxy for this token');
                return true;
            }
            this.logger(`Approve response: ${approvedAddr}`);
            // SPECIAL CASING non-compliant contracts
            if (!approvedAddr) {
                approvedAddr = await utils_1.getNonCompliantApprovalAddress(contract, tokenId, accountAddress);
                if (approvedAddr == proxyAddress) {
                    this.logger('Already approved proxy for this item');
                    return true;
                }
                this.logger(`Special-case approve response: ${approvedAddr}`);
            }
            return false;
        };
        const isApprovedForOne = await approvalOneCheck();
        if (isApprovedForOne) {
            return null;
        }
        // Call `approve`
        try {
            this._dispatch(types_1.EventType.ApproveAsset, {
                accountAddress,
                proxyAddress,
                asset: utils_1.getWyvernAsset(schema, { tokenId, tokenAddress })
            });
            const txHash = await utils_1.sendRawTransaction(this.web3, {
                from: accountAddress,
                to: contract.address,
                data: contract.approve.getData(proxyAddress, tokenId),
            }, error => {
                this._dispatch(types_1.EventType.TransactionDenied, { error, accountAddress });
            });
            await this._confirmTransaction(txHash, types_1.EventType.ApproveAsset, "Approving single token for trading", approvalOneCheck);
            return txHash;
        }
        catch (error) {
            console.error(error);
            throw new Error("Couldn't get permission to approve this token for trading. Its contract might not be implemented correctly. Please contact the developer!");
        }
    }
    /**
     * Check if a fungible token (e.g. WETH) is already approved
     * @param param0
     * @returns
     */
    async checkFungibleTokenApproval({ accountAddress, tokenAddress, proxyAddress, minimumAmount = wyvern_js_1.WyvernProtocol.MAX_UINT_256 }) {
        proxyAddress = proxyAddress || wyvern_js_1.WyvernProtocol.getTokenTransferProxyAddress(this._networkName);
        const approvedAmount = await this._getApprovedTokenCount({
            accountAddress,
            tokenAddress,
            proxyAddress
        });
        if (approvedAmount.greaterThanOrEqualTo(minimumAmount)) {
            this.logger('Already approved enough currency for trading');
            return true;
        }
        this.logger(`Not enough token approved for trade: ${approvedAmount} approved to transfer ${tokenAddress}`);
        return false;
    }
    /**
     * Approve a fungible token (e.g. W-ETH) for use in trades.
     * Called internally, but exposed for dev flexibility.
     * Checks to see if the minimum amount is already approved, first.
     * @param param0 __namedParamters Object
     * @param accountAddress The user's wallet address
     * @param tokenAddress The contract address of the token being approved
     * @param proxyAddress The user's proxy address. If unspecified, uses the Wyvern token transfer proxy address.
     * @param minimumAmount The minimum amount needed to skip a transaction. Defaults to the max-integer.
     * @returns Transaction hash if a new transaction occurred, otherwise null
     */
    async approveFungibleToken({ accountAddress, tokenAddress, proxyAddress, minimumAmount = wyvern_js_1.WyvernProtocol.MAX_UINT_256 }) {
        proxyAddress = proxyAddress || wyvern_js_1.WyvernProtocol.getTokenTransferProxyAddress(this._networkName);
        const approvedAmount = await this._getApprovedTokenCount({
            accountAddress,
            tokenAddress,
            proxyAddress
        });
        if (approvedAmount.greaterThanOrEqualTo(minimumAmount)) {
            this.logger('Already approved enough currency for trading');
            return null;
        }
        this.logger(`Not enough token approved for trade: ${approvedAmount} approved to transfer ${tokenAddress}`);
        this._dispatch(types_1.EventType.ApproveCurrency, {
            accountAddress,
            contractAddress: tokenAddress,
            proxyAddress
        });
        const hasOldApproveMethod = [constants_1.ENJIN_COIN_ADDRESS, constants_1.MANA_ADDRESS].includes(tokenAddress.toLowerCase());
        if (minimumAmount.greaterThan(0) && hasOldApproveMethod) {
            // Older erc20s require initial approval to be 0
            await this.unapproveFungibleToken({ accountAddress, tokenAddress, proxyAddress });
        }
        const txHash = await utils_1.sendRawTransaction(this.web3, {
            from: accountAddress,
            to: tokenAddress,
            data: schema_1.encodeCall(contracts_1.getMethod(contracts_1.ERC20, 'approve'), 
            // Always approve maximum amount, to prevent the need for followup
            // transactions (and because old ERC20s like MANA/ENJ are non-compliant)
            [proxyAddress, wyvern_js_1.WyvernProtocol.MAX_UINT_256.toString()]),
        }, error => {
            this._dispatch(types_1.EventType.TransactionDenied, { error, accountAddress });
        });
        await this._confirmTransaction(txHash, types_1.EventType.ApproveCurrency, "Approving currency for trading", async () => {
            const newlyApprovedAmount = await this._getApprovedTokenCount({
                accountAddress,
                tokenAddress,
                proxyAddress
            });
            return newlyApprovedAmount.greaterThanOrEqualTo(minimumAmount);
        });
        return txHash;
    }
    /**
     * Un-approve a fungible token (e.g. W-ETH) for use in trades.
     * Called internally, but exposed for dev flexibility.
     * Useful for old ERC20s that require a 0 approval count before
     * changing the count
     * @param param0 __namedParamters Object
     * @param accountAddress The user's wallet address
     * @param tokenAddress The contract address of the token being approved
     * @param proxyAddress The user's proxy address. If unspecified, uses the Wyvern token transfer proxy address.
     * @returns Transaction hash
     */
    async unapproveFungibleToken({ accountAddress, tokenAddress, proxyAddress }) {
        proxyAddress = proxyAddress || wyvern_js_1.WyvernProtocol.getTokenTransferProxyAddress(this._networkName);
        const txHash = await utils_1.sendRawTransaction(this.web3, {
            from: accountAddress,
            to: tokenAddress,
            data: schema_1.encodeCall(contracts_1.getMethod(contracts_1.ERC20, 'approve'), [proxyAddress, 0]),
        }, error => {
            this._dispatch(types_1.EventType.TransactionDenied, { error, accountAddress });
        });
        await this._confirmTransaction(txHash, types_1.EventType.UnapproveCurrency, "Resetting Currency Approval", async () => {
            const newlyApprovedAmount = await this._getApprovedTokenCount({
                accountAddress,
                tokenAddress,
                proxyAddress
            });
            return newlyApprovedAmount.isZero();
        });
        return txHash;
    }
    /**
     * Gets the price for the order using the contract
     * @param order The order to calculate the price for
     */
    async getCurrentPrice(order) {
        const currentPrice = await this._wyvernProtocolReadOnly.wyvernExchange.calculateCurrentPrice_.callAsync([order.exchange, order.maker, order.taker, order.feeRecipient, order.target, order.staticTarget, order.paymentToken], [order.makerRelayerFee, order.takerRelayerFee, order.makerProtocolFee, order.takerProtocolFee, order.basePrice, order.extra, order.listingTime, order.expirationTime, order.salt], order.feeMethod, order.side, order.saleKind, order.howToCall, order.calldata, order.replacementPattern, order.staticExtradata);
        return currentPrice;
    }
    /**
     * Returns whether an order is fulfillable.
     * An order may not be fulfillable if a target item's transfer function
     * is locked for some reason, e.g. an item is being rented within a game
     * or trading has been locked for an item type.
     * @param param0 __namedParamters Object
     * @param order Order to check
     * @param accountAddress The account address that will be fulfilling the order
     * @param recipientAddress The optional address to receive the order's item(s) or curriencies. If not specified, defaults to accountAddress.
     * @param referrerAddress The optional address that referred the order
     */
    async isOrderFulfillable({ order, accountAddress, recipientAddress, referrerAddress }) {
        const matchingOrder = this._makeMatchingOrder({
            order,
            accountAddress,
            recipientAddress: recipientAddress || accountAddress
        });
        const { buy, sell } = utils_1.assignOrdersToSides(order, matchingOrder);
        const metadata = this._getMetadata(order, referrerAddress);
        const gas = await this._estimateGasForMatch({ buy, sell, accountAddress, metadata });
        this.logger(`Gas estimate for ${order.side == types_1.OrderSide.Sell ? "sell" : "buy"} order: ${gas}`);
        return gas != null && gas > 0;
    }
    /**
     * Returns whether an asset is transferrable.
     * An asset may not be transferrable if its transfer function
     * is locked for some reason, e.g. an item is being rented within a game
     * or trading has been locked for an item type.
     * @param param0 __namedParamters Object
     * @param tokenId DEPRECATED: Token ID. Use `asset` instead.
     * @param tokenAddress DEPRECATED: Address of the token's contract. Use `asset` instead.
     * @param asset The asset to trade
     * @param fromAddress The account address that currently owns the asset
     * @param toAddress The account address that will be acquiring the asset
     * @param quantity The amount of the asset to transfer, if it's fungible (optional). In units (not base units), e.g. not wei.
     * @param useProxy Use the `fromAddress`'s proxy contract only if the `fromAddress` has already approved the asset for sale. Required if checking an ERC-721 v1 asset (like CryptoKitties) that doesn't check if the transferFrom caller is the owner of the asset (only allowing it if it's an approved address).
     * @param retries How many times to retry if false
     */
    async isAssetTransferrable({ asset, fromAddress, toAddress, quantity, useProxy = false }, retries = 1) {
        const schema = this._getSchema(asset.schemaName);
        const quantityBN = quantity
            ? wyvern_js_1.WyvernProtocol.toBaseUnitAmount(utils_1.makeBigNumber(quantity), asset.decimals || 0)
            : utils_1.makeBigNumber(1);
        const wyAsset = utils_1.getWyvernAsset(schema, asset, quantityBN);
        const abi = schema.functions.transfer(wyAsset);
        let from = fromAddress;
        if (useProxy) {
            const proxyAddress = await this._getProxy(fromAddress);
            if (!proxyAddress) {
                console.error(`This asset's owner (${fromAddress}) does not have a proxy!`);
                return false;
            }
            from = proxyAddress;
        }
        const data = schema_1.encodeTransferCall(abi, fromAddress, toAddress);
        try {
            const gas = await utils_1.estimateGas(this._getClientsForRead(retries).web3, {
                from,
                to: abi.target,
                data
            });
            return gas > 0;
        }
        catch (error) {
            if (retries <= 0) {
                console.error(error);
                console.error(from, abi.target, data);
                return false;
            }
            await utils_1.delay(500);
            return await this.isAssetTransferrable({ asset, fromAddress, toAddress, quantity, useProxy }, retries - 1);
        }
    }
    /**
     * Transfer a fungible or non-fungible asset to another address
     * @param param0 __namedParamaters Object
     * @param fromAddress The owner's wallet address
     * @param toAddress The recipient's wallet address
     * @param asset The fungible or non-fungible asset to transfer
     * @param quantity The amount of the asset to transfer, if it's fungible (optional). In units (not base units), e.g. not wei.
     * @returns Transaction hash
     */
    async transfer({ fromAddress, toAddress, asset, quantity = 1 }) {
        const schema = this._getSchema(asset.schemaName);
        const quantityBN = wyvern_js_1.WyvernProtocol.toBaseUnitAmount(utils_1.makeBigNumber(quantity), asset.decimals || 0);
        const wyAsset = utils_1.getWyvernAsset(schema, asset, quantityBN);
        const isCryptoKitties = [constants_1.CK_ADDRESS, constants_1.CK_RINKEBY_ADDRESS].includes(wyAsset.address);
        // Since CK is common, infer isOldNFT from it in case user
        // didn't pass in `version`
        const isOldNFT = isCryptoKitties || !!asset.version && [
            types_1.TokenStandardVersion.ERC721v1, types_1.TokenStandardVersion.ERC721v2
        ].includes(asset.version);
        const abi = asset.schemaName === types_1.WyvernSchemaName.ERC20
            ? utils_1.annotateERC20TransferABI(wyAsset)
            : isOldNFT
                ? utils_1.annotateERC721TransferABI(wyAsset)
                : schema.functions.transfer(wyAsset);
        this._dispatch(types_1.EventType.TransferOne, { accountAddress: fromAddress, toAddress, asset: wyAsset });
        const data = schema_1.encodeTransferCall(abi, fromAddress, toAddress);
        const txHash = await utils_1.sendRawTransaction(this.web3, {
            from: fromAddress,
            to: abi.target,
            data,
        }, error => {
            this._dispatch(types_1.EventType.TransactionDenied, { error, accountAddress: fromAddress });
        });
        await this._confirmTransaction(txHash, types_1.EventType.TransferOne, `Transferring asset`);
        return txHash;
    }
    /**
     * Transfer one or more assets to another address.
     * ERC-721 and ERC-1155 assets are supported
     * @param param0 __namedParamaters Object
     * @param assets An array of objects with the tokenId and tokenAddress of each of the assets to transfer.
     * @param fromAddress The owner's wallet address
     * @param toAddress The recipient's wallet address
     * @param schemaName The Wyvern schema name corresponding to the asset type, if not in each Asset definition
     * @returns Transaction hash
     */
    async transferAll({ assets, fromAddress, toAddress, schemaName = types_1.WyvernSchemaName.ERC721 }) {
        toAddress = utils_1.validateAndFormatWalletAddress(this.web3, toAddress);
        const schemaNames = assets.map(asset => asset.schemaName || schemaName);
        const wyAssets = assets.map(asset => utils_1.getWyvernAsset(this._getSchema(asset.schemaName), asset));
        const { calldata, target } = schema_1.encodeAtomicizedTransfer(schemaNames.map(name => this._getSchema(name)), wyAssets, fromAddress, toAddress, this._wyvernProtocol, this._networkName);
        let proxyAddress = await this._getProxy(fromAddress);
        if (!proxyAddress) {
            proxyAddress = await this._initializeProxy(fromAddress);
        }
        await this._approveAll({ schemaNames, wyAssets, accountAddress: fromAddress, proxyAddress });
        this._dispatch(types_1.EventType.TransferAll, { accountAddress: fromAddress, toAddress, assets: wyAssets });
        const txHash = await utils_1.sendRawTransaction(this.web3, {
            from: fromAddress,
            to: proxyAddress,
            data: schema_1.encodeProxyCall(target, types_1.HowToCall.DelegateCall, calldata),
        }, error => {
            this._dispatch(types_1.EventType.TransactionDenied, { error, accountAddress: fromAddress });
        });
        await this._confirmTransaction(txHash, types_1.EventType.TransferAll, `Transferring ${assets.length} asset${assets.length == 1 ? '' : 's'}`);
        return txHash;
    }
    /**
     * Get known payment tokens (ERC-20) that match your filters.
     * @param param0 __namedParamters Object
     * @param symbol Filter by the ERC-20 symbol for the token,
     *    e.g. "DAI" for Dai stablecoin
     * @param address Filter by the ERC-20 contract address for the token,
     *    e.g. "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359" for Dai
     * @param name Filter by the name of the ERC-20 contract.
     *    Not guaranteed to exist or be unique for each token type.
     *    e.g. '' for Dai and 'Decentraland' for MANA
     * FUTURE: officiallySupported: Filter for tokens that are
     *    officially supported and shown on opensea.io
     */
    async getFungibleTokens({ symbol, address, name } = {}) {
        utils_1.onDeprecated("Use `api.getPaymentTokens` instead");
        const tokenSettings = WyvernSchemas.tokens[this._networkName];
        const { tokens } = await this.api.getPaymentTokens({ symbol, address, name });
        const offlineTokens = [
            tokenSettings.canonicalWrappedEther,
            ...tokenSettings.otherTokens,
        ].filter(t => {
            if (symbol != null && t.symbol.toLowerCase() != symbol.toLowerCase()) {
                return false;
            }
            if (address != null && t.address.toLowerCase() != address.toLowerCase()) {
                return false;
            }
            if (name != null && t.name != name) {
                return false;
            }
            return true;
        });
        return [
            ...offlineTokens,
            ...tokens
        ];
    }
    /**
     * Get an account's balance of any Asset.
     * @param param0 __namedParameters Object
     * @param accountAddress Account address to check
     * @param asset The Asset to check balance for
     * @param retries How many times to retry if balance is 0
     */
    async getAssetBalance({ accountAddress, asset }, retries = 1) {
        const schema = this._getSchema(asset.schemaName);
        const wyAsset = utils_1.getWyvernAsset(schema, asset);
        if (schema.functions.countOf) {
            // ERC20 or ERC1155 (non-Enjin)
            const abi = schema.functions.countOf(wyAsset);
            const contract = this._getClientsForRead(retries).web3.eth.contract([abi]).at(abi.target);
            const inputValues = abi.inputs.filter(x => x.value !== undefined).map(x => x.value);
            const count = await utils_1.promisifyCall(c => contract[abi.name].call(accountAddress, ...inputValues, c));
            if (count !== undefined) {
                return count;
            }
        }
        else if (schema.functions.ownerOf) {
            // ERC721 asset
            const abi = schema.functions.ownerOf(wyAsset);
            const contract = this._getClientsForRead(retries).web3.eth.contract([abi]).at(abi.target);
            if (abi.inputs.filter(x => x.value === undefined)[0]) {
                throw new Error("Missing an argument for finding the owner of this asset");
            }
            const inputValues = abi.inputs.map(i => i.value.toString());
            const owner = await utils_1.promisifyCall(c => contract[abi.name].call(...inputValues, c));
            if (owner) {
                return owner.toLowerCase() == accountAddress.toLowerCase()
                    ? new bignumber_js_1.BigNumber(1)
                    : new bignumber_js_1.BigNumber(0);
            }
        }
        else {
            // Missing ownership call - skip check to allow listings
            // by default
            throw new Error('Missing ownership schema for this asset type');
        }
        if (retries <= 0) {
            throw new Error('Unable to get current owner from smart contract');
        }
        else {
            await utils_1.delay(500);
            // Recursively check owner again
            return await this.getAssetBalance({ accountAddress, asset }, retries - 1);
        }
    }
    /**
     * Get the balance of a fungible token.
     * Convenience method for getAssetBalance for fungibles
     * @param param0 __namedParameters Object
     * @param accountAddress Account address to check
     * @param tokenAddress The address of the token to check balance for
     * @param schemaName Optional schema name for the fungible token
     * @param retries Number of times to retry if balance is undefined
     */
    async getTokenBalance({ accountAddress, tokenAddress, schemaName = types_1.WyvernSchemaName.ERC20 }, retries = 1) {
        const asset = {
            tokenId: null,
            tokenAddress,
            schemaName
        };
        return this.getAssetBalance({ accountAddress, asset }, retries);
    }
    /**
     * Compute the fees for an order
     * @param param0 __namedParameters
     * @param asset Asset to use for fees. May be blank ONLY for multi-collection bundles.
     * @param side The side of the order (buy or sell)
     * @param accountAddress The account to check fees for (useful if fees differ by account, like transfer fees)
     * @param isPrivate Whether the order is private or not (known taker)
     * @param extraBountyBasisPoints The basis points to add for the bounty. Will throw if it exceeds the assets' contract's OpenSea fee.
     */
    async computeFees({ asset, side, accountAddress, isPrivate = false, extraBountyBasisPoints = 0 }) {
        let openseaBuyerFeeBasisPoints = constants_1.DEFAULT_BUYER_FEE_BASIS_POINTS;
        let openseaSellerFeeBasisPoints = constants_1.DEFAULT_SELLER_FEE_BASIS_POINTS;
        let devBuyerFeeBasisPoints = 0;
        let devSellerFeeBasisPoints = 0;
        let transferFee = utils_1.makeBigNumber(0);
        let transferFeeTokenAddress = null;
        let maxTotalBountyBPS = constants_1.DEFAULT_MAX_BOUNTY;
        if (asset) {
            openseaBuyerFeeBasisPoints = +asset.collection.openseaBuyerFeeBasisPoints;
            openseaSellerFeeBasisPoints = +asset.collection.openseaSellerFeeBasisPoints;
            devBuyerFeeBasisPoints = +asset.collection.devBuyerFeeBasisPoints;
            devSellerFeeBasisPoints = +asset.collection.devSellerFeeBasisPoints;
            maxTotalBountyBPS = openseaSellerFeeBasisPoints;
        }
        // Compute transferFrom fees
        if (side == types_1.OrderSide.Sell && asset) {
            // Server-side knowledge
            transferFee = asset.transferFee
                ? utils_1.makeBigNumber(asset.transferFee)
                : transferFee;
            transferFeeTokenAddress = asset.transferFeePaymentToken
                ? asset.transferFeePaymentToken.address
                : transferFeeTokenAddress;
            try {
                // web3 call to update it
                const result = await utils_1.getTransferFeeSettings(this.web3, { asset, accountAddress });
                transferFee = result.transferFee != null ? result.transferFee : transferFee;
                transferFeeTokenAddress = result.transferFeeTokenAddress || transferFeeTokenAddress;
            }
            catch (error) {
                // Use server defaults
                console.error(error);
            }
        }
        // Compute bounty
        let sellerBountyBasisPoints = side == types_1.OrderSide.Sell
            ? extraBountyBasisPoints
            : 0;
        // Check that bounty is in range of the opensea fee
        const bountyTooLarge = sellerBountyBasisPoints + constants_1.OPENSEA_SELLER_BOUNTY_BASIS_POINTS > maxTotalBountyBPS;
        if (sellerBountyBasisPoints > 0 && bountyTooLarge) {
            let errorMessage = `Total bounty exceeds the maximum for this asset type (${maxTotalBountyBPS / 100}%).`;
            if (maxTotalBountyBPS >= constants_1.OPENSEA_SELLER_BOUNTY_BASIS_POINTS) {
                errorMessage += ` Remember that OpenSea will add ${constants_1.OPENSEA_SELLER_BOUNTY_BASIS_POINTS / 100}% for referrers with OpenSea accounts!`;
            }
            throw new Error(errorMessage);
        }
        // Remove fees for private orders
        if (isPrivate) {
            openseaBuyerFeeBasisPoints = 0;
            openseaSellerFeeBasisPoints = 0;
            devBuyerFeeBasisPoints = 0;
            devSellerFeeBasisPoints = 0;
            sellerBountyBasisPoints = 0;
        }
        return {
            totalBuyerFeeBasisPoints: openseaBuyerFeeBasisPoints + devBuyerFeeBasisPoints,
            totalSellerFeeBasisPoints: openseaSellerFeeBasisPoints + devSellerFeeBasisPoints,
            openseaBuyerFeeBasisPoints,
            openseaSellerFeeBasisPoints,
            devBuyerFeeBasisPoints,
            devSellerFeeBasisPoints,
            sellerBountyBasisPoints,
            transferFee,
            transferFeeTokenAddress,
        };
    }
    /**
     * Validate and post an order to the OpenSea orderbook.
     * @param order The order to post. Can either be signed by the maker or pre-approved on the Wyvern contract using approveOrder. See https://github.com/ProjectWyvern/wyvern-ethereum/blob/master/contracts/exchange/Exchange.sol#L178
     * @returns The order as stored by the orderbook
     */
    async validateAndPostOrder(order) {
        const hash = await this._wyvernProtocolReadOnly.wyvernExchange.hashOrder_.callAsync([order.exchange, order.maker, order.taker, order.feeRecipient, order.target, order.staticTarget, order.paymentToken], [order.makerRelayerFee, order.takerRelayerFee, order.makerProtocolFee, order.takerProtocolFee, order.basePrice, order.extra, order.listingTime, order.expirationTime, order.salt], order.feeMethod, order.side, order.saleKind, order.howToCall, order.calldata, order.replacementPattern, order.staticExtradata);
        if (hash !== order.hash) {
            console.error(order);
            throw new Error(`Order couldn't be validated by the exchange due to a hash mismatch. Make sure your wallet is on the right network!`);
        }
        this.logger('Order hashes match');
        // Validation is called server-side
        const confirmedOrder = await this.api.postOrder(utils_1.orderToJSON(order));
        return confirmedOrder;
    }
    /**
     * DEPRECATED: ERC-1559
     * https://eips.ethereum.org/EIPS/eip-1559
     * Compute the gas price for sending a txn, in wei
     * Will be slightly above the mean to make it faster
     */
    async _computeGasPrice() {
        const meanGas = await utils_1.getCurrentGasPrice(this.web3);
        const weiToAdd = this.web3.toWei(this.gasPriceAddition, 'gwei');
        return meanGas.plus(weiToAdd);
    }
    /**
     * Compute the gas amount for sending a txn
     * Will be slightly above the result of estimateGas to make it more reliable
     * @param estimation The result of estimateGas for a transaction
     */
    _correctGasAmount(estimation) {
        return Math.ceil(estimation * this.gasIncreaseFactor);
    }
    /**
     * Estimate the gas needed to match two orders. Returns undefined if tx errors
     * @param param0 __namedParamaters Object
     * @param buy The buy order to match
     * @param sell The sell order to match
     * @param accountAddress The taker's wallet address
     * @param metadata Metadata bytes32 to send with the match
     * @param retries Number of times to retry if false
     */
    async _estimateGasForMatch({ buy, sell, accountAddress, metadata = constants_1.NULL_BLOCK_HASH }, retries = 1) {
        let value;
        if (buy.maker.toLowerCase() == accountAddress.toLowerCase() && buy.paymentToken == constants_1.NULL_ADDRESS) {
            value = await this._getRequiredAmountForTakingSellOrder(sell);
        }
        try {
            return await this._getClientsForRead(retries).wyvernProtocol.wyvernExchange.atomicMatch_.estimateGasAsync([buy.exchange, buy.maker, buy.taker, buy.feeRecipient, buy.target, buy.staticTarget, buy.paymentToken, sell.exchange, sell.maker, sell.taker, sell.feeRecipient, sell.target, sell.staticTarget, sell.paymentToken], [buy.makerRelayerFee, buy.takerRelayerFee, buy.makerProtocolFee, buy.takerProtocolFee, buy.basePrice, buy.extra, buy.listingTime, buy.expirationTime, buy.salt, sell.makerRelayerFee, sell.takerRelayerFee, sell.makerProtocolFee, sell.takerProtocolFee, sell.basePrice, sell.extra, sell.listingTime, sell.expirationTime, sell.salt], [buy.feeMethod, buy.side, buy.saleKind, buy.howToCall, sell.feeMethod, sell.side, sell.saleKind, sell.howToCall], buy.calldata, sell.calldata, buy.replacementPattern, sell.replacementPattern, buy.staticExtradata, sell.staticExtradata, [
                buy.v || 0,
                sell.v || 0
            ], [
                buy.r || constants_1.NULL_BLOCK_HASH,
                buy.s || constants_1.NULL_BLOCK_HASH,
                sell.r || constants_1.NULL_BLOCK_HASH,
                sell.s || constants_1.NULL_BLOCK_HASH,
                metadata
            ], 
            // Typescript error in estimate gas method, so use any
            { from: accountAddress, value });
        }
        catch (error) {
            if (retries <= 0) {
                console.error(error);
                return undefined;
            }
            await utils_1.delay(200);
            return await this._estimateGasForMatch({ buy, sell, accountAddress, metadata }, retries - 1);
        }
    }
    /**
     * Estimate the gas needed to transfer assets in bulk
     * Used for tests
     * @param param0 __namedParamaters Object
     * @param assets An array of objects with the tokenId and tokenAddress of each of the assets to transfer.
     * @param fromAddress The owner's wallet address
     * @param toAddress The recipient's wallet address
     * @param schemaName The Wyvern schema name corresponding to the asset type, if not in each asset
     */
    async _estimateGasForTransfer({ assets, fromAddress, toAddress, schemaName = types_1.WyvernSchemaName.ERC721 }) {
        const schemaNames = assets.map(asset => asset.schemaName || schemaName);
        const wyAssets = assets.map(asset => utils_1.getWyvernAsset(this._getSchema(asset.schemaName), asset));
        const proxyAddress = await this._getProxy(fromAddress);
        if (!proxyAddress) {
            throw new Error('Uninitialized proxy address');
        }
        await this._approveAll({ schemaNames, wyAssets, accountAddress: fromAddress, proxyAddress });
        const { calldata, target } = schema_1.encodeAtomicizedTransfer(schemaNames.map(name => this._getSchema(name)), wyAssets, fromAddress, toAddress, this._wyvernProtocol, this._networkName);
        return utils_1.estimateGas(this.web3, {
            from: fromAddress,
            to: proxyAddress,
            data: schema_1.encodeProxyCall(target, types_1.HowToCall.DelegateCall, calldata)
        });
    }
    /**
     * Get the proxy address for a user's wallet.
     * Internal method exposed for dev flexibility.
     * @param accountAddress The user's wallet address
     * @param retries Optional number of retries to do
     */
    async _getProxy(accountAddress, retries = 0) {
        let proxyAddress = await this._wyvernProtocolReadOnly.wyvernProxyRegistry.proxies.callAsync(accountAddress);
        if (proxyAddress == '0x') {
            throw new Error("Couldn't retrieve your account from the blockchain - make sure you're on the correct Ethereum network!");
        }
        if (!proxyAddress || proxyAddress == constants_1.NULL_ADDRESS) {
            if (retries > 0) {
                await utils_1.delay(1000);
                return await this._getProxy(accountAddress, retries - 1);
            }
            proxyAddress = null;
        }
        return proxyAddress;
    }
    /**
     * Initialize the proxy for a user's wallet.
     * Proxies are used to make trades on behalf of the order's maker so that
     *  trades can happen when the maker isn't online.
     * Internal method exposed for dev flexibility.
     * @param accountAddress The user's wallet address
     */
    async _initializeProxy(accountAddress) {
        this._dispatch(types_1.EventType.InitializeAccount, { accountAddress });
        this.logger(`Initializing proxy for account: ${accountAddress}`);
        const txnData = { from: accountAddress };
        const gasEstimate = await this._wyvernProtocolReadOnly.wyvernProxyRegistry.registerProxy.estimateGasAsync(txnData);
        const transactionHash = await this._wyvernProtocol.wyvernProxyRegistry.registerProxy.sendTransactionAsync({
            ...txnData,
            gas: this._correctGasAmount(gasEstimate)
        });
        await this._confirmTransaction(transactionHash, types_1.EventType.InitializeAccount, "Initializing proxy for account", async () => {
            const polledProxy = await this._getProxy(accountAddress);
            return !!polledProxy;
        });
        const proxyAddress = await this._getProxy(accountAddress, 10);
        if (!proxyAddress) {
            throw new Error('Failed to initialize your account :( Please restart your wallet/browser and try again!');
        }
        return proxyAddress;
    }
    /**
     * For a fungible token to use in trades (like W-ETH), get the amount
     *  approved for use by the Wyvern transfer proxy.
     * Internal method exposed for dev flexibility.
     * @param param0 __namedParamters Object
     * @param accountAddress Address for the user's wallet
     * @param tokenAddress Address for the token's contract
     * @param proxyAddress User's proxy address. If undefined, uses the token transfer proxy address
     */
    async _getApprovedTokenCount({ accountAddress, tokenAddress, proxyAddress }) {
        if (!tokenAddress) {
            tokenAddress = WyvernSchemas.tokens[this._networkName].canonicalWrappedEther.address;
        }
        const addressToApprove = proxyAddress || wyvern_js_1.WyvernProtocol.getTokenTransferProxyAddress(this._networkName);
        // NOTE: the way this is implemented, if the JSONRPC call errors out for whatever reason,
        // this library now thinks that the amount approved is 0!
        const approved = await utils_1.rawCall(this.web3, {
            from: accountAddress,
            to: tokenAddress,
            data: schema_1.encodeCall(contracts_1.getMethod(contracts_1.ERC20, 'allowance'), [accountAddress, addressToApprove]),
        });
        return utils_1.makeBigNumber(approved);
    }
    async _makeBuyOrder({ asset, quantity, accountAddress, startAmount, expirationTime = 0, paymentTokenAddress, extraBountyBasisPoints = 0, sellOrder, referrerAddress }) {
        accountAddress = utils_1.validateAndFormatWalletAddress(this.web3, accountAddress);
        const schema = this._getSchema(asset.schemaName);
        const quantityBN = wyvern_js_1.WyvernProtocol.toBaseUnitAmount(utils_1.makeBigNumber(quantity), asset.decimals || 0);
        const wyAsset = utils_1.getWyvernAsset(schema, asset, quantityBN);
        const openSeaAsset = await this.api.getAsset(asset);
        const taker = sellOrder
            ? sellOrder.maker
            : constants_1.NULL_ADDRESS;
        const { totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints } = await this.computeFees({ asset: openSeaAsset, extraBountyBasisPoints, side: types_1.OrderSide.Buy });
        const { makerRelayerFee, takerRelayerFee, makerProtocolFee, takerProtocolFee, makerReferrerFee, feeRecipient, feeMethod } = this._getBuyFeeParameters(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints, sellOrder);
        const { target, calldata, replacementPattern } = schema_1.encodeBuy(schema, wyAsset, accountAddress);
        const { basePrice, extra, paymentToken } = await this._getPriceParameters(types_1.OrderSide.Buy, paymentTokenAddress, expirationTime, startAmount);
        const times = this._getTimeParameters(expirationTime);
        const { staticTarget, staticExtradata } = await this._getStaticCallTargetAndExtraData({ asset: openSeaAsset, useTxnOriginStaticCall: false });
        return {
            exchange: wyvern_js_1.WyvernProtocol.getExchangeContractAddress(this._networkName),
            maker: accountAddress,
            taker,
            quantity: quantityBN,
            makerRelayerFee,
            takerRelayerFee,
            makerProtocolFee,
            takerProtocolFee,
            makerReferrerFee,
            waitingForBestCounterOrder: false,
            feeMethod,
            feeRecipient,
            side: types_1.OrderSide.Buy,
            saleKind: types_1.SaleKind.FixedPrice,
            target,
            howToCall: types_1.HowToCall.Call,
            calldata,
            replacementPattern,
            staticTarget,
            staticExtradata,
            paymentToken,
            basePrice,
            extra,
            listingTime: times.listingTime,
            expirationTime: times.expirationTime,
            salt: wyvern_js_1.WyvernProtocol.generatePseudoRandomSalt(),
            metadata: {
                asset: wyAsset,
                schema: schema.name,
                referrerAddress
            }
        };
    }
    async _makeSellOrder({ asset, quantity, accountAddress, startAmount, endAmount, listingTime, expirationTime, waitForHighestBid, englishAuctionReservePrice = 0, paymentTokenAddress, extraBountyBasisPoints, buyerAddress }) {
        accountAddress = utils_1.validateAndFormatWalletAddress(this.web3, accountAddress);
        const schema = this._getSchema(asset.schemaName);
        const quantityBN = wyvern_js_1.WyvernProtocol.toBaseUnitAmount(utils_1.makeBigNumber(quantity), asset.decimals || 0);
        const wyAsset = utils_1.getWyvernAsset(schema, asset, quantityBN);
        const isPrivate = buyerAddress != constants_1.NULL_ADDRESS;
        const openSeaAsset = await this.api.getAsset(asset);
        const { totalSellerFeeBasisPoints, totalBuyerFeeBasisPoints, sellerBountyBasisPoints } = await this.computeFees({ asset: openSeaAsset, side: types_1.OrderSide.Sell, isPrivate, extraBountyBasisPoints });
        const { target, calldata, replacementPattern } = schema_1.encodeSell(schema, wyAsset, accountAddress);
        const orderSaleKind = endAmount != null && endAmount !== startAmount
            ? types_1.SaleKind.DutchAuction
            : types_1.SaleKind.FixedPrice;
        const { basePrice, extra, paymentToken, reservePrice } = await this._getPriceParameters(types_1.OrderSide.Sell, paymentTokenAddress, expirationTime, startAmount, endAmount, waitForHighestBid, englishAuctionReservePrice);
        const times = this._getTimeParameters(expirationTime, listingTime, waitForHighestBid);
        const { makerRelayerFee, takerRelayerFee, makerProtocolFee, takerProtocolFee, makerReferrerFee, feeRecipient, feeMethod } = this._getSellFeeParameters(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints, waitForHighestBid, sellerBountyBasisPoints);
        const { staticTarget, staticExtradata } = await this._getStaticCallTargetAndExtraData({ asset: openSeaAsset, useTxnOriginStaticCall: waitForHighestBid });
        return {
            exchange: wyvern_js_1.WyvernProtocol.getExchangeContractAddress(this._networkName),
            maker: accountAddress,
            taker: buyerAddress,
            quantity: quantityBN,
            makerRelayerFee,
            takerRelayerFee,
            makerProtocolFee,
            takerProtocolFee,
            makerReferrerFee,
            waitingForBestCounterOrder: waitForHighestBid,
            englishAuctionReservePrice: reservePrice ? utils_1.makeBigNumber(reservePrice) : undefined,
            feeMethod,
            feeRecipient,
            side: types_1.OrderSide.Sell,
            saleKind: orderSaleKind,
            target,
            howToCall: types_1.HowToCall.Call,
            calldata,
            replacementPattern,
            staticTarget,
            staticExtradata,
            paymentToken,
            basePrice,
            extra,
            listingTime: times.listingTime,
            expirationTime: times.expirationTime,
            salt: wyvern_js_1.WyvernProtocol.generatePseudoRandomSalt(),
            metadata: {
                asset: wyAsset,
                schema: schema.name,
            }
        };
    }
    async _getStaticCallTargetAndExtraData({ asset, useTxnOriginStaticCall }) {
        const isCheezeWizards = [
            constants_1.CHEEZE_WIZARDS_GUILD_ADDRESS.toLowerCase(),
            constants_1.CHEEZE_WIZARDS_GUILD_RINKEBY_ADDRESS.toLowerCase()
        ].includes(asset.tokenAddress.toLowerCase());
        const isDecentralandEstate = asset.tokenAddress.toLowerCase() == constants_1.DECENTRALAND_ESTATE_ADDRESS.toLowerCase();
        const isMainnet = this._networkName == types_1.Network.Main;
        if (isMainnet && !useTxnOriginStaticCall) {
            // While testing, we will use dummy values for mainnet. We will remove this if-statement once we have pushed the PR once and tested on Rinkeby
            return {
                staticTarget: constants_1.NULL_ADDRESS,
                staticExtradata: '0x',
            };
        }
        if (isCheezeWizards) {
            const cheezeWizardsBasicTournamentAddress = isMainnet ? constants_1.CHEEZE_WIZARDS_BASIC_TOURNAMENT_ADDRESS : constants_1.CHEEZE_WIZARDS_BASIC_TOURNAMENT_RINKEBY_ADDRESS;
            const cheezeWizardsBasicTournamentABI = this.web3.eth.contract(contracts_1.CheezeWizardsBasicTournament);
            const cheezeWizardsBasicTournmentInstance = await cheezeWizardsBasicTournamentABI.at(cheezeWizardsBasicTournamentAddress);
            const wizardFingerprint = await utils_1.rawCall(this.web3, {
                to: cheezeWizardsBasicTournmentInstance.address,
                data: cheezeWizardsBasicTournmentInstance.wizardFingerprint.getData(asset.tokenId)
            });
            return {
                staticTarget: isMainnet
                    ? constants_1.STATIC_CALL_CHEEZE_WIZARDS_ADDRESS
                    : constants_1.STATIC_CALL_CHEEZE_WIZARDS_RINKEBY_ADDRESS,
                staticExtradata: schema_1.encodeCall(contracts_1.getMethod(contracts_1.StaticCheckCheezeWizards, 'succeedIfCurrentWizardFingerprintMatchesProvidedWizardFingerprint'), [asset.tokenId, wizardFingerprint, useTxnOriginStaticCall]),
            };
        }
        else if (isDecentralandEstate && isMainnet) {
            // We stated that we will only use Decentraland estates static
            // calls on mainnet, since Decentraland uses Ropsten
            const decentralandEstateAddress = constants_1.DECENTRALAND_ESTATE_ADDRESS;
            const decentralandEstateABI = this.web3.eth.contract(contracts_1.DecentralandEstates);
            const decentralandEstateInstance = await decentralandEstateABI.at(decentralandEstateAddress);
            const estateFingerprint = await utils_1.rawCall(this.web3, {
                to: decentralandEstateInstance.address,
                data: decentralandEstateInstance.getFingerprint.getData(asset.tokenId)
            });
            return {
                staticTarget: constants_1.STATIC_CALL_DECENTRALAND_ESTATES_ADDRESS,
                staticExtradata: schema_1.encodeCall(contracts_1.getMethod(contracts_1.StaticCheckDecentralandEstates, 'succeedIfCurrentEstateFingerprintMatchesProvidedEstateFingerprint'), [asset.tokenId, estateFingerprint, useTxnOriginStaticCall]),
            };
        }
        else if (useTxnOriginStaticCall) {
            return {
                staticTarget: isMainnet
                    ? constants_1.STATIC_CALL_TX_ORIGIN_ADDRESS
                    : constants_1.STATIC_CALL_TX_ORIGIN_RINKEBY_ADDRESS,
                staticExtradata: schema_1.encodeCall(contracts_1.getMethod(contracts_1.StaticCheckTxOrigin, 'succeedIfTxOriginMatchesHardcodedAddress'), []),
            };
        }
        else {
            // Noop - no checks
            return {
                staticTarget: constants_1.NULL_ADDRESS,
                staticExtradata: '0x',
            };
        }
    }
    async _makeBundleBuyOrder({ assets, collection, quantities, accountAddress, startAmount, expirationTime = 0, paymentTokenAddress, extraBountyBasisPoints = 0, sellOrder, referrerAddress }) {
        accountAddress = utils_1.validateAndFormatWalletAddress(this.web3, accountAddress);
        const quantityBNs = quantities.map((quantity, i) => wyvern_js_1.WyvernProtocol.toBaseUnitAmount(utils_1.makeBigNumber(quantity), assets[i].decimals || 0));
        const bundle = utils_1.getWyvernBundle(assets, assets.map(a => this._getSchema(a.schemaName)), quantityBNs);
        const orderedSchemas = bundle.schemas.map(name => this._getSchema(name));
        const taker = sellOrder
            ? sellOrder.maker
            : constants_1.NULL_ADDRESS;
        // If all assets are for the same collection, use its fees
        const asset = collection
            ? await this.api.getAsset(assets[0])
            : undefined;
        const { totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints } = await this.computeFees({ asset, extraBountyBasisPoints, side: types_1.OrderSide.Buy });
        const { makerRelayerFee, takerRelayerFee, makerProtocolFee, takerProtocolFee, makerReferrerFee, feeRecipient, feeMethod } = this._getBuyFeeParameters(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints, sellOrder);
        const { calldata, replacementPattern } = schema_1.encodeAtomicizedBuy(orderedSchemas, bundle.assets, accountAddress, this._wyvernProtocol, this._networkName);
        const { basePrice, extra, paymentToken } = await this._getPriceParameters(types_1.OrderSide.Buy, paymentTokenAddress, expirationTime, startAmount);
        const times = this._getTimeParameters(expirationTime);
        return {
            exchange: wyvern_js_1.WyvernProtocol.getExchangeContractAddress(this._networkName),
            maker: accountAddress,
            taker,
            quantity: utils_1.makeBigNumber(1),
            makerRelayerFee,
            takerRelayerFee,
            makerProtocolFee,
            takerProtocolFee,
            makerReferrerFee,
            waitingForBestCounterOrder: false,
            feeMethod,
            feeRecipient,
            side: types_1.OrderSide.Buy,
            saleKind: types_1.SaleKind.FixedPrice,
            target: wyvern_js_1.WyvernProtocol.getAtomicizerContractAddress(this._networkName),
            howToCall: types_1.HowToCall.DelegateCall,
            calldata,
            replacementPattern,
            staticTarget: constants_1.NULL_ADDRESS,
            staticExtradata: '0x',
            paymentToken,
            basePrice,
            extra,
            listingTime: times.listingTime,
            expirationTime: times.expirationTime,
            salt: wyvern_js_1.WyvernProtocol.generatePseudoRandomSalt(),
            metadata: {
                bundle,
                referrerAddress
            }
        };
    }
    async _makeBundleSellOrder({ bundleName, bundleDescription, bundleExternalLink, assets, collection, quantities, accountAddress, startAmount, endAmount, listingTime, expirationTime, waitForHighestBid, englishAuctionReservePrice = 0, paymentTokenAddress, extraBountyBasisPoints, buyerAddress }) {
        accountAddress = utils_1.validateAndFormatWalletAddress(this.web3, accountAddress);
        const quantityBNs = quantities.map((quantity, i) => wyvern_js_1.WyvernProtocol.toBaseUnitAmount(utils_1.makeBigNumber(quantity), assets[i].decimals || 0));
        const bundle = utils_1.getWyvernBundle(assets, assets.map(a => this._getSchema(a.schemaName)), quantityBNs);
        const orderedSchemas = bundle.schemas.map(name => this._getSchema(name));
        bundle.name = bundleName;
        bundle.description = bundleDescription;
        bundle.external_link = bundleExternalLink;
        const isPrivate = buyerAddress != constants_1.NULL_ADDRESS;
        // If all assets are for the same collection, use its fees
        const asset = collection
            ? await this.api.getAsset(assets[0])
            : undefined;
        const { totalSellerFeeBasisPoints, totalBuyerFeeBasisPoints, sellerBountyBasisPoints } = await this.computeFees({ asset, side: types_1.OrderSide.Sell, isPrivate, extraBountyBasisPoints });
        const { calldata, replacementPattern } = schema_1.encodeAtomicizedSell(orderedSchemas, bundle.assets, accountAddress, this._wyvernProtocol, this._networkName);
        const { basePrice, extra, paymentToken, reservePrice } = await this._getPriceParameters(types_1.OrderSide.Sell, paymentTokenAddress, expirationTime, startAmount, endAmount, waitForHighestBid, englishAuctionReservePrice);
        const times = this._getTimeParameters(expirationTime, listingTime, waitForHighestBid);
        const orderSaleKind = endAmount != null && endAmount !== startAmount
            ? types_1.SaleKind.DutchAuction
            : types_1.SaleKind.FixedPrice;
        const { makerRelayerFee, takerRelayerFee, makerProtocolFee, takerProtocolFee, makerReferrerFee, feeRecipient } = this._getSellFeeParameters(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints, waitForHighestBid, sellerBountyBasisPoints);
        return {
            exchange: wyvern_js_1.WyvernProtocol.getExchangeContractAddress(this._networkName),
            maker: accountAddress,
            taker: buyerAddress,
            quantity: utils_1.makeBigNumber(1),
            makerRelayerFee,
            takerRelayerFee,
            makerProtocolFee,
            takerProtocolFee,
            makerReferrerFee,
            waitingForBestCounterOrder: waitForHighestBid,
            englishAuctionReservePrice: reservePrice ? utils_1.makeBigNumber(reservePrice) : undefined,
            feeMethod: types_1.FeeMethod.SplitFee,
            feeRecipient,
            side: types_1.OrderSide.Sell,
            saleKind: orderSaleKind,
            target: wyvern_js_1.WyvernProtocol.getAtomicizerContractAddress(this._networkName),
            howToCall: types_1.HowToCall.DelegateCall,
            calldata,
            replacementPattern,
            staticTarget: constants_1.NULL_ADDRESS,
            staticExtradata: '0x',
            paymentToken,
            basePrice,
            extra,
            listingTime: times.listingTime,
            expirationTime: times.expirationTime,
            salt: wyvern_js_1.WyvernProtocol.generatePseudoRandomSalt(),
            metadata: {
                bundle
            }
        };
    }
    _makeMatchingOrder({ order, accountAddress, recipientAddress }) {
        accountAddress = utils_1.validateAndFormatWalletAddress(this.web3, accountAddress);
        recipientAddress = utils_1.validateAndFormatWalletAddress(this.web3, recipientAddress);
        const computeOrderParams = () => {
            if ('asset' in order.metadata) {
                const schema = this._getSchema(order.metadata.schema);
                return order.side == types_1.OrderSide.Buy
                    ? schema_1.encodeSell(schema, order.metadata.asset, recipientAddress)
                    : schema_1.encodeBuy(schema, order.metadata.asset, recipientAddress);
            }
            else if ('bundle' in order.metadata) {
                // We're matching a bundle order
                const bundle = order.metadata.bundle;
                const orderedSchemas = bundle.schemas
                    ? bundle.schemas.map(schemaName => this._getSchema(schemaName))
                    // Backwards compat:
                    : bundle.assets.map(() => this._getSchema('schema' in order.metadata
                        ? order.metadata.schema
                        : undefined));
                const atomicized = order.side == types_1.OrderSide.Buy
                    ? schema_1.encodeAtomicizedSell(orderedSchemas, order.metadata.bundle.assets, recipientAddress, this._wyvernProtocol, this._networkName)
                    : schema_1.encodeAtomicizedBuy(orderedSchemas, order.metadata.bundle.assets, recipientAddress, this._wyvernProtocol, this._networkName);
                return {
                    target: wyvern_js_1.WyvernProtocol.getAtomicizerContractAddress(this._networkName),
                    calldata: atomicized.calldata,
                    replacementPattern: atomicized.replacementPattern
                };
            }
            else {
                throw new Error('Invalid order metadata');
            }
        };
        const { target, calldata, replacementPattern } = computeOrderParams();
        const times = this._getTimeParameters(0);
        // Compat for matching buy orders that have fee recipient still on them
        const feeRecipient = order.feeRecipient == constants_1.NULL_ADDRESS
            ? constants_1.OPENSEA_FEE_RECIPIENT
            : constants_1.NULL_ADDRESS;
        const matchingOrder = {
            exchange: order.exchange,
            maker: accountAddress,
            taker: order.maker,
            quantity: order.quantity,
            makerRelayerFee: order.makerRelayerFee,
            takerRelayerFee: order.takerRelayerFee,
            makerProtocolFee: order.makerProtocolFee,
            takerProtocolFee: order.takerProtocolFee,
            makerReferrerFee: order.makerReferrerFee,
            waitingForBestCounterOrder: false,
            feeMethod: order.feeMethod,
            feeRecipient,
            side: (order.side + 1) % 2,
            saleKind: types_1.SaleKind.FixedPrice,
            target,
            howToCall: order.howToCall,
            calldata,
            replacementPattern,
            staticTarget: constants_1.NULL_ADDRESS,
            staticExtradata: '0x',
            paymentToken: order.paymentToken,
            basePrice: order.basePrice,
            extra: utils_1.makeBigNumber(0),
            listingTime: times.listingTime,
            expirationTime: times.expirationTime,
            salt: wyvern_js_1.WyvernProtocol.generatePseudoRandomSalt(),
            metadata: order.metadata,
        };
        return {
            ...matchingOrder,
            hash: utils_1.getOrderHash(matchingOrder)
        };
    }
    /**
     * Validate against Wyvern that a buy and sell order can match
     * @param param0 __namedParamters Object
     * @param buy The buy order to validate
     * @param sell The sell order to validate
     * @param accountAddress Address for the user's wallet
     * @param shouldValidateBuy Whether to validate the buy order individually.
     * @param shouldValidateSell Whether to validate the sell order individually.
     * @param retries How many times to retry if validation fails
     */
    async _validateMatch({ buy, sell, accountAddress, shouldValidateBuy = false, shouldValidateSell = false }, retries = 1) {
        try {
            if (shouldValidateBuy) {
                const buyValid = await this._validateOrder(buy);
                this.logger(`Buy order is valid: ${buyValid}`);
                if (!buyValid) {
                    throw new Error('Invalid buy order. It may have recently been removed. Please refresh the page and try again!');
                }
            }
            if (shouldValidateSell) {
                const sellValid = await this._validateOrder(sell);
                this.logger(`Sell order is valid: ${sellValid}`);
                if (!sellValid) {
                    throw new Error('Invalid sell order. It may have recently been removed. Please refresh the page and try again!');
                }
            }
            const canMatch = await debugging_1.requireOrdersCanMatch(this._getClientsForRead(retries).wyvernProtocol, { buy, sell, accountAddress });
            this.logger(`Orders matching: ${canMatch}`);
            const calldataCanMatch = await debugging_1.requireOrderCalldataCanMatch(this._getClientsForRead(retries).wyvernProtocol, { buy, sell });
            this.logger(`Order calldata matching: ${calldataCanMatch}`);
            return true;
        }
        catch (error) {
            if (retries <= 0) {
                throw new Error(`Error matching this listing: ${error.message}. Please contact the maker or try again later!`);
            }
            await utils_1.delay(500);
            return await this._validateMatch({ buy, sell, accountAddress, shouldValidateBuy, shouldValidateSell }, retries - 1);
        }
    }
    // For creating email whitelists on order takers
    async _createEmailWhitelistEntry({ order, buyerEmail }) {
        const asset = 'asset' in order.metadata
            ? order.metadata.asset
            : undefined;
        if (!asset || !asset.id) {
            throw new Error("Whitelisting only available for non-fungible assets.");
        }
        await this.api.postAssetWhitelist(asset.address, asset.id, buyerEmail);
    }
    // Throws
    async _sellOrderValidationAndApprovals({ order, accountAddress }) {
        const wyAssets = 'bundle' in order.metadata
            ? order.metadata.bundle.assets
            : order.metadata.asset
                ? [order.metadata.asset]
                : [];
        const schemaNames = 'bundle' in order.metadata && 'schemas' in order.metadata.bundle
            ? order.metadata.bundle.schemas
            : 'schema' in order.metadata
                ? [order.metadata.schema]
                : [];
        const tokenAddress = order.paymentToken;
        await this._approveAll({ schemaNames, wyAssets, accountAddress });
        // For fulfilling bids,
        // need to approve access to fungible token because of the way fees are paid
        // This can be done at a higher level to show UI
        if (tokenAddress != constants_1.NULL_ADDRESS) {
            const minimumAmount = utils_1.makeBigNumber(order.basePrice);
            await this.approveFungibleToken({ accountAddress, tokenAddress, minimumAmount });
        }
        // Check sell parameters
        const sellValid = await this._wyvernProtocolReadOnly.wyvernExchange.validateOrderParameters_.callAsync([order.exchange, order.maker, order.taker, order.feeRecipient, order.target, order.staticTarget, order.paymentToken], [order.makerRelayerFee, order.takerRelayerFee, order.makerProtocolFee, order.takerProtocolFee, order.basePrice, order.extra, order.listingTime, order.expirationTime, order.salt], order.feeMethod, order.side, order.saleKind, order.howToCall, order.calldata, order.replacementPattern, order.staticExtradata, { from: accountAddress });
        if (!sellValid) {
            console.error(order);
            throw new Error(`Failed to validate sell order parameters. Make sure you're on the right network!`);
        }
    }
    /**
     * Instead of signing an off-chain order, you can approve an order
     * with on on-chain transaction using this method
     * @param order Order to approve
     * @returns Transaction hash of the approval transaction
     */
    async _approveOrder(order) {
        const accountAddress = order.maker;
        const includeInOrderBook = true;
        this._dispatch(types_1.EventType.ApproveOrder, { order, accountAddress });
        const transactionHash = await this._wyvernProtocol.wyvernExchange.approveOrder_.sendTransactionAsync([order.exchange, order.maker, order.taker, order.feeRecipient, order.target, order.staticTarget, order.paymentToken], [order.makerRelayerFee, order.takerRelayerFee, order.makerProtocolFee, order.takerProtocolFee, order.basePrice, order.extra, order.listingTime, order.expirationTime, order.salt], order.feeMethod, order.side, order.saleKind, order.howToCall, order.calldata, order.replacementPattern, order.staticExtradata, includeInOrderBook, { from: accountAddress });
        await this._confirmTransaction(transactionHash.toString(), types_1.EventType.ApproveOrder, "Approving order", async () => {
            const isApproved = await this._validateOrder(order);
            return isApproved;
        });
        return transactionHash;
    }
    async _validateOrder(order) {
        const isValid = await this._wyvernProtocolReadOnly.wyvernExchange.validateOrder_.callAsync([order.exchange, order.maker, order.taker, order.feeRecipient, order.target, order.staticTarget, order.paymentToken], [order.makerRelayerFee, order.takerRelayerFee, order.makerProtocolFee, order.takerProtocolFee, order.basePrice, order.extra, order.listingTime, order.expirationTime, order.salt], order.feeMethod, order.side, order.saleKind, order.howToCall, order.calldata, order.replacementPattern, order.staticExtradata, order.v || 0, order.r || constants_1.NULL_BLOCK_HASH, order.s || constants_1.NULL_BLOCK_HASH);
        return isValid;
    }
    async _approveAll({ schemaNames, wyAssets, accountAddress, proxyAddress }) {
        proxyAddress = proxyAddress || await this._getProxy(accountAddress) || undefined;
        if (!proxyAddress) {
            proxyAddress = await this._initializeProxy(accountAddress);
        }
        const contractsWithApproveAll = new Set();
        return Promise.all(wyAssets.map(async (wyAsset, i) => {
            const schemaName = schemaNames[i];
            // Verify that the taker owns the asset
            let isOwner;
            try {
                isOwner = await this._ownsAssetOnChain({
                    accountAddress,
                    proxyAddress,
                    wyAsset,
                    schemaName
                });
            }
            catch (error) {
                // let it through for assets we don't support yet
                isOwner = true;
            }
            if (!isOwner) {
                const minAmount = 'quantity' in wyAsset
                    ? wyAsset.quantity
                    : 1;
                console.error(`Failed on-chain ownership check: ${accountAddress} on ${schemaName}:`, wyAsset);
                throw new Error(`You don't own enough to do that (${minAmount} base units of ${wyAsset.address}${wyAsset.id ? (" token " + wyAsset.id) : ''})`);
            }
            switch (schemaName) {
                case types_1.WyvernSchemaName.ERC721:
                case types_1.WyvernSchemaName.ERC1155:
                case types_1.WyvernSchemaName.LegacyEnjin:
                case types_1.WyvernSchemaName.ENSShortNameAuction:
                    // Handle NFTs and SFTs
                    const wyNFTAsset = wyAsset;
                    return await this.approveSemiOrNonFungibleToken({
                        tokenId: wyNFTAsset.id.toString(),
                        tokenAddress: wyNFTAsset.address,
                        accountAddress,
                        proxyAddress,
                        schemaName,
                        skipApproveAllIfTokenAddressIn: contractsWithApproveAll
                    });
                case types_1.WyvernSchemaName.ERC20:
                    // Handle FTs
                    const wyFTAsset = wyAsset;
                    if (contractsWithApproveAll.has(wyFTAsset.address)) {
                        // Return null to indicate no tx occurred
                        return null;
                    }
                    contractsWithApproveAll.add(wyFTAsset.address);
                    return await this.approveFungibleToken({
                        tokenAddress: wyFTAsset.address,
                        accountAddress,
                        proxyAddress
                    });
                // For other assets, including contracts:
                // Send them to the user's proxy
                // if (where != WyvernAssetLocation.Proxy) {
                //   return this.transferOne({
                //     schemaName: schema.name,
                //     asset: wyAsset,
                //     isWyvernAsset: true,
                //     fromAddress: accountAddress,
                //     toAddress: proxy
                //   })
                // }
                // return true
            }
        }));
    }
    // Throws
    async _buyOrderValidationAndApprovals({ order, counterOrder, accountAddress }) {
        const tokenAddress = order.paymentToken;
        if (tokenAddress != constants_1.NULL_ADDRESS) {
            const balance = await this.getTokenBalance({ accountAddress, tokenAddress });
            /* NOTE: no buy-side auctions for now, so sell.saleKind === 0 */
            let minimumAmount = utils_1.makeBigNumber(order.basePrice);
            if (counterOrder) {
                minimumAmount = await this._getRequiredAmountForTakingSellOrder(counterOrder);
            }
            // Check WETH balance
            if (balance.toNumber() < minimumAmount.toNumber()) {
                if (tokenAddress == WyvernSchemas.tokens[this._networkName].canonicalWrappedEther.address) {
                    throw new Error('Insufficient balance. You may need to wrap Ether.');
                }
                else {
                    throw new Error('Insufficient balance.');
                }
            }
            // Check token approval
            // This can be done at a higher level to show UI
            // await this.approveFungibleToken({ accountAddress, tokenAddress, minimumAmount })
            const approved = this.checkFungibleTokenApproval({ accountAddress, tokenAddress, minimumAmount });
            if (!approved) {
                throw new Error('Payment token not approved! Approve amount first on site!');
            }
        }
        // Check order formation
        const buyValid = await this._wyvernProtocolReadOnly.wyvernExchange.validateOrderParameters_.callAsync([order.exchange, order.maker, order.taker, order.feeRecipient, order.target, order.staticTarget, order.paymentToken], [order.makerRelayerFee, order.takerRelayerFee, order.makerProtocolFee, order.takerProtocolFee, order.basePrice, order.extra, order.listingTime, order.expirationTime, order.salt], order.feeMethod, order.side, order.saleKind, order.howToCall, order.calldata, order.replacementPattern, order.staticExtradata, { from: accountAddress });
        if (!buyValid) {
            console.error(order);
            throw new Error(`Failed to validate buy order parameters. Make sure you're on the right network!`);
        }
    }
    /**
     * Check if an account, or its proxy, owns an asset on-chain
     * @param accountAddress Account address for the wallet
     * @param proxyAddress Proxy address for the account
     * @param wyAsset asset to check. If fungible, the `quantity` attribute will be the minimum amount to own
     * @param schemaName WyvernSchemaName for the asset
     */
    async _ownsAssetOnChain({ accountAddress, proxyAddress, wyAsset, schemaName }) {
        const asset = {
            tokenId: wyAsset.id || null,
            tokenAddress: wyAsset.address,
            schemaName
        };
        const minAmount = new bignumber_js_1.BigNumber('quantity' in wyAsset
            ? wyAsset.quantity
            : 1);
        const accountBalance = await this.getAssetBalance({ accountAddress, asset });
        if (accountBalance.greaterThanOrEqualTo(minAmount)) {
            return true;
        }
        proxyAddress = proxyAddress || await this._getProxy(accountAddress);
        if (proxyAddress) {
            const proxyBalance = await this.getAssetBalance({ accountAddress: proxyAddress, asset });
            if (proxyBalance.greaterThanOrEqualTo(minAmount)) {
                return true;
            }
        }
        return false;
    }
    _getBuyFeeParameters(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints, sellOrder) {
        this._validateFees(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints);
        let makerRelayerFee;
        let takerRelayerFee;
        if (sellOrder) {
            // Use the sell order's fees to ensure compatiblity and force the order
            // to only be acceptable by the sell order maker.
            // Swap maker/taker depending on whether it's an English auction (taker)
            // TODO add extraBountyBasisPoints when making bidder bounties
            makerRelayerFee = sellOrder.waitingForBestCounterOrder
                ? utils_1.makeBigNumber(sellOrder.makerRelayerFee)
                : utils_1.makeBigNumber(sellOrder.takerRelayerFee);
            takerRelayerFee = sellOrder.waitingForBestCounterOrder
                ? utils_1.makeBigNumber(sellOrder.takerRelayerFee)
                : utils_1.makeBigNumber(sellOrder.makerRelayerFee);
        }
        else {
            makerRelayerFee = utils_1.makeBigNumber(totalBuyerFeeBasisPoints);
            takerRelayerFee = utils_1.makeBigNumber(totalSellerFeeBasisPoints);
        }
        return {
            makerRelayerFee,
            takerRelayerFee,
            makerProtocolFee: utils_1.makeBigNumber(0),
            takerProtocolFee: utils_1.makeBigNumber(0),
            makerReferrerFee: utils_1.makeBigNumber(0),
            feeRecipient: constants_1.OPENSEA_FEE_RECIPIENT,
            feeMethod: types_1.FeeMethod.SplitFee
        };
    }
    _getSellFeeParameters(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints, waitForHighestBid, sellerBountyBasisPoints = 0) {
        this._validateFees(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints);
        // Use buyer as the maker when it's an English auction, so Wyvern sets prices correctly
        const feeRecipient = waitForHighestBid
            ? constants_1.NULL_ADDRESS
            : constants_1.OPENSEA_FEE_RECIPIENT;
        // Swap maker/taker fees when it's an English auction,
        // since these sell orders are takers not makers
        const makerRelayerFee = waitForHighestBid
            ? utils_1.makeBigNumber(totalBuyerFeeBasisPoints)
            : utils_1.makeBigNumber(totalSellerFeeBasisPoints);
        const takerRelayerFee = waitForHighestBid
            ? utils_1.makeBigNumber(totalSellerFeeBasisPoints)
            : utils_1.makeBigNumber(totalBuyerFeeBasisPoints);
        return {
            makerRelayerFee,
            takerRelayerFee,
            makerProtocolFee: utils_1.makeBigNumber(0),
            takerProtocolFee: utils_1.makeBigNumber(0),
            makerReferrerFee: utils_1.makeBigNumber(sellerBountyBasisPoints),
            feeRecipient,
            feeMethod: types_1.FeeMethod.SplitFee
        };
    }
    /**
     * Validate fee parameters
     * @param totalBuyerFeeBasisPoints Total buyer fees
     * @param totalSellerFeeBasisPoints Total seller fees
     */
    _validateFees(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints) {
        const maxFeePercent = constants_1.INVERSE_BASIS_POINT / 100;
        if (totalBuyerFeeBasisPoints > constants_1.INVERSE_BASIS_POINT
            || totalSellerFeeBasisPoints > constants_1.INVERSE_BASIS_POINT) {
            throw new Error(`Invalid buyer/seller fees: must be less than ${maxFeePercent}%`);
        }
        if (totalBuyerFeeBasisPoints < 0
            || totalSellerFeeBasisPoints < 0) {
            throw new Error(`Invalid buyer/seller fees: must be at least 0%`);
        }
    }
    /**
     * Get the listing and expiration time paramters for a new order
     * @param expirationTimestamp Timestamp to expire the order (in seconds), or 0 for non-expiring
     * @param listingTimestamp Timestamp to start the order (in seconds), or undefined to start it now
     * @param waitingForBestCounterOrder Whether this order should be hidden until the best match is found
     */
    _getTimeParameters(expirationTimestamp, listingTimestamp, waitingForBestCounterOrder = false) {
        // Validation
        const minExpirationTimestamp = Math.round(Date.now() / 1000 + constants_1.MIN_EXPIRATION_SECONDS);
        const minListingTimestamp = Math.round(Date.now() / 1000);
        if (expirationTimestamp != 0 && expirationTimestamp < minExpirationTimestamp) {
            throw new Error(`Expiration time must be at least ${constants_1.MIN_EXPIRATION_SECONDS} seconds from now, or zero (non-expiring).`);
        }
        if (listingTimestamp && listingTimestamp < minListingTimestamp) {
            throw new Error('Listing time cannot be in the past.');
        }
        if (listingTimestamp && expirationTimestamp != 0 && listingTimestamp >= expirationTimestamp) {
            throw new Error('Listing time must be before the expiration time.');
        }
        if (waitingForBestCounterOrder && expirationTimestamp == 0) {
            throw new Error('English auctions must have an expiration time.');
        }
        if (waitingForBestCounterOrder && listingTimestamp) {
            throw new Error(`Cannot schedule an English auction for the future.`);
        }
        if (parseInt(expirationTimestamp.toString()) != expirationTimestamp) {
            throw new Error(`Expiration timestamp must be a whole number of seconds`);
        }
        if (waitingForBestCounterOrder) {
            listingTimestamp = expirationTimestamp;
            // Expire one week from now, to ensure server can match it
            // Later, this will expire closer to the listingTime
            expirationTimestamp = expirationTimestamp + constants_1.ORDER_MATCHING_LATENCY_SECONDS;
        }
        else {
            // Small offset to account for latency
            listingTimestamp = listingTimestamp || Math.round(Date.now() / 1000 - 100);
        }
        return {
            listingTime: utils_1.makeBigNumber(listingTimestamp),
            expirationTime: utils_1.makeBigNumber(expirationTimestamp),
        };
    }
    /**
     * Compute the `basePrice` and `extra` parameters to be used to price an order.
     * Also validates the expiration time and auction type.
     * @param tokenAddress Address of the ERC-20 token to use for trading.
     * Use the null address for ETH
     * @param expirationTime When the auction expires, or 0 if never.
     * @param startAmount The base value for the order, in the token's main units (e.g. ETH instead of wei)
     * @param endAmount The end value for the order, in the token's main units (e.g. ETH instead of wei). If unspecified, the order's `extra` attribute will be 0
     */
    async _getPriceParameters(orderSide, tokenAddress, expirationTime, startAmount, endAmount, waitingForBestCounterOrder = false, englishAuctionReservePrice) {
        const priceDiff = endAmount != null
            ? startAmount - endAmount
            : 0;
        const paymentToken = tokenAddress.toLowerCase();
        const isEther = tokenAddress == constants_1.NULL_ADDRESS;
        const { tokens } = await this.api.getPaymentTokens({ address: paymentToken });
        const token = tokens[0];
        // Validation
        if (isNaN(startAmount) || startAmount == null || startAmount < 0) {
            throw new Error(`Starting price must be a number >= 0`);
        }
        if (!isEther && !token) {
            throw new Error(`No ERC-20 token found for '${paymentToken}'`);
        }
        if (isEther && waitingForBestCounterOrder) {
            throw new Error(`English auctions must use wrapped ETH or an ERC-20 token.`);
        }
        if (isEther && orderSide === types_1.OrderSide.Buy) {
            throw new Error(`Offers must use wrapped ETH or an ERC-20 token.`);
        }
        if (priceDiff < 0) {
            throw new Error('End price must be less than or equal to the start price.');
        }
        if (priceDiff > 0 && expirationTime == 0) {
            throw new Error('Expiration time must be set if order will change in price.');
        }
        if (englishAuctionReservePrice && !waitingForBestCounterOrder) {
            throw new Error('Reserve prices may only be set on English auctions.');
        }
        if (englishAuctionReservePrice && (englishAuctionReservePrice < startAmount)) {
            throw new Error('Reserve price must be greater than or equal to the start amount.');
        }
        // Note: WyvernProtocol.toBaseUnitAmount(makeBigNumber(startAmount), token.decimals)
        // will fail if too many decimal places, so special-case ether
        const basePrice = isEther
            ? utils_1.makeBigNumber(this.web3.toWei(startAmount, 'ether')).round()
            : wyvern_js_1.WyvernProtocol.toBaseUnitAmount(utils_1.makeBigNumber(startAmount), token.decimals);
        const extra = isEther
            ? utils_1.makeBigNumber(this.web3.toWei(priceDiff, 'ether')).round()
            : wyvern_js_1.WyvernProtocol.toBaseUnitAmount(utils_1.makeBigNumber(priceDiff), token.decimals);
        const reservePrice = englishAuctionReservePrice
            ? isEther
                ? utils_1.makeBigNumber(this.web3.toWei(englishAuctionReservePrice, 'ether')).round()
                : wyvern_js_1.WyvernProtocol.toBaseUnitAmount(utils_1.makeBigNumber(englishAuctionReservePrice), token.decimals)
            : undefined;
        return { basePrice, extra, paymentToken, reservePrice };
    }
    _getMetadata(order, referrerAddress) {
        const referrer = referrerAddress || order.metadata.referrerAddress;
        if (referrer && ethereumjs_util_1.isValidAddress(referrer)) {
            return referrer;
        }
        return undefined;
    }
    async _atomicMatch({ buy, sell, accountAddress, metadata = constants_1.NULL_BLOCK_HASH }) {
        let value;
        let shouldValidateBuy = true;
        let shouldValidateSell = true;
        if (sell.maker.toLowerCase() == accountAddress.toLowerCase()) {
            // USER IS THE SELLER, only validate the buy order
            await this._sellOrderValidationAndApprovals({ order: sell, accountAddress });
            shouldValidateSell = false;
        }
        else if (buy.maker.toLowerCase() == accountAddress.toLowerCase()) {
            // USER IS THE BUYER, only validate the sell order
            await this._buyOrderValidationAndApprovals({ order: buy, counterOrder: sell, accountAddress });
            shouldValidateBuy = false;
            // If using ETH to pay, set the value of the transaction to the current price
            if (buy.paymentToken == constants_1.NULL_ADDRESS) {
                value = await this._getRequiredAmountForTakingSellOrder(sell);
            }
        }
        else {
            // User is neither - matching service
        }
        await this._validateMatch({ buy, sell, accountAddress, shouldValidateBuy, shouldValidateSell });
        this._dispatch(types_1.EventType.MatchOrders, { buy, sell, accountAddress, matchMetadata: metadata });
        let txHash;
        const txnData = { from: accountAddress, value };
        const args = [
            [buy.exchange, buy.maker, buy.taker, buy.feeRecipient, buy.target,
                buy.staticTarget, buy.paymentToken, sell.exchange, sell.maker, sell.taker, sell.feeRecipient, sell.target, sell.staticTarget, sell.paymentToken],
            [buy.makerRelayerFee, buy.takerRelayerFee, buy.makerProtocolFee, buy.takerProtocolFee, buy.basePrice, buy.extra, buy.listingTime, buy.expirationTime, buy.salt, sell.makerRelayerFee, sell.takerRelayerFee, sell.makerProtocolFee, sell.takerProtocolFee, sell.basePrice, sell.extra, sell.listingTime, sell.expirationTime, sell.salt],
            [buy.feeMethod, buy.side, buy.saleKind, buy.howToCall, sell.feeMethod, sell.side, sell.saleKind, sell.howToCall],
            buy.calldata,
            sell.calldata,
            buy.replacementPattern,
            sell.replacementPattern,
            buy.staticExtradata,
            sell.staticExtradata,
            [
                buy.v || 0,
                sell.v || 0
            ],
            [
                buy.r || constants_1.NULL_BLOCK_HASH,
                buy.s || constants_1.NULL_BLOCK_HASH,
                sell.r || constants_1.NULL_BLOCK_HASH,
                sell.s || constants_1.NULL_BLOCK_HASH,
                metadata
            ]
        ];
        // Estimate gas first
        try {
            // Typescript splat doesn't typecheck
            const gasEstimate = await this._wyvernProtocolReadOnly.wyvernExchange.atomicMatch_.estimateGasAsync(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], txnData);
            txnData.gas = this._correctGasAmount(gasEstimate);
        }
        catch (error) {
            console.error(`Failed atomic match with args: `, args, error);
            throw new Error(`Oops, the Ethereum network rejected this transaction :( The OpenSea devs have been alerted, but this problem is typically due an item being locked or untransferrable. The exact error was "${error.message.substr(0, debugging_1.MAX_ERROR_LENGTH)}..."`);
        }
        // Then do the transaction
        try {
            this.logger(`Fulfilling order with gas set to ${txnData.gas}`);
            txHash = await this._wyvernProtocol.wyvernExchange.atomicMatch_.sendTransactionAsync(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], txnData);
        }
        catch (error) {
            console.error(error);
            this._dispatch(types_1.EventType.TransactionDenied, { error, buy, sell, accountAddress, matchMetadata: metadata });
            throw new Error(`Failed to authorize transaction: "${error.message
                ? error.message
                : 'user denied'}..."`);
        }
        return txHash;
    }
    async _getRequiredAmountForTakingSellOrder(sell) {
        const currentPrice = await this.getCurrentPrice(sell);
        const estimatedPrice = utils_1.estimateCurrentPrice(sell);
        const maxPrice = bignumber_js_1.BigNumber.max(currentPrice, estimatedPrice);
        // TODO Why is this not always a big number?
        sell.takerRelayerFee = utils_1.makeBigNumber(sell.takerRelayerFee);
        const feePercentage = sell.takerRelayerFee.div(constants_1.INVERSE_BASIS_POINT);
        const fee = feePercentage.times(maxPrice);
        return fee.plus(maxPrice).ceil();
    }
    async _authorizeOrder(order) {
        const message = order.hash;
        const signerAddress = order.maker;
        this._dispatch(types_1.EventType.CreateOrder, { order, accountAddress: order.maker });
        const makerIsSmartContract = await utils_1.isContractAddress(this.web3, signerAddress);
        try {
            if (makerIsSmartContract) {
                // The web3 provider is probably a smart contract wallet.
                // Fallback to on-chain approval.
                await this._approveOrder(order);
                return null;
            }
            else {
                return await utils_1.personalSignAsync(this.web3, message, signerAddress);
            }
        }
        catch (error) {
            this._dispatch(types_1.EventType.OrderDenied, { order, accountAddress: signerAddress });
            throw error;
        }
    }
    _getSchema(schemaName) {
        const schemaName_ = schemaName || types_1.WyvernSchemaName.ERC721;
        const schema = WyvernSchemas.schemas[this._networkName].filter(s => s.name == schemaName_)[0];
        if (!schema) {
            throw new Error(`Trading for this asset (${schemaName_}) is not yet supported. Please contact us or check back later!`);
        }
        return schema;
    }
    _dispatch(event, data) {
        this._emitter.emit(event, data);
    }
    /**
     * Get the clients to use for a read call
     * @param retries current retry value
     */
    _getClientsForRead(retries = 1) {
        if (retries > 0) {
            // Use injected provider by default
            return {
                'web3': this.web3,
                'wyvernProtocol': this._wyvernProtocol
            };
        }
        else {
            // Use provided provider as fallback
            return {
                'web3': this.web3ReadOnly,
                'wyvernProtocol': this._wyvernProtocolReadOnly
            };
        }
    }
    async _confirmTransaction(transactionHash, event, description, testForSuccess) {
        const transactionEventData = { transactionHash, event };
        this.logger(`Transaction started: ${description}`);
        if (transactionHash == constants_1.NULL_BLOCK_HASH) {
            // This was a smart contract wallet that doesn't know the transaction
            this._dispatch(types_1.EventType.TransactionCreated, { event });
            if (!testForSuccess) {
                // Wait if test not implemented
                this.logger(`Unknown action, waiting 1 minute: ${description}`);
                await utils_1.delay(60 * 1000);
                return;
            }
            return await this._pollCallbackForConfirmation(event, description, testForSuccess);
        }
        // Normal wallet
        try {
            this._dispatch(types_1.EventType.TransactionCreated, transactionEventData);
            await utils_1.confirmTransaction(this.web3, transactionHash);
            this.logger(`Transaction succeeded: ${description}`);
            this._dispatch(types_1.EventType.TransactionConfirmed, transactionEventData);
        }
        catch (error) {
            this.logger(`Transaction failed: ${description}`);
            this._dispatch(types_1.EventType.TransactionFailed, {
                ...transactionEventData, error
            });
            throw error;
        }
    }
    async _pollCallbackForConfirmation(event, description, testForSuccess) {
        return new Promise(async (resolve, reject) => {
            const initialRetries = 60;
            const testResolve = async (retries) => {
                const wasSuccessful = await testForSuccess();
                if (wasSuccessful) {
                    this.logger(`Transaction succeeded: ${description}`);
                    this._dispatch(types_1.EventType.TransactionConfirmed, { event });
                    return resolve();
                }
                else if (retries <= 0) {
                    return reject();
                }
                if (retries % 10 == 0) {
                    this.logger(`Tested transaction ${initialRetries - retries + 1} times: ${description}`);
                }
                await utils_1.delay(5000);
                return testResolve(retries - 1);
            };
            return testResolve(initialRetries);
        });
    }
}
exports.OpenSeaPort = OpenSeaPort;
//# sourceMappingURL=seaport.js.map