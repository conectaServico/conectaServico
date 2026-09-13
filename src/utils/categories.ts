import {
  Wrench,
  Smartphone,
  Hammer,
  Droplets,
  Users
} from 'lucide-react';

export const CATEGORY_MENUS = [
  {
    name: 'Serviços gerais',
    slug: 'servicos-gerais',
    icon: Wrench,
    items: ['Marido de aluguel', 'Fretes e mudanças', 'Instalador de câmeras', 'Segurança e alarmes', 'Aulas particulares'],
    image: 'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?auto=format&fit=crop&w=800&q=80'
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
    items: ['Limpeza pós-obra', 'Jardinagem', 'Piscineiro', 'Dedetização', 'Lavagem de sofá', 'Limpeza de caixa d’água'],
    image: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Assistência técnica',
    slug: 'assistencia-tecnica',
    icon: Wrench,
    items: ['Ar condicionado', 'Máquina de lavar', 'Técnico de informática', 'Aquecedor a gás', 'Geladeira e freezer', 'Técnico de celular'],
    image: 'https://images.unsplash.com/photo-1721333089073-215a56fd710c?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Serviços domésticos',
    slug: 'servicos-domesticos',
    icon: Users,
    items: ['Babá', 'Cozinheira', 'Diarista'],
    image: 'https://images.unsplash.com/photo-1544126592-807ade215a0b?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Design e Tecnologia',
    slug: 'design-e-tecnologia',
    icon: Smartphone,
    items: ['Desenvolvedor de sites', 'Designer gráfico', 'Marketing digital', 'Edição de vídeo'],
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80'
  }
];

export const CATEGORIES_MAP: Record<string, string[]> = CATEGORY_MENUS.reduce((acc, cat) => {
  acc[cat.name] = cat.items;
  return acc;
}, {} as Record<string, string[]>);

export const MAIN_CATEGORIES = Object.keys(CATEGORIES_MAP);

/**
 * Foto por serviço específico (fileiras da home do cliente e cards de
 * categoria). Serviço sem entrada aqui cai no fallback da própria categoria
 * (CATEGORY_MENUS[i].image) — assim todo item sempre tem alguma foto.
 */
