export async function apiRequest(path, options = {}) {
  const { auth = true, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);
  const token = sessionStorage.getItem("earthscapeToken");

  const isFormData = typeof FormData !== "undefined" && fetchOptions.body instanceof FormData;
  if (fetchOptions.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;
  try {
    response = await fetch(path, { ...fetchOptions, headers });
  } catch {
    throw new Error("Could not reach the API. Check that the backend is running.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error ?? "The request could not be completed.");
    error.status = response.status;
    error.code = data.code;
    throw error;
  }

  return data;
}

export function clearSession() {
  sessionStorage.removeItem("earthscapeToken");
}
