import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { ApiAuthHandler } from "@/components/api-auth-handler";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <ApiAuthHandler />
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 lg:p-8 flex flex-col">
          <div className="w-full max-w-7xl mr-auto flex-1 flex flex-col">{children}</div>
        </main>
      </div>
    </div>
  );
}
