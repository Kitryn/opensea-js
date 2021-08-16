"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
/**
 * Any error that has to do with fetching data?
 * HTTP errors, GQL errors, etc
 */
var ApiError = /** @class */ (function (_super) {
    __extends(ApiError, _super);
    function ApiError(message, stack, data) {
        var _a;
        var _this = _super.call(this, message) || this;
        _this.name = "ApiError";
        _this.data = data; // can be undefined
        if (stack != undefined) {
            _this.stack =
                ((_a = _this.stack) === null || _a === void 0 ? void 0 : _a.split("\n").slice(0, 2).join("\n")) + "\n" + stack;
        }
        return _this;
    }
    return ApiError;
}(Error));
exports.ApiError = ApiError;
//# sourceMappingURL=query-types.js.map