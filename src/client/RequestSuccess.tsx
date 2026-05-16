import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const RequestSuccess = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="bg-success/10 p-6 rounded-full mb-6">
        <CheckCircle2 className="w-20 h-20 text-success" />
      </div>
      
      <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Pedido Enviado com Sucesso!</h1>
      <p className="text-lg text-slate-600 max-w-md mb-8">
        Seu pedido já está disponível para os profissionais da sua região. 
        Em breve você começará a receber propostas e orçamentos.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link 
          to="/requests" 
          className="bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          Ver meus pedidos
          <ArrowRight className="w-5 h-5" />
        </Link>
        <Link 
          to="/home" 
          className="bg-white border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
};

export default RequestSuccess;