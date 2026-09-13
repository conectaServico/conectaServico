import {
  Wrench,
  Smartphone,
  Hammer,
  Users,
  type LucideIcon
} from 'lucide-react';

export interface CategoryGroup {
  label: string;
  items: string[];
}

export interface CategoryMenu {
  name: string;
  slug: string;
  icon: LucideIcon;
  items: string[];
  image: string;
  /** Abas opcionais (ex.: Para Casa / Para Família / Para Pets) — categorias sem isso mostram a lista corrida de `items`. */
  groups?: CategoryGroup[];
}

// Só 4 categorias principais — "Reformas e Reparos" absorve o que antes eram
// "Construção e reformas", "Serviços gerais" e "Limpeza e manutenção",
// organizado em abas (igual à referência do GetNinjas).
export const CATEGORY_MENUS: CategoryMenu[] = [
  {
    name: 'Reformas e Reparos',
    slug: 'reformas-e-reparos',
    icon: Hammer,
    groups: [
      { label: 'Construção', items: ['Pedreiro', 'Arquiteto', 'Azulejista', 'Limpeza Pós Obra', 'Engenheiro', 'Marmoraria e Granitos', 'Poço Artesiano', 'Remoção de Entulho', 'Telhadista', 'Impermeabilização', 'Design de Interiores'] },
      { label: 'Reformas e Reparos', items: ['Eletricista', 'Gesso e DryWall', 'Pintor', 'Vidraceiro', 'Serralheria e Solda', 'Encanador', 'Gás', 'Pavimentação'] },
      { label: 'Instalação', items: ['Segurança Eletrônica', 'Automação Residencial', 'Instalação de eletrônicos', 'Antenista', 'Toldos e Coberturas'] },
      { label: 'Para a Casa', items: ['Decorador', 'Montador de Móveis', 'Marceneiro', 'Paisagista', 'Jardinagem', 'Piscina', 'Redes de Proteção', 'Coifas e Exaustores', 'Dedetização', 'Lavagem de sofá', 'Limpeza de caixa d’água'] },
      { label: 'Serviços Gerais', items: ['Marido de aluguel', 'Fretes e mudanças', 'Instalador de câmeras', 'Segurança e alarmes', 'Aulas particulares'] },
    ],
    items: [
      'Pedreiro', 'Arquiteto', 'Azulejista', 'Limpeza Pós Obra', 'Engenheiro', 'Marmoraria e Granitos', 'Poço Artesiano', 'Remoção de Entulho', 'Telhadista', 'Impermeabilização', 'Design de Interiores',
      'Eletricista', 'Gesso e DryWall', 'Pintor', 'Vidraceiro', 'Serralheria e Solda', 'Encanador', 'Gás', 'Pavimentação',
      'Segurança Eletrônica', 'Automação Residencial', 'Instalação de eletrônicos', 'Antenista', 'Toldos e Coberturas',
      'Decorador', 'Montador de Móveis', 'Marceneiro', 'Paisagista', 'Jardinagem', 'Piscina', 'Redes de Proteção', 'Coifas e Exaustores', 'Dedetização', 'Lavagem de sofá', 'Limpeza de caixa d’água',
      'Marido de aluguel', 'Fretes e mudanças', 'Instalador de câmeras', 'Segurança e alarmes', 'Aulas particulares',
    ],
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Serviços domésticos',
    slug: 'servicos-domesticos',
    icon: Users,
    // Agrupado em abas (Para Casa / Para Família / Para Pets) igual ao app do
    // GetNinjas — `items` é a união usada nos lugares que não têm abas (fileira
    // da home, grade de subcategoria do "novo pedido").
    groups: [
      { label: 'Para Casa', items: ['Diarista', 'Limpeza de Piscina', 'Passadeira', 'Personal Shopper', 'Lavadeira'] },
      { label: 'Para Família', items: ['Babá', 'Cozinheira', 'Motorista', 'Personal Organizer', 'Entregador', 'Segurança Particular'] },
      { label: 'Para Pets', items: ['Adestrador de Cães', 'Passeador de Cães', 'Serviços para Pets'] },
    ],
    items: ['Diarista', 'Limpeza de Piscina', 'Passadeira', 'Personal Shopper', 'Lavadeira', 'Babá', 'Cozinheira', 'Motorista', 'Personal Organizer', 'Entregador', 'Segurança Particular', 'Adestrador de Cães', 'Passeador de Cães', 'Serviços para Pets'],
    image: 'https://images.unsplash.com/photo-1544126592-807ade215a0b?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Assistência técnica',
    slug: 'assistencia-tecnica',
    icon: Wrench,
    items: ['Ar condicionado', 'Máquina de lavar', 'Técnico de informática', 'Aquecedor a gás', 'Geladeira e freezer', 'Técnico de celular'],
    image: 'https://images.unsplash.com/photo-1721333089073-215a56fd710c?auto=format&fit=crop&w=800&q=80'
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
  // Reformas e Reparos — Construção
  'Pedreiro': 'https://images.unsplash.com/photo-1653280679689-078c04c417a1?auto=format&fit=crop&w=400&q=70',
  'Arquiteto': 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=400&q=70',
  'Azulejista': 'https://images.unsplash.com/photo-1523413307857-ef24c53571ae?auto=format&fit=crop&w=400&q=70',
  'Limpeza Pós Obra': 'https://images.unsplash.com/photo-1718152421680-d1580e843cc9?auto=format&fit=crop&w=400&q=70',
  'Engenheiro': 'https://images.unsplash.com/photo-1742112125567-3e8967bad60f?auto=format&fit=crop&w=400&q=70',
  'Marmoraria e Granitos': 'https://images.unsplash.com/photo-1694378060976-66ee61c4f427?auto=format&fit=crop&w=400&q=70',
  'Poço Artesiano': 'https://images.unsplash.com/photo-1673870861507-d72aa6855d89?auto=format&fit=crop&w=400&q=70',
  'Remoção de Entulho': 'https://images.unsplash.com/photo-1777793919680-0123bc31ce36?auto=format&fit=crop&w=400&q=70',
  'Telhadista': 'https://images.unsplash.com/photo-1763665814538-8ba04597286c?auto=format&fit=crop&w=400&q=70',
  'Impermeabilização': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=70',
  'Design de Interiores': 'https://images.unsplash.com/photo-1664711942326-2c3351e215e6?auto=format&fit=crop&w=400&q=70',
  // Reformas e Reparos — aba "Reformas e Reparos"
  'Eletricista': 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=400&q=70',
  'Gesso e DryWall': 'https://images.unsplash.com/photo-1768839725085-829e6ac7ac26?auto=format&fit=crop&w=400&q=70',
  'Pintor': 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=70',
  'Vidraceiro': 'https://images.unsplash.com/photo-1524803504179-6d7ae4d283f7?auto=format&fit=crop&w=400&q=70',
  'Serralheria e Solda': 'https://images.unsplash.com/photo-1745448797901-2a4c9d9af1c1?auto=format&fit=crop&w=400&q=70',
  'Encanador': 'https://images.unsplash.com/photo-1673870861507-d72aa6855d89?auto=format&fit=crop&w=400&q=70',
  'Gás': 'https://images.unsplash.com/photo-1639600993675-2281b2c939f0?auto=format&fit=crop&w=400&q=70',
  'Pavimentação': 'https://images.unsplash.com/photo-1740818480063-545e4d686860?auto=format&fit=crop&w=400&q=70',
  // Reformas e Reparos — Instalação
  'Segurança Eletrônica': 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=70',
  'Automação Residencial': 'https://images.unsplash.com/photo-1707733260992-73ff6dbed163?auto=format&fit=crop&w=400&q=70',
  'Instalação de eletrônicos': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=70',
  'Antenista': 'https://images.unsplash.com/photo-1761795111868-4851b056cf63?auto=format&fit=crop&w=400&q=70',
  'Toldos e Coberturas': 'https://images.unsplash.com/photo-1741971282313-fb25835b1d24?auto=format&fit=crop&w=400&q=70',
  // Reformas e Reparos — Para a Casa
  'Decorador': 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&w=400&q=70',
  'Montador de Móveis': 'https://images.unsplash.com/photo-1590635023142-73c3d34f2805?auto=format&fit=crop&w=400&q=70',
  'Marceneiro': 'https://images.unsplash.com/photo-1611486212557-88be5ff6f941?auto=format&fit=crop&w=400&q=70',
  'Paisagista': 'https://images.unsplash.com/photo-1655731695281-b0f818014486?auto=format&fit=crop&w=400&q=70',
  'Jardinagem': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=400&q=70',
  'Piscina': 'https://images.unsplash.com/photo-1745570295714-cb18cd15ff64?auto=format&fit=crop&w=400&q=70',
  'Redes de Proteção': 'https://images.unsplash.com/photo-1443933223857-9ca346228f72?auto=format&fit=crop&w=400&q=70',
  'Coifas e Exaustores': 'https://images.unsplash.com/photo-1773867567777-c59415847cb0?auto=format&fit=crop&w=400&q=70',
  'Dedetização': 'https://images.unsplash.com/photo-1611773236409-f3ee161007a1?auto=format&fit=crop&w=400&q=70',
  'Lavagem de sofá': 'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=400&q=70',
  'Limpeza de caixa d’água': 'https://images.unsplash.com/photo-1778178933409-705e5a5c6a48?auto=format&fit=crop&w=400&q=70',
  // Reformas e Reparos — Serviços Gerais
  'Marido de aluguel': 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?auto=format&fit=crop&w=400&q=70',
  'Fretes e mudanças': 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=400&q=70',
  'Instalador de câmeras': 'https://images.unsplash.com/photo-1676630656246-3047520adfdf?auto=format&fit=crop&w=400&q=70',
  'Segurança e alarmes': 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=70',
  'Aulas particulares': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=70',
  // Serviços domésticos
  'Diarista': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=70',
  'Babá': 'https://images.unsplash.com/photo-1544126592-807ade215a0b?auto=format&fit=crop&w=400&q=70',
  'Cozinheira': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=400&q=70',
  'Limpeza de Piscina': 'https://images.unsplash.com/photo-1745570295714-cb18cd15ff64?auto=format&fit=crop&w=400&q=70',
  'Passadeira': 'https://images.unsplash.com/photo-1647202152259-98fe50ad0618?auto=format&fit=crop&w=400&q=70',
  'Personal Shopper': 'https://images.unsplash.com/photo-1760565030786-91526dff426c?auto=format&fit=crop&w=400&q=70',
  'Lavadeira': 'https://images.unsplash.com/photo-1577553697116-6ee9a4ba564b?auto=format&fit=crop&w=400&q=70',
  'Motorista': 'https://images.unsplash.com/photo-1761599933861-fddf8f791c0a?auto=format&fit=crop&w=400&q=70',
  'Personal Organizer': 'https://images.unsplash.com/photo-1650229068182-6931ccb389c2?auto=format&fit=crop&w=400&q=70',
  'Entregador': 'https://images.unsplash.com/photo-1543499459-d1460946bdc6?auto=format&fit=crop&w=400&q=70',
  'Segurança Particular': 'https://images.unsplash.com/photo-1618371690240-e0d46eead4b8?auto=format&fit=crop&w=400&q=70',
  'Adestrador de Cães': 'https://images.unsplash.com/photo-1484190929067-65e7edd5a22f?auto=format&fit=crop&w=400&q=70',
  'Passeador de Cães': 'https://images.unsplash.com/photo-1729890838717-c508668a5ba0?auto=format&fit=crop&w=400&q=70',
  'Serviços para Pets': 'https://images.unsplash.com/photo-1719464454959-9cf304ef4774?auto=format&fit=crop&w=400&q=70',
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
  // Reformas e Reparos — Construção
  'Pedreiro': ['Reforma', 'Construção nova', 'Reparo', 'Acabamento', 'Outro'],
  'Arquiteto': ['Projeto novo', 'Reforma/ampliação', 'Regularização', 'Outro'],
  'Engenheiro': ['Laudo técnico', 'Projeto estrutural', 'Acompanhamento de obra', 'Outro'],
  'Marmoraria e Granitos': ['Bancada nova', 'Reparo', 'Outro'],
  'Poço Artesiano': ['Perfuração', 'Manutenção', 'Outro'],
  'Remoção de Entulho': ['Caçamba avulsa', 'Remoção recorrente', 'Outro'],
  'Design de Interiores': ['Projeto completo', 'Consultoria', 'Outro'],
  // Reformas e Reparos — aba "Reformas e Reparos"
  'Pintor': ['Pintura interna', 'Pintura externa', 'Textura/grafiato', 'Retoque', 'Outro'],
  'Encanador': ['Vazamento', 'Entupimento', 'Instalação', 'Troca de peças (torneira, registro...)', 'Outro'],
  'Eletricista': ['Instalação', 'Conserto ou manutenção', 'Fiação elétrica', 'Instalação de ar condicionado', 'Instalação de ventilador de teto', 'Certificado de instalação', 'Outro'],
  'Gesso e DryWall': ['Instalação', 'Reparo', 'Forro/sanca', 'Outro'],
  'Serralheria e Solda': ['Portão/grade', 'Solda estrutural', 'Reparo', 'Outro'],
  'Gás': ['Instalação', 'Manutenção', 'Vazamento', 'Outro'],
  'Pavimentação': ['Calçada', 'Piso intertravado', 'Asfalto', 'Outro'],
  // Reformas e Reparos — Instalação
  'Segurança Eletrônica': ['Instalação', 'Manutenção', 'Outro'],
  'Automação Residencial': ['Iluminação inteligente', 'Fechadura/portão', 'Som ambiente', 'Projeto completo'],
  'Instalação de eletrônicos': ['TV/Home theater', 'Rede/Wi-Fi', 'Outro'],
  'Antenista': ['Instalação', 'Ajuste de sinal', 'Manutenção', 'Outro'],
  'Toldos e Coberturas': ['Toldo retrátil', 'Cobertura fixa', 'Manutenção', 'Outro'],
  // Reformas e Reparos — Para a Casa
  'Montador de Móveis': ['Móveis planejados', 'Móveis de loja (MDF)', 'Desmontagem', 'Outro'],
  'Decorador': ['Consultoria de decoração', 'Projeto completo', 'Outro'],
  'Paisagista': ['Projeto de jardim', 'Paisagismo completo', 'Outro'],
  'Jardinagem': ['Manutenção regular', 'Poda', 'Paisagismo', 'Outro'],
  'Piscina': ['Limpeza/manutenção', 'Tratamento químico', 'Reparo', 'Outro'],
  'Redes de Proteção': ['Janela', 'Sacada', 'Área de lazer', 'Outro'],
  'Coifas e Exaustores': ['Instalação', 'Manutenção/limpeza', 'Conserto', 'Outro'],
  // Reformas e Reparos — Serviços Gerais
  'Marido de aluguel': ['Pequenos reparos', 'Instalação', 'Montagem', 'Manutenção geral', 'Outro'],
  'Fretes e mudanças': ['Mudança residencial', 'Frete de item único', 'Mudança comercial', 'Outro'],
  // Serviços domésticos — Para Casa
  'Diarista': ['Limpeza única', 'Semanal', 'Quinzenal', 'Mensal'],
  'Limpeza de Piscina': ['Limpeza/manutenção', 'Tratamento químico', 'Reparo', 'Outro'],
  'Passadeira': ['Eventual', 'Semanal', 'Quinzenal', 'Mensal'],
  'Personal Shopper': ['Compras do dia a dia', 'Compras especiais/presentes', 'Consultoria de estilo', 'Outro'],
  'Lavadeira': ['Eventual', 'Semanal', 'Quinzenal', 'Mensal'],
  // Serviços domésticos — Para Família
  'Babá': ['Eventual', 'Fixo (diário)', 'Período integral', 'Meio período'],
  'Cozinheira': ['Evento único', 'Refeições da semana', 'Fixo (diário)'],
  'Motorista': ['Corrida avulsa', 'Fixo (diário)', 'Viagens', 'Outro'],
  'Personal Organizer': ['Organização de um ambiente', 'Casa completa', 'Mudança/desapego', 'Outro'],
  'Entregador': ['Entrega única', 'Entregas recorrentes', 'Outro'],
  'Segurança Particular': ['Evento único', 'Diária/plantão', 'Fixo (mensal)', 'Outro'],
  // Serviços domésticos — Para Pets
  'Adestrador de Cães': ['Adestramento básico', 'Comportamental', 'Filhotes', 'Outro'],
  'Passeador de Cães': ['Eventual', 'Diário', 'Semanal', 'Outro'],
  'Serviços para Pets': ['Banho e tosa', 'Hospedagem/hotel', 'Pet sitter', 'Outro'],
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
  'Reformas e Reparos': 'Ex: Preciso pintar 3 cômodos do apartamento (sala e 2 quartos). As paredes não têm infiltração, mas precisam de massa corrida em alguns pontos...',
  'Assistência técnica': 'Ex: Meu ar condicionado não está gelando e faz um ruído estranho ao ligar. Preciso de uma avaliação e do conserto o quanto antes...',
  'Design e Tecnologia': 'Ex: Preciso de um site institucional com 5 páginas pra minha empresa, com formulário de contato e integração com WhatsApp...',
  'Serviços domésticos': 'Ex: Preciso de uma diarista quinzenal pra limpeza geral de um apartamento de 2 quartos, incluindo cozinha e banheiros...',
};
const DEFAULT_DESCRIPTION_PLACEHOLDER = 'Ex: Descreva o que precisa, com detalhes como medidas, prazos e preferências que ajudem o profissional a entender o serviço...';

export function descriptionPlaceholder(category: string): string {
  return DESCRIPTION_PLACEHOLDERS[category] || DEFAULT_DESCRIPTION_PLACEHOLDER;
}
