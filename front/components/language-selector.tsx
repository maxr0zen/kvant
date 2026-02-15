"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const SUPPORTED_LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "cpp", label: "C++" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["value"];

/** Возвращает человеко-читаемое название языка */
export function languageLabel(lang: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.value === lang)?.label ?? lang;
}

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function LanguageSelector({ value, onChange, className }: LanguageSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Язык" />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <SelectItem key={lang.value} value={lang.value}>
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
