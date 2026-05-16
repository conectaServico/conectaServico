import { ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  isDestructive = false
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isDestructive ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">{title}</h2>
          <p className="text-slate-600 leading-relaxed">{message}</p>
        </div>
        
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`px-5 py-2.5 text-white rounded-xl font-bold transition-colors shadow-sm ${
              isDestructive 
                ? 'bg-danger hover:bg-red-600 shadow-danger/20' 
                : 'bg-primary hover:bg-primary-hover shadow-primary/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;