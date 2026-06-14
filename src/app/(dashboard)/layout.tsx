import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen">
        <Sidebar userRole={session.user.role} userName={session.user.name} />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </SessionProvider>
  );
}
