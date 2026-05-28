import { useEffect, useRef, useState } from "react";

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
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setSuggestions([]);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (value !== inputValue) {
            setInputValue(value || "");
        }
    }, [inputValue, value]);

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
            setSuggestions(data.suggestions || []);
        } catch (error) {
            console.error("Ошибка запроса к DaData:", error);
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    }

    function handleInputChange(event) {
        const newValue = event.target.value;
        setInputValue(newValue);
        onChange(newValue);
        fetchSuggestions(newValue);
    }

    function handleSelectSuggestion(suggestion) {
        const fullAddress = suggestion.value;
        setInputValue(fullAddress);
        onChange(fullAddress);
        setSuggestions([]);
    }

    return (
        <div className="address-input-container" ref={wrapperRef} style={{ position: "relative" }}>
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder={placeholder}
                className="address-input"
                autoComplete="off"
                readOnly={readOnly}
            />
            {isLoading && !readOnly && <div className="loading-indicator">Загрузка...</div>}
            {!readOnly && suggestions.length > 0 && (
                <ul className="suggestions-list">
                    {suggestions.map((suggestion, index) => (
                        <li key={index} onClick={() => handleSelectSuggestion(suggestion)}>
                            <strong>{suggestion.value}</strong>
                            {suggestion.data.city && <span className="suggestion-detail">г. {suggestion.data.city}</span>}
                        </li>
                    ))}
                </ul>
            )}
            <style>{`
                .address-input-container { position: relative; width: 100%; }
                .address-input { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; }
                .suggestions-list {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    max-height: 300px;
                    overflow-y: auto;
                    z-index: 1000;
                    margin: 0;
                    padding: 0;
                    list-style: none;
                }
                .suggestions-list li {
                    padding: 8px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid #eee;
                }
                .suggestions-list li:hover { background: #f5f5f5; }
                .suggestion-detail { display: block; font-size: 12px; color: #666; }
                .loading-indicator { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #999; }
            `}</style>
        </div>
    );
}
