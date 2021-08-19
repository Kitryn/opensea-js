import { ethers } from "ethers";
import { Network, OpenSeaAPI } from "../src";
import { ContractAddress } from "./constants";

const api = new OpenSeaAPI({
  networkName: Network.Main,
  apiKey: "2f6f419a083c46de9d83ce3dbe7db601",
});

function* jobGenerator(limit: number) {
  let count = 0;
  while (count < limit) {
    yield count;
    count++;
  }
}

let successCount = 0;
let failureCount = 0;

async function worker(gen: Generator<number, void, unknown>) {
  for (const item of gen) {
    try {
      const _ = await api.getAsset({
        tokenAddress: ContractAddress.hashmasks,
        tokenId: item,
      });
      successCount++;
    } catch (error) {
      failureCount++;
    }
  }
}

test("should stress", async () => {
  const gen = jobGenerator(1);
  // for (const job of gen) {
  //   console.log(job);
  // }
  const numWorkers = 50;
  const workers = [];
  for (let i = 0; i < numWorkers; i++) {
    workers.push(gen);
  }

  const promises = workers.map(worker);
  await Promise.allSettled(promises);
  console.log(`Successes: ${successCount}. Failures: ${failureCount}`);
});
