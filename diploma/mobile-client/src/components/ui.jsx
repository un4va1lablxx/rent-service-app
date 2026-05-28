import React, { useState, useRef } from "react";
import {
    Animated,
    Modal as RNModal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
// Используем стандартную библиотеку для работы с SVG в мобильной разработке
// Установка: npm install react-native-svg
import Svg, { Path } from "react-native-svg";

// ==========================================
// 1. КОМПОНЕНТ: Metric (Карточка метрики)
// ==========================================
export function Metric({ label, value }) {
    return (
        <View style={[styles.metricCard, styles.glass]}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricValue}>{value}</Text>
        </View>
    );
}

// ==========================================
// 2. КОМПОНЕНТ: Field (Контейнер поля ввода)
// ==========================================
export function Field({ label, children, wide = false }) {
    return (
        <View style={[styles.fieldContainer, wide ? styles.fieldWide : styles.fieldNormal]}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={styles.fieldContent}>
                {children}
            </View>
        </View>
    );
}

// ==========================================
// 3. КОМПОНЕНТ: Fact (Строка характеристик)
// ==========================================
export function Fact({ label, value }) {
    return (
        <View style={styles.factContainer}>
            <Text style={styles.factLabel}>{label}</Text>
            <Text style={styles.factValue}>{value}</Text>
        </View>
    );
}

// ==========================================
// 4. КОМПОНЕНТ: Modal (Нативное модальное окно)
// ==========================================
export function Modal({ children, onClose, wide = false }) {
    return (
        <RNModal
            transparent={true}
            visible={true}
            animationType="fade"
            onRequestClose={onClose} // Корректная обработка аппаратной кнопки «Назад» на Android
        >
            {/* Задний полупрозрачный фон */}
            <Pressable style={styles.modalBackdrop} onPress={onClose}>
                {/* Карточка модалки. Внутренний Pressable без колбэка предотвращает закрытие при клике на контент */}
                <Pressable style={[styles.modalCard, styles.glass, wide ? styles.modalWide : null]}>

                    {/* Кнопка закрытия с увеличенной Touch-зоной для удобства пальцев */}
                    <TouchableOpacity
                        style={styles.modalCloseButton}
                        onPress={onClose}
                        accessibilityLabel="Закрыть"
                        activeOpacity={0.7}
                    >
                        <Icon name="close" />
                    </TouchableOpacity>

                    {children}
                </Pressable>
            </Pressable>
        </RNModal>
    );
}

// ==========================================
// 5. КОМПОНЕНТ: Icon (Интерактивные иконки)
// ==========================================
export function Icon({ name, isActive = false, onAnimationEnd }) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handleClick = () => {
        if (name === "heart") {
            // Создаем плавную нативную микроанимацию отскока (Spring Bounce) при клике на сердечко
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.25, duration: 90, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true })
            ]).start(() => {
                if (onAnimationEnd) onAnimationEnd();
            });
        }
    };

    const isInteractive = name === "heart";
    // Если иконка интерактивная (сердечко), оборачиваем её в кликабельный контейнер
    const WrapperComponent = isInteractive ? TouchableOpacity : View;

    return (
        <WrapperComponent
            onPress={isInteractive ? handleClick : undefined}
            activeOpacity={0.7}
            style={isInteractive ? styles.interactiveIconWrapper : null}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                {name === "heart" && (
                    <Svg viewBox="0 0 24 24" width={24} height={24}>
                        <Path
                            d="M12 20.5 4.8 13.6a4.9 4.9 0 0 1 6.9-6.9L12 7l.3-.3a4.9 4.9 0 1 1 6.9 6.9L12 20.5Z"
                            fill={isActive ? "#FF3B30" : "none"} // Использован системный цвет Vibrant Red для iOS/Android
                            stroke={isActive ? "#FF3B30" : "#2C2C2E"}
                            strokeWidth="1.7"
                            strokeLinejoin="round"
                        />
                    </Svg>
                )}

                {name === "logout" && (
                    <Svg viewBox="0 0 24 24" width={24} height={24}>
                        <Path
                            d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 16l4-4-4-4M18 12H9"
                            fill="none"
                            stroke="#2C2C2E"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                )}

                {name === "close" && (
                    <Svg viewBox="0 0 24 24" width={20} height={20}>
                        <Path
                            d="M6 6 18 18M18 6 6 18"
                            fill="none"
                            stroke="#2C2C2E"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </Svg>
                )}
            </Animated.View>
        </WrapperComponent>
    );
}

// ==========================================
// СТИЛИ: Оптимизированы под мобильные экраны
// ==========================================
const styles = StyleSheet.create({
    // Эффект матового стекла (В React Native реализуется через полупрозрачность и тени)
    glass: {
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.5)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4, // Для теней на Android
    },

    // Стили Metric
    metricCard: {
        padding: 14,
        borderRadius: 12,
        marginVertical: 4,
        minWidth: 100,
    },
    metricLabel: {
        fontSize: 12,
        color: "#666",
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#111",
    },

    // Стили Field
    fieldContainer: {
        marginVertical: 8,
    },
    fieldNormal: {
        width: "48%",
    },
    fieldWide: {
        width: "100%",
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: "500",
        color: "#3A3A3C",
        marginBottom: 6,
    },
    fieldContent: {
        width: "100%",
    },

    // Стили Fact (классический Row-список характеристик для мобильных)
    factContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E5EA",
    },
    factLabel: {
        fontSize: 14,
        color: "#666",
    },
    factValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111",
    },

    // Стили Modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.4)", // затемнение экрана
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalCard: {
        width: "92%",
        maxWidth: 340,
        borderRadius: 20,
        padding: 20,
        position: "relative",
    },
    modalWide: {
        width: "100%",
        maxWidth: 400,
    },
    modalCloseButton: {
        position: "absolute",
        top: 12,
        right: 12,
        width: 44, // Соответствие стандартам Apple/Google на размер тач-зоны
        height: 44,
        borderRadius: 22,
        backgroundColor: "#F2F2F7",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 99,
    },

    // Внутренние отступы для кликабельной иконки
    interactiveIconWrapper: {
        padding: 8,
        justifyContent: "center",
        alignItems: "center",
    }
});