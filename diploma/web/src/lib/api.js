const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8080";

async function request(path, options = {}) {
  const token = localStorage.getItem("rent-service-token");
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const data = await response.json();
      message = data.error || message;
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
  getToken: () => localStorage.getItem("rent-service-token"),
  setToken: (token) => localStorage.setItem("rent-service-token", token),
  clearToken: () => localStorage.removeItem("rent-service-token")
};

export const authApi = {
  requestSmsCode: (phoneNumber, purpose) =>
    request("/api/auth/sms-code", {
      method: "POST",
      body: JSON.stringify({ phoneNumber, purpose })
    }),
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
  me: () => request("/api/auth/me"),
  updateMyRole: (role) =>
    request("/api/users/me/role", {
      method: "PATCH",
      body: JSON.stringify({ role })
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
  send: (payload) =>
    request("/api/messages", {
      method: "POST",
      body: JSON.stringify(payload)
    })
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
    })
};

export const verificationApi = {
  create: (payload) =>
    request("/api/verifications", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  mine: () => request(`/api/verifications/me${queryString({ page: 0, size: 50 })}`)
};

export const uploadApi = {
    upload: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return request('/api/upload', {
            method: 'POST',
            body: formData,
            headers: {} // не ставим Content-Type, браузер сам поставит с boundary
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
    updateUserVerification: (userId, verified, smsVerified = false, gosuslugiVerified = false) =>
        request(`/api/admin/users/${userId}/verification`, {
            method: "PATCH",
            body: JSON.stringify({ verified, smsVerified, gosuslugiVerified })
        }),
};