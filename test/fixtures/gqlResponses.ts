import BigNumber from "bignumber.js";
import {
  APIOpenSeaAssetTrait,
  APIOpenSeaCollection,
  APIOpenSeaCollectionTrait,
  APIOpenSeaNFTAsset,
  APIOpenSeaOrder,
  APIOpenSeaSale,
} from "../../src/api/validators";

const GetAssetResponse = {
  data: {
    archetype: {
      asset: {
        assetContract: {
          address: "0xc2c747e0f7004f9e8817db2ca4997657a7746928",
          chain: "ETHEREUM",
          name: "Hashmasks",
          symbol: "HM",
          tokenStandard: "ERC721",
        },
        name: "Hashmasks #12104",
        collection: {
          devBuyerFeeBasisPoints: 0,
          devSellerFeeBasisPoints: 0,
          openseaBuyerFeeBasisPoints: 0,
          openseaSellerFeeBasisPoints: 250,
          slug: "hashmasks",
          name: "Hashmasks",
        },
        tokenId: "12104",
        assetOwners: {
          edges: [
            {
              node: {
                owner: {
                  address: "0xd711e8975f248216dba4730c06fc86b9aa765f92",
                  displayName: "carys",
                },
              },
            },
          ],
        },
        assetEventData: {
          lastSale: {
            timestamp: "2021-08-05T12:08:25",
            totalPriceQuantity: {
              quantity: "880000000000000000",
              quantityInEth: "880000000000000000",
              asset: {
                decimals: 18,
                usdSpotPrice: 2783.75,
                symbol: "ETH",
                assetContract: {
                  address: "0x0000000000000000000000000000000000000000",
                  chain: "ETHEREUM",
                  tokenStandard: "ERC20",
                  symbol: "ETH",
                  name: "Ether",
                },
              },
            },
            eventType: "AUCTION_SUCCESSFUL",
          },
        },
        traits: {
          edges: [
            {
              node: {
                intValue: null,
                traitType: "Background",
                value: "Expressionist",
              },
            },
            {
              node: {
                intValue: "12104",
                traitType: "Token ID",
                value: null,
              },
            },
            {
              node: {
                intValue: null,
                traitType: "Mask",
                value: "Hawaiian",
              },
            },
            {
              node: {
                intValue: null,
                traitType: "Skin Color",
                value: "Blue",
              },
            },
            {
              node: {
                intValue: null,
                traitType: "Item",
                value: "No Item",
              },
            },
            {
              node: {
                intValue: null,
                traitType: "Eye Color",
                value: "Dark",
              },
            },
            {
              node: {
                intValue: null,
                traitType: "Character",
                value: "Male",
              },
            },
          ],
        },
      },
    },
    tradeSummary: {
      bestAsk: {
        englishAuctionReservePrice: null,
        dutchAuctionFinalPrice: null,
        closedAt: null,
        openedAt: "2021-08-06T05:52:34",
        orderType: "BASIC",
        maker: {
          address: "0xd711e8975f248216dba4730c06fc86b9aa765f92",
          displayName: "carys",
        },
        takerAssetBundle: {
          assetQuantities: {
            edges: [
              {
                node: {
                  quantity: "1000000000000000000",
                  quantityInEth: "1000000000000000000",
                  asset: {
                    decimals: 18,
                    usdSpotPrice: 2783.75,
                    symbol: "ETH",
                    assetContract: {
                      address: "0x0000000000000000000000000000000000000000",
                      chain: "ETHEREUM",
                      tokenStandard: "ERC20",
                      symbol: "ETH",
                      name: "Ether",
                    },
                  },
                },
              },
            ],
          },
        },
        priceFnEndedAt: null,
        remainingQuantity: "1",
        side: "ASK",
      },
      bestBid: {
        maker: {
          address: "0x507f71061c7dcd589413af566d700a9d24b6c39e",
          displayName: "pixhello",
        },
        orderType: "BASIC",
        makerAssetBundle: {
          assetQuantities: {
            edges: [
              {
                node: {
                  quantity: "712300000000000000",
                  quantityInEth: "712300000000000000",
                  asset: {
                    decimals: 18,
                    usdSpotPrice: 2783.75,
                    symbol: "WETH",
                    assetContract: {
                      address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                      chain: "ETHEREUM",
                      name: "Wrapped Ether",
                      symbol: "",
                      tokenStandard: "ERC20",
                    },
                  },
                },
              },
            ],
          },
        },
      },
    },
  },
};

