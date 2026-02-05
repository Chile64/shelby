const data = {
  rows: [
    { block: 1, txs: 120, volume: 30 },
    { block: 2, txs: 98, volume: 22 },
    { block: 3, txs: 150, volume: 45 },
  ],
};

document.getElementById("output").textContent = JSON.stringify(data, null, 2);
