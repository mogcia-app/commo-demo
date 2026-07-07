import type { CSSProperties, ReactNode } from "react";
import type { StoreTheme } from "@/lib/storefront/types";

const radiusMap: Record<StoreTheme["borderRadius"], string> = {
  sm: "6px",
  md: "10px",
  lg: "16px",
};

type StoreThemeStyle = CSSProperties & {
  "--store-primary": string;
  "--store-secondary": string;
  "--store-background": string;
  "--store-surface": string;
  "--store-text": string;
  "--store-muted": string;
  "--store-radius": string;
  "--store-font": string;
};

export function ThemeProvider({ theme, children }: { theme: StoreTheme; children: ReactNode }) {
  const style: StoreThemeStyle = {
    "--store-primary": theme.primaryColor,
    "--store-secondary": theme.secondaryColor,
    "--store-background": theme.backgroundColor,
    "--store-surface": theme.surfaceColor,
    "--store-text": theme.textColor,
    "--store-muted": theme.mutedTextColor,
    "--store-radius": radiusMap[theme.borderRadius],
    "--store-font": theme.fontFamily,
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    fontFamily: `var(--store-font), var(--font-geist-sans), system-ui, sans-serif`,
  };

  return (
    <div style={style} className="min-h-screen">
      {children}
    </div>
  );
}
