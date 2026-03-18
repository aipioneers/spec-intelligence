import type { AbstractIntlMessages } from "next-intl";

export const locales = ["en", "de"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
};

export async function getMessages(locale: Locale): Promise<AbstractIntlMessages> {
  return (await import(`./messages/${locale}.json`)).default;
}

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function getLocaleDirection(locale: Locale): "ltr" | "rtl" {
  return "ltr";
}
