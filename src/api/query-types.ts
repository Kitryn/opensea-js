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

/**
 * Any error that has to do with fetching data?
 * HTTP errors, GQL errors, etc
 */
export class ApiError extends Error {
  data: any;

  constructor(message: string, stack?: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.data = data; // can be undefined

    if (stack != undefined) {
      this.stack =
        this.stack?.split("\n").slice(0, 2).join("\n") + "\n" + stack;
    }
  }
}
