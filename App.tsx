
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, Schedule, ScheduleStatus, AppState, TransferHistory } from './types';
import { COMPANY_NAME, ICONS, COMMISSION_RATE } from './constants';
import { generateAppointmentReceipt, generatePDF } from './services/pdfService';

// --- Funções Utilitárias ---

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const getGoogleMapsUrl = (address: string, number?: string) => {
  const query = encodeURIComponent(`${address}, ${number || ''}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

const roleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.TECHNICIAN]: 'Técnico',
  [UserRole.ATTENDANT]: 'Atendente'
};

const statusLabels: Record<ScheduleStatus, string> = {
  [ScheduleStatus.PENDING]: 'Aguardando',
  [ScheduleStatus.ACCEPTED]: 'Em Andamento',
  [ScheduleStatus.CONCLUDED]: 'Concluído',
  [ScheduleStatus.RESCHEDULED]: 'Reagendado',
  [ScheduleStatus.CANCELLED]: 'Cancelado'
};

// --- Componentes de Interface ---

const Input: React.FC<{
  label: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  multiline?: boolean;
}> = ({ label, type = 'text', value, onChange, placeholder, required, options, multiline }) => (
  <div className="mb-3 text-left">
    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">{label}</label>
    {options ? (
      <select value={value} onChange={onChange} required={required} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none transition-all bg-white text-xs font-bold appearance-none">
        <option value="">Selecione...</option>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    ) : multiline ? (
      <textarea value={value} onChange={onChange} placeholder={placeholder} required={required} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none text-xs font-bold resize-none" />
    ) : (
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none text-xs font-bold" />
    )}
  </div>
);

const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'warning' | 'ghost';
  fullWidth?: boolean;
  className?: string;
  small?: boolean;
  disabled?: boolean;
}> = ({ children, onClick, type = 'button', variant = 'primary', fullWidth, className, small, disabled }) => {
  const variants = {
    primary: 'bg-sky-500 text-white hover:bg-sky-600',
    secondary: 'bg-slate-500 text-white hover:bg-slate-600',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600',
    warning: 'bg-amber-500 text-white hover:bg-amber-600',
    outline: 'border border-sky-500 text-sky-600 hover:bg-sky-50',
    ghost: 'bg-slate-50 text-slate-600 hover:bg-slate-100',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${small ? 'px-3 py-1.5' : 'px-5 py-2.5'} rounded-xl font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}>
      {children}
    </button>
  );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-[11px] font-black text-slate-800 uppercase italic tracking-wider">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 p-1">✕</button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[80vh]">{children}</div>
      </div>
    </div>
  );
};

// --- Aplicação Principal ---

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('click_geomaqui_v28');
    if (saved) return JSON.parse(saved);
    return {
      users: [{ id: 'admin-1', name: 'Administrador Principal', email: 'admin@click.com', password: '123', role: UserRole.ADMIN, ratingCount: 0, ratingSum: 0 }],
      schedules: [], sales: [], expenses: [], commissionPayments: [], currentUser: null, notifications: []
    };
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedules' | 'staff'>('dashboard');
  const [modals, setModals] = useState({ 
    schedule: false, successReceipt: false, addUser: false, transfer: false, conclude: false, reschedule: false
  });
  
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | 'ALL'>('ALL');
  const [isAuthMode, setIsAuthMode] = useState<'login' | 'register'>('login');

  // Formulários
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', role: UserRole.TECHNICIAN });
  const [scheduleForm, setScheduleForm] = useState({ clientName: '', clientPhone: '', clientAddress: '', clientNumber: '', date: '', time: '', technicianId: '', description: '' });
  const [concludeForm, setConcludeForm] = useState({ workDone: '', finalValue: '' });
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time: '' });
  const [transferForm, setTransferForm] = useState({ newTechId: '', reason: '' });

  useEffect(() => {
    localStorage.setItem('click_geomaqui_v28', JSON.stringify(state));
  }, [state]);

  const isAdmin = state.currentUser?.role === UserRole.ADMIN;
  const isTechnician = state.currentUser?.role === UserRole.TECHNICIAN;

  // --- Handlers ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = state.users.find(u => u.email === authForm.email && u.password === authForm.password);
    if (user) {
      setState(prev => ({ ...prev, currentUser: user }));
      setActiveTab(user.role === UserRole.ADMIN ? 'dashboard' : 'schedules');
    } else alert('E-mail ou senha incorretos.');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.users.some(u => u.email === authForm.email)) {
      alert('Este e-mail já está sendo utilizado.');
      return;
    }
    const newUser: User = {
      id: crypto.randomUUID(),
      name: authForm.name,
      email: authForm.email,
      password: authForm.password,
      role: authForm.role,
      ratingCount: 0,
      ratingSum: 0
    };
    setState(prev => ({ 
      ...prev, 
      users: [...prev.users, newUser],
      currentUser: newUser 
    }));
    setActiveTab(newUser.role === UserRole.ADMIN ? 'dashboard' : 'schedules');
  };

  const handleUpdateStatus = (id: string, status: ScheduleStatus) => {
    setState(prev => ({
      ...prev,
      schedules: prev.schedules.map(s => s.id === id ? { ...s, status } : s)
    }));
  };

  const handleConcludeOS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;
    const val = parseFloat(concludeForm.finalValue);
    if (isNaN(val)) return alert('Insira um valor numérico válido.');

    setState(prev => ({
      ...prev,
      schedules: prev.schedules.map(s => s.id === selectedSchedule.id ? { 
        ...s, 
        status: ScheduleStatus.CONCLUDED, 
        workDoneDescription: concludeForm.workDone, 
        finalValue: val,
        completionDate: new Date().toLocaleDateString('pt-BR')
      } : s)
    }));
    setModals({ ...modals, conclude: false });
    setConcludeForm({ workDone: '', finalValue: '' });
    alert('Visita finalizada com sucesso!');
  };

  const handleReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;
    setState(prev => ({
      ...prev,
      schedules: prev.schedules.map(s => s.id === selectedSchedule.id ? { 
        ...s, 
        status: ScheduleStatus.RESCHEDULED, 
        appointmentDate: rescheduleForm.date, 
        appointmentTime: rescheduleForm.time 
      } : s)
    }));
    setModals({ ...modals, reschedule: false });
    alert('Chamado reagendado.');
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;
    const newTech = state.users.find(u => u.id === transferForm.newTechId);
    if (!newTech) return;
    
    const transfer: TransferHistory = {
      fromId: state.currentUser!.id, fromName: state.currentUser!.name,
      toId: newTech.id, toName: newTech.name,
      reason: transferForm.reason, date: new Date().toLocaleDateString('pt-BR'), time: new Date().toLocaleTimeString('pt-BR')
    };

    setState(prev => ({
      ...prev,
      schedules: prev.schedules.map(s => s.id === selectedSchedule.id ? { 
        ...s, technicianId: newTech.id, transfers: [...(s.transfers || []), transfer], status: ScheduleStatus.PENDING 
      } : s)
    }));
    setModals({ ...modals, transfer: false });
    setTransferForm({ newTechId: '', reason: '' });
    alert('OS transferida para o novo técnico.');
  };

  // --- Cálculos Financeiros (Corrigido Bug de Mutação e Parse) ---

  const financialStats = useMemo(() => {
    const mySchedules = state.schedules.filter(s => s.technicianId === state.currentUser?.id && s.status === ScheduleStatus.CONCLUDED);
    
    const calculateForPeriod = (days: number | null) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      let filtered = mySchedules;
      if (days !== null) {
        // Criar uma cópia para evitar mutação indesejada do objeto original Date
        const threshold = new Date(todayStart.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
        
        filtered = mySchedules.filter(s => {
          if (!s.completionDate) return false;
          const [d, m, y] = s.completionDate.split('/');
          const compDate = new Date(Number(y), Number(m) - 1, Number(d));
          return compDate >= threshold;
        });
      }

      const totalValue = filtered.reduce((acc, curr) => acc + (curr.finalValue || 0), 0);
      return { total: totalValue, commission: totalValue * (COMMISSION_RATE || 0.07) };
    };

    return {
      today: calculateForPeriod(1),
      week: calculateForPeriod(7),
      month: calculateForPeriod(30)
    };
  }, [state.schedules, state.currentUser]);

  const filteredSchedules = useMemo(() => {
    let list = state.schedules;
    if (isTechnician) list = list.filter(s => s.technicianId === state.currentUser?.id);
    if (isAdmin && statusFilter !== 'ALL') list = list.filter(s => s.status === statusFilter);
    return list.slice().reverse();
  }, [state.schedules, state.currentUser, statusFilter, isAdmin, isTechnician]);

  // --- Renderização Principal ---

  if (!state.currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm border border-slate-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-sky-600 italic tracking-tighter">GEOMAQUI</h1>
            <p className="text-[9px] uppercase font-bold text-slate-400 mt-1 tracking-widest">Painel Técnico</p>
          </div>
          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setIsAuthMode('login')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${isAuthMode === 'login' ? 'bg-white shadow text-sky-600' : 'text-slate-400'}`}>Acessar</button>
            <button onClick={() => setIsAuthMode('register')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${isAuthMode === 'register' ? 'bg-white shadow text-sky-600' : 'text-slate-400'}`}>Cadastrar</button>
          </div>
          <form onSubmit={isAuthMode === 'login' ? handleLogin : handleRegister} className="space-y-1">
            {isAuthMode === 'register' && <Input label="Seu Nome" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} required />}
            <Input label="E-mail" type="email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} required />
            <Input label="Sua Senha" type="password" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} required />
            {isAuthMode === 'register' && (
               <Input label="Função" value={authForm.role} onChange={e => setAuthForm({ ...authForm, role: e.target.value as any })} options={[{ label: 'Técnico de Campo', value: UserRole.TECHNICIAN }, { label: 'Atendente Loja', value: UserRole.ATTENDANT }, { label: 'Administrador', value: UserRole.ADMIN }]} required />
            )}
            <Button type="submit" fullWidth className="mt-4 rounded-xl py-4">{isAuthMode === 'login' ? 'Entrar' : 'Registrar Agora'}</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar Compacta */}
      <aside className="w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 transition-all">
        <div className="p-8 text-center"><h2 className="text-2xl font-black text-sky-600 italic hidden lg:block">GEOMAQUI</h2><h2 className="text-2xl font-black text-sky-600 italic lg:hidden">G</h2></div>
        <nav className="flex-1 px-4 space-y-2">
          {isAdmin && (
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 p-3 lg:px-5 lg:py-3.5 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === 'dashboard' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
              <ICONS.Home className="w-5 h-5" /> <span className="hidden lg:inline">Painel</span>
            </button>
          )}
          <button onClick={() => setActiveTab('schedules')} className={`w-full flex items-center gap-3 p-3 lg:px-5 lg:py-3.5 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === 'schedules' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
            <ICONS.Calendar className="w-5 h-5" /> <span className="hidden lg:inline">Agenda</span>
          </button>
          {isAdmin && (
            <button onClick={() => setActiveTab('staff')} className={`w-full flex items-center gap-3 p-3 lg:px-5 lg:py-3.5 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === 'staff' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
              <ICONS.Users className="w-5 h-5" /> <span className="hidden lg:inline">Equipe</span>
            </button>
          )}
        </nav>
        <div className="p-4 lg:p-6 border-t bg-slate-50/50">
          <p className="text-[8px] font-black uppercase text-slate-800 mb-4 truncate hidden lg:block">{state.currentUser.name}</p>
          <button onClick={() => setState(prev => ({ ...prev, currentUser: null }))} className="w-full py-2.5 text-red-500 bg-red-50 rounded-xl text-[9px] font-black uppercase border border-red-100 flex items-center justify-center gap-2">
            <ICONS.Logout className="w-4 h-4" /> <span className="hidden lg:inline">Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        {/* Dashboard com Ganhos */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <header>
              <h1 className="text-3xl font-black italic text-slate-800 tracking-tighter">Financeiro & Metas</h1>
              <p className="text-[9px] uppercase font-bold text-slate-400 mt-1 tracking-widest italic">Controle de Produtividade Geomaqui</p>
            </header>

            {isTechnician ? (
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Hoje', val: financialStats.today },
                  { label: 'Últimos 7 Dias', val: financialStats.week },
                  { label: 'Últimos 30 Dias', val: financialStats.month }
                ].map((s, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-1">{s.label}</p>
                      <h3 className="text-xl font-black text-slate-800">{formatCurrency(s.val.total)}</h3>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                      <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Sua Comissão (7%)</span>
                      <span className="text-sm font-black text-emerald-600">{formatCurrency(s.val.commission)}</span>
                    </div>
                  </div>
                ))}
              </section>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400">Total de Chamados no Sistema</p>
                    <h2 className="text-5xl font-black italic text-sky-500 mt-2">{state.schedules.length}</h2>
                 </div>
                 <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400">Técnicos Ativos</p>
                    <h2 className="text-5xl font-black italic text-emerald-500 mt-2">{state.users.filter(u => u.role === UserRole.TECHNICIAN).length}</h2>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* Listagem de Agendamentos (Mais Compacto) */}
        {activeTab === 'schedules' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <header className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-black italic text-slate-800 tracking-tighter">Agenda de Campo</h1>
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest italic">Visitas Técnicas Agendadas</p>
              </div>
              {!isTechnician && <Button onClick={() => setModals({ ...modals, schedule: true })} className="rounded-xl">Nova OS</Button>}
            </header>

            {isAdmin && (
              <div className="flex gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
                <button onClick={() => setStatusFilter('ALL')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all shrink-0 ${statusFilter === 'ALL' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Todos</button>
                {Object.values(ScheduleStatus).map(val => (
                  <button key={val} onClick={() => setStatusFilter(val)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all shrink-0 ${statusFilter === val ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>{statusLabels[val]}</button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchedules.map(s => (
                <div key={s.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:border-sky-200 transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm ${s.status === ScheduleStatus.PENDING ? 'bg-amber-100 text-amber-600' : s.status === ScheduleStatus.ACCEPTED ? 'bg-sky-100 text-sky-600' : s.status === ScheduleStatus.CANCELLED ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>{statusLabels[s.status]}</span>
                      <p className="text-[9px] font-black text-slate-300 uppercase italic">{s.appointmentDate} • {s.appointmentTime}</p>
                    </div>

                    <h3 className="text-base font-black italic text-slate-800 truncate mb-1">{s.clientName}</h3>
                    <p className="text-[10px] font-bold text-slate-500 italic mb-3 line-clamp-1">{s.clientAddress}, {s.clientNumber}</p>
                    
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Defeito</p>
                      <p className="text-[10px] font-medium text-slate-700 italic line-clamp-2">{s.description}</p>
                    </div>

                    {isTechnician && s.status !== ScheduleStatus.CONCLUDED && (
                      <div className="mb-3">
                        <a href={getGoogleMapsUrl(s.clientAddress, s.clientNumber)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sky-500 font-black text-[9px] uppercase bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100">
                          <ICONS.Map className="w-3 h-3" /> Ver Rota
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-50 space-y-2">
                    {isTechnician && s.status === ScheduleStatus.PENDING && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="success" small fullWidth onClick={() => handleUpdateStatus(s.id, ScheduleStatus.ACCEPTED)}>Aceitar</Button>
                        <Button variant="warning" small fullWidth onClick={() => { setSelectedSchedule(s); setModals({ ...modals, transfer: true }); }}>Transferir</Button>
                      </div>
                    )}

                    {isTechnician && s.status === ScheduleStatus.ACCEPTED && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="primary" small fullWidth onClick={() => { setSelectedSchedule(s); setModals({ ...modals, conclude: true }); }}>Concluir</Button>
                        <Button variant="outline" small fullWidth onClick={() => { setSelectedSchedule(s); setModals({ ...modals, reschedule: true }); }}>Reagendar</Button>
                      </div>
                    )}

                    {!isTechnician && (
                      <Button variant="ghost" fullWidth small onClick={() => { setSelectedSchedule(s); setModals({ ...modals, successReceipt: true }); }}>Ver Detalhes</Button>
                    )}
                    
                    {s.status === ScheduleStatus.CONCLUDED && (
                      <div className="text-center pt-1 bg-emerald-50 rounded-lg py-2">
                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Faturado</p>
                        <p className="text-[11px] font-black text-emerald-700">{formatCurrency(s.finalValue || 0)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gerenciamento de Equipe */}
        {activeTab === 'staff' && isAdmin && (
          <div className="animate-in zoom-in-95 duration-300">
            <header className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-black italic text-slate-800 tracking-tighter">Equipe Técnica</h1>
              <Button onClick={() => setModals({ ...modals, addUser: true })}>Novo Membro</Button>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {state.users.map(u => (
                <div key={u.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm relative group">
                  <div className="w-12 h-12 bg-sky-100 text-sky-600 flex items-center justify-center rounded-2xl font-black text-lg">{u.name[0]}</div>
                  <div className="flex-1 truncate">
                    <p className="text-[11px] font-black uppercase truncate text-slate-800">{u.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{roleLabels[u.role]}</p>
                  </div>
                  {u.id !== 'admin-1' && (
                    <button onClick={() => { if(confirm('Remover membro da equipe?')) setState(prev => ({ ...prev, users: prev.users.filter(usr => usr.id !== u.id) })) }} className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 text-red-300 hover:text-red-500 transition-all">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- Modais --- */}

        {/* Modal Concluir OS */}
        <Modal isOpen={modals.conclude} onClose={() => setModals({ ...modals, conclude: false })} title="Finalizar Atendimento">
          <form onSubmit={handleConcludeOS} className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Resumo do Chamado</p>
               <p className="text-sm font-black italic text-slate-800">{selectedSchedule?.clientName}</p>
            </div>
            <Input label="Relatório Técnico" multiline value={concludeForm.workDone} onChange={e => setConcludeForm({ ...concludeForm, workDone: e.target.value })} required placeholder="Descreva o que foi realizado no produto..." />
            <Input label="Valor Cobrado (R$)" type="number" value={concludeForm.finalValue} onChange={e => setConcludeForm({ ...concludeForm, finalValue: e.target.value })} required placeholder="Ex: 250.00" />
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
              <p className="text-[9px] font-black text-emerald-800 uppercase tracking-widest mb-1">Comissão Final (7%)</p>
              <p className="text-xl font-black text-emerald-600">{formatCurrency(parseFloat(concludeForm.finalValue || '0') * 0.07)}</p>
            </div>
            <Button type="submit" fullWidth variant="success" className="py-4">Confirmar e Faturar</Button>
          </form>
        </Modal>

        {/* Modal Reagendar */}
        <Modal isOpen={modals.reschedule} onClose={() => setModals({ ...modals, reschedule: false })} title="Alterar Data/Hora">
          <form onSubmit={handleReschedule} className="space-y-4">
            <Input label="Nova Data Prevista" type="date" value={rescheduleForm.date} onChange={e => setRescheduleForm({ ...rescheduleForm, date: e.target.value })} required />
            <Input label="Novo Horário" type="time" value={rescheduleForm.time} onChange={e => setRescheduleForm({ ...rescheduleForm, time: e.target.value })} required />
            <Button type="submit" fullWidth className="py-4">Reagendar Visita</Button>
          </form>
        </Modal>

        {/* Modal Transferir */}
        <Modal isOpen={modals.transfer} onClose={() => setModals({ ...modals, transfer: false })} title="Delegar para outro Técnico">
          <form onSubmit={handleTransfer} className="space-y-4">
            <Input label="Selecionar Técnico Destino" value={transferForm.newTechId} onChange={e => setTransferForm({ ...transferForm, newTechId: e.target.value })} options={state.users.filter(u => u.role === UserRole.TECHNICIAN && u.id !== state.currentUser?.id).map(u => ({ label: u.name, value: u.id }))} required />
            <Input label="Justificativa da Transferência" multiline value={transferForm.reason} onChange={e => setTransferForm({ ...transferForm, reason: e.target.value })} required placeholder="Ex: Problema complexo, falta de peça específica..." />
            <Button type="submit" fullWidth variant="warning" className="py-4">Transferir Chamado</Button>
          </form>
        </Modal>

        {/* Modal Nova OS */}
        <Modal isOpen={modals.schedule} onClose={() => setModals({ ...modals, schedule: false })} title="Nova Ordem de Serviço">
          <form onSubmit={(e) => {
            e.preventDefault();
            const newOS: Schedule = {
              id: crypto.randomUUID(), clientName: scheduleForm.clientName, clientPhone: scheduleForm.clientPhone, clientAddress: scheduleForm.clientAddress, clientNumber: scheduleForm.clientNumber,
              appointmentDate: scheduleForm.date, appointmentTime: scheduleForm.time, technicianId: scheduleForm.technicianId, attendantId: state.currentUser?.id,
              attendantName: state.currentUser?.name || '', description: scheduleForm.description, status: ScheduleStatus.PENDING, transfers: []
            };
            setState(prev => ({ ...prev, schedules: [...prev.schedules, newOS] }));
            setModals({ ...modals, schedule: false });
            setScheduleForm({ clientName: '', clientPhone: '', clientAddress: '', clientNumber: '', date: '', time: '', technicianId: '', description: '' });
            alert('OS Agendada com sucesso!');
          }} className="space-y-1">
            <Input label="Cliente" value={scheduleForm.clientName} onChange={e => setScheduleForm({ ...scheduleForm, clientName: e.target.value })} required />
            <Input label="WhatsApp" value={scheduleForm.clientPhone} onChange={e => setScheduleForm({ ...scheduleForm, clientPhone: e.target.value })} required />
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><Input label="Endereço" value={scheduleForm.clientAddress} onChange={e => setScheduleForm({ ...scheduleForm, clientAddress: e.target.value })} required /></div>
              <Input label="Nº" value={scheduleForm.clientNumber} onChange={e => setScheduleForm({ ...scheduleForm, clientNumber: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label="Data" type="date" value={scheduleForm.date} onChange={e => setScheduleForm({ ...scheduleForm, date: e.target.value })} required />
              <Input label="Hora" type="time" value={scheduleForm.time} onChange={e => setScheduleForm({ ...scheduleForm, time: e.target.value })} required />
            </div>
            <Input label="Técnico Responsável" value={scheduleForm.technicianId} onChange={e => setScheduleForm({ ...scheduleForm, technicianId: e.target.value })} options={state.users.filter(u => u.role === UserRole.TECHNICIAN).map(u => ({ label: u.name, value: u.id }))} required />
            <Input label="Relato do Defeito" multiline value={scheduleForm.description} onChange={e => setScheduleForm({ ...scheduleForm, description: e.target.value })} required />
            <Button type="submit" fullWidth className="mt-4 py-4">Agendar Visita</Button>
          </form>
        </Modal>

        {/* Modal Detalhes do Chamado */}
        <Modal isOpen={modals.successReceipt} onClose={() => setModals({ ...modals, successReceipt: false })} title="Histórico do Chamado">
          {selectedSchedule && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 space-y-4">
                <div className="flex justify-between border-b pb-2"><p className="text-[9px] font-black text-slate-400 uppercase">OS #</p><p className="text-xs font-black text-sky-600">{selectedSchedule.id.slice(0,8).toUpperCase()}</p></div>
                <div><p className="text-[8px] font-black text-slate-400 uppercase">Cliente</p><p className="text-sm font-black italic">{selectedSchedule.clientName}</p></div>
                <div><p className="text-[8px] font-black text-slate-400 uppercase">Status Atual</p><p className="text-xs font-bold text-sky-600">{statusLabels[selectedSchedule.status]}</p></div>
                {selectedSchedule.status === ScheduleStatus.CONCLUDED && (
                  <div className="pt-3 border-t">
                    <p className="text-[8px] font-black text-emerald-500 uppercase mb-1">Serviço Realizado</p>
                    <p className="text-xs font-medium text-slate-600 italic leading-relaxed">{selectedSchedule.workDoneDescription}</p>
                    <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200">
                       <p className="text-[8px] font-black text-slate-400 uppercase">Valor Final</p>
                       <p className="text-sm font-black text-slate-800">{formatCurrency(selectedSchedule.finalValue || 0)}</p>
                    </div>
                  </div>
                )}
                {selectedSchedule.transfers && selectedSchedule.transfers.length > 0 && (
                   <div className="pt-3 border-t">
                      <p className="text-[8px] font-black text-amber-500 uppercase mb-2">Logs de Transferência</p>
                      {selectedSchedule.transfers.map((t, i) => (
                        <div key={i} className="text-[9px] text-slate-500 mb-1 border-l-2 border-amber-300 pl-2">De {t.fromName} para {t.toName} em {t.date}</div>
                      ))}
                   </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button fullWidth variant="ghost" onClick={() => setModals({ ...modals, successReceipt: false })}>Fechar</Button>
                <Button fullWidth onClick={() => generatePDF(selectedSchedule, state.users.find(u => u.id === selectedSchedule.technicianId))}>Gerar PDF</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal Adicionar Colaborador (Admin Only) */}
        <Modal isOpen={modals.addUser} onClose={() => setModals({ ...modals, addUser: false })} title="Cadastro de Equipe">
            <form onSubmit={(e) => {
              e.preventDefault();
              if (state.users.some(u => u.email === authForm.email)) return alert('E-mail já cadastrado.');
              const newUser: User = { id: crypto.randomUUID(), name: authForm.name, email: authForm.email, password: authForm.password, role: authForm.role, ratingCount: 0, ratingSum: 0 };
              setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
              setModals({ ...modals, addUser: false });
              setAuthForm({ name: '', email: '', password: '', role: UserRole.TECHNICIAN });
              alert('Novo membro adicionado com sucesso!');
            }} className="space-y-2">
                <Input label="Nome Completo" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} required />
                <Input label="E-mail de Login" type="email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} required />
                <Input label="Senha Temporária" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} required />
                <Input label="Cargo/Função" value={authForm.role} onChange={e => setAuthForm({ ...authForm, role: e.target.value as any })} options={[{ label: 'Técnico de Campo', value: UserRole.TECHNICIAN }, { label: 'Atendente Loja', value: UserRole.ATTENDANT }, { label: 'Administrador', value: UserRole.ADMIN }]} required />
                <Button type="submit" fullWidth className="mt-6 py-4 rounded-2xl">Confirmar Cadastro</Button>
            </form>
        </Modal>

      </main>
    </div>
  );
}
