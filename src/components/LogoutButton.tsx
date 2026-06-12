"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button } from "./ui";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }
  return (
    <Button variant="soft" size="md" onClick={logout}>
      Salir
    </Button>
  );
}
