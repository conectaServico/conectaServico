import { ChevronLeft, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';

const AllFaqs = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const isClient = user?.role === 'client';

  const clientFaqs = [
    {
      category: 'Sobre Pedidos',
      items: [
        {
          q: 'É gratuito fazer um pedido?',
          a: 'Sim! Você não paga absolutamente nada para usar a plataforma, solicitar orçamentos e conversar com os profissionais.'
        },
        {
          q: 'Posso cancelar um pedido?',
          a: 'Sim. Se você já fechou o serviço ou desistiu, basta acessar a tela de "Meus pedidos" e alterar o status do pedido para Cancelado.'
        },
        {
          q: 'Quantos orçamentos vou receber?',
          a: 'Geralmente, limitamos o contato a até 3 ou 4 profissionais da sua região. Isso garante que você receba orçamentos suficientes para comparar, sem sobrecarregar o seu chat.'
        }
      ]
    },
    {
      category: 'Pagamentos e Segurança',
      items: [
        {
          q: 'Como funciona o pagamento do serviço?',
          a: 'O pagamento é negociado e realizado diretamente entre você e o profissional. A plataforma Conecta Serviço não retém valores e não cobra comissões.'
        },
        {
          q: 'Como sei se o profissional é confiável?',
          a: 'Sempre verifique se o profissional possui o selo de "Verificado" (documentos validados) no perfil e leia atentamente as avaliações e comentários deixados por outros clientes.'
        }
      ]
    }
  ];

  const proFaqs = [
    {
      category: 'Sobre a Plataforma e Diamantes',
      items: [
        {
          q: 'O que são Diamantes e como funcionam?',
          a: 'Diamantes são a moeda virtual da plataforma. Você utiliza diamantes para liberar o contato do cliente e enviar seu orçamento. Cada pedido exige uma quantidade específica de diamantes dependendo do tamanho do serviço.'
        },
        {
          q: 'A plataforma cobra comissão sobre o serviço fechado?',
          a: 'Não! Nós não cobramos nenhuma comissão. 100% do valor que você negociar e receber do cliente é inteiramente seu.'
        },
        {
          q: 'Os diamantes têm validade?',
          a: 'Sim, os diamantes comprados possuem uma validade de 6 meses a partir da data de compra.'
        }
      ]
    },
    {
      category: 'Perfil e Serviços',
      items: [
        {
          q: 'Como valido meus documentos?',
          a: 'Acesse o seu Perfil, clique em "Validação de documentos" e siga as instruções para enviar uma foto do seu RG/CNH e uma selfie. A validação aumenta muito suas chances de fechar serviços.'
        },
        {
          q: 'Como defino até onde quero atender?',
          a: 'No seu Perfil, em "Meu perfil", existe a configuração de Raio de Atuação em KM. Você receberá apenas pedidos que estiverem dentro dessa distância a partir do seu endereço cadastrado.'
        }
      ]
    }
  ];

  const faqs = isClient ? clientFaqs : proFaqs;

  return (
    <div className="max-w-3xl mx-auto pb-12 pt-8 px-4">
      <button 
        onClick={() => navigate('/help')} 
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6 font-bold"
      >
        <ChevronLeft className="w-5 h-5" />
        Voltar para Central de Ajuda
      </button>

      <div className="mb-10 flex items-center gap-4">
        <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
          <HelpCircle className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1">Central Completa</h1>
          <p className="text-slate-500">Todas as dúvidas frequentes categorizadas.</p>
        </div>
      </div>

      <div className="space-y-10">
        {faqs.map((section, idx) => (
          <div key={idx} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-900 mb-6 pb-4 border-b border-slate-100">
              {section.category}
            </h2>
            <div className="space-y-6">
              {section.items.map((item, itemIdx) => (
                <div key={itemIdx}>
                  <h3 className="font-bold text-slate-800 mb-2 flex gap-2">
                    <span className="text-primary">Q.</span>
                    {item.q}
                  </h3>
                  <p className="text-slate-600 leading-relaxed pl-6">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center p-8 bg-slate-50 rounded-3xl border border-slate-100">
        <h3 className="font-bold text-slate-900 mb-2">Não encontrou o que procurava?</h3>
        <p className="text-slate-500 mb-6">Nossa equipe de suporte está pronta para ajudar você.</p>
        <button 
          onClick={() => navigate('/help/contact')}
          className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
        >
          Falar com Suporte
        </button>
      </div>
    </div>
  );
};

export default AllFaqs;
