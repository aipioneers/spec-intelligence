"use client";

import { usePathname } from "next/navigation";

const settingsNavItems = [
  { label: "Constitution", href: "/settings/constitution" },
  { label: "Extensions", href: "/settings/extensions" },
  { label: "Presets", href: "/settings/presets" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-1">
      {/* Top nav bar */}
      <header className="border-b border-gray-6 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <a href="/" className="text-lg font-bold text-gray-12">
            Spec Intelligence
          </a>
          <nav className="flex items-center gap-4">
            <a
              href="/features"
              className="text-sm font-medium text-gray-11 hover:text-accent-11"
            >
              Features
            </a>
            <a
              href="/settings/constitution"
              className="text-sm font-medium text-accent-11"
            >
              Settings
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-9">
          <a href="/" className="hover:text-gray-11">
            Home
          </a>
          <span className="mx-2">/</span>
          <span className="text-gray-12">Settings</span>
        </nav>

        <div className="mt-6 flex flex-col gap-8 lg:flex-row">
          {/* Sidebar */}
          <aside className="w-full flex-shrink-0 lg:w-48">
            <nav className="flex flex-row gap-1 lg:flex-col">
              {settingsNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-accent-3 text-accent-11"
                      : "text-gray-11 hover:bg-gray-3 hover:text-gray-12"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