const collectionTraits = {
  numericTraits: [
    {
      key: "Token ID",
      value: {
        max: 16383,
        min: 0,
      },
    },
  ],
  stringTraits: [
    {
      counts: [
        {
          count: 383,
          value: "Planetary",
        },
        {
          count: 801,
          value: "Greek Symbol",
        },
        {
          count: 640,
          value: "Mannequin",
        },
        {
          count: 264,
          value: "Zodiac Sign",
        },
        {
          count: 504,
          value: "Egyptian Hieroglyph",
        },
      ],
      key: "Glyph",
    },
    {
      counts: [
        {
          count: 980,
          value: "Pixel",
        },
        {
          count: 229,
          value: "Steampunk",
        },
        {
          count: 10,
          value: "Unique",
        },
        {
          count: 967,
          value: "African",
        },
        {
          count: 2216,
          value: "Basic",
        },
        {
          count: 925,
          value: "Street",
        },
        {
          count: 885,
          value: "Chinese",
        },
        {
          count: 319,
          value: "Abstract",
        },
        {
          count: 2475,
          value: "Mexican",
        },
        {
          count: 263,
          value: "Aztec",
        },
        {
          count: 1,
          value: "Unmasked",
        },
        {
          count: 2187,
          value: "Doodle",
        },
        {
          count: 490,
          value: "Crayon",
        },
        {
          count: 1573,
          value: "Hawaiian",
        },
        {
          count: 803,
          value: "Indian",
        },
        {
          count: 2061,
          value: "Animal",
        },
      ],
      key: "Mask",
    },
    {
      counts: [
        {
          count: 7,
          value: "The Golden Record",
        },
        {
          count: 2,
          value: "Wöhler Synthesis",
        },
        {
          count: 1,
          value: "Lucy",
        },
        {
          count: 9,
          value: "The Rosetta Stone",
        },
        {
          count: 2,
          value: "Romulus and Remus",
        },
        {
          count: 20,
          value: "Halo",
        },
        {
          count: 32,
          value: "Chess",
        },
        {
          count: 4,
          value: "The Pavamana Mantra",
        },
        {
          count: 37,
          value: "Phoenix",
        },
        {
          count: 20,
          value: "Quiet Night Thought",
        },
        {
          count: 52,
          value: "Cards",
        },
        {
          count: 6,
          value: "Crown",
        },
        {
          count: 21,
          value: "Fibonacci",
        },
        {
          count: 24,
          value: "Für Elise",
        },
      ],
      key: "Set",
    },
    {
      counts: [
        {
          count: 165,
          value: "Golden Robot",
        },
        {
          count: 12,
          value: "Mystical",
        },
        {
          count: 1477,
          value: "Robot",
        },
        {
          count: 8659,
          value: "Male",
        },
        {
          count: 5480,
          value: "Female",
        },
        {
          count: 591,
          value: "Puppet",
        },
      ],
      key: "Character",
    },
    {
      counts: [
        {
          count: 12,
          value: "Mystical",
        },
        {
          count: 1477,
          value: "Steel",
        },
        {
          count: 2,
          value: "Transparent",
        },
        {
          count: 1292,
          value: "Blue",
        },
        {
          count: 4252,
          value: "Light",
        },
        {
          count: 152,
          value: "Freak",
        },
        {
          count: 3784,
          value: "Dark",
        },
        {
          count: 591,
          value: "Wood",
        },
        {
          count: 4657,
          value: "Gray",
        },
        {
          count: 165,
          value: "Gold",
        },
      ],
      key: "Skin Color",
    },
    {
      counts: [
        {
          count: 134,
          value: "Heterochromatic",
        },
        {
          count: 1627,
          value: "Glass",
        },
        {
          count: 3532,
          value: "Blue",
        },
        {
          count: 7419,
          value: "Dark",
        },
        {
          count: 591,
          value: "Painted",
        },
        {
          count: 12,
          value: "Mystical",
        },
        {
          count: 435,
          value: "Freak",
        },
        {
          count: 2634,
          value: "Green",
        },
      ],
      key: "Eye Color",
    },
    {
      counts: [
        {
          count: 1981,
          value: "Waves",
        },
        {
          count: 854,
          value: "Pixel",
        },
        {
          count: 2012,
          value: "Street Art",
        },
        {
          count: 1473,
          value: "Expressionist",
        },
        {
          count: 2209,
          value: "Mystery Night",
        },
        {
          count: 2004,
          value: "Davinci",
        },
        {
          count: 313,
          value: "Book",
        },
        {
          count: 5538,
          value: "Doodle",
        },
      ],
      key: "Background",
    },
    {
      counts: [
        {
          count: 319,
          value: "Mirror",
        },
        {
          count: 450,
          value: "Book",
        },
        {
          count: 395,
          value: "Toilet Paper",
        },
        {
          count: 377,
          value: "Bottle",
        },
        {
          count: 77,
          value: "Golden Toilet Paper",
        },
        {
          count: 233,
          value: "Shadow Monkey",
        },
        {
          count: 14533,
          value: "No Item",
        },
      ],
      key: "Item",
    },
  ],
};

