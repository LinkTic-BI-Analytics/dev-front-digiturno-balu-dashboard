"use client";

import { logout } from "@/lib/auth/actions";
import { disposeDatasetCache } from "@/lib/data/dataset-store";
import { IconButton } from "@/components/ui/IconButton";
import { LogOutIcon } from "@/components/ui/icons";

export function LogoutButton() {
  // Antes de cerrar sesión se limpia la caché local (sin datos residuales en el equipo).
  const handleLogout = async () => {
    try {
      await disposeDatasetCache();
    } catch {
      // La limpieza es best-effort: el logout no debe bloquearse por IDB.
    }
    await logout();
  };

  return (
    <form action={handleLogout}>
      <IconButton
        label="Cerrar sesión"
        type="submit"
        className="hover:border-danger/40 hover:bg-danger-soft hover:text-danger"
      >
        <LogOutIcon className="h-4.5 w-4.5" />
      </IconButton>
    </form>
  );
}
