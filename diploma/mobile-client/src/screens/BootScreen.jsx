import React from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";

// Получаем размеры экрана устройства для позиционирования сферы
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function BootScreen() {
    return (
        <View style={styles.bootScreen}>
            {/* Светящаяся декоративная сфера (boot-orb) */}
            <View style={styles.bootOrb} />

            {/* Карточка с текстом (boot-card) */}
            <View style={styles.bootCard}>
                <Text style={styles.eyebrow}>Rent Service</Text>
                <Text style={styles.title}>Запускаем новый интерфейс</Text>
                <Text style={styles.description}>Проверяем сессию и готовим данные.</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    bootScreen: {
        flex: 1,
        backgroundColor: "#0A0A0C", // Глубокий темный фон, характерный для экранов загрузки с "орбами"
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    bootOrb: {
        position: "absolute",
        width: SCREEN_WIDTH * 0.8,
        height: SCREEN_WIDTH * 0.8,
        borderRadius: (SCREEN_WIDTH * 0.8) / 2,
        backgroundColor: "#007AFF",
        opacity: 0.15, // Мягкое свечение
        top: "20%",
        // В iOS размытие можно сделать через shadow, в Android через деградацию цвета или elevation
        shadowColor: "#007AFF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 40,
        elevation: 20,
    },
    bootCard: {
        alignItems: "center",
        paddingHorizontal: 24,
        zIndex: 2, // Чтобы текст был строго поверх сферы
    },
    eyebrow: {
        fontSize: 14,
        textTransform: "uppercase",
        letterSpacing: 2,
        color: "#8E8E93",
        fontWeight: "600",
        marginBottom: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#FFFFFF",
        textAlign: "center",
        marginBottom: 8,
    },
    description: {
        fontSize: 15,
        color: "#E5E5EA",
        textAlign: "center",
        opacity: 0.8,
        lineHeight: 22,
    },
});