/**
 * Expected results
 */
const expectedCollectionTraits: APIOpenSeaCollectionTrait[] = [
  { key: "Token ID", kind: "numeric", value: { min: 0, max: 16383 } },
  {
    key: "Glyph",
    kind: "string",
    counts: [
      { count: 383, value: "Planetary" },
      { count: 801, value: "Greek Symbol" },
      { count: 640, value: "Mannequin" },
      { count: 264, value: "Zodiac Sign" },
      { count: 504, value: "Egyptian Hieroglyph" },
    ],
  },
  {
    key: "Mask",
    kind: "string",
    counts: [
      { count: 980, value: "Pixel" },
      { count: 229, value: "Steampunk" },
      { count: 10, value: "Unique" },
      { count: 967, value: "African" },
      { count: 2216, value: "Basic" },
      { count: 925, value: "Street" },
      { count: 885, value: "Chinese" },
      { count: 319, value: "Abstract" },
      { count: 2475, value: "Mexican" },
      { count: 263, value: "Aztec" },
      { count: 1, value: "Unmasked" },
      { count: 2187, value: "Doodle" },
      { count: 490, value: "Crayon" },
      { count: 1573, value: "Hawaiian" },
      { count: 803, value: "Indian" },
      { count: 2061, value: "Animal" },
    ],
  },
  {
    key: "Set",
    kind: "string",
    counts: [
      { count: 7, value: "The Golden Record" },
      { count: 2, value: "Wöhler Synthesis" },
      { count: 1, value: "Lucy" },
      { count: 9, value: "The Rosetta Stone" },
      { count: 2, value: "Romulus and Remus" },
      { count: 20, value: "Halo" },
      { count: 32, value: "Chess" },
      { count: 4, value: "The Pavamana Mantra" },
      { count: 37, value: "Phoenix" },
      { count: 20, value: "Quiet Night Thought" },
      { count: 52, value: "Cards" },
      { count: 6, value: "Crown" },
      { count: 21, value: "Fibonacci" },
      { count: 24, value: "Für Elise" },
    ],
  },
  {
    key: "Character",
    kind: "string",
    counts: [
      { count: 165, value: "Golden Robot" },
      { count: 12, value: "Mystical" },
      { count: 1477, value: "Robot" },
      { count: 8659, value: "Male" },
      { count: 5480, value: "Female" },
      { count: 591, value: "Puppet" },
    ],
  },
  {
    key: "Skin Color",
    kind: "string",
    counts: [
      { count: 12, value: "Mystical" },
      { count: 1477, value: "Steel" },
      { count: 2, value: "Transparent" },
      { count: 1292, value: "Blue" },
      { count: 4252, value: "Light" },
      { count: 152, value: "Freak" },
      { count: 3784, value: "Dark" },
      { count: 591, value: "Wood" },
      { count: 4657, value: "Gray" },
      { count: 165, value: "Gold" },
    ],
  },
  {
    key: "Eye Color",
    kind: "string",
    counts: [
      { count: 134, value: "Heterochromatic" },
      { count: 1627, value: "Glass" },
      { count: 3532, value: "Blue" },
      { count: 7419, value: "Dark" },
      { count: 591, value: "Painted" },
      { count: 12, value: "Mystical" },
      { count: 435, value: "Freak" },
      { count: 2634, value: "Green" },
    ],
  },
  {
    key: "Background",
    kind: "string",
    counts: [
      { count: 1981, value: "Waves" },
      { count: 854, value: "Pixel" },
      { count: 2012, value: "Street Art" },
      { count: 1473, value: "Expressionist" },
      { count: 2209, value: "Mystery Night" },
      { count: 2004, value: "Davinci" },
      { count: 313, value: "Book" },
      { count: 5538, value: "Doodle" },
    ],
  },
  {
    key: "Item",
    kind: "string",
    counts: [
      { count: 319, value: "Mirror" },
      { count: 450, value: "Book" },
      { count: 395, value: "Toilet Paper" },
      { count: 377, value: "Bottle" },
      { count: 77, value: "Golden Toilet Paper" },
      { count: 233, value: "Shadow Monkey" },
      { count: 14533, value: "No Item" },
    ],
  },
];

