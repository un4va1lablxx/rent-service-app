import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const DADATA_API_KEY = "25fcfb5efefa78337862051ad97f5be41c0cc263";

export default function AddressInput({
    value,
    onChange,
    placeholder = "Введите адрес",
    readOnly = false
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [inputValue, setInputValue] = useState(value || "");
    const [isLoading, setIsLoading] = useState(false);
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        if (value !== inputValue) {
            setInputValue(value || "");
        }
    }, [inputValue, value]);

    const shouldShowSuggestions = useMemo(
        () => focused && !readOnly && suggestions.length > 0,
        [focused, readOnly, suggestions.length]
    );

    async function fetchSuggestions(query) {
        if (!query || query.length < 2 || readOnly) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch("https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Token ${DADATA_API_KEY}`
                },
                body: JSON.stringify({
                    query,
                    count: 8,
                    locations: [{ country_iso_code: "RU" }]
                })
            });

            const data = await response.json();
            setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
        } catch {
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    }

    function handleInputChange(newValue) {
        setInputValue(newValue);
        onChange(newValue);
        fetchSuggestions(newValue);
    }

    function handleSelectSuggestion(suggestion) {
        const fullAddress = suggestion?.value || "";
        setInputValue(fullAddress);
        onChange(fullAddress);
        setSuggestions([]);
        setFocused(false);
    }

    return (
        <View style={styles.container}>
            <TextInput
                value={inputValue}
                onChangeText={handleInputChange}
                placeholder={placeholder}
                editable={!readOnly}
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={() => setFocused(true)}
                onBlur={() => {
                    setTimeout(() => setFocused(false), 120);
                }}
                style={[styles.input, readOnly ? styles.inputReadonly : null]}
            />

            {isLoading && !readOnly ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="small" color="#0f766e" />
                </View>
            ) : null}

            {shouldShowSuggestions ? (
                <View style={styles.dropdown}>
                    {suggestions.map((item, index) => (
                            <Pressable
                                key={`${item?.value || "address"}-${index}`}
                                style={styles.suggestionItem}
                                onPress={() => handleSelectSuggestion(item)}
                            >
                                <Text style={styles.suggestionValue}>{item?.value || ""}</Text>
                                {item?.data?.city ? (
                                    <Text style={styles.suggestionDetail}>г. {item.data.city}</Text>
                                ) : null}
                            </Pressable>
                    ))}
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        position: "relative"
    },
    input: {
        width: "100%",
        minHeight: 46,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#d1d5db",
        backgroundColor: "#ffffff",
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: "#111827"
    },
    inputReadonly: {
        backgroundColor: "#f3f4f6",
        color: "#6b7280"
    },
    loading: {
        position: "absolute",
        right: 10,
        top: 10
    },
    dropdown: {
        position: "absolute",
        top: 50,
        left: 0,
        right: 0,
        zIndex: 30,
        maxHeight: 260,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#d1d5db",
        backgroundColor: "#ffffff",
        overflow: "hidden"
    },
    suggestionItem: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6"
    },
    suggestionValue: {
        fontSize: 14,
        lineHeight: 18,
        color: "#111827",
        fontWeight: "700"
    },
    suggestionDetail: {
        marginTop: 2,
        fontSize: 12,
        lineHeight: 16,
        color: "#6b7280"
    }
});
