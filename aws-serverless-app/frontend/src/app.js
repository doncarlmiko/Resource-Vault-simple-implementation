const API_URL = "https://od14qmcrug.execute-api.ap-southeast-2.amazonaws.com/dev-prod";

async function createItem() {
  const name = document.getElementById("name").value;
  const qty = document.getElementById("qty").value;

  const res = await fetch(`${API_URL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, qty })
  });

  const data = await res.json();
  document.getElementById("output").textContent = JSON.stringify(data, null, 2);
}
