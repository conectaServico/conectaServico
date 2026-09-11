import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type Banner = {
  id: string;
  title: ReactNode;
  subtitle?: ReactNode;
  emoji?: string;
  icon?: ComponentType<{ className?: string }>;
  /** classes tailwind do fundo, ex.: "from-yellow-300 to-yellow-400" */
  gradient: string;
  /** cor do texto, ex.: "text-yellow-950" (padrão text-white) */
  textClass?: string;
  cta?: { label: string; to?: string; onClick?: () => void };
};

const BannerCarousel = ({ banners, intervalMs = 5000 }: { banners: Banner[]; intervalMs?: number }) => {
  const [current, setCurrent] = useState(0);
  const count = banners.length;

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => setCurrent((p) => (p + 1) % count), intervalMs);
    return () => clearInterval(t);
  }, [count, intervalMs]);

  if (!count) return null;

  return (
    <div className="mb-6">
      <div className="relative overflow-hidden rounded-2xl shadow-sm">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.id}
                className={`w-full flex-shrink-0 bg-gradient-to-r ${b.gradient} p-6 flex items-center justify-between gap-4 relative overflow-hidden min-h-[168px]`}
              >
                <div className={`relative z-10 flex-1 ${b.textClass || 'text-white'}`}>
                  <h2 className="text-lg sm:text-2xl font-extrabold mb-1 leading-tight">{b.title}</h2>
                  {b.subtitle && <p className="text-sm font-medium opacity-90 mb-3">{b.subtitle}</p>}
                  {b.cta &&
                    (b.cta.to ? (
                      <Link
                        to={b.cta.to}
                        className="inline-block bg-white/95 text-slate-900 text-sm font-bold px-4 py-2 rounded-xl hover:bg-white transition-colors"
                      >
                        {b.cta.label}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={b.cta.onClick}
                        className="inline-block bg-white/95 text-slate-900 text-sm font-bold px-4 py-2 rounded-xl hover:bg-white transition-colors"
                      >
                        {b.cta.label}
                      </button>
                    ))}
                </div>
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white/20 rounded-full flex-shrink-0 relative z-10 flex items-center justify-center">
                  {b.emoji ? (
                    <span className="text-5xl sm:text-6xl">{b.emoji}</span>
                  ) : Icon ? (
                    <Icon className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
                  ) : null}
                </div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              </div>
            );
          })}
        </div>
      </div>

      {count > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {banners.map((b, idx) => (
            <button
              key={b.id}
              onClick={() => setCurrent(idx)}
              className={`h-2 rounded-full transition-all ${current === idx ? 'bg-primary w-4' : 'bg-slate-300 w-2'}`}
              aria-label={`Ir para o banner ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;
