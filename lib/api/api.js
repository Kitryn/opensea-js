"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenSeaAPI = void 0;
var types_1 = require("../types");
var constants_1 = require("../constants");
var fallback_api_1 = require("./fallback_api");
var query_builder_1 = require("./query-builder");
var query_types_1 = require("./query-types");
var node_fetch_1 = __importDefault(require("node-fetch"));
var parsers_1 = require("./parsers");
var OpenSeaAPI = /** @class */ (function () {
    function OpenSeaAPI(config, logger) {
        this.pageSize = 20;
        this.apiKey = config.apiKey;
        switch (config.networkName) {
            case types_1.Network.Rinkeby:
                this.apiBaseUrl = config.apiBaseUrl || constants_1.API_BASE_RINKEBY;
                this.gqlBaseUrl = constants_1.GQL_BASE_RINKEBY;
                break;
            case types_1.Network.Main:
            default:
                this.apiBaseUrl = config.apiBaseUrl || constants_1.API_BASE_MAINNET;
                this.gqlBaseUrl = constants_1.GQL_BASE_MAINNET;
                break;
        }
        // Debugging: default to nothing
        this.logger = logger || (function (arg) { return arg; });
        this.fallBackAPI = new fallback_api_1.OpenSeaAPI(config, logger);
    }
    /**
     * Send an order to the orderbook.
     * Throws when the order is invalid.
     * IN NEXT VERSION: change order input to Order type
     * @param order Order JSON to post to the orderbook
     * @param retries Number of times to retry if the service is unavailable for any reason
     */
    OpenSeaAPI.prototype.postOrder = function (order, retries) {
        if (retries === void 0) { retries = 2; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error("postOrder ==> Not implemented");
            });
        });
    };
    /**
     * Create a whitelist entry for an asset to prevent others from buying.
     * Buyers will have to have verified at least one of the emails
     * on an asset in order to buy.
     * This will throw a 403 if the given API key isn't allowed to create whitelist entries for this contract or asset.
     * @param tokenAddress Address of the asset's contract
     * @param tokenId The asset's token ID
     * @param email The email allowed to buy.
     */
    OpenSeaAPI.prototype.postAssetWhitelist = function (tokenAddress, tokenId, email) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error("postAssetWhitelist ==> Not implemented");
            });
        });
    };
    /**
     * Get an order from the orderbook, throwing if none is found.
     * @param query Query to use for getting orders. A subset of parameters
     *  on the `OrderJSON` type is supported
     */
    OpenSeaAPI.prototype.getOrder = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // don't think this used by seaport.ts
                throw new Error("getOrder ==> Not Implemented");
            });
        });
    };
    /**
     * Get a list of orders from the orderbook, returning the page of orders
     *  and the count of total orders found.
     * @param query Query to use for getting orders. A subset of parameters
     *  on the `OrderJSON` type is supported
     * @param page Page number, defaults to 1. Can be overridden by
     * `limit` and `offset` attributes from OrderQuery
     */
    OpenSeaAPI.prototype.getOrders = function (query, page) {
        if (query === void 0) { query = {}; }
        if (page === void 0) { page = 1; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error("getOrders ==> Not implemented");
            });
        });
    };
    /**
     * Fetch an asset from the API, throwing if none is found
     * @param tokenAddress Address of the asset's contract
     * @param tokenId The asset's token ID. The old behaviour had it possible to null if ERC-20 -- does this work in GQL? TODO
     * @param retries Number of times to retry if the service is unavailable for any reason
     */
    OpenSeaAPI.prototype.getAsset = function (_a, retries) {
        var tokenAddress = _a.tokenAddress, tokenId = _a.tokenId;
        if (retries === void 0) { retries = 1; }
        return __awaiter(this, void 0, void 0, function () {
            var query, json, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        query = query_builder_1.createGetAssetQuery(tokenAddress, parseInt("" + tokenId) // silence typescript and cast to string first
                        );
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 5]);
                        return [4 /*yield*/, this.postQuery(query)];
                    case 2:
                        json = _b.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        error_1 = _b.sent();
                        _throwOrContinue(error_1, retries);
                        return [4 /*yield*/, delay(1000)];
                    case 4:
                        _b.sent();
                        return [2 /*return*/, this.getAsset({ tokenAddress: tokenAddress, tokenId: tokenId }, retries - 1)];
                    case 5:
                        if (json.errors != null) {
                            throw new query_types_1.ApiError("Error in GQL response: " + JSON.stringify(json.errors), undefined, json.errors);
                        }
                        return [2 /*return*/, parsers_1.parseNFTAsset(json)];
                }
            });
        });
    };
    /**
     * Fetch list of assets from the API, returning the page of assets and the count of total assets
     * @param query Query to use for getting orders. A subset of parameters on the `OpenSeaAssetJSON` type is supported
     * @param page Page number, defaults to 1. Can be overridden by
     * `limit` and `offset` attributes from OpenSeaAssetQuery
     */
    OpenSeaAPI.prototype.getAssets = function (query, page) {
        if (query === void 0) { query = {}; }
        if (page === void 0) { page = 1; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error("getAssets ==> Not implemented"); // note: can throw, will bubble up, let caller handle
            });
        });
    };
    /**
     * Fetch list of fungible tokens from the API matching paramters
     * @param query Query to use for getting orders. A subset of parameters on the `OpenSeaAssetJSON` type is supported
     * @param page Page number, defaults to 1. Can be overridden by
     * `limit` and `offset` attributes from OpenSeaFungibleTokenQuery
     * @param retries Number of times to retry if the service is unavailable for any reason
     */
    OpenSeaAPI.prototype.getPaymentTokens = function (query, page, retries) {
        if (query === void 0) { query = {}; }
        if (page === void 0) { page = 1; }
        if (retries === void 0) { retries = 1; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.fallBackAPI.getPaymentTokens(query, page, retries)];
            });
        });
    };
    /**
     * Fetch an bundle from the API, return null if it isn't found
     * @param slug The bundle's identifier
     */
    OpenSeaAPI.prototype.getBundle = function (_a) {
        var slug = _a.slug;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                return [2 /*return*/, this.fallBackAPI.getBundle({ slug: slug })];
            });
        });
    };
    /**
     * Fetch list of bundles from the API, returning the page of bundles and the count of total bundles
     * @param query Query to use for getting orders. A subset of parameters on the `OpenSeaAssetBundleJSON` type is supported
     * @param page Page number, defaults to 1. Can be overridden by
     * `limit` and `offset` attributes from OpenSeaAssetBundleQuery
     */
    OpenSeaAPI.prototype.getBundles = function (query, page) {
        if (query === void 0) { query = {}; }
        if (page === void 0) { page = 1; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.fallBackAPI.getBundles(query, page)];
            });
        });
    };
    // ======== helper methods
    OpenSeaAPI.prototype.postQuery = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            var fetchOpts;
            var _this = this;
            return __generator(this, function (_a) {
                fetchOpts = {
                    method: "post",
                    body: JSON.stringify(query),
                    headers: __assign({ "Content-Type": "application/json", Accept: "application/json" }, (this.apiKey ? { "X-API-KEY": this.apiKey } : {})),
                };
                // this.logger({
                //   level: "verbose",
                //   message: `postQuery => id: ${query.id}, variables: ${
                //     query.variables ? JSON.stringify(query.variables) : {}
                //   }`,
                // });
                return [2 /*return*/, node_fetch_1.default(this.gqlBaseUrl, fetchOpts)
                        .then(function (res) { return _this._handleApiResponse(res); })
                        .catch(function (error) {
                        // Catches errors from fetch() (FetchError) and everything within _handleApiResponse
                        // this.logger({
                        //   level: "error",
                        //   message: `postQuery ${query.id} => ${error.name}: ${error.message}`,
                        //   ...(error.data ? { data: error.data } : {}),
                        // });
                        // Re-throws -- caller should handle
                        throw new query_types_1.ApiError(error.message, error.stack ? error.stack : undefined, error.data ? error.data : undefined);
                    })];
            });
        });
    };
    OpenSeaAPI.prototype._handleApiResponse = function (res) {
        return __awaiter(this, void 0, void 0, function () {
            var resultText, resultJson, _a, data;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, res.text()];
                    case 1:
                        resultText = _b.sent();
                        resultJson = JSON.parse(resultText);
                        return [3 /*break*/, 3];
                    case 2:
                        _a = _b.sent();
                        return [3 /*break*/, 3];
                    case 3:
                        data = resultJson || resultText;
                        if (!res.ok) {
                            // this.logger({
                            //   level: "error",
                            //   message: `handleApiResponse => HTTP request failed with status ${res.status}`,
                            //   ...(data ? { data } : {}),
                            // });
                            throw new query_types_1.ApiError("HTTP request failed with status " + res.status, undefined, data !== null && data !== void 0 ? data : undefined);
                        }
                        if (resultJson == null) {
                            // this.logger({
                            //   level: "error",
                            //   message: `handleApiResponse => Error parsing response into JSON`,
                            //   ...(data ? { data } : {}),
                            // });
                            throw new query_types_1.ApiError("Error parsing response into JSON", undefined, data !== null && data !== void 0 ? data : undefined);
                        }
                        return [2 /*return*/, resultJson];
                }
            });
        });
    };
    return OpenSeaAPI;
}());
exports.OpenSeaAPI = OpenSeaAPI;
function _throwOrContinue(error, retries) {
    var isUnavailable = !!error.message &&
        (error.message.includes("503") || error.message.includes("429"));
    if (retries <= 0 || !isUnavailable) {
        throw error;
    }
}
function delay(ms) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (res) { return setTimeout(res, ms); })];
        });
    });
}
//# sourceMappingURL=api.js.map