"use client";

import Link from "next/link";

export function AppLogo() {
  return (
    <Link
      href="/"
      className="flex h-14 items-center justify-center border-b border-border px-5 transition-opacity hover:opacity-80"
    >
      <span
        className="text-lg font-semibold tracking-tight text-accent"
      >
        Rendara
      </span>
    </Link>
  );
}
