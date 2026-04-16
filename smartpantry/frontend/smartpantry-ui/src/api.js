const hostname =
  typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
const API_BASE =
  process.env.REACT_APP_API_BASE || `http://${hostname}:8000`;

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function request(path, { method = "GET", body = null, isForm = false } = {}) {
  const headers = {};
  const token = getToken();

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!isForm) {
    headers["Content-Type"] = "application/json";
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : null,
    });
  } catch (err) {
    throw new Error("Cannot connect to backend");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.detail || `Request failed (${res.status})`);
  }

  return data;
}

export const api = {
  signup: (payload) =>
    request("/auth/signup", { method: "POST", body: payload }),

  login: (payload) =>
    request("/auth/login", { method: "POST", body: payload }),

  me: () => request("/me"),

  updateMe: (payload) =>
    request("/me", { method: "PUT", body: payload }),

  getAdminSummary: () => request("/admin/summary"),

  listAdminUsers: () => request("/admin/users"),

  updateAdminUserRole: (id, payload) =>
    request(`/admin/users/${id}/role`, { method: "PUT", body: payload }),

  listInventory: () => request("/inventory"),

  addItem: (payload) =>
    request("/inventory", { method: "POST", body: payload }),

  updateItem: (id, payload) =>
    request(`/inventory/${id}`, { method: "PUT", body: payload }),

  deleteItem: (id) =>
    request(`/inventory/${id}`, { method: "DELETE" }),

  listShoppingItems: () => request("/shopping-list"),

  addShoppingItem: (payload) =>
    request("/shopping-list", { method: "POST", body: payload }),

  updateShoppingItem: (id, payload) =>
    request(`/shopping-list/${id}`, { method: "PUT", body: payload }),

  deleteShoppingItem: (id) =>
    request(`/shopping-list/${id}`, { method: "DELETE" }),

  quickAdd: (payload) =>
    request("/ai/quick-add", { method: "POST", body: payload }),

  barcodeLookup: (payload) =>
    request("/ai/barcode-lookup", { method: "POST", body: payload }),

  ocrReceipt: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return request("/ai/ocr-receipt", {
      method: "POST",
      body: fd,
      isForm: true,
    });
  },

  ocrCommit: (items) =>
    request("/ai/ocr-commit", { method: "POST", body: items }),

  getRecipes: () => request("/ai/recipes"),

  getGeminiRecipes: () => request("/ai/recipes-gemini"),
};
