
import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Package, Calendar, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Container, ShipmentFormData, ContainerItem } from '../types';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  container: Container | undefined;
  onSave: (id: string, data: ShipmentFormData, isReceive: boolean) => void;
  isSaving: boolean;
  mode: 'shipment' | 'receive'; 
}

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, container, onSave, isSaving, mode }) => {
  const [formData, setFormData] = useState<ShipmentFormData>({
    nf: '',
    date_pickup: new Date().toISOString().split('T')[0],
    date_arrival: '', 
    items_actual: ['', '', ''],
    extra_items: []
  });

  const isReceiveMode = mode === 'receive';

  useEffect(() => {
    if (container) {
      let currentActuals = ['', '', ''];
      if (container.items && container.items.length > 0) {
        container.items.filter(i => !i.isExtra).forEach((item, idx) => {
           if (idx < 3) currentActuals[idx] = item.real || '';
        });
      }

      setFormData({
        nf: container.nf || '',
        date_pickup: container.date_pickup ? container.date_pickup.split('T')[0] : new Date().toISOString().split('T')[0],
        date_arrival: isReceiveMode 
            ? new Date().toISOString().split('T')[0] 
            : (container.date_arrival_forecast ? container.date_arrival_forecast.split('T')[0] : ''),
        items_actual: currentActuals,
        extra_items: container.items?.filter(i => i.isExtra) || []
      });
    }
  }, [container, isOpen, mode]);

  if (!isOpen || !container) return null;

  const handleItemActualChange = (index: number, value: string) => {
    const newActuals = [...formData.items_actual];
    newActuals[index] = value;
    setFormData({ ...formData, items_actual: newActuals });
  };

  const addExtraItem = () => {
    setFormData({
      ...formData,
      extra_items: [...formData.extra_items, { desc: '', qtd: '', real: '', isExtra: true }]
    });
  };

  const removeExtraItem = (index: number) => {
    setFormData({
      ...formData,
      extra_items: formData.extra_items.filter((_, i) => i !== index)
    });
  };

  const handleExtraItemChange = (index: number, field: keyof ContainerItem, value: string) => {
    const newExtras = [...formData.extra_items];
    const updatedItem = { ...newExtras[index], [field]: value };
    
    // Sincroniza 'real' com 'qtd' para itens extras para que o card mostre o valor correto
    if (field === 'qtd') {
      updatedItem.real = value;
    }
    
    newExtras[index] = updatedItem;
    setFormData({ ...formData, extra_items: newExtras });
  };

  const handleManualSubmit = () => {
    const form = document.getElementById('register-form') as HTMLFormElement;
    if (form && !form.checkValidity()) {
        form.reportValidity();
        return;
    }
    onSave(container.id, formData, isReceiveMode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden max-h-[90vh]">
        <div className="bg-slate-950/50 p-5 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
               {isReceiveMode ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Package className="w-5 h-5 text-cyan-400" />}
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">{isReceiveMode ? 'Confirmar Recebimento' : 'Registrar Embarque'}</h2>
                <p className="text-xs text-slate-400 font-mono mt-1">{container.id} | {container.supplier}</p>
             </div>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>

        <form id="register-form" onSubmit={(e) => e.preventDefault()} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nota Fiscal (NF)</label>
              <input type="text" required disabled={isSaving} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono" value={formData.nf} onChange={(e) => setFormData({...formData, nf: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Coleta</label>
              <input type="date" required disabled={isSaving} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white [color-scheme:dark]" value={formData.date_pickup} onChange={(e) => setFormData({...formData, date_pickup: e.target.value})} />
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase mb-1 ${isReceiveMode ? 'text-emerald-500' : 'text-cyan-500'}`}>{isReceiveMode ? "Data Chegada" : "Previsão Chegada"}</label>
              <input type="date" required={isReceiveMode} disabled={isSaving} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white [color-scheme:dark]" value={formData.date_arrival} onChange={(e) => setFormData({...formData, date_arrival: e.target.value})} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Package className="w-4 h-4 text-slate-400" /> Conferência de Itens Programados</h3>
            {container.items?.filter(i => !i.isExtra).map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-4 bg-slate-950/30 p-3 rounded-lg border border-slate-800/50 items-center">
                <div className="col-span-6 md:col-span-5 border-r border-slate-800 pr-4">
                  <p className="text-sm text-slate-300 font-medium leading-tight">{item.desc}</p>
                  <p className="text-xs text-slate-500 mt-1 font-mono">Solicitado: {item.qtd}</p>
                </div>
                <div className="col-span-6 md:col-span-7">
                  <input type="text" placeholder="Qtd Real Embarcada..." className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cyan-500" value={formData.items_actual[idx]} onChange={(e) => handleItemActualChange(idx, e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Itens Extras (Fora do Pedido)</h3>
              <button type="button" onClick={addExtraItem} className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/20 transition-all"><Plus className="w-3.5 h-3.5" /> ADD ITEM EXTRA</button>
            </div>
            
            <div className="space-y-3">
              {formData.extra_items.map((item, idx) => (
                <div key={idx} className="bg-amber-900/05 border border-amber-500/20 p-3 rounded-xl relative group">
                  <button type="button" onClick={() => removeExtraItem(idx)} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 md:col-span-6">
                      <input type="text" placeholder="Descrição do Material Extra" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white" value={item.desc} onChange={(e) => handleExtraItemChange(idx, 'desc', e.target.value)} />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <input type="text" placeholder="Peças" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white text-center" value={item.qtd} onChange={(e) => handleExtraItemChange(idx, 'qtd', e.target.value)} />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <input type="text" placeholder="M³ (opcional)" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white text-right" value={item.m3 || ''} onChange={(e) => handleExtraItemChange(idx, 'm3', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
              {formData.extra_items.length === 0 && <p className="text-center text-slate-600 text-[10px] italic py-2">Nenhum item extra registrado</p>}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 rounded-lg text-slate-400 text-sm font-medium">Cancelar</button>
            <button type="button" onClick={handleManualSubmit} disabled={isSaving} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white text-sm font-bold shadow-lg ${isReceiveMode ? 'bg-emerald-600' : 'bg-cyan-600'}`}>
              {isSaving ? "Salvando..." : <><Save className="w-4 h-4" /> {isReceiveMode ? 'Confirmar Entrega' : 'Confirmar Embarque'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterModal;
