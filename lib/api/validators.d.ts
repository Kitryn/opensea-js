import { OrderSide } from "../types";
import { Infer } from "superstruct";
import { BigNumber } from "@0x/utils";
/**
 *
 */
export declare const APIOpenSeaCollectionTrait: import("superstruct").Struct<{
    key: string;
    kind: "string";
    counts: {
        value: string;
        count: number;
    }[];
} | {
    value: {
        max: number;
        min: number;
    };
    key: string;
    kind: "numeric";
}, null>;
export declare type APIOpenSeaCollectionTrait = Infer<typeof APIOpenSeaCollectionTrait>;
/**
 *
 */
export declare const APIOpenSeaCollection: import("superstruct").Struct<{
    name: string;
    slug: string;
    devBuyerFeeBasisPoints: number;
    devSellerFeeBasisPoints: number;
    openseaBuyerFeeBasisPoints: number;
    openseaSellerFeeBasisPoints: number;
    collectionTraits?: ({
        key: string;
        kind: "string";
        counts: {
            value: string;
            count: number;
        }[];
    } | {
        value: {
            max: number;
            min: number;
        };
        key: string;
        kind: "numeric";
    })[] | undefined;
}, {
    name: import("superstruct").Struct<string, null>;
    slug: import("superstruct").Struct<string, null>;
    devBuyerFeeBasisPoints: import("superstruct").Struct<number, null>;
    devSellerFeeBasisPoints: import("superstruct").Struct<number, null>;
    openseaBuyerFeeBasisPoints: import("superstruct").Struct<number, null>;
    openseaSellerFeeBasisPoints: import("superstruct").Struct<number, null>;
    collectionTraits: import("superstruct").Struct<({
        key: string;
        kind: "string";
        counts: {
            value: string;
            count: number;
        }[];
    } | {
        value: {
            max: number;
            min: number;
        };
        key: string;
        kind: "numeric";
    })[] | undefined, import("superstruct").Struct<{
        key: string;
        kind: "string";
        counts: {
            value: string;
            count: number;
        }[];
    } | {
        value: {
            max: number;
            min: number;
        };
        key: string;
        kind: "numeric";
    }, null>>;
}>;
export declare type APIOpenSeaCollection = Infer<typeof APIOpenSeaCollection>;
/**
 *
 */
export declare const APIOpenSeaAssetTrait: import("superstruct").Struct<{
    value: string;
    key: string;
    kind: "string" | "numeric";
}, {
    key: import("superstruct").Struct<string, null>;
    kind: import("superstruct").Struct<"string" | "numeric", {
        string: "string";
        numeric: "numeric";
    }>;
    value: import("superstruct").Struct<string, null>;
}>;
export declare type APIOpenSeaAssetTrait = Infer<typeof APIOpenSeaAssetTrait>;
/**
 *
 */
export declare const APIOpenSeaAccount: import("superstruct").Struct<{
    address: string;
    displayName: string | null;
}, {
    address: import("superstruct").Struct<string, null>;
    displayName: import("superstruct").Struct<string | null, null>;
}>;
export declare type APIOpenSeaAccount = Infer<typeof APIOpenSeaAccount>;
/**
 *
 */
export declare const APIOpenSeaAssetContract: import("superstruct").Struct<{
    symbol: string;
    address: string;
    name: string;
    chain: string;
    tokenStandard: string;
}, {
    address: import("superstruct").Struct<string, null>;
    chain: import("superstruct").Struct<string, null>;
    name: import("superstruct").Struct<string, null>;
    symbol: import("superstruct").Struct<string, null>;
    tokenStandard: import("superstruct").Struct<string, null>;
}>;
export declare type APIOpenSeaAssetContract = Infer<typeof APIOpenSeaAssetContract>;
/**
 *
 */
export declare const APIOpenSeaPaymentAsset: import("superstruct").Struct<{
    symbol: string;
    address: string;
    name: string;
    decimals: number;
    chain: string;
    tokenStandard: string;
    usdSpotPrice: number;
}, {
    decimals: import("superstruct").Struct<number, null>;
    usdSpotPrice: import("superstruct").Struct<number, null>;
    symbol: import("superstruct").Struct<string, null>;
    address: import("superstruct").Struct<string, null>;
    name: import("superstruct").Struct<string, null>;
    chain: import("superstruct").Struct<string, null>;
    tokenStandard: import("superstruct").Struct<string, null>;
}>;
export declare type APIOpenSeaPaymentAsset = Infer<typeof APIOpenSeaPaymentAsset>;
/**
 *
 */
