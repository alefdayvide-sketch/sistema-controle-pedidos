
import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw,
  PlusCircle,
  Calendar,
  CheckCircle2,
  LogOut,
  LogIn,
  BarChart3,
  Ship
} from 'lucide-react';
import ContainerCard from './components/ContainerCard';
import RegisterModal from './components/RegisterModal';
import CreateModal from './components/CreateModal';
import PasswordModal from './components/PasswordModal';
import DashboardView from './components/DashboardView';
import DetailsModal from './components/DetailsModal';
import { Container, RawApiContainer, ShipmentFormData, CreateFormData, ContainerItem } from './types';
import { API_URL } from './constants';

const DRIVE_FILE_ID = "15ubzgKAvMV1hz-4PjWzfxi_iQmUVHPzU";
const LOGO_URL = `https://lh3.googleusercontent.com/d/${DRIVE_FILE_ID}`;

const normalizeId = (id: any): string => {
  if (!id) return '';
  return String(id).trim().replace(/\s+/g, '').toUpperCase();
};

const App: React.FC = () => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [currentView, setCurrentView] = useState<'ops' | 'dashboard'>('ops');
  const [activeTab, setActiveTab] = useState<'planning' | 'transit' | 'yard'>('planning');
  const [viewMode, setViewMode] = useState<'director' | 'admin'>(() => (localStorage.getItem('viewMode') as 'director' | 'admin') || 'director');
  
  // Modal States
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
    try {
      const response = await fetch(API_URL);
      const data: RawApiContainer[] = await response.json();
      
      if (!Array.isArray(data)) { setContainers([]); return; }

      const mappedData = data
        .filter(item => (item['Status'] || "") !== "Excluído")
        .map((item): Container => {
          const rawStatus = item['Status'] || "";
          let status: Container['status'] = 'planning';
          if (rawStatus === "Em Trânsito") status = 'transit';
          else if (rawStatus === "Entregue") status = 'yard';

          const itemsList: ContainerItem[] = [];
          
          if (item['Item 1 Desc']) itemsList.push({ desc: item['Item 1 Desc'], qtd: String(item['Item 1 Qtd'] || ''), real: String(item['Item 1 Real'] || ''), m3: String(item['Item 1 M3'] || '') });
          if (item['Item 2 Desc']) itemsList.push({ desc: item['Item 2 Desc'], qtd: String(item['Item 2 Qtd'] || ''), real: String(item['Item 2 Real'] || ''), m3: String(item['Item 2 M3'] || '') });
          if (item['Item 3 Desc']) itemsList.push({ desc: item['Item 3 Desc'], qtd: String(item['Item 3 Qtd'] || ''), real: String(item['Item 3 Real'] || ''), m3: String(item['Item 3 M3'] || '') });

          const rawExtras = String(item['Itens Extras'] || "").trim();
          if (rawExtras && (rawExtras.startsWith('[') || rawExtras.startsWith('{'))) {
             try {
                const extrasJson = JSON.parse(rawExtras);
                if (Array.isArray(extrasJson)) {
                  extrasJson.forEach((ex: any) => {
                    itemsList.push({ ...ex, real: ex.real || ex.qtd, isExtra: true });
                  });
                }
             } catch(e) { console.error("Erro ao processar JSON de extras", e); }
          }

          return {
            ...item,
            id: normalizeId(item['Id'] || item['id']),
            supplier: item['Fornecedor'],
            status: status,
            priority: item['Prioridade'],
            measures_requested: item['Material Solicitado'] || "",
            measures_actual: item['Material Embarcado'] || "",
            nf: item['Nf'] || "",
            date_pickup: item['Data Coleta'] || "",
            date_arrival_forecast: item['Data Chegada'] || "",
            date_start: item['Data Inicio'] || item['Data Início'] || '',
            date_end: item['Data Fim'] || '',
            items: itemsList, 
          };
        });

      setContainers(mappedData);
    } catch (err) {
      showToast("Erro ao carregar dados.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveModalData = async (id: string, formData: ShipmentFormData, isReceive: boolean) => {
    setIsSaving(true);
    const cleanId = normalizeId(id);
    const targetStatus = isReceive ? "Entregue" : "Em Trânsito";
    const extrasJsonString = formData.extra_items.length > 0 ? JSON.stringify(formData.extra_items) : '';
    
    const payload = {
      action: "update",
      id: cleanId,
      "Nf": formData.nf,
      "Data Coleta": formData.date_pickup,
      "Data Chegada": formData.date_arrival, 
      "Status": targetStatus,
      "Itens Extras": extrasJsonString, 
      "Item 1 Real": formData.items_actual[0] || '',
      "Item 2 Real": formData.items_actual[1] || '',
      "Item 3 Real": formData.items_actual[2] || ''
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (result.result === "success") {
        showToast("Dados salvos com sucesso!", "success");
        setIsModalOpen(false);
        fetchData(); 
      } else { throw new Error(result.message); }
    } catch (err) {
      showToast(`Erro de conexão com a planilha.`, "error");
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
      "Item 3 M3": data.items[2]?.m3 || ''
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      if ((await response.json()).result === "success") {
        showToast("Programação criada!", "success");
        setIsCreateModalOpen(false); 
        fetchData();
      }
    } catch (err) {
      showToast("Erro ao criar.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContainer = async (id: string) => {
    const cleanId = normalizeId(id);
    if (!cleanId || !window.confirm(`Excluir permanentemente ${cleanId}?`)) return;
    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "delete", id: cleanId, "Status": "Excluído" })
      });
      showToast("Removido com sucesso!", "success");
      fetchData();
    } catch (err) { showToast("Erro ao excluir.", "error"); }
  };

  const selectedContainer = containers?.find(c => c.id === selectedContainerId);

  const renderColumn = (title: string, status: 'planning' | 'transit' | 'yard', Icon: React.ElementType) => {
    let items = containers.filter(c => c.status === status);
    if (status === 'planning') items.sort((a, b) => (a.date_end || '').localeCompare(b.date_end || ''));
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
          {items.length === 0 ? (
            <div className="h-24 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-lg bg-slate-900/20 text-xs italic">Sem registros</div>
          ) : (
            items.map(container => (
              <ContainerCard 
                key={container.id} 
                container={container} 
                isAdmin={viewMode === 'admin'} 
                onRegisterShipment={handleOpenRegister} 
                onDelete={handleDeleteContainer} 
                onReceive={handleOpenReceive}
                onViewDetails={handleOpenDetails}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  const handleOpenRegister = (id: string) => { setSelectedContainerId(id); setModalMode('shipment'); setIsModalOpen(true); };
  const handleOpenReceive = (id: string) => { setSelectedContainerId(id); setModalMode('receive'); setIsModalOpen(true); };
  const handleOpenDetails = (id: string) => { setSelectedContainerId(id); setIsDetailsOpen(true); };

  if (currentView === 'dashboard') return <DashboardView containers={containers} onBack={() => setCurrentView('ops')} />;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden relative">
      {notification && (
        <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 border
          ${notification.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400' : notification.type === 'error' ? 'bg-rose-500/90 text-white border-rose-400' : 'bg-slate-800/90 text-cyan-400 border-cyan-500/30'}
        `}>
          <span className="text-sm font-bold">{notification.message}</span>
        </div>
      )}

      <header className="h-14 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-4 shrink-0 z-20 shadow-xl">
        <div className="flex items-center gap-2">
          <img src={LOGO_URL} alt="Logo" className="h-8 w-auto object-contain" />
          <h1 className="font-bold text-sm sm:text-base text-white hidden xs:block">Controle de Pedidos</h1>
          <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border border-slate-700 transition-all ml-2"><BarChart3 className="w-4 h-4 text-cyan-400" /> <span className="hidden sm:inline">DASHBOARD</span></button>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          {viewMode === 'admin' && (
            <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all"><PlusCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">NOVO</span></button>
          )}
          <button onClick={fetchData} disabled={loading} className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={() => viewMode === 'admin' ? setViewMode('director') : setIsPasswordModalOpen(true)} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] sm:text-xs font-bold transition-all ${viewMode === 'admin' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
            {viewMode === 'admin' ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
            <span>ADMIN</span>
          </button>
        </div>
      </header>

      <nav className="flex md:hidden bg-slate-900 border-b border-slate-800 px-2 py-2 shrink-0 z-10 gap-1.5">
        <button onClick={() => setActiveTab('planning')} className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl border ${activeTab === 'planning' ? 'bg-slate-800 border-slate-600 text-white' : 'border-transparent text-slate-500'}`}><Calendar className="w-5 h-5 mb-1" /><span className="text-[8px] font-extrabold uppercase">Planejamento</span></button>
        <button onClick={() => setActiveTab('transit')} className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl border ${activeTab === 'transit' ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-400' : 'border-transparent text-slate-500'}`}><Ship className="w-5 h-5 mb-1" /><span className="text-[8px] font-extrabold uppercase">Em Trânsito</span></button>
        <button onClick={() => setActiveTab('yard')} className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl border ${activeTab === 'yard' ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400' : 'border-transparent text-slate-500'}`}><CheckCircle2 className="w-5 h-5 mb-1" /><span className="text-[8px] font-extrabold uppercase">Pátio</span></button>
      </nav>

      <main className="flex-1 overflow-hidden p-3 sm:p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 h-full max-w-[1600px] mx-auto w-full">
          {renderColumn('PLANEJAMENTO', 'planning', Calendar)}
          {renderColumn('EM TRÂNSITO', 'transit', Ship)}
          {renderColumn('PÁTIO / ENTREGUE', 'yard', CheckCircle2)}
        </div>
      </main>

      <RegisterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} container={selectedContainer} onSave={handleSaveModalData} isSaving={isSaving} mode={modalMode} />
      <DetailsModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} container={selectedContainer} />
      <CreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSave={handleCreateContainer} isSaving={isSaving} existingContainers={containers} />
      <PasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} onSuccess={() => setViewMode('admin')} />
    </div>
  );
};

export default App;
