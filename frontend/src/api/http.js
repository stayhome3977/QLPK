import axios from "axios";

let accessToken = null;
let refreshToken = null;

const AUTH_STORAGE_KEY = "qlpk.auth";

function parseStoredSession() {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function syncSessionTokens(session) {
  accessToken = session?.accessToken || null;
  refreshToken = session?.refreshToken || null;
}

export const hydrateAuthSession = () => {
  const session = parseStoredSession();
  syncSessionTokens(session);
  return session;
};

export const storeAuthSession = (session) => {
  syncSessionTokens(session);

  if (typeof window === "undefined") return;

  if (session?.user && session?.accessToken && session?.refreshToken) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const setAccessToken = (token) => {
  accessToken = token;
};

export const clearAccessToken = () => {
  accessToken = null;
};

export const clearAuthSession = () => {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshRequest = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";
    const isAuthRequest = requestUrl.includes("/api/v1/auth/login") || requestUrl.includes("/api/v1/auth/refresh");

    if (
      error.response?.status !== 401 ||
      !refreshToken ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthRequest
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      refreshRequest ??= axios
        .post(`${api.defaults.baseURL}/api/v1/auth/refresh`, {
          refresh_token: refreshToken
        })
        .then((response) => {
          const previousSession = parseStoredSession();
          const nextSession = {
            user: response.data.user || previousSession?.user || null,
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token
          };

          storeAuthSession(nextSession);
          return response.data.access_token;
        })
        .finally(() => {
          refreshRequest = null;
        });

      const nextAccessToken = await refreshRequest;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearAuthSession();

      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }

      return Promise.reject(refreshError);
    }
  }
);

function extractFilename(headers, fallback) {
  const disposition = headers?.["content-disposition"] || headers?.["Content-Disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}

export async function downloadAuthenticatedFile(path, fallbackFileName) {
  const response = await api.get(path, { responseType: "blob" });
  const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = extractFilename(response.headers, fallbackFileName);
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
}