const expectedCollection: APIOpenSeaCollection = {
  devBuyerFeeBasisPoints: 0,
  devSellerFeeBasisPoints: 0,
  openseaBuyerFeeBasisPoints: 0,
  openseaSellerFeeBasisPoints: 250,
  slug: "hashmasks",
  name: "Hashmasks",
  collectionTraits: undefined,
};

const expectedAssetTraits: APIOpenSeaAssetTrait[] = [
  { key: "Background", kind: "string", value: "Expressionist" },
  { key: "Token ID", kind: "numeric", value: "12104" },
  { key: "Mask", kind: "string", value: "Hawaiian" },
  { key: "Skin Color", kind: "string", value: "Blue" },
  { key: "Item", kind: "string", value: "No Item" },
  { key: "Eye Color", kind: "string", value: "Dark" },
  { key: "Character", kind: "string", value: "Male" },
];

const expectedLastSale: APIOpenSeaSale = {
  paymentAsset: {
    address: "0x0000000000000000000000000000000000000000",
    chain: "ETHEREUM",
    tokenStandard: "ERC20",
    symbol: "ETH",
    name: "Ether",
    decimals: 18,
    usdSpotPrice: 2783.75,
  },
  timestamp: new Date("2021-08-05T04:08:25.000Z"),
  totalPrice: new BigNumber("880000000000000000"),
  totalPriceInEth: new BigNumber("880000000000000000"),
};

const expectedBestAsk: APIOpenSeaOrder = {
  side: 1,
  orderType: "BASIC",
  paymentAsset: {
    address: "0x0000000000000000000000000000000000000000",
    chain: "ETHEREUM",
    tokenStandard: "ERC20",
    symbol: "ETH",
    name: "Ether",
    decimals: 18,
    usdSpotPrice: 2783.75,
  },
  totalPrice: new BigNumber("1000000000000000000"),
  totalPriceInEth: new BigNumber("1000000000000000000"),
  user: {
    address: "0xd711e8975f248216dba4730c06fc86b9aa765f92",
    displayName: "carys",
  },
};

