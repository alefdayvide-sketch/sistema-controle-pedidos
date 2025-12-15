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
  LogIn
} from 'lucide-react';
import ContainerCard from './ContainerCard';
import RegisterModal from './RegisterModal';
import CreateModal from './CreateModal';
import PasswordModal from './PasswordModal';
import { Container, RawApiContainer, ShipmentFormData, CreateFormData } from './types';
import { API_URL } from './constants';

const DRIVE_FILE_ID = "15ubzgKAvMV1hz-4PjWzfxi_iQmUVHPzU";
const LOGO_URL = `https://lh3.googleusercontent.com/d/${DRIVE_FILE_ID}`;

const App: React.FC = () => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<'director' | 'admin'>(() => {
    return (localStorage.getItem('viewMode') as 'director' | 'admin') || 'director';
  });

  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL);
      const data: RawApiContainer[] = await response.json();
      
      if (!Array.isArray(data)) {
        console.error("API returned invalid format:", data);
        setContainers([]); 
        return;
      }

      // SOFT DELETE FILTER: 
      // Ignora qualquer registro que o Google Apps Script tenha marcado como "Excluído"
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
        const robustId = item['Id'] || item['id'] || `TEMP-${Math.random().toString(36).substr(2,9)}`;

        return {
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
          ...item 
        };
      });

      setContainers(mappedData);
    } catch (err) {
      console.error(err);
      setError("Falha ao carregar dados do sistema. Verifique sua conexão.");
      setContainers([]); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const safeContainers = Array.isArray(containers) ? containers : [];
    return {
      planning: safeContainers.filter(c => c.status === 'planning').length,
      transit: safeContainers.filter(c => c.status === 'transit').length,
      divergences: safeContainers.filter(c => 
        c.items && c.items.some(i => i.real && i.real !== i.desc)
      ).length
    };
  }, [containers]);

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
    setIsModalOpen(true);
  };

  // --- SECURITY & MODE SWITCHING ---
  const handleSwitchModeClick = () => {
    if (viewMode === 'admin') {
      // Se é admin, sai diretamente
      setViewMode('director');
    } else {
      // Se é director, abre modal de senha
      setIsPasswordModalOpen(true);
    }
  };

  const handleAdminSuccess = () => {
    setViewMode('admin');
  };

  // --- DELETE FUNCTION: LÓGICA RÍGIDA DE SOFT DELETE ---
  const handleDeleteContainer = async (id: string) => {
    const cleanId = String(id ?? "").trim();

    if (!cleanId) {
      alert("Erro: ID inválido para exclusão.");
      return;
    }

    // Confirmação do usuário
    if (!window.confirm(`ATENÇÃO: Deseja realmente excluir o container ${cleanId}?\nEsta ação moverá o status para 'Excluído'.`)) {
      return;
    }

    try {
      // FIX CRÍTICO: headers 'text/plain' evita Preflight CORS do Google Apps Script
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "delete", id: cleanId })
      });

      const result = await response.json();

      // Validação estrita da resposta
      if (result?.result !== "success") {
        alert(`Não foi possível excluir.\nMotivo: ${result?.message || result?.error || "erro desconhecido"}`);
        await fetchData(); // Recarrega para garantir consistência
        return;
      }

      // Sucesso: Recarrega a lista. Como o status agora é "Excluído", o filtro do fetchData fará o card sumir.
      await fetchData();

    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao excluir. Recarregando dados.");
      await fetchData();
    }
  };

  const handleReceiveContainer = async (id: string) => {
      const cleanId = String(id ?? "").trim();
      
      if (!window.confirm(`Confirmar recebimento do container ${cleanId} no pátio?`)) {
          return;
      }

      setLoading(true);
      try {
          const response = await fetch(API_URL, {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({ action: "receive", id: cleanId })
          });

          const result = await response.json();

          if (result?.result !== "success" && result?.result !== "updated") {
              // Fallback: Se o backend não suportar 'receive', tentamos entender o erro, mas exibimos msg
              alert(`Atenção: O sistema respondeu: ${result?.message || "Erro desconhecido"}`);
          }
          
          await fetchData();
      } catch (err) {
          console.error(err);
          alert("Erro de conexão ao receber carga.");
      } finally {
          setLoading(false);
      }
  };

  const handleSaveShipment = async (id: string, formData: ShipmentFormData) => {
    setIsSaving(true);
    const currentContainer = containers.find(c => c.id === id);
    const actionType = currentContainer?.status === 'transit' ? 'edit' : 'update';
    const cleanId = String(id).trim();

    const payload = {
      action: actionType,
      id: cleanId,
      nf: formData.nf,
      data_coleta: formData.date_pickup,
      data_chegada: formData.date_arrival,
      item1_real: formData.items_actual[0] || '',
      item2_real: formData.items_actual[1] || '',
      item3_real: formData.items_actual[2] || ''
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (result.result !== "updated" && result.result !== "edit" && result.result !== "success") {
        throw new Error(result.error || result.message || "Erro ao salvar");
      }
      
      await fetchData();
      setIsModalOpen(false);
    } catch (err) {
      alert(`Erro: ${err instanceof Error ? err.message : String(err)}`);
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
      id: data.id,
      fornecedor: data.fornecedor,
      data_inicio: data.data_inicio,
      data_fim: data.data_fim,
      data_chegada: "", 
      total_m3: totalM3.toFixed(2),
      item1_desc: data.items[0]?.desc || '',
      item1_qtd: data.items[0]?.qtd || '',
      item1_m3: data.items[0]?.m3 || '',
      item2_desc: data.items[1]?.desc || '',
      item2_qtd: data.items[1]?.qtd || '',
      item2_m3: data.items[1]?.m3 || '',
      item3_desc: data.items[2]?.desc || '',
      item3_qtd: data.items[2]?.qtd || '',
      item3_m3: data.items[2]?.m3 || '',
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      // FIX: Aceitar tanto "created" quanto "success" como retorno válido
      if (result.result !== "created" && result.result !== "success") {
        throw new Error(result.error || result.message || "Erro ao criar");
      }

      await fetchData();
      setIsCreateModalOpen(false); // Fecha o modal com sucesso
    } catch (err) {
      alert(`Erro: ${err instanceof Error ? err.message : String(err)}`);
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
      
      const parseDate = (dateStr: string | undefined | null) => {
        if (!dateStr) return null;
        const s = String(dateStr).trim();
        if (s.includes('-')) {
          const parts = s.split('T')[0].split('-');
          if (parts.length === 3) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
        }
        if (s.includes('/')) {
          const parts = s.split('/');
          if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 0, 0, 0, 0);
        }
        return null;
      };

      items.sort((a, b) => {
        const startA = parseDate(a.date_start);
        const endA = parseDate(a.date_end);
        const startB = parseDate(b.date_start);
        const endB = parseDate(b.date_end);

        const getWeight = (c: Container, s: Date | null, e: Date | null) => {
          if (!e) return 3; 
          if (today.getTime() > e.getTime()) return 0; 
          if ((!s || today.getTime() >= s.getTime()) && today.getTime() <= e.getTime()) return 1; 
          return 2; 
        };

        const weightA = getWeight(a, startA, endA);
        const weightB = getWeight(b, startB, endB);

        if (weightA !== weightB) return weightA - weightB;
        return (a.date_end || '').localeCompare(b.date_end || '');
      });
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
            <div className="h-24 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-lg bg-slate-900/20">
              <p className="text-xs">Vazio</p>
            </div>
          ) : (
            items.map(container => (
              <div key={container.id} className="w-full">
                <ContainerCard 
                  container={container} 
                  isAdmin={viewMode === 'admin'}
                  onRegisterShipment={handleOpenRegister}
                  onDelete={handleDeleteContainer}
                  onReceive={handleReceiveContainer}
                />
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>

      <header className="h-14 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-4 shrink-0 z-20 shadow-xl shadow-black/40">
        <div className="flex items-center gap-3">
          <div className="h-9 flex items-center justify-start">
            <img src={LOGO_URL} alt="Logo" className="h-full w-auto object-contain drop-shadow-lg" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-base text-white leading-tight">Controle de Pedidos</h1>
          </div>
          
          {viewMode === 'admin' && (
            <>
              <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block"></div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-cyan-900/20 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">NOVA PROGRAMAÇÃO</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={fetchData} 
            disabled={loading}
            className="p-2 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={loading ? "Atualizando..." : "Atualizar Dados"}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <div className="relative hidden md:block">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select 
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg pl-9 pr-3 py-2 focus:ring-1 focus:ring-cyan-500 outline-none appearance-none cursor-pointer hover:border-slate-600 transition-colors"
            >
              <option value="all">Todos Fornecedores</option>
              {suppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSwitchModeClick}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all
              ${viewMode === 'admin' 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300 hover:bg-slate-800'
              }
            `}
            title={viewMode === 'admin' ? "Sair do modo Admin" : "Acessar modo Admin"}
          >
            {viewMode === 'admin' ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {viewMode === 'admin' ? 'SAIR ADMIN' : 'ACESSAR ADMIN'}
            </span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-4 relative">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-500/90 text-white px-4 py-2 rounded-lg shadow-xl text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-4">
            <AlertOctagon className="w-4 h-4" />
            {error}
            <button onClick={fetchData} className="ml-2 underline hover:text-rose-100">Tentar novamente</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full max-w-[1600px] mx-auto w-full">
          {renderColumn('PLANEJAMENTO', 'planning', Calendar, 'border-slate-500/30')}
          {renderColumn('EM TRÂNSITO', 'transit', Ship, 'border-cyan-500/30')}
          {renderColumn('PÁTIO / ENTREGUE', 'yard', CheckCircle2, 'border-emerald-500/30')}
        </div>
      </main>

      <RegisterModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        container={selectedContainer}
        onSave={handleSaveShipment}
        isSaving={isSaving}
      />

      <CreateModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateContainer}
        isSaving={isSaving}
        existingContainers={containers}
      />

      <PasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handleAdminSuccess}
      />
    </div>
  );
};

export default App;
