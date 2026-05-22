import { 
  Wrench,
  PenTool,
  Truck,
  ShieldCheck,
  Smartphone,
  Star,
  Sparkles,
  Hammer,
  Droplets
} from 'lucide-react';

export const CATEGORY_MENUS = [
  {
    name: 'Assistência técnica',
    slug: 'assistencia-tecnica',
    icon: Wrench,
    items: ['Aquecedor a gás', 'Ar condicionado'],
    image: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=A%20handsome%20technician%20in%20a%20dark%20blue%20polo%20shirt%20with%20a%20logo%2C%20wearing%20safety%20glasses%20and%20black%20gloves%2C%20using%20a%20screwdriver%20to%20carefully%20repair%20an%20open%20laptop%20motherboard%20on%20a%20grey%20desk.%20In%20the%20background%2C%20a%20clean%20and%20organized%20technical%20assistance%20workshop%20with%20tools%20hanging%20on%20a%20pegboard.%20Professional%20lighting%2C%20realistic%20photography%2C%20high%20quality&image_size=landscape_16_9'
  },
  { 
    name: 'Design e Tecnologia', 
    slug: 'design-e-tecnologia',
    icon: Smartphone,
    items: ['Desenvolvedor de sites', 'Designer gráfico', 'Marketing digital', 'Edição de vídeo'],
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80'
  },
  { 
    name: 'Construção e reformas', 
    slug: 'construcao-e-reformas',
    icon: Hammer,
    items: ['Pedreiro', 'Azulejista', 'Pintor', 'Gesseiro', 'Drywall', 'Encanador', 'Eletricista', 'Serralheiro', 'Marceneiro', 'Soldador', 'Montador de móveis', 'Vidraceiro', 'Telhadista', 'Impermeabilização'],
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80'
  },
  { 
    name: 'Limpeza e manutenção', 
    slug: 'limpeza-e-manutencao',
    icon: Droplets,
    items: ['Diarista', 'Limpeza pós-obra', 'Jardinagem', 'Piscineiro', 'Dedetização', 'Lavagem de sofá', 'Limpeza de caixa d’água'],
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80'
  },
  { 
    name: 'Serviços gerais', 
    slug: 'servicos-gerais',
    icon: Wrench,
    items: ['Marido de aluguel', 'Fretes e mudanças', 'Instalador de câmeras', 'Técnico de ar-condicionado', 'Técnico de celular', 'Técnico de informática'],
    image: 'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?auto=format&fit=crop&w=800&q=80'
  }
];

export const CATEGORIES_MAP: Record<string, string[]> = CATEGORY_MENUS.reduce((acc, cat) => {
  acc[cat.name] = cat.items;
  return acc;
}, {} as Record<string, string[]>);

export const MAIN_CATEGORIES = Object.keys(CATEGORIES_MAP);