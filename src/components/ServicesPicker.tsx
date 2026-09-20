import { Check } from 'lucide-react';
import { CATEGORY_MENUS } from '@/utils/categories';

interface Props {
  selected: string[];
  onToggle: (service: string) => void;
}

/** Lista de serviços por categoria, marcáveis — usada no cadastro e na edição do perfil do profissional. */
const ServicesPicker = ({ selected, onToggle }: Props) => (
  <div className="space-y-4 max-h-80 overflow-y-auto pr-1 -mr-1">
    {CATEGORY_MENUS.map((cat) => (
      <div key={cat.name}>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">{cat.name}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cat.items.map((service) => {
            const isSelected = selected.includes(service);
            return (
              <button
                key={service}
                type="button"
                onClick={() => onToggle(service)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-primary/50'
                }`}
              >
                <span className="text-sm">{service}</span>
                {isSelected && <Check className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);

export default ServicesPicker;
