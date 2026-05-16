import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, writeBatch, increment } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';
import { Transaction } from '@/types';
import { Coins, ArrowUpRight, ArrowDownRight, Loader2, CreditCard, Gift, ShieldAlert, X, CheckCircle2, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const DIAMOND_PACKAGES = [
  { id: 'pkg_50', diamonds: 50, price: 9.90, popular: false },
  { id: 'pkg_150', diamonds: 150, price: 27.90, popular: true },
  { id: 'pkg_300', diamonds: 300, price: 49.90, popular: false },
];

const Wallet = () => {
  const { user, setUser } = useUserStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Store States
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<typeof DIAMOND_PACKAGES[0] | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', user.id)
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        
        // Sort frontend (no index needed)
        data.sort((a, b) => b.created_at - a.created_at);
        
        setTransactions(data);
      } catch (error) {
        console.error('Erro ao buscar transações:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'BONUS_SIGNUP': return <Gift className="w-5 h-5 text-emerald-500" />;
      case 'UNLOCK_CONTACT': return <ArrowDownRight className="w-5 h-5 text-danger" />;
      case 'REFUND': return <ArrowUpRight className="w-5 h-5 text-emerald-500" />;
      case 'PURCHASE': return <Coins className="w-5 h-5 text-primary" />;
      default: return <Coins className="w-5 h-5 text-primary" />;
    }
  };

  const getTransactionColor = (type: string) => {
    if (type === 'UNLOCK_CONTACT') return 'text-danger';
    return 'text-emerald-500';
  };

  const getTransactionPrefix = (type: string) => {
    if (type === 'UNLOCK_CONTACT') return '-';
    return '+';
  };

  const handleBuyDiamonds = () => {
    setIsStoreOpen(true);
    setSelectedPackage(null);
    setPaymentMethod(null);
    setPaymentSuccess(false);
  };

  const handleCheckout = async () => {
    if (!user || !selectedPackage || !paymentMethod) return;
    setProcessingPayment(true);
    
    // Simulate Gateway Payment Delay (Mercado Pago / Stripe)
    await new Promise(resolve => setTimeout(resolve, 2500));

    try {
      const batch = writeBatch(db);
      
      // Update User Balance
      const userRef = doc(db, 'users', user.id);
      batch.update(userRef, { coinsBalance: increment(selectedPackage.diamonds) });

      // Add Transaction
      const txRef = doc(collection(db, 'transactions'));
      const newTx: Omit<Transaction, 'id'> = {
        userId: user.id,
        amount: selectedPackage.diamonds,
        type: 'PURCHASE',
        description: `Compra de Pacote: ${selectedPackage.diamonds} Diamantes via ${paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito'}`,
        created_at: Date.now()
      };
      batch.set(txRef, newTx);

      await batch.commit();

      // Update Local State
      setUser({ ...user, coinsBalance: (user.coinsBalance || 0) + selectedPackage.diamonds });
      setTransactions(prev => [{ id: txRef.id, ...newTx } as Transaction, ...prev].sort((a, b) => b.created_at - a.created_at));
      
      setPaymentSuccess(true);
      toast.success('Diamantes adicionados com sucesso!');
      setTimeout(() => {
        setIsStoreOpen(false);
        setPaymentSuccess(false);
        setSelectedPackage(null);
        setPaymentMethod(null);
      }, 3000);

    } catch (err) {
      console.error('Erro na compra:', err);
      toast.error('Erro ao processar o pagamento.');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Saldo Atual */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl flex-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Coins className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <p className="text-slate-400 font-medium mb-2 uppercase tracking-wider text-sm">Saldo Disponível</p>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-6xl font-extrabold">{user?.coinsBalance || 0}</span>
              <span className="text-xl font-medium text-slate-300">Diamantes</span>
            </div>
            
            <button 
              onClick={handleBuyDiamonds}
              className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-primary/30"
            >
              <CreditCard className="w-5 h-5" /> Adicionar Diamantes
            </button>
          </div>
        </div>

        {/* Informações de Compra */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex-1 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Como funciona?</h3>
          <ul className="space-y-4">
            <li className="flex gap-3 items-start">
              <div className="bg-primary/10 p-1.5 rounded-full mt-0.5"><Coins className="w-4 h-4 text-primary" /></div>
              <p className="text-sm text-slate-600 leading-relaxed">Você usa diamantes para <strong className="text-slate-900">desbloquear o contato</strong> dos clientes e enviar orçamentos.</p>
            </li>
            <li className="flex gap-3 items-start">
              <div className="bg-emerald-50 p-1.5 rounded-full mt-0.5"><ArrowUpRight className="w-4 h-4 text-emerald-500" /></div>
              <p className="text-sm text-slate-600 leading-relaxed"><strong className="text-slate-900">Reembolso Garantido:</strong> Se você não for o profissional escolhido pelo cliente, seus diamantes voltam automaticamente.</p>
            </li>
            <li className="flex gap-3 items-start">
              <div className="bg-slate-100 p-1.5 rounded-full mt-0.5"><ShieldAlert className="w-4 h-4 text-slate-500" /></div>
              <p className="text-sm text-slate-600 leading-relaxed">Nós não cobramos comissão. O valor do serviço fechado é <strong className="text-slate-900">100% seu</strong>.</p>
            </li>
          </ul>
        </div>
      </div>

      {/* Extrato / Histórico */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900">Histórico de Transações</h2>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            Nenhuma transação encontrada.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map(t => (
              <div key={t.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    t.type === 'UNLOCK_CONTACT' ? 'bg-danger/10' : 'bg-emerald-50'
                  }`}>
                    {getTransactionIcon(t.type)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{t.description}</p>
                    <p className="text-sm text-slate-500">{format(t.created_at, "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>
                <div className={`text-xl font-extrabold ${getTransactionColor(t.type)}`}>
                  {getTransactionPrefix(t.type)}{t.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loja de Diamantes Modal (Gateway Simulator) */}
      {isStoreOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Coins className="w-6 h-6 text-primary" /> Loja de Diamantes
              </h2>
              {!processingPayment && !paymentSuccess && (
                <button onClick={() => setIsStoreOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>

            <div className="p-6">
              {paymentSuccess ? (
                <div className="text-center py-10 space-y-4">
                  <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto text-success mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900">Pagamento Aprovado!</h3>
                  <p className="text-slate-600">Seus diamantes já estão disponíveis na sua carteira.</p>
                </div>
              ) : processingPayment ? (
                <div className="text-center py-12 space-y-6">
                  <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Processando pagamento...</h3>
                    <p className="text-slate-500 text-sm">Conectando com o Mercado Pago de forma segura.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {!selectedPackage ? (
                    <>
                      <p className="text-slate-600 mb-6">Escolha o melhor pacote para você continuar enviando orçamentos para os clientes.</p>
                      
                      {DIAMOND_PACKAGES.map((pkg) => (
                        <div 
                          key={pkg.id} 
                          className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer group flex items-center justify-between ${
                            pkg.popular 
                              ? 'border-primary bg-primary/5 hover:bg-primary/10' 
                              : 'border-slate-200 hover:border-primary/40'
                          }`}
                          onClick={() => setSelectedPackage(pkg)}
                        >
                          {pkg.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                              Mais Popular
                            </div>
                          )}
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${pkg.popular ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                              <Coins className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-lg font-extrabold text-slate-900">{pkg.diamonds} Diamantes</h4>
                              <p className="text-sm text-slate-500 font-medium">R$ {(pkg.price / pkg.diamonds).toFixed(2).replace('.', ',')} por diamante</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-extrabold text-slate-900">
                              <span className="text-sm font-medium text-slate-500 mr-1">R$</span>
                              {pkg.price.toFixed(2).replace('.', ',')}
                            </p>
                            <button className={`text-sm font-bold mt-1 ${pkg.popular ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`}>
                              Comprar
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center mb-6">
                        <div>
                          <p className="text-sm text-slate-500 font-bold">Pacote Selecionado</p>
                          <p className="text-lg font-extrabold text-slate-900">{selectedPackage.diamonds} Diamantes</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500 font-bold">Total</p>
                          <p className="text-xl font-extrabold text-primary">R$ {selectedPackage.price.toFixed(2).replace('.', ',')}</p>
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-900 mb-3">Forma de Pagamento</h4>
                      <div className="grid grid-cols-2 gap-3 mb-8">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('pix')}
                          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${
                            paymentMethod === 'pix' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <QrCode className={`w-8 h-8 ${paymentMethod === 'pix' ? 'text-emerald-500' : 'text-slate-400'}`} />
                          <span className="font-bold text-sm">PIX (Aprovação na hora)</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('credit_card')}
                          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${
                            paymentMethod === 'credit_card' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <CreditCard className={`w-8 h-8 ${paymentMethod === 'credit_card' ? 'text-primary' : 'text-slate-400'}`} />
                          <span className="font-bold text-sm">Cartão de Crédito</span>
                        </button>
                      </div>

                      <div className="flex gap-3">
                        <button 
                          onClick={() => {
                            setSelectedPackage(null);
                            setPaymentMethod(null);
                          }}
                          className="px-6 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                          Voltar
                        </button>
                        <button 
                          onClick={handleCheckout}
                          disabled={!paymentMethod}
                          className="flex-1 bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex justify-center items-center gap-2"
                        >
                          Pagar R$ {selectedPackage.price.toFixed(2).replace('.', ',')}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 pt-4 border-t border-slate-100 text-center flex items-center justify-center gap-2 text-xs text-slate-400">
                    <ShieldAlert className="w-4 h-4" /> Pagamento 100% seguro processado por Mercado Pago
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;