import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const APPLE_DESIGN = {
  radius: {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
    xl: "rounded-3xl",
    full: "rounded-full",
  },
  shadow: {
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
    xl: "shadow-xl",
    "2xl": "shadow-2xl",
  },
  transition: "transition-all duration-300 ease-in-out",
  text: {
    title: "text-slate-900 font-bold tracking-tight",
    body: "text-slate-600 leading-relaxed",
    caption: "text-slate-500 text-sm",
  }
};
