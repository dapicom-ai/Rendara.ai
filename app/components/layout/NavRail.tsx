"use client";

import { MessageSquare, LayoutDashboard, Bookmark, BookOpen } from "lucide-react";
import { NavItem } from "./NavItem";

export function NavRail() {
  return (
    <nav className="flex flex-col gap-1 border-b border-border px-3 py-4">
      <NavItem icon={MessageSquare} label="Conversations" href="/" />
      <NavItem icon={LayoutDashboard} label="Dashboards" href="/dashboards" />
      <NavItem icon={BookOpen} label="Stories" href="/stories" />
      <NavItem icon={Bookmark} label="Pinned" href="/pinned" />
    </nav>
  );
}
