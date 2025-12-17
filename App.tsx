import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Ship, 
  Filter, 
  UserCircle,
  ShieldCheck,
  Search,
  RefreshCw,
  AlertOctagon,
  PlusCircle,
  Calendar,
  CheckCircle2,
  LogOut,
  LogIn,
  Info
} from 'lucide-react';
import ContainerCard from './components/ContainerCard';
import RegisterModal from './components/RegisterModal';
import CreateModal from './components/CreateModal';
import PasswordModal from './components/PasswordModal';
import { Container, RawApiContainer, ShipmentFormData, CreateFormData } from './types';
import { API_URL } from './constants';

const DRIVE_FILE_ID = "15ubzgKAvMV1hz-4PjWzfxi_iQmUVHPzU";
const LOGO_URL = `https://lh3.googleusercontent.com/d/${DRIVE_FILE_ID}`;

const normalizeId = (id: any): string => {
  if (!id) return '';
  return String(id).replace(/\s+/g, '').toUpperCase();
};

const App: React.FC = () => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const [viewMode, setViewMode] = useState<'director' | 'admin'>(() => {
    return (localStorage.getItem('viewMode') as 'director' | 'admin') || 'director';
  });

  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'shipment' | 'receive'>('shipment');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL);
      const data: RawApiContainer[] = await response.json();
      
      if (!Array.isArray(data)) {
        setContainers([]); 
        return;
      }

      const activeData = data.filter(item => (item['Status'] || "") !== "Excluído");

      const mappedData = activeData.map((item): Container => {
        const rawStatus = item['Status'] || "";
        let status: Container['status'] = 'planning';
        
        if (rawStatus === "Em Trânsito") status = 'transit';
        else if (rawStatus === "Entregue") status = 'yard';
        else status = 'planning'; 

        const itemsList = [];
        if (item['Item 1 Desc']) itemsList.push({ desc: item['Item 1 Desc'], qtd: item['Item 1 Qtd'] || '', real: item['Item 1 Real'] || '' });
        if (item['Item 2 Desc']) itemsList.push({ desc: item['Item 2 Desc'], qtd: item['Item 2 Qtd'] || '', real: item['Item 2 Real'] || '' });
        if (item['Item 3 Desc']) itemsList.push({ desc: item['Item 3 Desc'], qtd: item['Item 3 Qtd'] || '', real: item['Item 3 Real'] || '' });

        let requestedSummary = item['Material Solicitado'] || "";
        if (itemsList.length > 0 && !requestedSummary) {
          requestedSummary = itemsList.map(i => i.desc).join(', ');
        }

        const rawInicio = item['Data Inicio'] || item['Data Início'] || '';
        const rawFim = item['Data Fim'] || '';
        const rawId = item['Id'] || item['id'];
        const robustId = rawId ? normalizeId(rawId) : `TEMP-${Math.random().toString(36).substr(2,9)}`;

        return {
          ...item,
          id: robustId,
          supplier: item['Fornecedor'],
          status: status,
          priority: item['Prioridade'],
          measures_requested: requestedSummary,
          measures_actual: item['Material Embarcado'],
          nf: item['Nf'],
          date_pickup: item['Data Coleta'],
          date_arrival_forecast: item['Data Chegada'],
          date_start: rawInicio,
          date_end: rawFim,
          items: itemsList, 
        };
      });

      setContainers(mappedData);
    } catch (err) {
      setError("Falha ao carregar dados. Verifique sua conexão.");
      setContainers([]); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const suppliers = useMemo(() => {
    const safeContainers = Array.isArray(containers) ? containers : [];
    return Array.from(new Set(safeContainers.map(c => c.supplier)));
  }, [containers]);

  const filteredContainers = useMemo(() => {
    const safeContainers = Array.isArray(containers) ? containers : [];
    if (supplierFilter === 'all') return safeContainers;
    return safeContainers.filter(c => c.supplier === supplierFilter);
  }, [containers, supplierFilter]);

  const handleOpenRegister = (id: string) => {
    setSelectedContainerId(id);
    setModalMode('shipment');
    setIsModalOpen(true);
  };

  const handleOpenReceive = (id: string) => {
    setSelectedContainerId(id);
    setModalMode('receive');
    setIsModalOpen(true);
  };

  const handleSwitchModeClick = () => {
    if (viewMode === 'admin') setViewMode('director');
    else setIsPasswordModalOpen(true);
  };

  const handleDeleteContainer = async (id: string) => {
    const cleanId = normalizeId(id);
    if (!cleanId || !window.confirm(`ATENÇÃO: Deseja excluir ${cleanId}?`)) return;

    setContainers(prev => prev.filter(c => normalizeId(c.id) !== cleanId));
    showToast("Excluindo...", "info");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "delete", id: cleanId, "Status": "Excluído" })
      });
      const result = await response.json();
      if (result?.result === "success") {
        showToast("Excluído!", "success");
      } else {
        fetchData();
      }
    } catch (err) {
      fetchData();
    }
  };

  const handleSaveModalData = async (id: string, formData: ShipmentFormData, isReceive: boolean) => {
    setIsSaving(true);
    const cleanId = normalizeId(id);
    const targetStatus = isReceive ? "Entregue" : "Em Trânsito";
    
    // ATUALIZAÇÃO OTIMISTA
    setContainers(prev => prev.map(c => {
        if (normalizeId(c.id) === cleanId) {
            return {
                ...c,
                status: isReceive ? 'yard' : 'transit',
                nf: formData.nf,
                date_pickup: formData.date_pickup,
                date_arrival_forecast: formData.date_arrival,
                items: c.items.map((item, idx) => ({
                    ...item,
                    real: formData.items_actual[idx] || item.real
                }))
            };
        }
        return c;
    }));
    
    setIsModalOpen(false);
    showToast("Salvando alterações...", "info");

    // PAYLOAD COM MÁXIMA REDUNDÂNCIA DE CABEÇALHOS
    const payload = {
      action: "update",
      id: cleanId,
      "Nf": formData.nf,
      "Data Coleta": formData.date_pickup,
      "Data Chegada": formData.date_arrival, 
      
      // Chaves redundantes para o Status
      "Status": targetStatus,
      "Status ": targetStatus, // com espaço caso tenha erro no cabeçalho
      "status": targetStatus,
      "Situação": targetStatus,
      
      "Item 1 Real": formData.items_actual[0] || '',
      "Item 2 Real": formData.items_actual[1] || '',
      "Item 3 Real": formData.items_actual[2] || ''
    };

    console.log("Enviando Payload para API:", payload);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (result.result !== "updated" && result.result !== "edit" && result.result !== "success") {
        throw new Error(result.error || result.message || "Erro no servidor");
      }
      
      showToast(isReceive ? "Entregue com sucesso!" : "Embarque registrado!", "success");
      
      // AGUARDA 1.5 SEGUNDOS PARA GARANTIR QUE O GOOGLE SHEETS PROCESSOU
      setTimeout(() => {
        fetchData();
      }, 1500);

    } catch (err) {
      showToast(`Erro ao sincronizar. Tente atualizar.`, "error");
      setTimeout(fetchData, 2000); // Tenta recuperar dados originais em caso de falha
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateContainer = async (data: CreateFormData) => {
    setIsSaving(true);
    const itemsUsed = (data.items || []).filter(i => i.desc.trim() !== '');
    const totalM3 = itemsUsed.reduce((sum, item) => sum + (parseFloat(item.m3.replace(',','.')) || 0), 0);

    const payload = {
      action: "create",
      "Id": data.id,
      "Fornecedor": data.fornecedor,
      "Data Inicio": data.data_inicio,
      "Data Fim": data.data_fim,
      "Total M3": totalM3.toFixed(2),
      "Status": "Planejamento",
      "Item 1 Desc": data.items[0]?.desc || '',
      "Item 1 Qtd": data.items[0]?.qtd || '',
      "Item 1 M3": data.items[0]?.m3 || '',
      "Item 2 Desc": data.items[1]?.desc || '',
      "Item 2 Qtd": data.items[1]?.qtd || '',
      "Item 2 M3": data.items[1]?.m3 || '',
      "Item 3 Desc": data.items[2]?.desc || '',
      "Item 3 Qtd": data.items[2]?.qtd || '',
      "Item 3 M3": data.items[2]?.m3 || '',
      id: data.id,
      fornecedor: data.fornecedor
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.result === "created" || result.result === "success") {
        showToast("Programação criada!", "success");
        setTimeout(fetchData, 1000);
        setIsCreateModalOpen(false); 
      }
    } catch (err) {
      showToast(`Erro ao criar.`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedContainer = containers?.find(c => c.id === selectedContainerId);

  const renderColumn = (title: string, status: string, Icon: React.ElementType, colorClass: string) => {
    const safeFiltered = Array.isArray(filteredContainers) ? filteredContainers : [];
    let items = safeFiltered.filter(c => c.status === status);
    
    if (status === 'planning') {
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      const parseDateHelper = (dateStr: any) => {
        if (!dateStr) return null;
        const s = String(dateStr).trim();
        if (s.includes('-')) {
          const parts = s.split('T')[0].split('-');
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return null;
      };
      items.sort((a, b) => (a.date_end || '').localeCompare(b.date_end || ''));
    }

    return (
      <div className="flex flex-col h-full bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden">
        <div className={`p-3 border-b border-slate-800 flex items-center justify-between ${colorClass} bg-opacity-5`}>
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${colorClass}`} />
            <h2 className="font-bold text-slate-200 text-sm tracking-wide">{title}</h2>
          </div>
          <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
            {items.length}
          </span>
        </div>
        <div className="flex-1 p-2 overflow-y-auto space-y-2 custom-scrollbar">
          {items.length === 0 ? (
            <div className="h-24 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-lg bg-slate-900/20 text-xs">Vazio</div>
          ) : (
            items.map(container => (
              <ContainerCard 
                key={container.id}
                container={container} 
                isAdmin={viewMode === 'admin'}
                onRegisterShipment={handleOpenRegister}
                onDelete={handleDeleteContainer}
                onReceive={handleOpenReceive}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden relative">
      {notification && (
        <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 border
          ${notification.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400' : ''}
          ${notification.type === 'error' ? 'bg-rose-500/90 text-white border-rose-400' : ''}
          ${notification.type === 'info' ? 'bg-slate-800/90 text-cyan-400 border-cyan-500/30' : ''}
        `}>
          {notification.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
          {notification.type === 'error' && <AlertOctagon className="w-5 h-5" />}
          {notification.type === 'info' && <Info className="w-5 h-5" />}
          <span className="text-sm font-bold">{notification.message}</span>
        </div>
      )}

      <header className="h-14 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-4 shrink-0 z-20 shadow-xl shadow-black/40">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="Logo" className="h-9 w-auto object-contain drop-shadow-lg" />
          <h1 className="font-bold text-base text-white leading-tight hidden sm:block">Controle de Pedidos</h1>
          {viewMode === 'admin' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all ml-4"
            >
              <PlusCircle className="w-4 h-4" /> <span className="hidden sm:inline">NOVA PROGRAMAÇÃO</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={fetchData} disabled={loading} className="p-2 text-slate-400 hover:text-cyan-400 transition-colors">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleSwitchModeClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${viewMode === 'admin' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
            {viewMode === 'admin' ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            <span className="hidden sm:inline">{viewMode === 'admin' ? 'SAIR ADMIN' : 'ACESSAR ADMIN'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-4 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full max-w-[1600px] mx-auto w-full">
          {renderColumn('PLANEJAMENTO', 'planning', Calendar, 'border-slate-500/30')}
          {renderColumn('EM TRÂNSITO', 'transit', Ship, 'border-cyan-500/30')}
          {renderColumn('PÁTIO / ENTREGUE', 'yard', CheckCircle2, 'border-emerald-500/30')}
        </div>
      </main>

      <RegisterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} container={selectedContainer} onSave={handleSaveModalData} isSaving={isSaving} mode={modalMode} />
      <CreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSave={handleCreateContainer} isSaving={isSaving} existingContainers={containers} />
      <PasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} onSuccess={() => setViewMode('admin')} />
    </div>
  );
};

export default App;