"use client";

import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
}

export function NavItem({ icon: Icon, label, href }: NavItemProps) {
  const pathname = usePathname();

  // Check if current route matches nav item
  const isActive =
    (href === "/" && pathname === "/") ||
    (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-surface text-primary"
          : "text-muted-foreground hover:text-primary hover:bg-surface/50"
      )}
      aria-label={label}
      title={label}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span>{label}</span>
    </Link>
  );
}
