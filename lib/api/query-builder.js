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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGetAssetQuery = exports.createQuery = void 0;
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var getAssetQueryString = fs_1.default.readFileSync(path_1.default.resolve(__dirname, "./gql/GetAsset.gql"), "utf-8");
function createQuery(id, queryString) {
    return {
        id: id,
        query: queryString,
    };
}
exports.createQuery = createQuery;
function createGetAssetQuery(assetContractAddress, tokenId) {
    return __assign(__assign({}, createQuery("getAsset", getAssetQueryString)), { variables: {
            assetContractAddress: assetContractAddress,
            tokenId: tokenId,
        } });
}
exports.createGetAssetQuery = createGetAssetQuery;
//# sourceMappingURL=query-builder.js.map