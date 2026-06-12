import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-brand-100/60 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/app" className="flex items-center gap-2">
            <span className="text-2xl">📒</span>
            <span className="font-extrabold text-ink">Bitácora</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-ink/60 sm:block">
              {session.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
