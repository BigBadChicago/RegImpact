'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

/**
 * Simple icon components using emojis/text
 */
const layoutIcons = {
  dashboard: '📊',
  regulations: '📄',
  deadlines: '📅',
  settings: '⚙️',
  logout: '🚪',
  menu: '☰',
  close: '✕',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * DashboardLayout provides the main layout structure for dashboard pages.
 * Includes responsive sidebar navigation and top bar with user menu.
 * 
 * @component
 */
export default function DashboardLayout({ children }: DashboardLayoutProps): React.ReactElement {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  /**
   * Navigation menu items
   */
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: layoutIcons.dashboard },
    { href: '/dashboard/regulations', label: 'Regulations', icon: layoutIcons.regulations },
    { href: '/dashboard/deadlines', label: 'Deadlines', icon: layoutIcons.deadlines },
    { href: '/dashboard/settings', label: 'Settings', icon: layoutIcons.settings },
  ];

  /**
   * Check if current link is active
   */
  const isActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo area */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">RegImpact</h1>
            <p className="text-xs text-gray-500 mt-1">Regulatory Compliance</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <span className="text-lg mr-3">{icon}</span>
                {label}
              </Link>
            ))}
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 rounded-md text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              <span className="text-lg mr-3">{layoutIcons.logout}</span>
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              aria-label="Toggle sidebar"
            >
              <span className="text-lg">
                {isSidebarOpen ? layoutIcons.close : layoutIcons.menu}
              </span>
            </button>

            {/* Page title */}
            <h1 className="text-xl font-bold text-gray-900">Executive Dashboard</h1>

            {/* Right side spacer */}
            <div className="w-10" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
