// Esqueletos de carga: la forma gris de lo que va a aparecer, en vez de un
// "Cargando…". Así no salta nada al cargar y se ve qué viene.

export function Bloque({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-sm bg-white/[0.06] ${className}`} />;
}

// Formulario (briefing tras el pago): título y varios campos.
export function EsqueletoFormulario({ campos = 5 }) {
  return (
    <div role="status" aria-label="Cargando" className="mx-auto max-w-[650px] space-y-6 px-5 py-16">
      <Bloque className="h-9 w-2/3" />
      <Bloque className="h-4 w-full" />
      {Array.from({ length: campos }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Bloque className="h-3 w-32" />
          <Bloque className="h-11 w-full" />
        </div>
      ))}
      <Bloque className="h-12 w-full" />
    </div>
  );
}

// Área de clientes: cabecera, tarjeta de suscripción y lista de compras.
export function EsqueletoAreaCliente() {
  return (
    <div role="status" aria-label="Cargando" className="min-h-screen bg-ink">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Bloque className="h-8 w-32" />
          <Bloque className="h-8 w-24" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-8 px-5 py-12">
        <Bloque className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Bloque className="h-40" />
          <Bloque className="h-40 md:col-span-2" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bloque key={i} className="h-14" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Resultados del buscador mientras se cargan.
export function EsqueletoResultados() {
  return (
    <div role="status" aria-label="Cargando" className="space-y-2 p-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Bloque className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Bloque className="h-3 w-2/3" />
            <Bloque className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