const expectedBestBid: APIOpenSeaOrder = {
  side: 0,
  orderType: "BASIC",
  paymentAsset: {
    address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    chain: "ETHEREUM",
    name: "Wrapped Ether",
    symbol: "WETH",
    tokenStandard: "ERC20",
    decimals: 18,
    usdSpotPrice: 2783.75,
  },
  totalPrice: new BigNumber("712300000000000000"),
  totalPriceInEth: new BigNumber("712300000000000000"),
  user: {
    address: "0x507f71061c7dcd589413af566d700a9d24b6c39e",
    displayName: "pixhello",
  },
};

const expectedNFTAsset: APIOpenSeaNFTAsset = {
  assetContract: {
    address: "0xc2c747e0f7004f9e8817db2ca4997657a7746928",
    chain: "ETHEREUM",
    name: "Hashmasks",
    symbol: "HM",
    tokenStandard: "ERC721",
  },
  collection: {
    devBuyerFeeBasisPoints: 0,
    devSellerFeeBasisPoints: 0,
    openseaBuyerFeeBasisPoints: 0,
    openseaSellerFeeBasisPoints: 250,
    slug: "hashmasks",
    name: "Hashmasks",
    collectionTraits: undefined,
  },
  name: "Hashmasks #12104",
  tokenId: 12104,
  owner: {
    address: "0xd711e8975f248216dba4730c06fc86b9aa765f92",
    displayName: "carys",
  },
  lastSale: {
    paymentAsset: {
      address: "0x0000000000000000000000000000000000000000",
      chain: "ETHEREUM",
      tokenStandard: "ERC20",
      symbol: "ETH",
      name: "Ether",
      decimals: 18,
      usdSpotPrice: 2783.75,
    },
    timestamp: new Date("2021-08-05T04:08:25.000Z"),
    totalPrice: new BigNumber("880000000000000000"),
    totalPriceInEth: new BigNumber("880000000000000000"),
  },
  bestAsk: {
    side: 1,
    orderType: "BASIC",
    paymentAsset: {
      address: "0x0000000000000000000000000000000000000000",
      chain: "ETHEREUM",
      tokenStandard: "ERC20",
      symbol: "ETH",
      name: "Ether",
      decimals: 18,
      usdSpotPrice: 2783.75,
    },
    totalPrice: new BigNumber("1000000000000000000"),
    totalPriceInEth: new BigNumber("1000000000000000000"),
    user: {
      address: "0xd711e8975f248216dba4730c06fc86b9aa765f92",
      displayName: "carys",
    },
  },
  bestBid: {
    side: 0,
    orderType: "BASIC",
    paymentAsset: {
      address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      chain: "ETHEREUM",
      name: "Wrapped Ether",
      symbol: "WETH",
      tokenStandard: "ERC20",
      decimals: 18,
      usdSpotPrice: 2783.75,
    },
    totalPrice: new BigNumber("712300000000000000"),
    totalPriceInEth: new BigNumber("712300000000000000"),
    user: {
      address: "0x507f71061c7dcd589413af566d700a9d24b6c39e",
      displayName: "pixhello",
    },
  },
  traits: [
    { key: "Background", kind: "string", value: "Expressionist" },
    { key: "Token ID", kind: "numeric", value: "12104" },
    { key: "Mask", kind: "string", value: "Hawaiian" },
    { key: "Skin Color", kind: "string", value: "Blue" },
    { key: "Item", kind: "string", value: "No Item" },
    { key: "Eye Color", kind: "string", value: "Dark" },
    { key: "Character", kind: "string", value: "Male" },
  ],
};

export { GetAssetResponse, collectionTraits };
export {
  expectedCollectionTraits,
  expectedCollection,
  expectedAssetTraits,
  expectedLastSale,
  expectedBestAsk,
  expectedBestBid,
  expectedNFTAsset,
};
