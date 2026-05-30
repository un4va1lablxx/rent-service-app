import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Для тестирования на реальном мобильном устройстве вместо localhost используйте адрес из App.js: WEB_APP_URL = "http://192.168.0.23:8080".
export const API_BASE_URL = "http://192.168.0.23:8080";

export function assetUrl(url) {
    if (!url) return "";
    const value = String(url);
    const base = new URL(API_BASE_URL);

    // Если это уже полный URL (с http), возвращаем как есть
    if (/^https?:\/\//i.test(value)) {
        try {
            const parsed = new URL(value);
            if (["localhost", "127.0.0.1", "10.0.2.2"].includes(parsed.hostname)) {
                parsed.protocol = base.protocol;
                parsed.host = base.host;
                return parsed.toString();
            }
        } catch {
            return value;
        }
        return value;
    }

    if (/^(data:|file:|content:)/i.test(value)) return value;

    // Если путь начинается с /, приклеиваем наш базовый IP
    if (value.startsWith('/')) return `${API_BASE_URL}${value}`;

    // Если путь относительный без слэша, добавляем слэш и базовый IP
    return `${API_BASE_URL}/${value}`;
}

export const getFullUrl = assetUrl;
function resolveWebSocketUrl(path) {
  const baseUrl = new URL(API_BASE_URL);
  const protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${baseUrl.host}${path}`;
}

async function request(path, options = {}) {
  const token = await storage.getToken();
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Не удалось подключиться к серверу");
    }
    throw error;
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const data = await response.json();
      message = data.error || data.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function queryString(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : "";
}

export const storage = {
  getToken: () => AsyncStorage.getItem("rent-service-token"),
  setToken: (token) => AsyncStorage.setItem("rent-service-token", token),
  clearToken: () => AsyncStorage.removeItem("rent-service-token")
};

export const authApi = {
  register: (payload) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  login: (payload) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  startPasswordReset: (phoneNumber) =>
    request("/api/auth/password-reset/start", {
      method: "POST",
      body: JSON.stringify({ phoneNumber })
    }),
  confirmPasswordReset: (payload) =>
    request("/api/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  startTelegramRegister: (payload) =>
    request("/api/auth/telegram/register/start", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  startTelegramLogin: (payload) =>
    request("/api/auth/telegram/login/start", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  telegramStatus: (requestId) => request(`/api/auth/telegram/status/${requestId}`),
  me: () => request("/api/auth/me"),
  updateMyRole: (role) =>
    request("/api/users/me/role", {
      method: "PATCH",
      body: JSON.stringify({ role })
    }),
  updateMyPaymentDetails: (payload) =>
    request("/api/users/me/payment-details", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  deleteMyPaymentDetails: () =>
    request("/api/users/me/payment-details", {
      method: "DELETE"
    }),
  updateMyPassportDetails: (payload) =>
    request("/api/users/me/passport-details", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  deleteMyPassportDetails: () =>
    request("/api/users/me/passport-details", {
      method: "DELETE"
    }),
  updateMyAvatar: (avatarUrl) =>
    request("/api/users/me/avatar", {
      method: "PATCH",
      body: JSON.stringify({ avatarUrl })
    })
};

export const adsApi = {
  list: (filters = {}) => request(`/api/ads${queryString({ page: 0, size: 24, ...filters })}`),
  my: () => request(`/api/ads/my${queryString({ page: 0, size: 50 })}`),
  details: (adId) => request(`/api/ads/${adId}`),
  create: (payload) =>
    request("/api/ads", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  update: (adId, payload) =>
    request(`/api/ads/${adId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  activate: (adId) =>
    request(`/api/ads/${adId}/activate`, {
      method: "PATCH"
    }),
  deactivate: (adId) =>
    request(`/api/ads/${adId}/deactivate`, {
      method: "PATCH"
    }),
  remove: (adId) =>
    request(`/api/ads/${adId}`, {
      method: "DELETE"
    })
};

export const favoritesApi = {
  list: () => request(`/api/favorites${queryString({ page: 0, size: 100 })}`),
  status: (adId) => request(`/api/favorites/${adId}/status`),
  add: (adId) =>
    request(`/api/favorites/${adId}`, {
      method: "POST"
    }),
  remove: (adId) =>
    request(`/api/favorites/${adId}`, {
      method: "DELETE"
    })
};

export const messagesApi = {
  dialogs: () => request(`/api/messages/dialogs${queryString({ page: 0, size: 100 })}`),
  dialog: (adId, otherUserId) =>
    request(`/api/messages/dialogs/${adId}/${otherUserId}${queryString({ page: 0, size: 200 })}`),
  unreadCount: () => request("/api/messages/unread-count"),
  proposeViewing: (payload) =>
    request("/api/messages/viewings/propose", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  decideViewing: (messageId, accepted) =>
    request(`/api/messages/viewings/proposals/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ accepted })
    }),
  submitViewingResult: (viewingRequestId, confirmed) =>
    request(`/api/messages/viewings/${viewingRequestId}/result`, {
      method: "PATCH",
      body: JSON.stringify({ confirmed })
    }),
  createContract: (payload) =>
    request("/api/messages/contracts", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  contractDetails: (contractId) => request(`/api/messages/contracts/${contractId}`),
  signContract: (contractId, payload) =>
    request(`/api/messages/contracts/${contractId}/sign`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  paymentDetails: (paymentId) => request(`/api/messages/payments/${paymentId}`),
  pay: (paymentId, payload) =>
    request(`/api/messages/payments/${paymentId}/pay`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  declineContract: (payload) =>
    request("/api/messages/contracts/decline", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  send: (payload) =>
    request("/api/messages", {
      method: "POST",
      body: JSON.stringify(payload)
    })
};

export const messagesSocketApi = {
  connect: async () => {
    const token = await storage.getToken();
    if (!token) {
      return null;
    }

    return new WebSocket(
      `${resolveWebSocketUrl("/ws/messages")}?token=${encodeURIComponent(token)}`
    );
  }
};

export const bookingsApi = {
  list: (scope = "all") => request(`/api/bookings${queryString({ scope, page: 0, size: 100 })}`),
  create: (payload) =>
    request("/api/bookings", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  update: (bookingId, status) =>
    request(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    })
};

export const reviewsApi = {
  listMine: (scope = "received") => request(`/api/reviews/me${queryString({ scope, page: 0, size: 100 })}`),
  create: (payload) =>
    request("/api/reviews", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  update: (reviewId, payload) =>
    request(`/api/reviews/${reviewId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  remove: (reviewId) =>
    request(`/api/reviews/${reviewId}`, {
      method: "DELETE"
    })
};

export const usersApi = {
  publicProfile: (userId) => request(`/api/users/${userId}/public`)
};

export const notificationsApi = {
  list: () => request("/api/notifications"),
  unreadCount: () => request("/api/notifications/unread-count"),
  markRead: (notificationId) =>
    request(`/api/notifications/${notificationId}/read`, {
      method: "PATCH"
    }),
  remove: (notificationId) =>
    request(`/api/notifications/${notificationId}`, {
      method: "DELETE"
    }),
  clear: () =>
    request("/api/notifications", {
      method: "DELETE"
    })
};

export const verificationApi = {
  create: (payload) =>
    request("/api/verifications", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  mine: () => request("/api/verifications/me"),
  removeDocument: (requestId, fieldKey) =>
    request(`/api/verifications/${requestId}/documents/${fieldKey}`, {
      method: "DELETE"
    })
};

export const uploadApi = {
  uploadPhoto: async (asset) => {
    const formData = new FormData();
    formData.append("files", {
      uri: asset.uri,
      name: asset.fileName || `photo-${Date.now()}.jpg`,
      type: asset.mimeType || "image/jpeg"
    });
    const urls = await request("/api/upload/photos", {
      method: "POST",
      body: formData,
      headers: {}
    });
    return Array.isArray(urls) ? urls[0] : urls;
  },
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.fileName || file.name || `file-${Date.now()}.jpg`,
      type: file.mimeType || file.type || "image/jpeg"
    });
    return request("/api/upload/file", {
      method: "POST",
      body: formData,
      headers: {}
    });
  }
};

export const adminApi = {
    stats: () => request("/api/admin/stats"),
    users: (page = 0, size = 100) => request(`/api/admin/users?page=${page}&size=${size}`),

    getAllAds: (status = null, page = 0, size = 100) => {
        let url = `/api/admin/ads/all?page=${page}&size=${size}`;
        if (status && status !== "all") {
            url += `&status=${status}`;
        }
        return request(url);
    },

    adDetails: (adId) => request(`/api/admin/ads/${adId}`),

    moderateAd: (adId, payload) =>
        request(`/api/admin/ads/${adId}/moderation`, {
            method: "PATCH",
            body: JSON.stringify(payload)
        }),

    updateUserBlock: (userId, blocked, reason = "") =>
        request(`/api/admin/users/${userId}/block`, {
            method: "PATCH",
            body: JSON.stringify({ blocked, reason })
        }),

    updateUserVerification: (
        userId,
        verified,
        verificationType = null,
        revokeOwnerVerification = false
    ) =>
        request(`/api/admin/users/${userId}/verification`, {
            method: "PATCH",
            body: JSON.stringify({
                verified,
                verificationType,
                revokeOwnerVerification
            })
        }),

    listVerificationRequests: (status = "pending") =>
        request(`/api/admin/verifications${queryString({ status })}`),

    decideVerificationRequest: (requestId, payload) =>
        request(`/api/admin/verifications/${requestId}`, {
            method: "PATCH",
            body: JSON.stringify(payload)
        })
};
