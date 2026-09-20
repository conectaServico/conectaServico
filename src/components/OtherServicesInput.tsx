import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  MAX_CUSTOM_SERVICES,
  MAX_CUSTOM_SERVICE_LENGTH,
  MIN_CUSTOM_SERVICE_LENGTH,
  normalizeCustomService,
} from '@/utils/customServices';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

/** Campo "Outros serviços" (opcional): o profissional digita e adiciona quantos quiser, até o limite. */
const OtherServicesInput = ({ value, onChange }: Props) => {
  const [text, setText] = useState('');
  const [hint, setHint] = useState('');

  const add = () => {
    const s = normalizeCustomService(text);
    if (!s) return;
    if (s.length < MIN_CUSTOM_SERVICE_LENGTH) {
      setHint(`Escreva pelo menos ${MIN_CUSTOM_SERVICE_LENGTH} letras.`);
      return;
    }
    if (value.some((v) => v.toLowerCase() === s.toLowerCase())) {
      setHint('Você já adicionou esse serviço.');
      return;
    }
    if (value.length >= MAX_CUSTOM_SERVICES) {
      setHint(`Você pode adicionar até ${MAX_CUSTOM_SERVICES} outros serviços.`);
      return;
    }
    onChange([...value, s]);
    setText('');
    setHint('');
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">
        Outros serviços que você faz (opcional)
      </label>
      <p className="text-xs text-slate-500 mb-2">
        Não achou na lista? Escreva aqui, por exemplo: “Instalação de portão eletrônico” ou “Eletricista — quadro
        trifásico”. Aparece no seu perfil e ajuda os clientes a te encontrarem.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          maxLength={MAX_CUSTOM_SERVICE_LENGTH}
          onChange={(e) => {
            setText(e.target.value);
            setHint('');
          }}
          onKeyDown={(e) => {
            // Enter adiciona o serviço em vez de enviar o formulário inteiro.
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Digite um serviço"
          className="flex-1 min-w-0 p-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
        />
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 px-4 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>

      {hint && <p className="text-xs text-danger font-medium mt-1.5">{hint}</p>}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {value.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200"
            >
              {s}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== s))}
                aria-label={`Remover ${s}`}
                className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-400 mt-2">
        {value.length}/{MAX_CUSTOM_SERVICES} adicionados
      </p>
    </div>
  );
};

export default OtherServicesInput;
