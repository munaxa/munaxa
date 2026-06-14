import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind-aware className combiner — vendored from @munaxa/ui so the demo's UI kit
 * behaves identically to production while staying dependency-free of the monorepo.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
