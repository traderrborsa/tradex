"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { open: sidebarOpen, hydrated, close } = useSidebar();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        Yükleniyor…
      </div>
    );
  }

  if (!user) return null;

  return (
    <NotificationsProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        <Navbar />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar />

          {hydrated && sidebarOpen && (
            <button
              type="button"
              aria-label="Menüyü kapat"
              className="fixed inset-x-0 bottom-0 top-14 z-30 bg-black/40 lg:hidden"
              onClick={close}
            />
          )}

          <main className="min-w-0 flex-1 overflow-y-auto p-6">
            <div className="w-full">{children}</div>
          </main>
        </div>
      </div>
    </NotificationsProvider>
  );
}
