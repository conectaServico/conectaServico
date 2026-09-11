import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, ChevronRight, Rocket } from 'lucide-react';
import { useProOnboarding } from '@/hooks/useProOnboarding';

/**
 * Tela mostrada no lugar do feed enquanto o profissional não completa o cadastro.
 */
const ProOnboarding = () => {
  const { steps, doneCount, total } = useProOnboarding();
  const pct = Math.round((doneCount / total) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-16">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
          <Rocket className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Complete seu perfil</h1>
        <p className="text-slate-500 mt-1">
          Faltam alguns passos para você começar a receber pedidos.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm font-bold text-slate-500 mb-1.5">
          <span>{doneCount} de {total} concluídos</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div className="bg-primary h-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <Link
            key={step.key}
            to={step.to}
            className={`flex items-center gap-4 rounded-2xl border p-4 transition-colors ${
              step.done
                ? 'border-success/30 bg-success/5'
                : 'border-slate-200 bg-white hover:border-primary/40'
            }`}
          >
            <div className="flex-shrink-0">
              {step.done ? (
                <CheckCircle2 className="w-6 h-6 text-success" />
              ) : step.pending ? (
                <Clock className="w-6 h-6 text-amber-500" />
              ) : (
                <Circle className="w-6 h-6 text-slate-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold ${step.done ? 'text-slate-700' : 'text-slate-900'}`}>
                {step.label}
              </p>
              <p className="text-sm text-slate-500">{step.hint}</p>
            </div>
            {!step.done && <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ProOnboarding;
