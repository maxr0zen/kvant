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
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
