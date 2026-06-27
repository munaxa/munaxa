/**
 * @munaxa/icons — the single icon source for the Munaxa platform.
 *
 * Every app and @munaxa/ui import icons from here so the whole platform shares one icon
 * library at one version. This avoids each app pinning its own lucide-react version and
 * drifting apart visually.
 *
 *   import { Search, type IconProps } from "@munaxa/icons";
 *
 * The full lucide set is re-exported (so any icon is available), plus a typed `IconProps`
 * and `Icon` type alias for props and component typing.
 */
export * from 'lucide-react';
export type { LucideIcon as Icon, LucideProps as IconProps } from 'lucide-react';