export declare const APIOpenSeaSale: import("superstruct").Struct<{
    timestamp: Date;
    paymentAsset: {
        symbol: string;
        address: string;
        name: string;
        decimals: number;
        chain: string;
        tokenStandard: string;
        usdSpotPrice: number;
    };
    totalPrice: BigNumber;
    totalPriceInEth: BigNumber;
}, {
    timestamp: import("superstruct").Struct<Date, null>;
    paymentAsset: import("superstruct").Struct<{
        symbol: string;
        address: string;
        name: string;
        decimals: number;
        chain: string;
        tokenStandard: string;
        usdSpotPrice: number;
    }, {
        decimals: import("superstruct").Struct<number, null>;
        usdSpotPrice: import("superstruct").Struct<number, null>;
        symbol: import("superstruct").Struct<string, null>;
        address: import("superstruct").Struct<string, null>;
        name: import("superstruct").Struct<string, null>;
        chain: import("superstruct").Struct<string, null>;
        tokenStandard: import("superstruct").Struct<string, null>;
    }>;
    totalPrice: import("superstruct").Struct<BigNumber, null>;
    totalPriceInEth: import("superstruct").Struct<BigNumber, null>;
}>;
export declare type APIOpenSeaSale = Infer<typeof APIOpenSeaSale>;
/**
 *
 */
export declare const APIOpenSeaOrder: import("superstruct").Struct<{
    user: {
        address: string;
        displayName: string | null;
    };
    side: OrderSide;
    paymentAsset: {
        symbol: string;
        address: string;
        name: string;
        decimals: number;
        chain: string;
        tokenStandard: string;
        usdSpotPrice: number;
    };
    totalPrice: BigNumber;
    totalPriceInEth: BigNumber;
    orderType: string;
}, {
    side: import("superstruct").Struct<OrderSide, {
        0: OrderSide.Buy;
        1: OrderSide.Sell;
    }>;
    orderType: import("superstruct").Struct<string, null>;
    paymentAsset: import("superstruct").Struct<{
        symbol: string;
        address: string;
        name: string;
        decimals: number;
        chain: string;
        tokenStandard: string;
        usdSpotPrice: number;
    }, {
        decimals: import("superstruct").Struct<number, null>;
        usdSpotPrice: import("superstruct").Struct<number, null>;
        symbol: import("superstruct").Struct<string, null>;
        address: import("superstruct").Struct<string, null>;
        name: import("superstruct").Struct<string, null>;
        chain: import("superstruct").Struct<string, null>;
        tokenStandard: import("superstruct").Struct<string, null>;
    }>;
    totalPrice: import("superstruct").Struct<BigNumber, null>;
    totalPriceInEth: import("superstruct").Struct<BigNumber, null>;
    user: import("superstruct").Struct<{
        address: string;
        displayName: string | null;
    }, {
        address: import("superstruct").Struct<string, null>;
        displayName: import("superstruct").Struct<string | null, null>;
    }>;
}>;
export declare type APIOpenSeaOrder = Infer<typeof APIOpenSeaOrder>;
/**
 *
 */
