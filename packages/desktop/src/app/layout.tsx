"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

// ---------------------------------------------------------------------------
// Navigation configuration (shared structure with web, minus auth items)
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  iconPath: string;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/features",
    iconPath:
      "M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  },
  {
    label: "Features",
    href: "/features",
    iconPath:
      "M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
  },
  {
    label: "Analysis",
    href: "/analysis",
    iconPath:
      "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  },
  {
    label: "Settings",
    href: "/settings",
    iconPath:
      "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z",
    children: [
      {
        label: "Constitution",
        href: "/settings/constitution",
        iconPath:
          "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
      },
      {
        label: "Extensions",
        href: "/settings/extensions",
        iconPath:
          "M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.546 3.16 1.073 4.637l.136-.003c.834 0 1.514.675 1.514 1.508 0 .833-.68 1.508-1.514 1.508a48.97 48.97 0 01-1.073-.047 48.68 48.68 0 01-.472 2.11c1.545.98 3.329 1.552 5.247 1.552 1.918 0 3.702-.572 5.247-1.552a48.68 48.68 0 01-.472-2.11 48.97 48.97 0 01-1.073.047c-.834 0-1.514-.675-1.514-1.508 0-.833.68-1.508 1.514-1.508l.136.003a46.588 46.588 0 001.073-4.637 48.39 48.39 0 01-4.163.3.64.64 0 01-.657-.643v0z",
      },
      {
        label: "Presets",
        href: "/settings/presets",
        iconPath:
          "M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75",
      },
      {
        label: "Agents",
        href: "/settings/agents",
        iconPath:
          "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 14.5M14.25 3.104c.251.023.501.05.75.082M19.8 14.5l-2.206 2.206a1.875 1.875 0 01-2.65 0l-.244-.244m-4.4 0l-.244.244a1.875 1.875 0 01-2.65 0L5.2 14.5m4.4 0h4.8",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function NavIcon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={`h-5 w-5 shrink-0 ${className}`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

function SidebarNavItem({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");
  const [childrenOpen, setChildrenOpen] = useState(isActive);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <a
        href={item.href}
        onClick={
          hasChildren
            ? (e) => {
                e.preventDefault();
                setChildrenOpen((v) => !v);
              }
            : undefined
        }
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? "bg-accent-3 text-accent-11"
            : "text-gray-11 hover:bg-gray-3 hover:text-gray-12"
        } ${collapsed ? "justify-center" : ""}`}
        title={collapsed ? item.label : undefined}
      >
        <NavIcon path={item.iconPath} />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {hasChildren && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`h-3.5 w-3.5 transition-transform ${childrenOpen ? "rotate-90" : ""}`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            )}
          </>
        )}
      </a>

      {hasChildren && childrenOpen && !collapsed && (
        <div className="ml-5 mt-1 space-y-0.5 border-l border-gray-4 pl-3">
          {item.children!.map((child) => {
            const childActive =
              pathname === child.href ||
              pathname.startsWith(child.href + "/");

            return (
              <a
                key={child.href}
                href={child.href}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  childActive
                    ? "text-accent-11 font-medium"
                    : "text-gray-9 hover:text-gray-12"
                }`}
              >
                <NavIcon path={child.iconPath} className="h-4 w-4" />
                <span>{child.label}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desktop Layout — no auth elements, Tauri window chrome area
// ---------------------------------------------------------------------------

export default function DesktopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-1">
      {/* ---- Sidebar ---- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-6 bg-white ${
          sidebarCollapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Tauri draggable titlebar area */}
        <div
          data-tauri-drag-region
          className="flex h-10 items-center justify-between border-b border-gray-6 px-4"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          {!sidebarCollapsed && (
            <span className="text-sm font-bold text-gray-12">Spec Intelligence</span>
          )}
          <button
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="rounded p-1 text-gray-9 hover:bg-gray-3 hover:text-gray-11"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={
                  sidebarCollapsed
                    ? "M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5"
                    : "M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"
                }
              />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {NAV_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.href + item.label}
              item={item}
              pathname={pathname}
              collapsed={sidebarCollapsed}
            />
          ))}
        </nav>
      </aside>

      {/* ---- Main area ---- */}
      <div
        className={`flex flex-1 flex-col transition-all ${
          sidebarCollapsed ? "ml-16" : "ml-60"
        }`}
      >
        {/* Tauri titlebar / top bar */}
        <header
          data-tauri-drag-region
          className="flex h-10 items-center justify-between border-b border-gray-6 bg-white px-4"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          {/* Search */}
          <div
            className="relative"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              className="w-56 rounded-md border border-gray-6 bg-gray-2 py-1 pl-8 pr-3 text-sm text-gray-12 placeholder:text-gray-8 focus:border-accent-8 focus:bg-white focus:outline-none focus:ring-1 focus:ring-accent-8"
            />
          </div>

          {/* Spacer for window controls (macOS traffic lights) */}
          <div className="w-20" />
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
