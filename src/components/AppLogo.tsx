import { LOCKED_AUDIENCE } from '@/config/appTarget';

/**
 * Logo dos apps nativos: a marca com o nome do app e, logo abaixo, o lado
 * ("Cliente" azul / "Profissional" laranja) — mesmas cores dos ícones do celular.
 * Só faz sentido dentro do app (LOCKED_AUDIENCE definido); no site não é usado.
 */
const AppLogo = ({ size = 'lg' }: { size?: 'lg' | 'sm' }) => {
  const isPro = LOCKED_AUDIENCE === 'professional';
  const big = size === 'lg';

  return (
    <div className="flex items-center gap-3 min-w-0">
      <img
        src="/logo.jpg"
        alt=""
        className={`${big ? 'h-14' : 'h-8'} w-auto rounded-lg flex-shrink-0`}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = '/logo.png';
        }}
      />
      <div className="flex flex-col items-start min-w-0 leading-none">
        <span className={`${big ? 'text-2xl' : 'text-base'} font-extrabold text-blue-950 tracking-tight truncate`}>
          Conecta Serviço
        </span>
        <span
          className={`${big ? 'mt-1.5 px-3 py-1 text-[11px]' : 'mt-1 px-2 py-0.5 text-[9px]'} rounded-full font-extrabold uppercase tracking-widest text-white ${
            isPro ? 'bg-orange-500' : 'bg-primary'
          }`}
        >
          {isPro ? 'Profissional' : 'Cliente'}
        </span>
      </div>
    </div>
  );
};

export default AppLogo;
