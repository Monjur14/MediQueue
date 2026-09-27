import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001';

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: false,
});

// ── Attach access token to every request ────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Auto-refresh on 401 ─────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Endpoints where a 401 means "wrong credentials" — never attempt a token refresh on these
const SKIP_REFRESH_URLS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/register-tenant'];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const url = originalRequest.url ?? '';
    const shouldSkip = SKIP_REFRESH_URLS.some((skip) => url.includes(skip));

    // 402 Payment Required — subscription expired/cancelled → redirect to billing
    if (error.response?.status === 402) {
      if (typeof window !== 'undefined') {
        const data = error.response.data as { message?: string; redirect?: string };
        // Store message to show as toast on the billing page
        try { sessionStorage.setItem('billing_alert', data.message ?? 'Your subscription has expired.'); } catch {}
        window.location.href = data.redirect ?? '/billing';
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry && !shouldSkip) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        isRefreshing = false;
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Backend schema uses snake_case: { refresh_token }
        // Backend returns { accessToken } directly (no data wrapper)
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const newAccessToken: string = data.accessToken ?? data.data?.accessToken;
        const newRefreshToken: string | undefined = data.refreshToken ?? data.data?.refreshToken;

        localStorage.setItem('accessToken', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ── Typed API helpers ───────────────────────────────────────────────
export type ApiResponse<T> = {
  message: string;
  data: T;
};

export type ApiError = {
  message: string;
  errors?: Record<string, string[]>;
  upgrade?: boolean;
};
