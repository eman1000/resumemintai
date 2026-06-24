// lib/currencies.ts — common salary currencies for job postings.

export type CurrencyOption = { code: string; label: string };

export const CURRENCIES: CurrencyOption[] = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "NZD", label: "NZD — New Zealand Dollar" },
  { code: "CHF", label: "CHF — Swiss Franc" },
  { code: "ZAR", label: "ZAR — South African Rand" },
  { code: "NGN", label: "NGN — Nigerian Naira" },
  { code: "KES", label: "KES — Kenyan Shilling" },
  { code: "GHS", label: "GHS — Ghanaian Cedi" },
  { code: "EGP", label: "EGP — Egyptian Pound" },
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "SAR", label: "SAR — Saudi Riyal" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "CNY", label: "CNY — Chinese Yuan" },
  { code: "BRL", label: "BRL — Brazilian Real" },
  { code: "MXN", label: "MXN — Mexican Peso" },
];

export const CURRENCY_CODES = new Set(CURRENCIES.map((c) => c.code));
