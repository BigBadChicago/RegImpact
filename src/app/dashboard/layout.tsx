/**
 * Dashboard Layout
 * Shared layout for all dashboard pages
 */

import { ReactNode } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
