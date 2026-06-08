import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

const TELEGRAM_ICON = require("../../assets/telegram.png");
const EYE_ICON = require("../../assets/eye.png");

export function AuthScreen(props) {
    // Деструктурируем все переданные пропсы без изменений структуры
    const {
        authMode,
        setAuthMode,
        authView,
        setAuthView,
        phoneNumber,
        setPhoneNumber,
        fullName,
        setFullName,
        password,
        setPassword,
        telegramAuth,
        setTelegramAuth,
        error,
        setError,
        notice,
        setNotice,
        loadingMap,
        resetCode,
        handleResetCodeChange,
        handleResetCodeKeyDown,
        newPassword,
        setNewPassword,
        handleForgotPassword,
        handleAuthSubmit,
        handleTelegramAuth,
        handlePasswordResetSubmit,
    } = props;

    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Массив ссылок для управления фокусом в ячейках ввода кода
    const codeRefs = useRef([]);

    // Безопасный вызов внешних ссылок (переход в Telegram-бота)
    const openTelegramBot = async (url) => {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            console.error("Не удалось открыть ссылку: " + url);
        }
    };

    // Адаптер для вызова веб-событий отправки формы
    const triggerSubmit = (submitHandler) => {
        Keyboard.dismiss();
        if (submitHandler) {
            submitHandler({ preventDefault: () => {} });
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.authShell}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[styles.authCard, styles.glass]}>

                    {/* ==========================================
              РЕЖИМ 1: Форма Входа / Регистрации
              ========================================== */}
                    {authView === "form" && (
                        <>
                            <View style={styles.titleContainer}>
                                <Text style={styles.mainTitle}>
                                    {authMode === "login" ? "Вход в систему" : "Регистрация"}
                                </Text>
                            </View>

                            {telegramAuth ? (
                                // Подрежим: Авторизация через Telegram (QR-код)
                                <View style={styles.telegramAuthContainer}>
                                    <Text style={styles.subtitleText}>
                                        Для завершения {authMode === "register" ? "регистрации" : "входа"} перейдите в Telegram-бота
                                    </Text>

                                    <Image
                                        source={{ uri: telegramAuth.qrCodeUrl }}
                                        style={styles.qrCodeImage}
                                    />

                                    <TouchableOpacity
                                        style={styles.primaryButton}
                                        onPress={() => openTelegramBot(telegramAuth.botLink)}
                                    >
                                        <Text style={styles.primaryButtonText}>Перейти в бота</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.backButton}
                                        onPress={() => setTelegramAuth(null)}
                                    >
                                        <Text style={styles.backButtonText}>← Назад</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                // Подрежим: Стандартная форма (Телефон / Пароль)
                                <View style={styles.formContainer}>

                                    {/* Поле: Телефон */}
                                    <View style={styles.field}>
                                        <Text style={styles.fieldLabel}>Телефон</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={phoneNumber}
                                            onChangeText={setPhoneNumber}
                                            placeholder="+7 999 123-45-67"
                                            placeholderTextColor="#A2A2A7"
                                            keyboardType="phone-pad"
                                            autoComplete="tel"
                                        />
                                    </View>

                                    {/* Поле: ФИО (Только при регистрации) */}
                                    {authMode === "register" && (
                                        <View style={styles.field}>
                                            <Text style={styles.fieldLabel}>Полное ФИО</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={fullName}
                                                onChangeText={setFullName}
                                                placeholder="Иванов Иван Иванович"
                                                placeholderTextColor="#A2A2A7"
                                                autoCapitalize="words"
                                            />
                                        </View>
                                    )}

                                    {/* Поле: Пароль */}
                                    <View style={styles.field}>
                                        <Text style={styles.fieldLabel}>Пароль</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={password}
                                            onChangeText={setPassword}
                                            placeholder="Минимум 6 символов"
                                            placeholderTextColor="#A2A2A7"
                                            secureTextEntry={!showPassword}
                                        />
                                        <TouchableOpacity
                                            style={styles.eyeButton}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setShowPassword((value) => !value);
                                            }}
                                            accessibilityRole="button"
                                        >
                                            <Image source={EYE_ICON} style={[styles.eyeIcon, showPassword && styles.eyeIconActive]} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Ссылка "Забыли пароль?" */}
                                    {authMode === "login" && (
                                        <TouchableOpacity
                                            style={styles.forgotPasswordContainer}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                handleForgotPassword();
                                            }}
                                            disabled={loadingMap["forgot-send"]}
                                        >
                                            <Text style={styles.accentLinkText}>
                                                {loadingMap["forgot-send"] ? "Отправляем код..." : "Забыли пароль?"}
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Ошибки и уведомления */}
                                    {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
                                    {!!notice && <View style={styles.noticeBox}><Text style={styles.noticeText}>{notice}</Text></View>}

                                    {/* Основная кнопка действия */}
                                    <TouchableOpacity
                                        style={[styles.primaryButton, loadingMap.auth ? styles.buttonDisabled : null]}
                                        onPress={() => triggerSubmit(handleAuthSubmit)}
                                        disabled={loadingMap.auth}
                                    >
                                        {loadingMap.auth ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Text style={styles.primaryButtonText}>
                                                {authMode === "register" ? "Создать аккаунт" : "Войти"}
                                            </Text>
                                        )}
                                    </TouchableOpacity>

                                    {/* Переключатель режима Вход / Регистрация */}
                                    <View style={styles.toggleAuthModeRow}>
                                        <Text style={styles.mutedText}>
                                            {authMode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setAuthMode(authMode === "login" ? "register" : "login");
                                                setError("");
                                                setNotice("");
                                                setPassword("");
                                                setTelegramAuth(null);
                                            }}
                                        >
                                            <Text style={styles.accentLinkText}>
                                                {authMode === "login" ? "Зарегистрироваться" : "Войти"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Разделитель "ИЛИ" */}
                                    <View style={styles.dividerRow}>
                                        <View style={styles.dividerLine} />
                                        <Text style={styles.dividerText}>или</Text>
                                        <View style={styles.dividerLine} />
                                    </View>

                                    {/* Вход через Telegram OAuth */}
                                    <View style={styles.socialAuthRow}>
                                        <TouchableOpacity
                                            disabled={loadingMap["telegram-auth"]}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                handleTelegramAuth();
                                            }}
                                            style={[styles.telegramCircleButton, loadingMap["telegram-auth"] ? { opacity: 0.6 } : null]}
                                        >
                                            {/* Используем текстовую замену или иконку. Для надежности выведем сокращенный бренд-текст */}
                                            <Image source={TELEGRAM_ICON} style={styles.telegramIcon} />
                                        </TouchableOpacity>
                                    </View>

                                </View>
                            )}
                        </>
                    )}

                    {/* ==========================================
              РЕЖИМ 2: Сброс пароля (Ввод кода)
              ========================================== */}
                    {authView === "reset" && (
                        <View style={styles.formContainer}>
                            <View style={styles.titleContainer}>
                                <Text style={styles.mainTitle}>Установка нового пароля</Text>
                                <Text style={styles.subtitleText}>
                                    Введите код подтверждения, отправленный в Telegram-бота
                                </Text>
                            </View>

                            {/* Сетка ввода 6-значного кода с автопереключением фокуса */}
                            <View style={styles.resetCodeRow}>
                                {resetCode.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={(el) => (codeRefs.current[index] = el)}
                                        style={styles.resetCodeInput}
                                        keyboardType="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChangeText={(text) => {
                                            handleResetCodeChange(index, text);
                                            // Смещение фокуса вперед на телефонах при вводе
                                            if (text && index < 5) {
                                                codeRefs.current[index + 1]?.focus();
                                            }
                                        }}
                                        onKeyPress={(e) => {
                                            // Смещение фокуса назад на телефонах при стирании
                                            if (e.nativeEvent.key === "Backspace" && !digit && index > 0) {
                                                codeRefs.current[index - 1]?.focus();
                                            }
                                            handleResetCodeKeyDown?.(index, {
                                                key: e.nativeEvent.key,
                                                preventDefault: () => {}
                                            });
                                        }}
                                    />
                                ))}
                            </View>

                            {/* Поле: Новый пароль */}
                            <View style={styles.field}>
                                <Text style={styles.fieldLabel}>Новый пароль</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Введите новый пароль"
                                    placeholderTextColor="#A2A2A7"
                                    secureTextEntry={!showNewPassword}
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setShowNewPassword((value) => !value);
                                    }}
                                    accessibilityRole="button"
                                >
                                    <Image source={EYE_ICON} style={[styles.eyeIcon, showNewPassword && styles.eyeIconActive]} />
                                </TouchableOpacity>
                            </View>

                            {/* Ошибки и уведомления */}
                            {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
                            {!!notice && <View style={styles.noticeBox}><Text style={styles.noticeText}>{notice}</Text></View>}

                            {/* Кнопка отправки нового пароля */}
                            <TouchableOpacity
                                style={[styles.primaryButton, loadingMap["forgot-confirm"] ? styles.buttonDisabled : null]}
                                onPress={() => triggerSubmit(handlePasswordResetSubmit)}
                                disabled={loadingMap["forgot-confirm"]}
                            >
                                {loadingMap["forgot-confirm"] ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Сохранить пароль</Text>
                                )}
                            </TouchableOpacity>

                            {/* Кнопка отмены */}
                            <TouchableOpacity
                                style={styles.ghostButton}
                                onPress={() => {
                                    Keyboard.dismiss();
                                    setAuthView("form");
                                    setError("");
                                    setNotice("");
                                    handleResetCodeChange(0, ""); // сброс локального массива через стейт родителя
                                    setNewPassword("");
                                }}
                            >
                                <Text style={styles.ghostButtonText}>Назад ко входу</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    authShell: {
        flex: 1,
        backgroundColor: "#F2F2F7", // Родной системный фон iOS/Android Light Mode
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    glass: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.6)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 6,
    },
    authCard: {
        width: "100%",
        maxWidth: 440,
        borderRadius: 24,
        padding: 24,
    },
    titleContainer: {
        alignItems: "center",
        marginBottom: 20,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1C1C1E",
        textAlign: "center",
    },
    subtitleText: {
        fontSize: 14,
        color: "#8E8E93",
        textAlign: "center",
        lineHeight: 20,
        marginTop: 6,
        marginBottom: 16,
    },
    formContainer: {
        width: "100%",
    },
    field: {
        marginBottom: 16,
        width: "100%",
        position: "relative",
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: "500",
        color: "#3A3A3C",
        marginBottom: 6,
        paddingLeft: 2,
    },
    input: {
        width: "100%",
        height: 48,
        backgroundColor: "#E5E5EA",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingRight: 52,
        fontSize: 15,
        color: "#1C1C1E",
    },
    passwordInputWrap: {
        position: "relative",
        width: "100%",
    },
    passwordInput: {
        paddingRight: 52,
    },
    eyeButton: {
        position: "absolute",
        right: 6,
        bottom: 4,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    eyeIcon: {
        width: 22,
        height: 22,
        tintColor: "#3A3A3C",
    },
    eyeIconActive: {
        tintColor: "#007AFF",
    },
    forgotPasswordContainer: {
        alignSelf: "flex-end",
        marginTop: -4,
        marginBottom: 20,
        paddingVertical: 4,
    },
    accentLinkText: {
        color: "#007AFF",
        fontSize: 14,
        fontWeight: "600",
    },
    primaryButton: {
        width: "100%",
        height: 50,
        backgroundColor: "#007AFF",
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
        shadowColor: "#007AFF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    buttonDisabled: {
        opacity: 0.7,
        backgroundColor: "#A2A2A7",
    },
    ghostButton: {
        width: "100%",
        height: 48,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
    },
    ghostButtonText: {
        color: "#8E8E93",
        fontSize: 15,
        fontWeight: "500",
    },
    toggleAuthModeRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 20,
    },
    mutedText: {
        color: "#8E8E93",
        fontSize: 14,
    },
    errorBox: {
        backgroundColor: "#FFEBEB",
        borderColor: "#FF3B30",
        borderWidth: 1,
        padding: 12,
        borderRadius: 10,
        marginBottom: 14,
    },
    errorText: {
        color: "#FF3B30",
        fontSize: 13,
        fontWeight: "500",
    },
    noticeBox: {
        backgroundColor: "#E8F5E9",
        borderColor: "#34C759",
        borderWidth: 1,
        padding: 12,
        borderRadius: 10,
        marginBottom: 14,
    },
    noticeText: {
        color: "#34C759",
        fontSize: 13,
        fontWeight: "500",
    },
    dividerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: "#D1D1D6",
    },
    dividerText: {
        marginHorizontal: 12,
        color: "#8E8E93",
        fontSize: 14,
    },
    socialAuthRow: {
        alignItems: "center",
        justifyContent: "center",
    },
    telegramCircleButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: "#29B6F6", // Фирменный цвет Telegram
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#29B6F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    telegramIcon: {
        width: 28,
        height: 28,
        resizeMode: "contain",
    },
    telegramCircleButtonText: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 16,
    },
    telegramAuthContainer: {
        alignItems: "center",
        width: "100%",
    },
    qrCodeImage: {
        width: 180,
        height: 180,
        borderRadius: 12,
        marginVertical: 20,
        backgroundColor: "#FFF",
    },
    backButton: {
        paddingVertical: 12,
        marginTop: 10,
    },
    backButtonText: {
        color: "#8E8E93",
        fontSize: 14,
    },
    resetCodeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        marginBottom: 20,
    },
    resetCodeInput: {
        width: "14%",
        height: 50,
        backgroundColor: "#E5E5EA",
        borderRadius: 10,
        textAlign: "center",
        fontSize: 18,
        fontWeight: "600",
        color: "#1C1C1E",
    },
});
