
import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, Calendar, CheckCircle2, BarChart3, Ship, Filter, X, Loader2, ExternalLink, ShieldAlert, Info, Check, AlertCircle, Plus, Search, User, LayoutGrid
} from 'lucide-react';
import ContainerCard from './components/ContainerCard';
import RegisterModal from './components/RegisterModal';
import CreateModal from './components/CreateModal';
import PasswordModal from './components/PasswordModal';
import DashboardView from './components/DashboardView';
import DetailsModal from './components/DetailsModal';
import { Container, ShipmentFormData, CreateFormData, ContainerItem } from './types';
import { API_URL } from './constants';

const DRIVE_FILE_ID = "15ubzgKAvMV1hz-4PjWzfxi_iQmUVHPzU";
const LOGO_URL = `https://lh3.googleusercontent.com/d/${DRIVE_FILE_ID}`;

const normalizeStr = (str: any): string => {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

const getVal = (obj: any, key: string): any => {
  if (!obj) return undefined;
  const target = normalizeStr(key);
  const foundKey = Object.keys(obj).find(k => normalizeStr(k) === target);
  return foundKey ? obj[foundKey] : undefined;
};

const normalizeId = (id: any): string => {
  if (!id) return '';
  return String(id).trim().replace(/\s+/g, '').toUpperCase();
};

const parseToTimestamp = (dateStr: any) => {
  if (!dateStr) return 0;
  const s = String(dateStr).trim();
  try {
    if (s.includes('-')) return new Date(s.split('T')[0]).getTime();
    if (s.includes('/')) {
      const [d, m, y] = s.split('/');
      return new Date(`${y}-${m}-${d}`).getTime();
    }
  } catch (e) { return 0; }
  return 0;
};

const App: React.FC = () => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [currentView, setCurrentView] = useState<'ops' | 'dashboard'>('ops');
  const [activeTab, setActiveTab] = useState<'planning' | 'transit' | 'yard'>('planning');
  const [viewMode, setViewMode] = useState<'director' | 'admin'>(() => (localStorage.getItem('viewMode') as 'director' | 'admin') || 'director');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'shipment' | 'receive'>('shipment');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { localStorage.setItem('viewMode', viewMode); }, [viewMode]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const urlWithCacheBuster = `${API_URL}${API_URL.includes('?') ? '&' : '?'}t=${Date.now()}`;
      const response = await fetch(urlWithCacheBuster, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow'
      });
      if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (text.includes("<!DOCTYPE html>")) throw new Error("Acesso Negado.");
        throw new Error("Resposta inválida do Google.");
      }
      if (!Array.isArray(data)) throw new Error("Dados inválidos.");
      const mappedData = data
        .filter(item => normalizeStr(getVal(item, 'Status')) !== "excluido")
        .map((item): Container => {
          const normStatus = normalizeStr(getVal(item, 'Status'));
          let status: Container['status'] = 'planning';
          if (normStatus.includes("transito")) status = 'transit';
          else if (normStatus.includes("entregue") || normStatus.includes("patio")) status = 'yard';
          
          const itemsList: ContainerItem[] = [];
          for (let i = 1; i <= 3; i++) {
            const desc = getVal(item, `Item ${i} Desc`);
            if (desc) {
              itemsList.push({
                desc: String(desc),
                qtd: String(getVal(item, `Item ${i} Qtd`) || ''),
                real: String(getVal(item, `Item ${i} Real`) || ''),
                m3: String(getVal(item, `Item ${i} M3`) || ''),
                isExtra: false
              });
            }
          }

          const extrasRaw = getVal(item, 'Itens Extras');
          if (extrasRaw && extrasRaw.trim() !== "" && extrasRaw !== "[]") {
            try {
              const extras = JSON.parse(extrasRaw);
              if (Array.isArray(extras)) {
                extras.forEach((ex: any) => {
                  itemsList.push({
                    desc: String(ex.desc || ''),
                    qtd: String(ex.qtd || ''),
                    real: String(ex.real || ex.qtd || ''),
                    m3: String(ex.m3 || ''),
                    isExtra: true
                  });
                });
              }
            } catch (e) {
              console.warn("Erro ao ler extras do ID:", getVal(item, 'Id'));
            }
          }

          return {
            ...item,
            id: normalizeId(getVal(item, 'Id')),
            supplier: String(getVal(item, 'Fornecedor') || 'Sem Nome'),
            status: status,
            priority: String(getVal(item, 'Prioridade') || 'Normal'),
            nf: String(getVal(item, 'Nf') || ""),
            date_pickup: String(getVal(item, 'Data Coleta') || ""),
            date_arrival_forecast: String(getVal(item, 'Data Chegada') || ""),
            date_start: String(getVal(item, 'Data Inicio') || ""),
            date_end: String(getVal(item, 'Data Fim') || ''),
            items: itemsList, 
          };
        });
      setContainers(mappedData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const uniqueSuppliers = useMemo(() => {
    const s = new Set(containers.map(c => c.supplier));
    return Array.from(s).sort();
  }, [containers]);

  const handleCreateOrder = async (data: CreateFormData) => {
    setIsSaving(true);
    const payload = {
      action: "create",
      "Id": data.id,
      "Fornecedor": data.fornecedor,
      "Data Inicio": data.data_inicio,
      "Data Fim": data.data_fim,
      "Status": "Planejamento",
      "Prioridade": "Normal",
      "Item 1 Desc": data.items[0]?.desc || '',
      "Item 1 Qtd": data.items[0]?.qtd || '',
      "Item 1 M3": data.items[0]?.m3 || '',
      "Item 2 Desc": data.items[1]?.desc || '',
      "Item 2 Qtd": data.items[1]?.qtd || '',
      "Item 2 M3": data.items[1]?.m3 || '',
      "Item 3 Desc": data.items[2]?.desc || '',
      "Item 3 Qtd": data.items[2]?.qtd || '',
      "Item 3 M3": data.items[2]?.m3 || '',
      "Itens Extras": "[]"
    };
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast("Programação Enviada!", "success");
      setIsCreateModalOpen(false);
      setTimeout(fetchData, 4500); 
    } catch (err) {
      showToast("Erro ao criar.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveModalData = async (id: string, formData: ShipmentFormData, isReceive: boolean) => {
    setIsSaving(true);
    const payload = {
      action: "update",
      id: normalizeId(id),
      "Nf": formData.nf,
      "Data Coleta": formData.date_pickup,
      "Data Chegada": formData.date_arrival, 
      "Status": isReceive ? "Entregue" : "Em Trânsito",
      "Item 1 Real": formData.items_actual[0] || '',
      "Item 2 Real": formData.items_actual[1] || '',
      "Item 3 Real": formData.items_actual[2] || '',
      "Itens Extras": JSON.stringify(formData.extra_items)
    };
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast("Dados Atualizados!", "success");
      setIsModalOpen(false);
      setTimeout(fetchData, 4000);
    } catch (err) {
      showToast("Erro ao salvar.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Deseja realmente excluir o container ${id}?`)) return;
    setIsSaving(true);
    const payload = { action: "update", id: normalizeId(id), "Status": "Excluido" };
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast("Item Excluído!", "success");
      setTimeout(fetchData, 3000);
    } catch (err) {
      showToast("Erro ao excluir.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredContainers = useMemo(() => {
    return containers.filter(c => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        c.id.toLowerCase().includes(searchLower) || 
        c.nf?.toLowerCase().includes(searchLower) ||
        c.supplier?.toLowerCase().includes(searchLower);
        
      const matchesSupplier = supplierFilter === 'all' || c.supplier === supplierFilter;
      
      return matchesSearch && matchesSupplier;
    });
  }, [containers, searchQuery, supplierFilter]);

  const renderColumn = (title: string, status: 'planning' | 'transit' | 'yard', Icon: React.ElementType) => {
    let items = filteredContainers.filter(c => c.status === status);
    items.sort((a, b) => {
      if (status === 'planning') return parseToTimestamp(a.date_end) - parseToTimestamp(b.date_end);
      if (status === 'transit') return parseToTimestamp(a.date_arrival_forecast) - parseToTimestamp(b.date_arrival_forecast);
      if (status === 'yard') return parseToTimestamp(b.date_arrival_forecast) - parseToTimestamp(a.date_arrival_forecast);
      return 0;
    });

    const isHiddenOnMobile = activeTab !== status;
    return (
      <div className={`flex flex-col h-full bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden ${isHiddenOnMobile ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/30 shrink-0">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${status === 'yard' ? 'text-emerald-500' : status === 'transit' ? 'text-cyan-500' : 'text-slate-500'}`} />
            <h2 className="font-bold text-slate-200 text-sm tracking-wide uppercase">{title}</h2>
          </div>
          <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">{items.length}</span>
        </div>
        <div className="flex-1 p-2 overflow-y-auto space-y-2 custom-scrollbar pb-32 md:pb-2">
          {items.map(c => (
            <ContainerCard 
              key={c.id} 
              container={c} 
              isAdmin={viewMode === 'admin'} 
              onRegisterShipment={(id) => { setSelectedContainerId(id); setModalMode('shipment'); setIsModalOpen(true); }} 
              onDelete={handleDelete} 
              onReceive={(id) => { setSelectedContainerId(id); setModalMode('receive'); setIsModalOpen(true); }} 
              onViewDetails={(id) => { setSelectedContainerId(id); setIsDetailsOpen(true); }} 
            />
          ))}
        </div>
      </div>
    );
  };

  if (currentView === 'dashboard') return <DashboardView containers={containers} onBack={() => setCurrentView('ops')} />;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden relative">
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-top-4">
          <div className={`px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 backdrop-blur-md ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
            <Info className="w-5 h-5" /><p className="text-sm font-bold uppercase">{notification.message}</p>
          </div>
        </div>
      )}

      {(isSaving || loading) && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl flex flex-col items-center gap-4">
             <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
             <p className="text-sm font-black text-white uppercase tracking-widest">{isSaving ? "Sincronizando..." : "Carregando..."}</p>
          </div>
        </div>
      )}

      <header className="flex flex-col shrink-0 z-20 shadow-2xl bg-slate-950">
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/60 bg-slate-950">
          <div className="flex items-center gap-5">
            <img src={LOGO_URL} alt="Logo" className="h-10 w-auto" />
            <div className="h-8 w-px bg-slate-800/80" />
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Controle de Containers</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchData} 
              title="Sincronizar Dados"
              className="p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 rounded-xl transition-all active:scale-90"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => viewMode === 'admin' ? setViewMode('director') : setIsPasswordModalOpen(true)} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-[10px] font-black transition-all shadow-lg active:scale-95 ${viewMode === 'admin' ? 'bg-rose-500 text-white border-rose-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            >
              <LayoutGrid className="w-4 h-4" />
              {viewMode === 'admin' ? 'ADMIN ATIVO' : 'MODO DIRETOR'}
            </button>
          </div>
        </div>
        <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800/80 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentView('dashboard')} 
              className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-cyan-400 border border-slate-700/50 px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Indicadores</span>
            </button>
            {viewMode === 'admin' && (
              <button 
                onClick={() => setIsCreateModalOpen(true)} 
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 border border-emerald-500/30"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Nova Carga</span>
              </button>
            )}
          </div>
          <div className="h-6 w-px bg-slate-800/50 hidden lg:block" />
          <div className="flex-1 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-lg group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Pesquisar ID, NF ou Fornecedor..." 
                className="w-full bg-slate-950/40 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold text-white focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/5 outline-none transition-all placeholder:text-slate-600 shadow-inner" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
            <div className="relative min-w-[240px]">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Filter className="w-4 h-4 text-slate-500" />
              </div>
              <select 
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full bg-slate-950/40 border border-slate-800 rounded-xl pl-11 pr-10 py-2.5 text-[10px] font-black uppercase text-slate-300 appearance-none cursor-pointer focus:border-cyan-500/50 outline-none transition-all hover:bg-slate-900 shadow-inner"
              >
                <option value="all">TODOS OS FORNECEDORES</option>
                {uniqueSuppliers.map(s => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <User className="w-4 h-4 text-slate-600" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {!error && (
        <>
          <nav className="flex md:hidden bg-slate-900 border-b border-slate-800 px-2 py-2 shrink-0 z-10 gap-1.5">
            <button onClick={() => setActiveTab('planning')} className={`flex-1 flex flex-col items-center py-2 rounded-xl border ${activeTab === 'planning' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}><Calendar className="w-5 h-5 mb-1" /><span className="text-[8px] font-black uppercase">Plan</span></button>
            <button onClick={() => setActiveTab('transit')} className={`flex-1 flex flex-col items-center py-2 rounded-xl border ${activeTab === 'transit' ? 'bg-cyan-950/30 text-cyan-400' : 'text-slate-500'}`}><Ship className="w-5 h-5 mb-1" /><span className="text-[8px] font-black uppercase">Trans</span></button>
            <button onClick={() => setActiveTab('yard')} className={`flex-1 flex flex-col items-center py-2 rounded-xl border ${activeTab === 'yard' ? 'bg-emerald-950/30 text-emerald-400' : 'text-slate-500'}`}><CheckCircle2 className="w-5 h-5 mb-1" /><span className="text-[8px] font-black uppercase">Patio</span></button>
          </nav>
          <main className="flex-1 overflow-hidden p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-full max-w-[1700px] mx-auto w-full">
                {renderColumn('PLANEJAMENTO', 'planning', Calendar)}
                {renderColumn('EM TRÂNSITO', 'transit', Ship)}
                {renderColumn('PÁTIO / ENTREGUE', 'yard', CheckCircle2)}
              </div>
          </main>
        </>
      )}

      {error && !loading && (
        <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center text-center">
           <ShieldAlert className="w-12 h-12 text-rose-500 mb-6" />
           <h2 className="text-xl font-black text-white uppercase mb-2">Erro de Conexão</h2>
           <p className="text-sm text-rose-400 max-w-md mb-8">{error}</p>
           <button onClick={fetchData} className="bg-rose-600 text-white font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-2xl active:scale-95">Tentar Novamente</button>
        </div>
      )}

      <RegisterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} container={containers.find(c => c.id === selectedContainerId)} onSave={handleSaveModalData} isSaving={isSaving} mode={modalMode} />
      <DetailsModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} container={containers.find(c => c.id === selectedContainerId)} />
      <CreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSave={handleCreateOrder} isSaving={isSaving} existingContainers={containers} />
      <PasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} onSuccess={() => setViewMode('admin')} />
    </div>
  );
};

export default App;
