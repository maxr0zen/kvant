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
        <div className="flex flex-1 min-h-0 relative">
          <Sidebar />
          <SidebarToggle />
          <main className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden">
            <div className="w-full min-w-0 px-4 py-6 sm:px-6 md:px-8 lg:px-10 xl:px-14 2xl:px-16">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
