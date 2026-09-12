import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, startAt, endAt, limit, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';
import { JobRequest, Urgency } from '@/types';
import { geohashQueryBounds, distanceBetween } from '@/utils/geo';
import { CATEGORIES_MAP } from '@/utils/categories';
import { registerForPush, pushSupported, pushPermission, type PushPermission } from '@/services/push';
import { useProOnboarding } from '@/hooks/useProOnboarding';
import ProOnboarding from '@/components/ProOnboarding';
import BannerCarousel, { type Banner } from '@/components/BannerCarousel';
import {
  MapPin, Search, ShieldCheck, Coins, User as UserIcon, Phone, ChevronRight, Lock,
  SlidersHorizontal, BellRing, X, ArrowUpDown, AlertTriangle, Trophy, Check,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

type JobWithDistance = JobRequest & { _distanceKm?: number };

const DEFAULT_RADIUS_KM = 25;

type SortMode = 'default' | 'recent' | 'urgency' | 'distance';

const SORT_OPTIONS: { value: SortMode; label: string; needsGeo?: boolean }[] = [
  { value: 'default', label: 'Padrão' },
  { value: 'recent', label: 'Mais recentes' },
  { value: 'urgency', label: 'Mais urgentes primeiro' },
  { value: 'distance', label: 'Menor distância', needsGeo: true },
];

const URGENCY_RANK: Record<Urgency, number> = {
  'Emergência (Imediato)': 0,
  'Alta (O quanto antes)': 1,
  'Média (Próximas semanas)': 2,
  'Baixa (Pode esperar)': 3,
};

const isUrgentJob = (u: Urgency) => u === 'Alta (O quanto antes)' || u === 'Emergência (Imediato)';

// A partir dos serviços (subcategorias) do profissional, descobre as categorias-pai.
function categoryParentsOf(services: string[] = []): Set<string> {
  const parents = new Set<string>();
  for (const [parent, subs] of Object.entries(CATEGORIES_MAP)) {
    if (services.some((s) => subs.includes(s))) parents.add(parent);
  }
  return parents;
}

const ProHome = () => {
  const { user } = useUserStore();
  const onboarding = useProOnboarding();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const cityParam = searchParams.get('city') || '';

  const [jobs, setJobs] = useState<JobWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoActive, setGeoActive] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Filtro e ordenação do feed
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [onlyExclusive, setOnlyExclusive] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    if (!user?.id || user.role !== 'professional') return;
    getDocs(collection(db, 'users', user.id, 'dismissedLeads'))
      .then((snap) => setDismissed(new Set(snap.docs.map((d) => d.id))))
      .catch(() => undefined);
  }, [user?.id, user?.role]);

  const dismissLead = async (requestId: string) => {
    if (!user?.id) return;
    setDismissed((prev) => new Set(prev).add(requestId));
    try {
      await setDoc(doc(db, 'users', user.id, 'dismissedLeads', requestId), { created_at: Date.now() });
    } catch (e) {
      console.error('Falha ao ocultar lead:', e);
    }
  };

  // Push de novos pedidos
  const [pushState, setPushState] = useState<PushPermission>(() => pushPermission());
  const [pushBusy, setPushBusy] = useState(false);
  const enablePush = async () => {
    if (!user?.id) return;
    setPushBusy(true);
    try {
      const token = await registerForPush(user.id);
      setPushState(pushPermission());
      toast[token ? 'success' : 'error'](
        token ? 'Avisos de novos pedidos ativados!' : 'Não foi possível ativar os avisos agora.'
      );
    } finally {
      setPushBusy(false);
    }
  };

  const radiusKm = user?.radiusKm || DEFAULT_RADIUS_KM;

  // Categorias que o profissional atende (para o match do feed, estilo GetNinjas)
  const proCategories = useMemo(() => {
    const set = new Set<string>(user?.serviceCategories || []);
    for (const p of categoryParentsOf(user?.services)) set.add(p);
    return set;
  }, [user?.serviceCategories, user?.services]);
  const proServices = useMemo(() => new Set(user?.services || []), [user?.services]);

  const copyInviteLink = () => {
    if (!user?.id) return;
    const link = `${window.location.origin}/register?ref=${user.id}`;
    navigator.clipboard?.writeText(link).then(
      () => toast.success('Link de convite copiado! Mande para colegas profissionais.'),
      () => toast.error('Não foi possível copiar. Link: ' + link)
    );
  };

  const invites = user?.referralCount || 0;
  const proBanners: Banner[] = [
    {
      id: 'invite',
      gradient: 'from-yellow-300 to-yellow-400',
      textClass: 'text-yellow-950',
      emoji: '🤝',
      title: 'Convide colegas e ganhe 100 💎',
      subtitle:
        invites > 0
          ? `Você já indicou ${invites} ${invites === 1 ? 'profissional' : 'profissionais'}. Ganha 100 diamantes cada vez que um deles verifica a conta.`
          : 'Ganhe 100 diamantes cada vez que um profissional indicado verifica a conta.',
      cta: { label: 'Copiar meu link', onClick: copyInviteLink },
    },
    {
      id: 'unlock',
      gradient: 'from-blue-500 to-blue-700',
      icon: Lock,
      title: 'Gastou 10 💎, o contato é seu',
      subtitle: 'Sem comissão sobre o serviço. Até 3 profissionais por pedido — chegue primeiro.',
      cta: { label: 'Ver pedidos', to: '/home' },
    },
    {
      id: 'verified',
      gradient: 'from-emerald-400 to-emerald-600',
      icon: ShieldCheck,
      title: 'Selo verificado = mais contatos',
      subtitle: 'Envie seu documento e ganhe o selo de confiança que os clientes procuram.',
      cta: { label: 'Verificar agora', to: '/documents' },
    },
    {
      id: 'wallet',
      gradient: 'from-fuchsia-500 to-purple-700',
      icon: Coins,
      title: 'Diamantes acabando?',
      subtitle: 'Recarregue em segundos e não perca os próximos pedidos da sua região.',
      cta: { label: 'Adicionar diamantes', to: '/wallet' },
    },
  ];

  useEffect(() => {
    let cancelled = false;

    const fetchAvailableJobs = async () => {
      setLoading(true);
      try {
        const hasGeo = typeof user?.lat === 'number' && typeof user?.lng === 'number';

        if (hasGeo) {
          // --- Busca por raio (geohash) ---
          const center: [number, number] = [user!.lat as number, user!.lng as number];
          const bounds = geohashQueryBounds(center, radiusKm * 1000);
          const snaps = await Promise.all(
            bounds.map((b) =>
              getDocs(
                query(
                  collection(db, 'serviceRequests'),
                  where('status', '==', 'OPEN'),
                  orderBy('geohash'),
                  startAt(b[0]),
                  endAt(b[1])
                )
              )
            )
          );

          const seen = new Set<string>();
          const withinRadius: JobWithDistance[] = [];
          for (const snap of snaps) {
            for (const d of snap.docs) {
              if (seen.has(d.id)) continue;
              seen.add(d.id);
              const job = { id: d.id, ...d.data() } as JobWithDistance;
              if (typeof job.lat !== 'number' || typeof job.lng !== 'number') continue;
              const dist = distanceBetween([job.lat, job.lng], center);
              if (dist <= radiusKm) {
                job._distanceKm = dist;
                withinRadius.push(job);
              }
            }
          }
          withinRadius.sort((a, b) => (a._distanceKm ?? 0) - (b._distanceKm ?? 0));
          if (!cancelled) {
            setJobs(withinRadius);
            setGeoActive(true);
          }
        } else {
          // --- Fallback sem coordenadas: NÃO mostra o Brasil inteiro. Filtra pela UF/cidade
          // do perfil. Sem nem isso, some tudo e pede pro completar a região. ---
          const proUf = (user?.uf || user?.state || '').toUpperCase();
          const proCityKey = (user?.cityKey || user?.city || '').toLowerCase();

          if (!proUf && !proCityKey) {
            if (!cancelled) {
              setJobs([]);
              setGeoActive(false);
            }
            return;
          }

          const snapshot = await getDocs(
            query(
              collection(db, 'serviceRequests'),
              where('status', '==', 'OPEN'),
              orderBy('created_at', 'desc'),
              limit(100)
            )
          );
          const fetched = (snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as JobWithDistance[]).filter(
            (j) => {
              const jUf = (j.uf || j.state || '').toUpperCase();
              const jCity = (j.cityKey || j.city || '').toLowerCase();
              return (proUf && jUf === proUf) || (proCityKey && jCity === proCityKey);
            }
          );
          if (!cancelled) {
            setJobs(fetched);
            setGeoActive(false);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar jobs:', err);
        if (!cancelled) setJobs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAvailableJobs();
    return () => {
      cancelled = true;
    };
    // Reexecuta quando a posição ou o raio do profissional muda (não a cada re-render do user).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.lat, user?.lng, radiusKm]);

  // Filtros client-side: texto, categoria do profissional e (no fallback) localização.
  const filteredJobs = jobs.filter((job) => {
    if (dismissed.has(job.id)) return false;

    const matchesSearch =
      q === '' ||
      job.description.toLowerCase().includes(q.toLowerCase()) ||
      job.category.toLowerCase().includes(q.toLowerCase()) ||
      (job.subcategory && job.subcategory.toLowerCase().includes(q.toLowerCase()));

    const matchesCategory =
      showAllCategories ||
      proCategories.size === 0 ||
      proCategories.has(job.category) ||
      (job.subcategory ? proServices.has(job.subcategory) : false);

    // No modo geo o raio já resolve a localização; o filtro por cidade é só do fallback.
    const loc = cityParam.trim().toLowerCase();
    const matchesLocation =
      geoActive ||
      loc === '' ||
      job.state?.toLowerCase() === loc ||
      job.city?.toLowerCase() === loc;

    const matchesUrgent = !onlyUrgent || isUrgentJob(job.urgency);
    const matchesExclusive = !onlyExclusive || (job.unlockCount || 0) === 0;

    return matchesSearch && matchesCategory && matchesLocation && matchesUrgent && matchesExclusive;
  });

  const hiddenByCategory =
    !showAllCategories && proCategories.size > 0
      ? jobs.length - jobs.filter((j) => proCategories.has(j.category) || (j.subcategory ? proServices.has(j.subcategory) : false)).length
      : 0;

  const activeFilterCount = (onlyUrgent ? 1 : 0) + (onlyExclusive ? 1 : 0);

  // Ordenação — "Padrão" mantém a ordem que já veio da busca (distância no modo geo, recência no fallback).
  const sortedJobs = [...filteredJobs];
  if (sortMode === 'recent') {
    sortedJobs.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  } else if (sortMode === 'urgency') {
    sortedJobs.sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]);
  } else if (sortMode === 'distance') {
    sortedJobs.sort((a, b) => (a._distanceKm ?? Infinity) - (b._distanceKm ?? Infinity));
  }

  const getHiddenName = (fullName: string | null | undefined, clientId: string) => {
    if (!fullName) return `Cliente ${clientId.slice(0, 4)}`;
    const parts = fullName.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0]}.`;
  };

  // Feed só libera quando o cadastro do profissional está completo.
  if (
    user?.role === 'professional' &&
    (onboarding.clearlyIncomplete || (!onboarding.loading && !onboarding.complete))
  ) {
    return <ProOnboarding />;
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
        {/* Tabs */}
        <div className="bg-white flex w-full border-b border-slate-200">
        <div className="flex-1 flex justify-center py-4 border-b-2 border-yellow-400">
          <span className="text-sm font-bold text-slate-800 tracking-wide uppercase">Disponíveis</span>
        </div>
        <Link to="/proposals" className="flex-1 flex justify-center py-4 text-slate-400 hover:text-slate-600 transition-colors">
          <span className="text-sm font-bold tracking-wide uppercase">Meus Pedidos</span>
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-12">
        <BannerCarousel banners={proBanners} />

        {/* Location / radius header */}
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <p className="text-slate-600 font-medium flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400" />
            {geoActive ? (
              <>Pedidos num raio de <strong className="text-slate-800">{radiusKm} km</strong></>
            ) : (
              'Pedidos abertos recentes'
            )}
          </p>
          <Link to="/profile?edit=radius" className="text-blue-600 font-bold hover:text-blue-800 transition-colors text-sm">
            {geoActive ? 'Ajustar raio' : 'Definir minha região'}
          </Link>
        </div>

        {pushSupported() && pushState === 'default' && (
          <button
            onClick={enablePush}
            disabled={pushBusy}
            className="mb-4 w-full flex items-center justify-center gap-2 rounded-xl bg-primary/10 text-primary border border-primary/20 px-4 py-3 font-bold hover:bg-primary/15 transition-colors disabled:opacity-60"
          >
            <BellRing className="w-4 h-4" />
            {pushBusy ? 'Ativando…' : 'Ativar avisos de novos pedidos'}
          </button>
        )}

        {!geoActive && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3">
            Cadastre seu <strong>CEP</strong> e o <strong>raio de atuação</strong> no perfil para ver só os pedidos perto de você.
          </div>
        )}

        {geoActive && user?.geoPrecise === false && (
          <div className="mb-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs px-4 py-2.5">
            Localização aproximada (nível estadual). Informe seu CEP no perfil para um raio preciso.
          </div>
        )}

        {/* Filtrar / Ordenar */}
        <div className="flex items-center flex-wrap gap-3 mb-4">
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="relative flex-shrink-0 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" /> Filtrar
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            className="relative flex-shrink-0 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" /> Ordenar
            {sortMode !== 'default' && (
              <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-primary" aria-hidden />
            )}
          </button>
          {sortMode !== 'default' && (
            <span className="text-xs font-bold text-slate-400 truncate">
              {SORT_OPTIONS.find((o) => o.value === sortMode)?.label}
            </span>
          )}
        </div>

        {/* Main Content (Lista de Serviços) */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-yellow-400"></div>
            </div>
          ) : sortedJobs.length > 0 ? (
            <div className="flex flex-col gap-4">
              {sortedJobs.map(job => {
                const unlocks = job.unlockCount || 0;
                const isLocked = unlocks >= 3;

                return (
                <Link
                  key={job.id}
                  to={isLocked ? '#' : `/requests/${job.id}`}
                  className={`block bg-white rounded-2xl p-5 shadow-sm border-l-4 border-l-transparent hover:border-l-yellow-400 transition-all group relative overflow-hidden ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      dismissLead(job.id);
                    }}
                    className="absolute right-2 top-2 p-1.5 rounded-full text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10"
                    aria-label="Não tenho interesse neste pedido"
                    title="Não tenho interesse"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>

                  <div className="pr-8">
                    {(unlocks === 0 || isUrgentJob(job.urgency)) && (
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {unlocks === 0 && (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            <Trophy className="w-3.5 h-3.5" /> Seja o primeiro
                          </span>
                        )}
                        {isUrgentJob(job.urgency) && (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {job.urgency === 'Emergência (Imediato)' ? 'Emergência' : 'Urgente'}
                          </span>
                        )}
                      </div>
                    )}
                    <h3 className="text-lg font-medium text-slate-800 mb-4 line-clamp-1">
                      {job.category} - {job.subcategory || job.propertyType}
                    </h3>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-slate-600 mb-5">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{getHiddenName(job.clientName, job.clientId)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="font-medium tracking-widest text-slate-400">•••••-••••</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">
                          {job.neighborhood ? `${job.neighborhood}, ${job.city}` : 'Serviço online'}
                          {typeof job._distanceKm === 'number' && (
                            <span className="text-slate-400"> · {job._distanceKm < 1 ? '<1' : Math.round(job._distanceKm)} km</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {job.photos && job.photos.length > 0 && (
                      <div className="flex gap-2 mb-4">
                        {job.photos.slice(0, 4).map((url, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                            <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                            {i === 3 && job.photos!.length > 4 && (
                              <div className="absolute inset-0 bg-black/50 text-white text-xs font-bold flex items-center justify-center">
                                +{job.photos!.length - 4}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Progress Bar Area */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex-1 flex gap-1 mr-4">
                        <div className={`h-1.5 rounded-full flex-1 ${unlocks >= 1 ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                        <div className={`h-1.5 rounded-full flex-1 ${unlocks >= 2 ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                        <div className={`h-1.5 rounded-full flex-1 ${unlocks >= 3 ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <Lock className="w-3.5 h-3.5" />
                        <span>{unlocks}/3</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`-mx-5 -mb-5 mt-4 px-5 py-3 text-center text-sm font-bold text-white ${
                      isLocked ? 'bg-slate-400' : unlocks === 0 ? 'bg-blue-600' : 'bg-sky-500'
                    }`}
                  >
                    {isLocked
                      ? 'Limite de profissionais atingido'
                      : unlocks === 0
                        ? 'Este pedido pode ser só seu — seja o primeiro a desbloquear!'
                        : `Ainda dá tempo: ${3 - unlocks} vaga${3 - unlocks === 1 ? '' : 's'} disponível${3 - unlocks === 1 ? '' : 'is'}`}
                  </div>
                </Link>
              )})}
            </div>
          ) : jobs.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <SlidersHorizontal className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Nenhum pedido com esses filtros</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Existem pedidos disponíveis, mas nenhum combina com os filtros escolhidos.
              </p>
              <button
                onClick={() => {
                  setOnlyUrgent(false);
                  setOnlyExclusive(false);
                  setShowAllCategories(false);
                }}
                className="mt-6 inline-block text-primary font-bold hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Nenhum serviço encontrado</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                {geoActive
                  ? `Não há pedidos abertos num raio de ${radiusKm} km. Aumente o raio no seu perfil para ver mais.`
                  : (user?.uf || user?.state || user?.city)
                    ? 'Não há pedidos abertos na sua cidade/estado no momento.'
                    : 'Cadastre seu CEP e o raio de atuação no seu perfil para ver os pedidos perto de você.'}
              </p>
              <Link to="/profile" className="mt-6 inline-block text-primary font-bold hover:underline">
                Completar meu perfil
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Filtrar */}
      {filterOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={() => setFilterOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-extrabold text-slate-900">Filtros</h2>
              <button
                onClick={() => {
                  setOnlyUrgent(false);
                  setOnlyExclusive(false);
                  setShowAllCategories(false);
                }}
                className="text-sm font-bold text-primary hover:underline"
              >
                Limpar
              </button>
            </div>
            <div className="p-6 space-y-1">
              <p className="text-sm font-bold text-slate-700 mb-2">Mostrar apenas</p>
              <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
                <span className="flex-1 min-w-0 text-sm text-slate-700">Serviços urgentes</span>
                <input
                  type="checkbox"
                  checked={onlyUrgent}
                  onChange={(e) => setOnlyUrgent(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary flex-shrink-0"
                />
              </label>
              <label className="flex items-center justify-between gap-4 py-3 cursor-pointer border-t border-slate-100">
                <span className="flex-1 min-w-0 text-sm text-slate-700">Seja o primeiro a liberar (ninguém desbloqueou ainda)</span>
                <input
                  type="checkbox"
                  checked={onlyExclusive}
                  onChange={(e) => setOnlyExclusive(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary flex-shrink-0"
                />
              </label>
              {proCategories.size > 0 && (
                <label className="flex items-center justify-between gap-4 py-3 cursor-pointer border-t border-slate-100">
                  <span className="flex-1 min-w-0 text-sm text-slate-700">
                    Pedidos fora da minha área de atuação {hiddenByCategory > 0 && `(+${hiddenByCategory})`}
                  </span>
                  <input
                    type="checkbox"
                    checked={showAllCategories}
                    onChange={(e) => setShowAllCategories(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary flex-shrink-0"
                  />
                </label>
              )}
            </div>
            <div className="p-6 pt-2">
              <button
                onClick={() => setFilterOpen(false)}
                className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary-hover transition-colors"
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ordenar */}
      {sortOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={() => setSortOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-extrabold text-slate-900">Ordenar por</h2>
              <button onClick={() => setSortOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-2">
              {SORT_OPTIONS.filter((opt) => !opt.needsGeo || geoActive).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSortMode(opt.value);
                    setSortOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left font-bold transition-colors ${
                    sortMode === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                  {sortMode === opt.value && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProHome;
