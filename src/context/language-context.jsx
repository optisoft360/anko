import React, { createContext, useContext, useState } from "react";
import { dictionaryList } from "../locales";

export const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState(() => {
        // Always start in English — write it so the API interceptor picks it up
        localStorage.setItem("language", "en");
        return "en";
    });

    const changeLanguage = (lang) => {
        setLanguage(lang);
        // Persist so the axios interceptor sends the right Accept-Language header
        localStorage.setItem("language", lang);
    };

    const t = (key, params) => {
        if (!key || typeof key !== "string") return "";
        const keys = key.split(".");
        let value = dictionaryList[language];

        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) break;
        }

        // 18: plural forms — { one, other } chosen by Intl.PluralRules from params.count / params.n.
        if (value && typeof value === "object" && ("one" in value || "other" in value)) {
            const n = Number(params?.count ?? params?.n);
            const form = Number.isFinite(n) ? new Intl.PluralRules(language === "es" ? "es" : "en").select(n) : "other";
            value = value[form] ?? value.other ?? value.one;
        }

        if (typeof value === "string" && params && typeof params === "object") {
            Object.keys(params).forEach(paramKey => {
                value = value.replace(new RegExp(`{${paramKey}}`, "g"), params[paramKey]);
            });
        }

        return value || key;
    };

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
