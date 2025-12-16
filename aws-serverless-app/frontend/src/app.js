const apiBaseInput = document.getElementById("apiBase");
const saveBaseBtn = document.getElementById("saveBase");
const createSampleBtn = document.getElementById("createSample");
const clearLogBtn = document.getElementById("clearLog");
const latestResponseEl = document.getElementById("latestResponse");
const responseStatusEl = document.getElementById("responseStatus");
const logContainer = document.getElementById("log");

const createForm = document.getElementById("createForm");
const updateForm = document.getElementById("updateForm");
const readForm = document.getElementById("readForm");
const deleteForm = document.getElementById("deleteForm");

const STORAGE_KEY = "rv-api-base-url";

const savedBase = localStorage.getItem(STORAGE_KEY);
if (savedBase) {
  apiBaseInput.value = savedBase;
}

function normalizeBaseUrl() {
  const value = apiBaseInput.value.trim().replace(/\/$/, "");
  if (!value) {
    throw new Error("Add the API Gateway invoke URL first.");
  }
  if (!/^https?:\/\//i.test(value)) {
    throw new Error("Include http or https in the API URL.");
  }
  return value;
}

function setStatusLabel(status, label) {
  responseStatusEl.className = "pill";
  if (!status) {
    responseStatusEl.classList.add("muted");
    responseStatusEl.textContent = label || "Idle";
    return;
  }
  const isOk = status >= 200 && status < 300;
  responseStatusEl.classList.add(isOk ? "info" : "danger");
  responseStatusEl.textContent = `${label} · ${status}`;
}

function setLatest(label, data, status) {
  setStatusLabel(status, label);
  if (typeof data === "string") {
    latestResponseEl.textContent = data;
  } else {
    latestResponseEl.textContent = JSON.stringify(data, null, 2);
  }
}

function addLogEntry(method, path, status, payload) {
  const entry = document.createElement("div");
  entry.className = "log-entry";
  const statusClass = status && status >= 200 && status < 300 ? "ok" : "err";
  const safeStatus = status || "—";
  entry.innerHTML = `
    <div class="log-meta">
      <span class="log-path">${method} ${path}</span>
      <span class="log-status ${statusClass}">${safeStatus}</span>
    </div>
    <pre class="log-body">${JSON.stringify(payload, null, 2)}</pre>
  `;
  logContainer.prepend(entry);
  while (logContainer.children.length > 12) {
    logContainer.removeChild(logContainer.lastChild);
  }
}

async function makeRequest(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const method = options.method || "GET";
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const init = { ...options, method, headers };
  if (options.body === undefined) {
    delete init.body;
  }

  try {
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    const pathname = new URL(url).pathname;
    addLogEntry(method, pathname, res.status, data);
    setLatest(`${method} ${pathname}`, data, res.status);
    return { res, data };
  } catch (error) {
    addLogEntry(method, path, null, { error: error.message });
    setLatest("Request failed", { error: error.message });
    return { error };
  }
}

function collectPayload(fields) {
  const payload = {};
  fields.forEach(([key, value]) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed !== "") payload[key] = trimmed;
      return;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      payload[key] = value;
    }
  });
  return payload;
}

saveBaseBtn?.addEventListener("click", () => {
  const raw = apiBaseInput.value.trim();
  if (!raw) {
    setLatest("Missing base URL", { error: "Paste the API Gateway invoke URL first." });
    return;
  }
  localStorage.setItem(STORAGE_KEY, raw);
  setLatest("Saved API base URL", { url: raw });
});

clearLogBtn?.addEventListener("click", () => {
  logContainer.innerHTML = "";
  setLatest("Log cleared", {});
});

createSampleBtn?.addEventListener("click", () => {
  const now = new Date();
  const suffix = now.toISOString().slice(11, 19).replace(/:/g, "");
  document.getElementById("createName").value = `Sample artifact ${suffix}`;
  document.getElementById("createOwner").value = "demo-user";
  document.getElementById("createCategory").value = "example";
  document.getElementById("createNotes").value = "Created from the static UI to verify connectivity.";
  document.getElementById("createPriority").value = 3;
  createForm?.requestSubmit();
});

createForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  let baseUrl;
  try {
    baseUrl = normalizeBaseUrl();
  } catch (err) {
    setLatest("Missing configuration", { error: err.message });
    return;
  }

  const payload = collectPayload([
    ["name", document.getElementById("createName").value],
    ["owner", document.getElementById("createOwner").value],
    ["category", document.getElementById("createCategory").value],
    ["notes", document.getElementById("createNotes").value],
  ]);

  const priorityValue = parseInt(document.getElementById("createPriority").value, 10);
  if (!Number.isNaN(priorityValue)) {
    payload.priority = priorityValue;
  }

  const { data } = await makeRequest(baseUrl, "/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (data && data.id) {
    document.getElementById("readId").value = data.id;
    document.getElementById("updateId").value = data.id;
    document.getElementById("deleteId").value = data.id;
  }
});

updateForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  let baseUrl;
  try {
    baseUrl = normalizeBaseUrl();
  } catch (err) {
    setLatest("Missing configuration", { error: err.message });
    return;
  }

  const id = document.getElementById("updateId").value.trim();
  if (!id) {
    setLatest("Missing item id", { error: "Provide an id to update." });
    return;
  }

  const payload = collectPayload([
    ["name", document.getElementById("updateName").value],
    ["owner", document.getElementById("updateOwner").value],
    ["category", document.getElementById("updateCategory").value],
    ["notes", document.getElementById("updateNotes").value],
  ]);

  const priorityValue = parseInt(document.getElementById("updatePriority").value, 10);
  if (!Number.isNaN(priorityValue)) {
    payload.priority = priorityValue;
  }

  payload.id = id;

  const { data } = await makeRequest(baseUrl, `/items/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (data && data.id) {
    document.getElementById("readId").value = data.id;
    document.getElementById("deleteId").value = data.id;
  }
});

readForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  let baseUrl;
  try {
    baseUrl = normalizeBaseUrl();
  } catch (err) {
    setLatest("Missing configuration", { error: err.message });
    return;
  }

  const id = document.getElementById("readId").value.trim();
  if (!id) {
    setLatest("Missing item id", { error: "Provide an id to fetch." });
    return;
  }

  await makeRequest(baseUrl, `/items/${encodeURIComponent(id)}`, {
    method: "GET",
  });
});

deleteForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  let baseUrl;
  try {
    baseUrl = normalizeBaseUrl();
  } catch (err) {
    setLatest("Missing configuration", { error: err.message });
    return;
  }

  const id = document.getElementById("deleteId").value.trim();
  if (!id) {
    setLatest("Missing item id", { error: "Provide an id to delete." });
    return;
  }

  await makeRequest(baseUrl, `/items/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
});