export declare const APIOpenSeaNFTAsset: import("superstruct").Struct<{
    name: string;
    owner: {
        address: string;
        displayName: string | null;
    };
    tokenId: number;
    assetContract: {
        symbol: string;
        address: string;
        name: string;
        chain: string;
        tokenStandard: string;
    };
    collection: {
        name: string;
        slug: string;
        devBuyerFeeBasisPoints: number;
        devSellerFeeBasisPoints: number;
        openseaBuyerFeeBasisPoints: number;
        openseaSellerFeeBasisPoints: number;
        collectionTraits?: ({
            key: string;
            kind: "string";
            counts: {
                value: string;
                count: number;
            }[];
        } | {
            value: {
                max: number;
                min: number;
            };
            key: string;
            kind: "numeric";
        })[] | undefined;
    };
    lastSale: {
        timestamp: Date;
        paymentAsset: {
            symbol: string;
            address: string;
            name: string;
            decimals: number;
            chain: string;
            tokenStandard: string;
            usdSpotPrice: number;
        };
        totalPrice: BigNumber;
        totalPriceInEth: BigNumber;
    } | null;
    bestAsk: {
        user: {
            address: string;
            displayName: string | null;
        };
        side: OrderSide;
        paymentAsset: {
            symbol: string;
            address: string;
            name: string;
            decimals: number;
            chain: string;
            tokenStandard: string;
            usdSpotPrice: number;
        };
        totalPrice: BigNumber;
        totalPriceInEth: BigNumber;
        orderType: string;
    } | null;
    bestBid: {
        user: {
            address: string;
            displayName: string | null;
        };
        side: OrderSide;
        paymentAsset: {
            symbol: string;
            address: string;
            name: string;
            decimals: number;
            chain: string;
            tokenStandard: string;
            usdSpotPrice: number;
        };
        totalPrice: BigNumber;
        totalPriceInEth: BigNumber;
        orderType: string;
    } | null;
    traits?: {
        value: string;
        key: string;
        kind: "string" | "numeric";
    }[] | undefined;
}, {
    assetContract: import("superstruct").Struct<{
        symbol: string;
        address: string;
        name: string;
        chain: string;
        tokenStandard: string;
    }, {
        address: import("superstruct").Struct<string, null>;
        chain: import("superstruct").Struct<string, null>;
        name: import("superstruct").Struct<string, null>;
        symbol: import("superstruct").Struct<string, null>;
        tokenStandard: import("superstruct").Struct<string, null>;
    }>;
    collection: import("superstruct").Struct<{
        name: string;
        slug: string;
        devBuyerFeeBasisPoints: number;
        devSellerFeeBasisPoints: number;
        openseaBuyerFeeBasisPoints: number;
        openseaSellerFeeBasisPoints: number;
        collectionTraits?: ({
            key: string;
            kind: "string";
            counts: {
                value: string;
                count: number;
            }[];
        } | {
            value: {
                max: number;
                min: number;
            };
            key: string;
            kind: "numeric";
        })[] | undefined;
    }, {
        name: import("superstruct").Struct<string, null>;
        slug: import("superstruct").Struct<string, null>;
        devBuyerFeeBasisPoints: import("superstruct").Struct<number, null>;
        devSellerFeeBasisPoints: import("superstruct").Struct<number, null>;
        openseaBuyerFeeBasisPoints: import("superstruct").Struct<number, null>;
        openseaSellerFeeBasisPoints: import("superstruct").Struct<number, null>;
        collectionTraits: import("superstruct").Struct<({
            key: string;
            kind: "string";
            counts: {
                value: string;
                count: number;
            }[];
        } | {
            value: {
                max: number;
                min: number;
            };
            key: string;
            kind: "numeric";
        })[] | undefined, import("superstruct").Struct<{
            key: string;
            kind: "string";
            counts: {
                value: string;
                count: number;
            }[];
        } | {
            value: {
                max: number;
                min: number;
            };
            key: string;
            kind: "numeric";
        }, null>>;
    }>;
    name: import("superstruct").Struct<string, null>;
    tokenId: import("superstruct").Struct<number, null>;
    owner: import("superstruct").Struct<{
        address: string;
        displayName: string | null;
    }, {
        address: import("superstruct").Struct<string, null>;
        displayName: import("superstruct").Struct<string | null, null>;
    }>;
    traits: import("superstruct").Struct<{
        value: string;
        key: string;
        kind: "string" | "numeric";
    }[] | undefined, import("superstruct").Struct<{
        value: string;
        key: string;
        kind: "string" | "numeric";
    }, {
        key: import("superstruct").Struct<string, null>;
        kind: import("superstruct").Struct<"string" | "numeric", {
            string: "string";
            numeric: "numeric";
        }>;
        value: import("superstruct").Struct<string, null>;
    }>>;
    lastSale: import("superstruct").Struct<{
        timestamp: Date;
        paymentAsset: {
            symbol: string;
            address: string;
            name: string;
            decimals: number;
            chain: string;
            tokenStandard: string;
            usdSpotPrice: number;
        };
        totalPrice: BigNumber;
        totalPriceInEth: BigNumber;
    } | null, {
        timestamp: import("superstruct").Struct<Date, null>;
        paymentAsset: import("superstruct").Struct<{
            symbol: string;
            address: string;
            name: string;
            decimals: number;
            chain: string;
            tokenStandard: string;
            usdSpotPrice: number;
        }, {
            decimals: import("superstruct").Struct<number, null>;
            usdSpotPrice: import("superstruct").Struct<number, null>;
            symbol: import("superstruct").Struct<string, null>;
            address: import("superstruct").Struct<string, null>;
            name: import("superstruct").Struct<string, null>;
            chain: import("superstruct").Struct<string, null>;
            tokenStandard: import("superstruct").Struct<string, null>;
        }>;
        totalPrice: import("superstruct").Struct<BigNumber, null>;
        totalPriceInEth: import("superstruct").Struct<BigNumber, null>;
    }>;
    bestAsk: import("superstruct").Struct<{
        user: {
            address: string;
            displayName: string | null;
        };
        side: OrderSide;
        paymentAsset: {
            symbol: string;
            address: string;
            name: string;
            decimals: number;
            chain: string;
            tokenStandard: string;
            usdSpotPrice: number;
        };
        totalPrice: BigNumber;
        totalPriceInEth: BigNumber;
        orderType: string;
    } | null, {
        side: import("superstruct").Struct<OrderSide, {
            0: OrderSide.Buy;
            1: OrderSide.Sell;
        }>;
        orderType: import("superstruct").Struct<string, null>;
        paymentAsset: import("superstruct").Struct<{
            symbol: string;
            address: string;
            name: string;
            decimals: number;
            chain: string;
            tokenStandard: string;
            usdSpotPrice: number;
        }, {
            decimals: import("superstruct").Struct<number, null>;
            usdSpotPrice: import("superstruct").Struct<number, null>;
            symbol: import("superstruct").Struct<string, null>;
            address: import("superstruct").Struct<string, null>;
            name: import("superstruct").Struct<string, null>;
            chain: import("superstruct").Struct<string, null>;
            tokenStandard: import("superstruct").Struct<string, null>;
        }>;
        totalPrice: import("superstruct").Struct<BigNumber, null>;
        totalPriceInEth: import("superstruct").Struct<BigNumber, null>;
        user: import("superstruct").Struct<{
            address: string;
            displayName: string | null;
        }, {
            address: import("superstruct").Struct<string, null>;
            displayName: import("superstruct").Struct<string | null, null>;
        }>;
    }>;
    bestBid: import("superstruct").Struct<{
        user: {
            address: string;
            displayName: string | null;
        };
        side: OrderSide;
        paymentAsset: {
            symbol: string;
            address: string;
            name: string;
            decimals: number;
            chain: string;
            tokenStandard: string;
            usdSpotPrice: number;
        };
        totalPrice: BigNumber;
        totalPriceInEth: BigNumber;
        orderType: string;
    } | null, {
        side: import("superstruct").Struct<OrderSide, {
            0: OrderSide.Buy;
            1: OrderSide.Sell;
        }>;
        orderType: import("superstruct").Struct<string, null>;
        paymentAsset: import("superstruct").Struct<{
            symbol: string;
            address: string;
            name: string;
            decimals: number;
            chain: string;
            tokenStandard: string;
            usdSpotPrice: number;
        }, {
            decimals: import("superstruct").Struct<number, null>;
            usdSpotPrice: import("superstruct").Struct<number, null>;
            symbol: import("superstruct").Struct<string, null>;
            address: import("superstruct").Struct<string, null>;
            name: import("superstruct").Struct<string, null>;
            chain: import("superstruct").Struct<string, null>;
            tokenStandard: import("superstruct").Struct<string, null>;
        }>;
        totalPrice: import("superstruct").Struct<BigNumber, null>;
        totalPriceInEth: import("superstruct").Struct<BigNumber, null>;
        user: import("superstruct").Struct<{
            address: string;
            displayName: string | null;
        }, {
            address: import("superstruct").Struct<string, null>;
            displayName: import("superstruct").Struct<string | null, null>;
        }>;
    }>;
}>;
export declare type APIOpenSeaNFTAsset = Infer<typeof APIOpenSeaNFTAsset>;
