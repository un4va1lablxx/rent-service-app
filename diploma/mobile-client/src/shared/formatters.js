import { propertyOptions } from "./appConstants";

export function roleLabel(role) {
    switch ((role || "").toLowerCase()) {
        case "admin":
            return "Администратор";
        case "landlord":
            return "Арендодатель";
        default:
            return "Арендатор";
    }
}

export function propertyLabel(type) {
    return propertyOptions.find((option) => option.value === type)?.label || "Жилье";
}

export function statusLabel(status) {
    switch ((status || "").toLowerCase()) {
        case "approved":
            return "Одобрено";
        case "rejected":
            return "Отклонено";
        default:
            return "На модерации";
    }
}

export function formatMoney(value) {
    return `${new Intl.NumberFormat("ru-RU").format(value || 0)} ₽`;
}

export function formatArea(value) {
    return value ? `${value} м²` : "Площадь не указана";
}

export function fallbackImage(type) {
    const label = propertyLabel(type);
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f7f7f9" />
          <stop offset="100%" stop-color="#e8ebf0" />
        </linearGradient>
      </defs>
      <rect width="1200" height="900" rx="48" fill="url(#g)" />
      <g fill="#c4cad3">
        <rect x="320" y="290" width="560" height="320" rx="36" />
        <rect x="370" y="360" width="120" height="160" rx="20" fill="#eef1f5" />
        <rect x="550" y="360" width="220" height="90" rx="20" fill="#eef1f5" />
        <rect x="550" y="480" width="140" height="130" rx="20" fill="#eef1f5" />
      </g>
      <text x="600" y="720" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="42" fill="#6e6e73">
        ${label}
      </text>
    </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function formatPriceWithType(price, rentalType) {
    const formatted = new Intl.NumberFormat("ru-RU").format(price || 0);
    if (rentalType === "short_term") {
        return `${formatted} ₽ / сутки`;
    }
    return `${formatted} ₽ / месяц`;
}

export function verificationStatusMeta(status) {
    switch ((status || "").toLowerCase()) {
        case "trusted_partner":
            return { label: "Надежный партнер", tone: "trusted" };
        case "owner_verified":
            return { label: "Подтвержденный собственник", tone: "verified" };
        default:
            return { label: "Базовая верификация", tone: "muted" };
    }
}

export function trustLevelMeta(level, count = 0) {
    switch ((level || "").toLowerCase()) {
        case "gold":
            return { label: "Золотой партнер", tone: "gold" };
        case "trusted":
            return { label: "Надежный", tone: "trusted" };
        case "regular":
            return { label: "Обычный пользователь", tone: "regular" };
        case "attention":
            return { label: "Требует внимания", tone: "danger" };
        default:
            return { label: count < 3 ? "Новый пользователь" : "Нет данных", tone: "muted" };
    }
}

export function formatUserRating(score, count = 0) {
    if (!count || count < 3 || !score) {
        return "Нет данных";
    }
    return `${Number(score).toFixed(2)} ★`;
}
