/**
 * Placeholders cinza que aparecem enquanto a lista carrega — a tela "já existe" e o app
 * parece mais rápido do que um círculo girando sozinho no meio do nada.
 */
export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} aria-hidden="true" />
);

/** Cartão de pedido/proposta em "esqueleto". */
export const CardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4" aria-hidden="true">
    <div className="flex items-center gap-3">
      <Skeleton className="h-6 w-24 rounded-full" />
      <Skeleton className="h-4 w-28" />
    </div>
    <Skeleton className="h-6 w-2/3" />
    <div className="space-y-2">
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-4/5" />
    </div>
    <div className="flex gap-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-24" />
    </div>
  </div>
);

/** Lista de cartões em esqueleto (avisa leitores de tela que está carregando). */
export const ListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="grid gap-4" role="status" aria-label="Carregando">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

/** Linha de conversa/transação em esqueleto. */
export const RowSkeleton = () => (
  <div className="flex items-center gap-4 p-5" aria-hidden="true">
    <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
    <Skeleton className="h-5 w-10" />
  </div>
);

export const RowsSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="divide-y divide-slate-100" role="status" aria-label="Carregando">
    {Array.from({ length: count }).map((_, i) => (
      <RowSkeleton key={i} />
    ))}
  </div>
);
