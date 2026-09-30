import { useState, type ReactNode } from "react";

/**
 * Estructura común de los paneles inferiores: una cabecera fija (asa, título, cerrar) y una zona
 * desplazable. La cabecera marca su límite con una línea suave cuando hay contenido por debajo.
 */
export function SheetLayout({ header, children }: { header: ReactNode; children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  return (
    <>
      <div className={"sheet-top" + (scrolled ? " scrolled" : "")}>{header}</div>
      <div className="sheet-body" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 2)}>
        {children}
      </div>
    </>
  );
}
