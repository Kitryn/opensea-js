export interface AssetArchetype {
  assetContractAddress: string;
  tokenId: number;
}

export interface QueryBody {
  id: string;
  query: string;
  variables?: {};
}

export interface GetAssetQueryBody extends QueryBody {
  variables: AssetArchetype;
}
