import { formatMoscowDayLabel, getMoscowDayKey } from "./time";

export function normalizeInteger(value) {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
}

export function normalizeNumber(value) {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = Number.parseFloat(String(value).replace(",", "."));
    return Number.isNaN(parsed) ? null : parsed;
}

export function dialogKey(dialog) {
    return `${dialog.adId}:${dialog.otherUserId}`;
}

export function groupMessagesByDay(messages) {
    const groups = [];
    let currentDay = null;
    let currentDayLabel = null;
    let currentGroup = [];

    const todayKey = getMoscowDayKey(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getMoscowDayKey(yesterday);

    messages.forEach((msg) => {
        const dayKey = getMoscowDayKey(msg.createdAt);
        let dayLabel;

        if (dayKey === todayKey) {
            dayLabel = "Сегодня";
        } else if (dayKey === yesterdayKey) {
            dayLabel = "Вчера";
        } else {
            dayLabel = formatMoscowDayLabel(msg.createdAt);
        }

        if (currentDay !== dayKey) {
            if (currentGroup.length) {
                groups.push({ day: currentDayLabel, messages: [...currentGroup] });
            }
            currentDay = dayKey;
            currentDayLabel = dayLabel;
            currentGroup = [msg];
        } else {
            currentGroup.push(msg);
        }
    });

    if (currentGroup.length) {
        groups.push({ day: currentDayLabel, messages: [...currentGroup] });
    }

    return groups;
}

export function parseSystemPayload(message) {
    if (!message?.messageType || message.messageType === "text") {
        return null;
    }
    try {
        return JSON.parse(message.text);
    } catch {
        return { displayText: message.text };
    }
}

export function autoResizeTextarea(textarea) {
    return textarea;
}
