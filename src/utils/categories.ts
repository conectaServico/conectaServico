import {
  Wrench,
  Smartphone,
  Hammer,
  Droplets
} from 'lucide-react';

export const CATEGORY_MENUS = [
  {
    name: 'Assistência técnica',
    slug: 'assistencia-tecnica',
    icon: Wrench,
    items: ['Aquecedor a gás', 'Ar condicionado'],
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80'
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