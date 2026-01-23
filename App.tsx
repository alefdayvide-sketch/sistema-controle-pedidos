
import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, PlusCircle, Calendar, CheckCircle2, BarChart3, Ship, Filter, X, Loader2, ExternalLink, Terminal, ShieldAlert, Info, Check, AlertCircle, Plus
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

const App: React.FC = () => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [currentView, setCurrentView] = useState<'ops' | 'dashboard'>('ops');
  const [activeTab, setActiveTab] = useState<'planning' | 'transit' | 'yard'>('planning');
  const [viewMode, setViewMode] = useState<'director' | 'admin'>(() => (localStorage.getItem('viewMode') as 'director' | 'admin') || 'director');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  
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
    setDebugInfo(null);
    const startTime = Date.now();
    
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow'
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`Google API erro: ${response.status}`);
      }

      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (e) {
        setDebugInfo({ status: response.status, latency: `${latency}ms`, preview: text.substring(0, 100) });
        if (text.includes("<!DOCTYPE html>")) throw new Error("Acesso Negado: O script exige login. Verifique se publicou como 'Qualquer Pessoa'.");
        throw new Error("O Google não retornou um JSON válido.");
      }
      
      if (!Array.isArray(data)) throw new Error("Formato de dados inválido na planilha.");

      const mappedData = data
        .filter(item => {
          const status = normalizeStr(getVal(item, 'Status'));
          return status !== "excluido";
        })
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
                m3: String(getVal(item, `Item ${i} M3`) || '')
              });
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
      setError(err.message === "Failed to fetch" 
        ? "Erro de Conexão: O navegador bloqueou o acesso ao Google. Verifique se o link está correto e se o script foi publicado como 'Qualquer Pessoa'." 
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
    };

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload)
      });
      showToast("Programação cadastrada!", "success");
      setTimeout(fetchData, 2500);
      setIsCreateModalOpen(false);
    } catch (err) {
      showToast("Erro ao criar pedido.", "error");
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
      "Item 3 Real": formData.items_actual[2] || ''
    };

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload)
      });
      showToast("Dados enviados com sucesso!", "success");
      setTimeout(fetchData, 2500);
      setIsModalOpen(false);
    } catch (err) {
      showToast("Erro ao salvar alterações.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenRegister = (id: string) => { setSelectedContainerId(id); setModalMode('shipment'); setIsModalOpen(true); };
  const handleOpenReceive = (id: string) => { setSelectedContainerId(id); setModalMode('receive'); setIsModalOpen(true); };
  const handleOpenDetails = (id: string) => { setSelectedContainerId(id); setIsDetailsOpen(true); };

  const filteredContainers = useMemo(() => {
    return containers.filter(c => {
      const matchSupplier = selectedSupplierFilter === 'TODOS' || c.supplier === selectedSupplierFilter;
      const searchLower = searchQuery.toLowerCase();
      return matchSupplier && (!searchQuery || 
        c.id.toLowerCase().includes(searchLower) || 
        (c.nf && c.nf.toLowerCase().includes(searchLower)) ||
        (c.supplier && c.supplier.toLowerCase().includes(searchLower)));
    });
  }, [containers, selectedSupplierFilter, searchQuery]);

  const suppliersList = useMemo(() => {
    const s = new Set(containers.map(c => c.supplier).filter(Boolean));
    return ['TODOS', ...Array.from(s).sort()];
  }, [containers]);

  const renderColumn = (title: string, status: 'planning' | 'transit' | 'yard', Icon: React.ElementType) => {
    let items = filteredContainers.filter(c => c.status === status);
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
          {items.map(container => (
            <ContainerCard 
              key={container.id} 
              container={container} 
              isAdmin={viewMode === 'admin'} 
              onRegisterShipment={handleOpenRegister} 
              onDelete={() => {}} 
              onReceive={handleOpenReceive} 
              onViewDetails={handleOpenDetails} 
            />
          ))}
        </div>
      </div>
    );
  };

  const selectedContainer = containers?.find(c => c.id === selectedContainerId);

  if (currentView === 'dashboard') return <DashboardView containers={containers} onBack={() => setCurrentView('ops')} />;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden relative">
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 min-w-[300px] backdrop-blur-md ${
            notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            notification.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
            'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
          }`}>
            {notification.type === 'success' ? <Check className="w-5 h-5" /> : 
             notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> : 
             <Info className="w-5 h-5" />}
            <p className="text-sm font-bold uppercase tracking-tight">{notification.message}</p>
          </div>
        </div>
      )}

      {(isSaving || loading) && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center">
             <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
             <p className="text-sm font-black text-white uppercase tracking-widest">Sincronizando com Google...</p>
          </div>
        </div>
      )}

      <header className="h-14 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-4 shrink-0 z-20 shadow-xl">
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Logo" className="h-8 w-auto object-contain" />
            <h1 className="hidden sm:block font-bold text-sm text-white">Controle de Pedidos</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentView('dashboard')} 
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 px-3 py-1.5 rounded-lg transition-all shadow-lg shadow-slate-950/50 group"
            >
              <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="hidden md:block text-[10px] font-black uppercase tracking-wider">Dashboard</span>
            </button>

            {viewMode === 'admin' && (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-all shadow-lg shadow-emerald-900/20 group border border-emerald-500/50"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                <span className="hidden md:block text-[10px] font-black uppercase tracking-wider">Novo Pedido</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={() => viewMode === 'admin' ? setViewMode('director') : setIsPasswordModalOpen(true)} className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold ${viewMode === 'admin' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-slate-800 text-slate-400'}`}>
            {viewMode === 'admin' ? 'ADMIN ON' : 'ADMIN OFF'}
          </button>
        </div>
      </header>

      {!error && (
        <>
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-col gap-2 shrink-0">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
              <Filter className="w-3 h-3 text-slate-500 shrink-0" />
              <div className="flex items-center gap-1.5">
                {suppliersList.map(sup => (
                  <button key={sup} onClick={() => setSelectedSupplierFilter(sup)} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border ${selectedSupplierFilter === sup ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    {sup}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <nav className="flex md:hidden bg-slate-900 border-b border-slate-800 px-2 py-2 shrink-0 z-10 gap-1.5">
            <button onClick={() => setActiveTab('planning')} className={`flex-1 flex flex-col items-center py-2 rounded-xl ${activeTab === 'planning' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}><Calendar className="w-5 h-5 mb-1" /><span className="text-[8px] font-bold uppercase">Plan</span></button>
            <button onClick={() => setActiveTab('transit')} className={`flex-1 flex flex-col items-center py-2 rounded-xl ${activeTab === 'transit' ? 'bg-cyan-950/30 text-cyan-400' : 'text-slate-500'}`}><Ship className="w-5 h-5 mb-1" /><span className="text-[8px] font-bold uppercase">Trans</span></button>
            <button onClick={() => setActiveTab('yard')} className={`flex-1 flex flex-col items-center py-2 rounded-xl ${activeTab === 'yard' ? 'bg-emerald-950/30 text-emerald-400' : 'text-slate-500'}`}><CheckCircle2 className="w-5 h-5 mb-1" /><span className="text-[8px] font-bold uppercase">Patio</span></button>
          </nav>

          <main className="flex-1 overflow-hidden p-3 sm:p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 h-full max-w-[1600px] mx-auto w-full">
                {renderColumn('PLANEJAMENTO', 'planning', Calendar)}
                {renderColumn('EM TRÂNSITO', 'transit', Ship)}
                {renderColumn('PÁTIO / ENTREGUE', 'yard', CheckCircle2)}
              </div>
          </main>
        </>
      )}

      {error && !loading && (
        <div className="flex-1 overflow-y-auto bg-slate-900/80 backdrop-blur-xl p-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
           <div className="bg-rose-500/10 p-5 rounded-full mb-6 border border-rose-500/20">
             <ShieldAlert className="w-12 h-12 text-rose-500" />
           </div>
           <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Erro de Sincronização</h2>
           <p className="text-sm text-rose-400 font-medium max-w-md mb-8">{error}</p>
           
           <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg">
             <button onClick={fetchData} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs">Tentar Novamente</button>
             <a href={API_URL} target="_blank" rel="noopener noreferrer" className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-4 rounded-2xl border border-slate-700 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
               <ExternalLink className="w-4 h-4" /> Link da API
             </a>
           </div>
        </div>
      )}

      <RegisterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} container={selectedContainer} onSave={handleSaveModalData} isSaving={isSaving} mode={modalMode} />
      <DetailsModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} container={selectedContainer} />
      <CreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSave={handleCreateOrder} isSaving={isSaving} existingContainers={containers} />
      <PasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} onSuccess={() => setViewMode('admin')} />
    </div>
  );
};

export default App;
