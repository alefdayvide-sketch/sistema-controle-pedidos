import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Package, Calendar } from 'lucide-react';
import { Container, ShipmentFormData } from '../types';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  container: Container | undefined;
  onSave: (id: string, data: ShipmentFormData) => void;
  isSaving: boolean;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, container, onSave, isSaving }) => {
  const [formData, setFormData] = useState<ShipmentFormData>({
    nf: '',
    date_pickup: new Date().toISOString().split('T')[0],
    date_arrival: '', 
    items_actual: ['', '', '']
  });

  const isEditMode = container?.status === 'transit';

  useEffect(() => {
    if (container) {
      let currentActuals = ['', '', ''];
      
      // FIX: Prioriza os dados reais estruturados (item.real) em vez de measures_actual (string concatenada)
      // Isso garante que edições salvas nos campos "Item X Real" apareçam corretamente no formulário ao reabrir
      if (container.items && container.items.length > 0) {
        container.items.forEach((item, idx) => {
           if (idx < 3) {
             currentActuals[idx] = item.real || '';
           }
        });
      } else if (container.measures_actual) {
        // Fallback legado caso items esteja vazio ou estrutura antiga
        const split = container.measures_actual.split(' | ');
        currentActuals = [
          split[0] || '',
          split[1] || '',
          split[2] || ''
        ];
      }

      setFormData({
        nf: container.nf || '',
        date_pickup: container.date_pickup ? container.date_pickup.split('T')[0] : new Date().toISOString().split('T')[0],
        date_arrival: container.date_arrival_forecast ? container.date_arrival_forecast.split('T')[0] : '',
        items_actual: currentActuals
      });
    }
  }, [container]);

  if (!isOpen || !container) return null;

  const handleItemActualChange = (index: number, value: string) => {
    const newActuals = [...formData.items_actual];
    newActuals[index] = value;
    setFormData({ ...formData, items_actual: newActuals });
  };

  // SAFETY FIX: Manual validation preventing form submit reload
  const handleManualSubmit = () => {
    const form = document.getElementById('register-form') as HTMLFormElement;
    if (form && !form.checkValidity()) {
        form.reportValidity();
        return;
    }
    onSave(container.id, formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-950/50 p-5 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">
              {isEditMode ? 'Editar Embarque' : 'Registrar Embarque'}
            </h2>
            <p className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-1">
              <Package className="w-3 h-3" /> {container.id} 
              <span className="text-slate-600">|</span> 
              {container.supplier}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <form 
            id="register-form" 
            onSubmit={(e) => e.preventDefault()} // CRITICAL: Blocks native submit
            className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          
          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nota Fiscal (NF)</label>
              <input 
                type="text" 
                required
                disabled={isSaving}
                placeholder="Ex: 123456"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 transition-all font-mono"
                value={formData.nf}
                onChange={(e) => setFormData({...formData, nf: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Coleta</label>
              <input 
                type="date" 
                required
                disabled={isSaving}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 [color-scheme:dark]"
                value={formData.date_pickup}
                onChange={(e) => setFormData({...formData, date_pickup: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-cyan-500 uppercase mb-1">Previsão Chegada (BR)</label>
              <input 
                type="date" 
                // NOT REQUIRED
                disabled={isSaving}
                className="w-full bg-slate-950 border border-cyan-900/50 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 [color-scheme:dark]"
                value={formData.date_arrival}
                onChange={(e) => setFormData({...formData, date_arrival: e.target.value})}
              />
            </div>
          </div>

          <div className="border-t border-slate-800 my-2"></div>

          {/* Items Section */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400" /> Conferência de Itens
            </h3>
            
            <div className="space-y-4">
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-4 text-[10px] uppercase font-bold text-slate-500 px-2">
                <div className="col-span-6 md:col-span-5">Solicitado (Original)</div>
                <div className="col-span-6 md:col-span-7 text-cyan-500">Realmente Embarcado (Editar)</div>
              </div>

              {/* Items Loop */}
              {container.items && container.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-4 bg-slate-950/30 p-3 rounded-lg border border-slate-800/50 items-center">
                  
                  {/* Left: Static Info */}
                  <div className="col-span-6 md:col-span-5 border-r border-slate-800 pr-4">
                    <p className="text-sm text-slate-300 font-medium leading-tight">{item.desc}</p>
                    {item.qtd && <p className="text-xs text-slate-500 mt-1 font-mono">Qtd: {item.qtd}</p>}
                  </div>

                  {/* Right: Input */}
                  <div className="col-span-6 md:col-span-7">
                    <input 
                      type="text" 
                      placeholder="Qtd/Medidas Reais..."
                      className={`w-full bg-slate-900 border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all
                        ${formData.items_actual[idx] && formData.items_actual[idx] !== item.desc 
                          ? 'border-amber-500/30' 
                          : 'border-slate-700'
                        }
                      `}
                      value={formData.items_actual[idx]}
                      onChange={(e) => handleItemActualChange(idx, e.target.value)}
                    />
                    {/* Divergence Warning Small */}
                    {formData.items_actual[idx] && formData.items_actual[idx] !== item.desc && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-500 font-bold">
                        <AlertTriangle className="w-3 h-3" /> Divergente
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {(!container.items || container.items.length === 0) && (
                <div className="text-center p-4 text-slate-500 text-sm italic">
                  Nenhum item detalhado encontrado neste container.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800 mt-4">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button 
              type="button" // CRITICAL: type="button" preventing reload
              onClick={handleManualSubmit}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20 transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> {isEditMode ? 'Atualizar Dados' : 'Confirmar Embarque'}
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default RegisterModal;