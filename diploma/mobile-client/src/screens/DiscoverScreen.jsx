import React, { useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

function parseDate(value) {
    const [year, month, day] = String(value || "").split("-").map(Number);
    return year && month && day ? new Date(year, month - 1, day) : new Date();
}

function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function DiscoverScreen(props) {
    const {
        cityFilter, setCityFilter,
        roomsFilter, setRoomsFilter,
        propertyFilter, setPropertyFilter,
        priceMin, setPriceMin,
        priceMax, setPriceMax,
        maxGuestsCount, setMaxGuestsCount,
        checkInDate, setCheckInDate,
        checkOutDate, setCheckOutDate,
        searchRentalType, setSearchRentalType,
        discoverSort, setDiscoverSort,
        curatedAds, favoriteIds,
        favoriteStatusMap, loadingMap,
        propertyOptions, ListingCard,
        handleSearchSubmit, handleToggleFavorite,
        setSelectedAdId
    } = props;

    const [datePicker, setDatePicker] = useState({ open: false, field: "checkIn" });

    // Безопасный вызов веб-обработчика формы на мобильной платформе
    const triggerSearch = () => {
        if (handleSearchSubmit) {
            handleSearchSubmit({ preventDefault: () => {} });
        }
    };

    return (
        <ScrollView
            style={styles.discoverPage}
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
        >
            {/* ==========================================
          БЛОК 1: Фильтры (Вместо веб-сайдбара aside)
          ========================================== */}
            <View style={[styles.filterPanel, styles.glass]}>

                {/* Переключатель типа аренды */}
                <View style={styles.rentalTypeSwitch}>
                    <TouchableOpacity
                        style={[styles.switchBtn, searchRentalType === "long_term" ? styles.switchBtnActive : null]}
                        onPress={() => setSearchRentalType("long_term")}
                    >
                        <Text style={[styles.switchBtnText, searchRentalType === "long_term" ? styles.switchBtnTextActive : null]}>
                            Длительная
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.switchBtn, searchRentalType === "short_term" ? styles.switchBtnActive : null]}
                        onPress={() => setSearchRentalType("short_term")}
                    >
                        <Text style={[styles.switchBtnText, searchRentalType === "short_term" ? styles.switchBtnTextActive : null]}>
                            Посуточная
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Поле: Город */}
                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Город</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Введите город"
                        placeholderTextColor="#A2A2A7"
                        value={cityFilter}
                        onChangeText={setCityFilter}
                    />
                </View>

                {/* Динамическое поле: Комнаты (Длительно) / Гости (Посуточно) */}
                {searchRentalType === "long_term" ? (
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Комнаты</Text>
                        {/* Горизонтальный выбор комнат вместо неудобного на телефонах select */}
                        <View style={styles.segmentedContainer}>
                            {[
                                { label: "Любые", value: "" },
                                { label: "1", value: "1" },
                                { label: "2", value: "2" },
                                { label: "3", value: "3" },
                                { label: "4+", value: "4" }
                            ].map((opt) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[styles.segmentedBtn, roomsFilter === opt.value ? styles.segmentedBtnActive : null]}
                                    onPress={() => setRoomsFilter(opt.value)}
                                >
                                    <Text style={[styles.segmentedBtnText, roomsFilter === opt.value ? styles.segmentedBtnTextActive : null]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : (
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Количество гостей</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Например, 2"
                            placeholderTextColor="#A2A2A7"
                            keyboardType="numeric"
                            value={maxGuestsCount ? String(maxGuestsCount) : ""}
                            onChangeText={(text) => setMaxGuestsCount(Math.max(1, Number(text) || 0))}
                        />
                    </View>
                )}

                {/* Ряд: Диапазон Цен */}
                <View style={styles.filterInlineGrid}>
                    <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.fieldLabel}>Цена от</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={searchRentalType === "short_term" ? "₽/сутки" : "от ₽"}
                            placeholderTextColor="#A2A2A7"
                            keyboardType="numeric"
                            value={priceMin ? String(priceMin) : ""}
                            onChangeText={(text) => setPriceMin(Math.max(0, Number(text) || 0))}
                        />
                    </View>
                    <View style={[styles.field, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.fieldLabel}>Цена до</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={searchRentalType === "short_term" ? "₽/сутки" : "до ₽"}
                            placeholderTextColor="#A2A2A7"
                            keyboardType="numeric"
                            value={priceMax ? String(priceMax) : ""}
                            onChangeText={(text) => setPriceMax(Math.max(0, Number(text) || 0))}
                        />
                    </View>
                </View>

                {/* Поля дат (Только для посуточной аренды) */}
                {searchRentalType === "short_term" && (
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Даты проживания</Text>
                        <View style={styles.dateRangeContainer}>
                            <TouchableOpacity style={styles.dateButton} onPress={() => setDatePicker({ open: true, field: "checkIn" })}>
                                <Text style={[styles.dateButtonText, !checkInDate && styles.dateButtonPlaceholder]}>
                                    {checkInDate || "Заезд"}
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.dateSeparator}>➔</Text>
                            <TouchableOpacity style={styles.dateButton} onPress={() => setDatePicker({ open: true, field: "checkOut" })}>
                                <Text style={[styles.dateButtonText, !checkOutDate && styles.dateButtonPlaceholder]}>
                                    {checkOutDate || "Выезд"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {datePicker.open && (
                            <DateTimePicker
                                value={parseDate(datePicker.field === "checkIn" ? checkInDate : checkOutDate)}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setDatePicker((prev) => ({ ...prev, open: false }));
                                    if (event.type === "dismissed" || !selectedDate) return;
                                    const value = formatDate(selectedDate);
                                    if (datePicker.field === "checkIn") setCheckInDate(value);
                                    else setCheckOutDate(value);
                                }}
                            />
                        )}
                    </View>
                )}

                {/* Кнопка отправки поискового запроса */}
                <TouchableOpacity style={styles.primaryButton} onPress={triggerSearch}>
                    <Text style={styles.primaryButtonText}>Показать объявления</Text>
                </TouchableOpacity>

                {/* Фильтр: Тип жилья */}
                <View style={styles.tagsContainer}>
                    <Text style={styles.filterTagsLabel}>Тип жилья</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                        <TouchableOpacity
                            style={[styles.tagButton, !propertyFilter ? styles.tagButtonActive : null]}
                            onPress={() => setPropertyFilter("")}
                        >
                            <Text style={[styles.tagButtonText, !propertyFilter ? styles.tagButtonTextActive : null]}>Все</Text>
                        </TouchableOpacity>
                        {propertyOptions.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[styles.tagButton, propertyFilter === option.value ? styles.tagButtonActive : null]}
                                onPress={() => setPropertyFilter(option.value)}
                            >
                                <Text style={[styles.tagButtonText, propertyFilter === option.value ? styles.tagButtonTextActive : null]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

            </View>

            {/* ==========================================
          БЛОК 2: Результаты выдачи
          ========================================== */}
            <View style={styles.resultsPanel}>
                <View style={styles.resultsTopbar}>
                    <Text style={styles.resultsCount}>Найдено {curatedAds.length} объявлений</Text>
                </View>

                {/* Кастомный селектор сортировки */}
                <View style={styles.sortContainer}>
                    <Text style={styles.sortLabel}>Сортировка:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                        {[
                            { label: "По рейтингу", value: "rating_desc" },
                            { label: "Сначала новые", value: "recent" },
                            { label: "Сначала дешевле", value: "price_asc" },
                            { label: "Сначала дороже", value: "price_desc" }
                        ].map((sortOpt) => (
                            <TouchableOpacity
                                key={sortOpt.value}
                                style={[styles.sortOptBtn, discoverSort === sortOpt.value ? styles.sortOptBtnActive : null]}
                                onPress={() => setDiscoverSort(sortOpt.value)}
                            >
                                <Text style={[styles.sortOptBtnText, discoverSort === sortOpt.value ? styles.sortOptBtnTextActive : null]}>
                                    {sortOpt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Сетка карточек объявлений */}
                <View style={styles.cardGrid}>
                    {curatedAds.map((ad) => (
                        <View key={ad.id} style={styles.cardWrapper}>
                            <ListingCard
                                ad={ad}
                                onOpen={setSelectedAdId}
                                onToggleFavorite={handleToggleFavorite}
                                isFavorite={favoriteIds.has(ad.id) || favoriteStatusMap[ad.id]}
                                loading={loadingMap[`favorite-${ad.id}`]}
                            />
                        </View>
                    ))}
                </View>

                {/* Состояние "Пусто" */}
                {!curatedAds.length && (
                    <View style={[styles.emptyState, styles.glass]}>
                        <Text style={styles.emptyTitle}>Подходящих объявлений пока нет</Text>
                        <Text style={styles.emptySubtitle}>Попробуйте изменить фильтры или расширить диапазон цены и дат.</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

// ==========================================
// СТИЛИ: Оптимизированы под мобильные экраны
// ==========================================
const styles = StyleSheet.create({
    discoverPage: {
        flex: 1,
        backgroundColor: "#F2F2F7",
    },
    scrollContainer: {
        padding: 14,
    },
    glass: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    filterPanel: {
        marginBottom: 20,
        width: "100%",
    },
    rentalTypeSwitch: {
        flexDirection: "row",
        backgroundColor: "#E5E5EA",
        borderRadius: 10,
        padding: 2,
        marginBottom: 16,
    },
    switchBtn: {
        flex: 1,
        paddingVertical: 8,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
    },
    switchBtnActive: {
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    switchBtnText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#636366",
    },
    switchBtnTextActive: {
        color: "#000000",
        fontWeight: "600",
    },
    field: {
        marginBottom: 14,
        width: "100%",
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: "500",
        color: "#3A3A3C",
        marginBottom: 6,
    },
    input: {
        width: "100%",
        height: 44,
        backgroundColor: "#F2F2F7",
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 15,
        color: "#1C1C1E",
    },
    filterInlineGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
    },
    segmentedContainer: {
        flexDirection: "row",
        backgroundColor: "#F2F2F7",
        borderRadius: 10,
        padding: 2,
    },
    segmentedBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: "center",
        borderRadius: 8,
    },
    segmentedBtnActive: {
        backgroundColor: "#007AFF",
    },
    segmentedBtnText: {
        fontSize: 13,
        color: "#1C1C1E",
    },
    segmentedBtnTextActive: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    dateRangeContainer: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
    },
    dateButton: {
        flex: 1,
        height: 44,
        borderRadius: 10,
        backgroundColor: "#F2F2F7",
        justifyContent: "center",
        paddingHorizontal: 12,
    },
    dateButtonText: {
        color: "#1C1C1E",
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
    },
    dateButtonPlaceholder: {
        color: "#A2A2A7",
        fontWeight: "500",
    },
    dateSeparator: {
        marginHorizontal: 8,
        color: "#8E8E93",
    },
    primaryButton: {
        width: "100%",
        height: 46,
        backgroundColor: "#007AFF",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 6,
        marginBottom: 16,
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "600",
    },
    tagsContainer: {
        marginTop: 4,
    },
    filterTagsLabel: {
        fontSize: 13,
        fontWeight: "500",
        color: "#3A3A3C",
        marginBottom: 8,
    },
    horizontalScroll: {
        flexDirection: "row",
    },
    tagButton: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        backgroundColor: "#F2F2F7",
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: "transparent",
    },
    tagButtonActive: {
        backgroundColor: "#E1F0FF",
        borderColor: "#007AFF",
    },
    tagButtonText: {
        fontSize: 13,
        color: "#3A3A3C",
    },
    tagButtonTextActive: {
        color: "#007AFF",
        fontWeight: "600",
    },
    resultsPanel: {
        width: "100%",
    },
    resultsTopbar: {
        marginBottom: 10,
    },
    resultsCount: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1C1C1E",
    },
    sortContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    sortLabel: {
        fontSize: 13,
        color: "#636366",
        marginRight: 6,
    },
    sortOptBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 6,
    },
    sortOptBtnActive: {
        borderBottomWidth: 2,
        borderBottomColor: "#007AFF",
    },
    sortOptBtnText: {
        fontSize: 13,
        color: "#636366",
    },
    sortOptBtnTextActive: {
        color: "#007AFF",
        fontWeight: "600",
    },
    cardGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        width: "100%",
    },
    cardWrapper: {
        width: "100%", // На мобильных стандартно — 1 карточка в ряд. Для 2-х колонок укажите "48%"
        marginBottom: 14,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
        paddingHorizontal: 16,
        marginTop: 10,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1C1C1E",
        textAlign: "center",
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 14,
        color: "#8E8E93",
        textAlign: "center",
        lineHeight: 18,
    }
});
