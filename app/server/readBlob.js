import { ShelbyClient } from "./shelbyClient.js";

const client = new ShelbyClient({
  rpcUrl: "https://rpc.shelby.mock",
  walletAddress: "0x490a1c8c9ed8660ab30a8bdd17b457ab98ac11f8cf2c844136b57567e1dfdb9e",
});

(async () => {
  const data = await client.readBlob("demo_blob_id");
  console.log("Analytics Data:", data);
})();
