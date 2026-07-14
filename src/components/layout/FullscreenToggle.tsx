"use client";

import { useFullscreen } from "@/hooks/useFullscreen";
import { IconButton } from "@/components/ui/IconButton";
import { MaximizeIcon, MinimizeIcon } from "@/components/ui/icons";

export function FullscreenToggle() {
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  return (
    <IconButton
      label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
      onClick={toggleFullscreen}
    >
      {isFullscreen ? (
        <MinimizeIcon className="h-4.5 w-4.5" />
      ) : (
        <MaximizeIcon className="h-4.5 w-4.5" />
      )}
    </IconButton>
  );
}
