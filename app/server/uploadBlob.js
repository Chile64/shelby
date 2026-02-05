import { ShelbyClient } from "./shelbyClient.js";

const client = new ShelbyClient({
  rpcUrl: "https://rpc.shelby.mock",
  walletAddress: "0x490a1c8c9ed8660ab30a8bdd17b457ab98ac11f8cf2c844136b57567e1dfdb9e",
});

const analyticsData = {
  generatedAt: new Date().toISOString(),
  metrics: [
    { block: 1, txs: 120, volume: 30 },
    { block: 2, txs: 98, volume: 22 },
    { block: 3, txs: 150, volume: 45 },
  ],
};

(async () => {
  const result = await client.uploadBlob(analyticsData);
  console.log("Uploaded:", result);
})();