export const SERVICE_IMAGES: Record<string, string> = {
  'Aquecedor a gás': 'https://images.unsplash.com/photo-1594233078955-e1f73a02ebb2?auto=format&fit=crop&w=400&q=70',
  'Ar condicionado': 'https://images.unsplash.com/photo-1757219525975-03b5984bc6e8?auto=format&fit=crop&w=400&q=70',
  'Geladeira e freezer': 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=400&q=70',
  'Máquina de lavar': 'https://images.unsplash.com/photo-1622473590925-e3616c0a41bf?auto=format&fit=crop&w=400&q=70',
  'Técnico de celular': 'https://images.unsplash.com/photo-1550041473-d296a3a8a18a?auto=format&fit=crop&w=400&q=70',
  'Técnico de informática': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=70',
  'Desenvolvedor de sites': 'https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=400&q=70',
  'Designer gráfico': 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=400&q=70',
  'Marketing digital': 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?auto=format&fit=crop&w=400&q=70',
  'Edição de vídeo': 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=400&q=70',
  'Pedreiro': 'https://images.unsplash.com/photo-1653280679689-078c04c417a1?auto=format&fit=crop&w=400&q=70',
  'Azulejista': 'https://images.unsplash.com/photo-1523413307857-ef24c53571ae?auto=format&fit=crop&w=400&q=70',
  'Pintor': 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=70',
  'Gesseiro': 'https://images.unsplash.com/photo-1768839725085-829e6ac7ac26?auto=format&fit=crop&w=400&q=70',
  'Drywall': 'https://images.unsplash.com/photo-1768321903410-54961e343b71?auto=format&fit=crop&w=400&q=70',
  'Encanador': 'https://images.unsplash.com/photo-1673870861507-d72aa6855d89?auto=format&fit=crop&w=400&q=70',
  'Eletricista': 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=400&q=70',
  'Serralheiro': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=400&q=70',
  'Marceneiro': 'https://images.unsplash.com/photo-1611486212557-88be5ff6f941?auto=format&fit=crop&w=400&q=70',
  'Soldador': 'https://images.unsplash.com/photo-1745448797901-2a4c9d9af1c1?auto=format&fit=crop&w=400&q=70',
  'Montador de móveis': 'https://images.unsplash.com/photo-1590635023142-73c3d34f2805?auto=format&fit=crop&w=400&q=70',
  'Vidraceiro': 'https://images.unsplash.com/photo-1524803504179-6d7ae4d283f7?auto=format&fit=crop&w=400&q=70',
  'Telhadista': 'https://images.unsplash.com/photo-1763665814538-8ba04597286c?auto=format&fit=crop&w=400&q=70',
  'Impermeabilização': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=70',
  'Diarista': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=70',
  'Babá': 'https://images.unsplash.com/photo-1544126592-807ade215a0b?auto=format&fit=crop&w=400&q=70',
  'Cozinheira': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=400&q=70',
  'Limpeza pós-obra': 'https://images.unsplash.com/photo-1718152421680-d1580e843cc9?auto=format&fit=crop&w=400&q=70',
  'Jardinagem': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=400&q=70',
  'Piscineiro': 'https://images.unsplash.com/photo-1745570295714-cb18cd15ff64?auto=format&fit=crop&w=400&q=70',
  'Dedetização': 'https://images.unsplash.com/photo-1611773236409-f3ee161007a1?auto=format&fit=crop&w=400&q=70',
  'Lavagem de sofá': 'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=400&q=70',
  'Limpeza de caixa d’água': 'https://images.unsplash.com/photo-1778178933409-705e5a5c6a48?auto=format&fit=crop&w=400&q=70',
  'Marido de aluguel': 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?auto=format&fit=crop&w=400&q=70',
  'Fretes e mudanças': 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=400&q=70',
  'Instalador de câmeras': 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=400&q=70',
  'Segurança e alarmes': 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=70',
  'Aulas particulares': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=70',
};

/** Foto pra um serviço, com fallback pra imagem da categoria dona dele. */
export function imageForService(categoryName: string, service: string): string {
  if (SERVICE_IMAGES[service]) return SERVICE_IMAGES[service];
  const cat = CATEGORY_MENUS.find((c) => c.name === categoryName);
  return cat?.image || '';
}

/**
 * "Tipo de serviço" por subcategoria — cada serviço pergunta o que faz sentido
 * pra ele (Eletricista pergunta sobre fiação/instalação, Diarista pergunta
 * frequência etc.), em vez de todo mundo cair no mesmo formulário genérico.
 * Subcategoria sem entrada aqui usa DEFAULT_SERVICE_TYPES.
 */
