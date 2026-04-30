import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { SidebarToggle } from "./sidebar-toggle";
import { SidebarProvider } from "./sidebar-context";
import { ApiAuthHandler } from "@/components/api-auth-handler";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="app-shell flex min-h-screen h-full flex-col">
        <ApiAuthHandler />
        <Header />
        <SidebarToggle />
        <div className="relative flex min-h-0 flex-1 h-full px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3 lg:px-5 lg:pb-5 lg:pt-3">
          <div className="app-canvas flex min-h-0 flex-1 h-full">
          <Sidebar />
          <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden h-full">
            <div className="w-full min-w-0 h-full overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10">
              {children}
            </div>
          </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
