import React, { useState, useEffect } from 'react';
import { X, Save, Package, Calendar, Calculator } from 'lucide-react';
import { CreateFormData, Container } from '../types';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateFormData) => void;
  isSaving: boolean;
  existingContainers: Container[];
}

const CreateModal: React.FC<CreateModalProps> = ({ isOpen, onClose, onSave, isSaving, existingContainers }) => {
  const [numItems, setNumItems] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<CreateFormData>({
    id: '',
    fornecedor: '',
    data_inicio: '',
    data_fim: '',
    items: [
      { desc: '', qtd: '', m3: '' },
      { desc: '', qtd: '', m3: '' },
      { desc: '', qtd: '', m3: '' }
    ]
  });

  const [totalM3, setTotalM3] = useState(0);

  // FIX 1: CÁLCULO DE SEMANA ISO 8601 PADRÃO
  const getISOWeek = (date: Date) => {
    // Clona a data para não alterar a original
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    // Define para a quinta-feira mais próxima: current date + 4 - current day number
    // Domingo é 0, fazemos ele virar 7
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    // Início do ano
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calcula semana completa
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  useEffect(() => {
    if (isOpen) {
      setFormData({
        id: '',
        fornecedor: '',
        data_inicio: '',
        data_fim: '',
        items: [
          { desc: '', qtd: '', m3: '' },
          { desc: '', qtd: '', m3: '' },
          { desc: '', qtd: '', m3: '' }
        ]
      });
      setNumItems(1);
    }
  }, [isOpen]);

  // FIX 2: GERAÇÃO DE ID COM PROTEÇÃO DE FUSO HORÁRIO
  useEffect(() => {
    if (!formData.data_inicio) {
        return;
    }

    const generateSmartID = () => {
        try {
            // Divide a string YYYY-MM-DD
            const [yStr, mStr, dStr] = formData.data_inicio.split('-');
            
            // CRÍTICO: Cria a data ao MEIO-DIA (12:00:00)
            // Isso evita que o timezone local (ex: GMT-3) faça a data voltar para o dia anterior
            // Ex: 01/12 00:00 vira 30/11 21:00 sem isso.
            const dateObj = new Date(parseInt(yStr), parseInt(mStr) - 1, parseInt(dStr), 12, 0, 0);

            const weekNum = getISOWeek(dateObj);
            
            // Pega o ano da data calculada (pode ser diferente do input se for final de ano)
            const targetYear = dateObj.getFullYear().toString().slice(-2);
            
            const suffix = `W${weekNum}/${targetYear}`;
            
            // Conta quantos existem com esse sufixo para gerar sequencial
            const safeContainers = Array.isArray(existingContainers) ? existingContainers : [];
            const count = safeContainers.filter(c => c.id && c.id.includes(suffix)).length;
            
            const nextSeq = (count + 1).toString().padStart(2, '0');
            const newId = `CONT-${nextSeq}-${suffix}`;

            setFormData(prev => ({ ...prev, id: newId }));
        } catch (e) {
            console.error("Erro ao gerar ID", e);
        }
    };

    generateSmartID();

  }, [formData.data_inicio, existingContainers]);


  useEffect(() => {
    // Calcula o total apenas dos itens visíveis
    const total = formData.items.slice(0, numItems).reduce((sum, item) => {
      const val = parseFloat(item.m3.replace(',', '.'));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    setTotalM3(total);
  }, [formData.items, numItems]);

  if (!isOpen) return null;

  const handleItemChange = (index: number, field: 'desc' | 'qtd' | 'm3', value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleManualSubmit = () => {
    const form = document.getElementById('create-form') as HTMLFormElement;
    if (form && !form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Limpa os itens que não estão visíveis antes de salvar
    // Isso evita enviar lixo de campos que o usuário escondeu
    const cleanData = {
        ...formData,
        items: formData.items.map((item, idx) => {
            if (idx >= numItems) return { desc: '', qtd: '', m3: '' };
            return item;
        })
    };
    
    onSave(cleanData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <form 
        id="create-form"
        onSubmit={(e) => e.preventDefault()}
        className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]"
      >
        
        {/* HEADER: Z-50 e BG Sólido */}
        <div className="shrink-0 p-5 border-b border-slate-800 bg-slate-900 z-50 relative rounded-t-xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Package className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Cadastrar Programação</h2>
              <p className="text-xs text-slate-400">Novo Container de Importação</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isSaving} 
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 relative custom-scrollbar space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">ID do Container (Auto)</label>
              <input 
                type="text" 
                readOnly
                placeholder="Selecione a Data de Início..."
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg px-3 py-2 text-slate-400 font-mono text-sm cursor-not-allowed uppercase focus:outline-none"
                value={formData.id}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Fornecedor</label>
              <input 
                type="text" 
                required
                placeholder="Nome do Fornecedor"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 transition-all placeholder-slate-600"
                value={formData.fornecedor}
                onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
              />
            </div>
          </div>

          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Cronograma
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Início Semana</label>
                <input 
                  type="date" 
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-cyan-500 [color-scheme:dark]"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Fim Semana</label>
                <input 
                  type="date" 
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-cyan-500 [color-scheme:dark]"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({...formData, data_fim: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Itens da Carga</h3>
              <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNumItems(n as 1|2|3)}
                    // VISUAL: Botões PT-BR
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${numItems === n ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {n} {n === 1 ? 'Item' : 'Itens'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {Array.from({ length: numItems }).map((_, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 animate-in slide-in-from-left-2 duration-300">
                  <div className="col-span-1 flex items-center justify-center text-slate-500 font-mono text-xs font-bold">
                    #{index + 1}
                  </div>
                  <div className="col-span-6 md:col-span-7">
                    <input 
                      type="text" 
                      placeholder="Descrição do Item / Medidas"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cyan-500 placeholder-slate-600"
                      value={formData.items[index].desc}
                      onChange={(e) => handleItemChange(index, 'desc', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-2">
                    <input 
                      type="number" 
                      placeholder="Qtd"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:ring-1 focus:ring-cyan-500 text-center"
                      value={formData.items[index].qtd}
                      onChange={(e) => handleItemChange(index, 'qtd', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3 md:col-span-2 relative">
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="M3"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-2 pr-6 py-2 text-sm text-white focus:ring-1 focus:ring-cyan-500 text-right font-mono"
                      value={formData.items[index].m3}
                      onChange={(e) => handleItemChange(index, 'm3', e.target.value)}
                    />
                    <span className="absolute right-2 top-2 text-xs text-slate-500">m³</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <div className="bg-slate-800 px-4 py-2 rounded-lg flex items-center gap-3 border border-slate-700">
                <Calculator className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-slate-400 uppercase font-bold">Total Volume:</span>
                <span className="text-lg font-mono font-bold text-white">{totalM3.toFixed(2)} m³</span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="shrink-0 p-5 border-t border-slate-800 bg-slate-900 rounded-b-xl flex justify-end gap-3 z-10">
          <button 
            type="button" 
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleManualSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Enviando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Salvar Programação
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default CreateModal;