const SERVICE_TYPE_OPTIONS: Record<string, string[]> = {
  // Assistência técnica
  'Aquecedor a gás': ['Instalação', 'Manutenção', 'Conserto', 'Outro'],
  'Ar condicionado': ['Instalação', 'Manutenção/limpeza', 'Conserto', 'Outro'],
  'Geladeira e freezer': ['Conserto', 'Manutenção', 'Instalação', 'Outro'],
  'Máquina de lavar': ['Conserto', 'Manutenção', 'Instalação', 'Outro'],
  'Técnico de celular': ['Troca de tela', 'Troca de bateria', 'Não liga', 'Outro'],
  'Técnico de informática': ['Formatação', 'Vírus/malware', 'Não liga', 'Lentidão', 'Outro'],
  // Design e Tecnologia
  'Desenvolvedor de sites': ['Site novo', 'Manutenção de site existente', 'Loja virtual', 'Outro'],
  'Designer gráfico': ['Identidade visual/logo', 'Material impresso', 'Redes sociais', 'Outro'],
  'Marketing digital': ['Gestão de redes sociais', 'Tráfego pago', 'SEO', 'Outro'],
  'Edição de vídeo': ['Vídeo institucional', 'Redes sociais', 'Casamento/evento', 'Outro'],
  // Construção e reformas
  'Pedreiro': ['Reforma', 'Construção nova', 'Reparo', 'Acabamento', 'Outro'],
  'Pintor': ['Pintura interna', 'Pintura externa', 'Textura/grafiato', 'Retoque', 'Outro'],
  'Encanador': ['Vazamento', 'Entupimento', 'Instalação', 'Troca de peças (torneira, registro...)', 'Outro'],
  'Eletricista': ['Instalação', 'Conserto ou manutenção', 'Fiação elétrica', 'Instalação de ar condicionado', 'Instalação de ventilador de teto', 'Certificado de instalação', 'Outro'],
  'Montador de móveis': ['Móveis planejados', 'Móveis de loja (MDF)', 'Desmontagem', 'Outro'],
  // Limpeza e manutenção
  'Diarista': ['Limpeza única', 'Semanal', 'Quinzenal', 'Mensal'],
  'Babá': ['Eventual', 'Fixo (diário)', 'Período integral', 'Meio período'],
  'Cozinheira': ['Evento único', 'Refeições da semana', 'Fixo (diário)'],
  'Jardinagem': ['Manutenção regular', 'Poda', 'Paisagismo', 'Outro'],
  'Piscineiro': ['Limpeza/manutenção', 'Tratamento químico', 'Reparo', 'Outro'],
  // Serviços gerais
  'Marido de aluguel': ['Pequenos reparos', 'Instalação', 'Montagem', 'Manutenção geral', 'Outro'],
  'Fretes e mudanças': ['Mudança residencial', 'Frete de item único', 'Mudança comercial', 'Outro'],
};
const DEFAULT_SERVICE_TYPES = ['Instalação', 'Conserto ou manutenção', 'Outro'];

export function serviceTypeOptions(subcategory: string): string[] {
  return SERVICE_TYPE_OPTIONS[subcategory] || DEFAULT_SERVICE_TYPES;
}

export const WEEKDAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
export const DAY_PERIODS = ['Manhã (7h às 12h)', 'Tarde (12h às 18h)', 'Noite (após 18h)'];

/**
 * Exemplo (placeholder) do campo de descrição, por categoria — cada categoria
 * tem seu próprio exemplo em vez de sempre mostrar um exemplo de obras/pintura
 * pra quem está pedindo, digamos, uma diarista ou um site.
 */
const DESCRIPTION_PLACEHOLDERS: Record<string, string> = {
  'Construção e reformas': 'Ex: Preciso pintar 3 cômodos do apartamento (sala e 2 quartos). As paredes não têm infiltração, mas precisam de massa corrida em alguns pontos...',
  'Assistência técnica': 'Ex: Meu ar condicionado não está gelando e faz um ruído estranho ao ligar. Preciso de uma avaliação e do conserto o quanto antes...',
  'Design e Tecnologia': 'Ex: Preciso de um site institucional com 5 páginas pra minha empresa, com formulário de contato e integração com WhatsApp...',
  'Limpeza e manutenção': 'Ex: Preciso limpar a caixa d\'água e fazer uma dedetização preventiva no apartamento antes de mudar...',
  'Serviços gerais': 'Ex: Preciso instalar 2 prateleiras e trocar uma fechadura. Já tenho os materiais, só preciso da mão de obra...',
  'Serviços domésticos': 'Ex: Preciso de uma diarista quinzenal pra limpeza geral de um apartamento de 2 quartos, incluindo cozinha e banheiros...',
};
const DEFAULT_DESCRIPTION_PLACEHOLDER = 'Ex: Descreva o que precisa, com detalhes como medidas, prazos e preferências que ajudem o profissional a entender o serviço...';

export function descriptionPlaceholder(category: string): string {
  return DESCRIPTION_PLACEHOLDERS[category] || DEFAULT_DESCRIPTION_PLACEHOLDER;
}