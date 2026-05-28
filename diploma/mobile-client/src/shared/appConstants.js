export const propertyOptions = [
    { value: "apartment", label: "Квартиры" },
    { value: "house", label: "Дома" }
];

export const roomOptions = [
    { value: "", label: "Все" },
    { value: "studio", label: "Студия" },
    { value: "1", label: "1 комната" },
    { value: "2", label: "2 комнаты" },
    { value: "3", label: "3 комнаты" },
    { value: "4", label: "4+ комнаты" }
];

export const initialDraft = {
    title: "",
    description: "",
    address: "",
    city: "",
    district: "",
    region: "",
    propertyType: "apartment",
    rentalType: "long_term",
    latitude: "",
    longitude: "",
    rooms: "",
    pricePerMonth: "",
    pricePerDay: "",
    maxGuests: "",
    area: "",
    floor: "",
    totalFloors: "",
    photos: []
};

export const navItems = [
    { key: "discover", label: "Обзор" },
    { key: "favorites", label: "Избранное" },
    { key: "messages", label: "Сообщения" },
    { key: "manage", label: "Мои объявления" },
    { key: "profile", label: "Профиль" },
    { key: "admin", label: "Админ" }
];
