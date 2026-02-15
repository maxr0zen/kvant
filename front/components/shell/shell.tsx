import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { SidebarToggle } from "./sidebar-toggle";
import { SidebarProvider } from "./sidebar-context";
import { ApiAuthHandler } from "@/components/api-auth-handler";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen flex-col">
        <ApiAuthHandler />
        <Header />
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar />
          <SidebarToggle />
          <main className="flex-1 min-h-0 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
