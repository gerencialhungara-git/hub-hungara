import {
  BarChart3, BookOpen, Boxes, Building2, CalendarDays, ClipboardCheck, Coins, FileSpreadsheet, FileText, Factory,
  Gauge, Globe, LayoutGrid, LineChart, Link as LinkIcon, MapPin, Megaphone, Package, PartyPopper, PieChart, Receipt,
  Settings, ShoppingBag, Store, Table2, Truck, Tv, Users, Wallet, Wrench, type LucideIcon,
} from "lucide-react";

/** Ícones disponíveis para os cards. O banco guarda só o nome. */
export const ICONS: Record<string, LucideIcon> = {
  BarChart3, BookOpen, Boxes, Building2, CalendarDays, ClipboardCheck, Coins, FileSpreadsheet, FileText, Factory,
  Gauge, Globe, LayoutGrid, LineChart, Link: LinkIcon, MapPin, Megaphone, Package, PartyPopper, PieChart, Receipt,
  Settings, ShoppingBag, Store, Table2, Truck, Tv, Users, Wallet, Wrench,
};

export const ICON_NAMES = Object.keys(ICONS);

export function iconByName(name: string): LucideIcon {
  return ICONS[name] ?? LayoutGrid;
}

/** Cor de cada categoria de módulo, sempre dentro da paleta da marca. */
const CATEGORY_COLORS = ["bg-brand-red", "bg-brand-orange", "bg-success", "bg-info-2", "bg-purple", "bg-pink", "bg-brand-yellow"];

export function categoryColor(category: string): string {
  let h = 0;
  for (const ch of category) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CATEGORY_COLORS[h % CATEGORY_COLORS.length]!;
}
