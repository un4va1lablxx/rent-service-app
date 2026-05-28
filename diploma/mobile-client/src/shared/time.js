const MOSCOW_TIME_ZONE = "Europe/Moscow";

function parseLocalDateTimeParts(value) {
    if (!value) return null;
    if (value instanceof Date) {
        return value;
    }
    const normalized = String(value);
    if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(normalized)) {
        const absoluteDate = new Date(normalized);
        return Number.isNaN(absoluteDate.getTime()) ? null : absoluteDate;
    }
    const [datePart, timePart = "00:00:00"] = normalized.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours = 0, minutes = 0, seconds = 0] = timePart.split(":").map(Number);
    if (!year || !month || !day) return null;
    return new Date(Date.UTC(year, month - 1, day, hours - 3, minutes, seconds));
}

export function formatMoscowTime(value) {
    const date = parseLocalDateTimeParts(value);
    if (!date) return "";
    return new Intl.DateTimeFormat("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: MOSCOW_TIME_ZONE
    }).format(date);
}

export function formatMoscowDayLabel(value) {
    const date = parseLocalDateTimeParts(value);
    if (!date) return "";
    return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        timeZone: MOSCOW_TIME_ZONE
    }).format(date);
}

export function getMoscowDayKey(value) {
    const date = parseLocalDateTimeParts(value);
    if (!date) return "";
    return new Intl.DateTimeFormat("sv-SE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: MOSCOW_TIME_ZONE
    }).format(date);
}

export function formatMoscowDateWords(date = new Date()) {
    return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: MOSCOW_TIME_ZONE
    }).format(date);
}

export function calculateRentalDuration(startDate, endDate, rentalType) {
    if (!startDate || !endDate) return "";

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        return "";
    }

    if (rentalType === "short_term") {
        const diffDays = Math.max(1, Math.round((end - start) / 86400000));
        return `${diffDays} ${pluralize(diffDays, "сутки", "суток", "суток")}`;
    }

    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (months <= 0) months = 1;
    return `${months} ${pluralize(months, "месяц", "месяца", "месяцев")}`;
}

function pluralize(value, one, few, many) {
    const mod100 = value % 100;
    const mod10 = value % 10;
    if (mod100 >= 11 && mod100 <= 19) return many;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
}

export { MOSCOW_TIME_ZONE };
