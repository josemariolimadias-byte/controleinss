
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, TransactionType, Summary } from './types';
import { getFinancialAdvice } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

const STORAGE_KEY = 'controle_inss_data';

const App: React.FC = () => {
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>('INCOME');
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Transaction | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      let dataLoaded = false;

      // Tentar Supabase primeiro
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: trans, error } = await supabase
            .from('transactions')
            .select('*')
            .order('date', { ascending: true });
          
          if (!error && trans) {
            setTransactions(trans as Transaction[]);
            dataLoaded = true;
          }
        } catch (e) {
          console.error("Erro ao carregar do Supabase:", e);
        }
      }

      // Se não carregou do Supabase ou não configurado, vai para LocalStorage
      if (!dataLoaded) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const { initial, trans } = JSON.parse(saved);
            setInitialBalance(initial || 0);
            setTransactions(trans || []);
          } catch (e) {
            console.error("Falha ao carregar dados locais", e);
          }
        }
      }
      setIsLoading(false);
    };

    loadData();
  }, []);

  // Salvar saldo inicial no localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ initial: initialBalance, trans: transactions }));
    }
  }, [initialBalance, transactions, isLoading]);

  const processedTransactions = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let current = initialBalance;
    return sorted.map(t => {
      current = t.type === 'INCOME' ? current + t.amount : current - t.amount;
      return { ...t, runningBalance: current };
    });
  }, [transactions, initialBalance]);

  const summary = useMemo((): Summary => {
    const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    return {
      initialBalance,
      totalIncome,
      totalExpenses,
      finalBalance: initialBalance + totalIncome - totalExpenses
    };
  }, [transactions, initialBalance]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || parseFloat(amount) <= 0) return;

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      date,
      description,
      amount: parseFloat(amount),
      type
    };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('transactions').insert([newTransaction]);
      if (error) {
        console.warn("Erro ao salvar no banco de dados. Mantendo apenas local.");
      }
    }

    setTransactions([...transactions, newTransaction]);
    setDescription('');
    setAmount('');
  };

  const deleteTransaction = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) console.error("Erro ao deletar no Supabase");
    }
    setTransactions(transactions.filter(t => t.id !== id));
  };

  // Funções de Edição
  const startEditing = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditForm({ ...transaction });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async () => {
    if (!editForm || !editingId) return;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('transactions')
        .update({
          date: editForm.date,
          description: editForm.description,
          amount: editForm.amount,
          type: editForm.type
        })
        .eq('id', editingId);
      
      if (error) {
        alert("Erro ao atualizar no banco de dados.");
        return;
      }
    }

    setTransactions(transactions.map(t => t.id === editingId ? editForm : t));
    setEditingId(null);
    setEditForm(null);
  };

  const fetchAdvice = useCallback(async () => {
    setLoadingAdvice(true);
    const advice = await getFinancialAdvice(transactions, summary);
    setAiAdvice(advice);
    setLoadingAdvice(false);
  }, [transactions, summary]);

  return (
    <div className="min-h-screen pb-12 bg-slate-950 text-slate-100">
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Controle INSS</h1>
              {!isSupabaseConfigured && <span className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">Modo Local</span>}
              {isSupabaseConfigured && <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Cloud Sync On</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
            <label className="text-[10px] font-bold uppercase text-slate-400 px-2 tracking-widest">Saldo Inicial</label>
            <div className="flex items-center">
              <span className="text-slate-500 font-mono ml-2">R$</span>
              <input 
                type="number" 
                className="bg-transparent border-none rounded px-2 py-1 w-28 font-mono text-lg text-white focus:ring-0 outline-none"
                value={initialBalance}
                onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Entradas Totais</p>
              <h2 className="text-2xl font-bold text-emerald-400">R$ {summary.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
            </div>
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Saídas Totais</p>
              <h2 className="text-2xl font-bold text-rose-400">R$ {summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
            </div>
            <div className="bg-indigo-600 p-6 rounded-2xl shadow-xl shadow-indigo-900/20 border border-indigo-500/50">
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Saldo Final</p>
              <h2 className="text-3xl font-black text-white">R$ {summary.finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-base font-bold mb-5 flex items-center gap-2 text-white">Novo Lançamento</h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <input type="date" required className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none" value={date} onChange={(e) => setDate(e.target.value)} />
              <input type="text" required placeholder="Descrição" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none" value={description} onChange={(e) => setDescription(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step="0.01" required placeholder="Valor" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none font-mono" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <select className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none" value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
                  <option value="INCOME">Entrada (+)</option>
                  <option value="EXPENSE">Saída (-)</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all">Registrar</button>
            </form>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <h4 className="text-xs font-bold mb-3 text-indigo-400 uppercase tracking-widest">IA Financeira</h4>
            <p className="text-slate-300 text-sm italic">{aiAdvice || "Analise para dicas."}</p>
            <button onClick={fetchAdvice} disabled={loadingAdvice || transactions.length === 0} className="mt-4 w-full py-2 bg-slate-800 border border-slate-700 rounded text-xs font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-30">
              {loadingAdvice ? "Analisando..." : "Gerar Insights"}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden min-h-[400px]">
            <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/50">
              <h3 className="font-bold text-lg text-white">Extrato</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                    <th className="px-6 py-4 text-right">Saldo</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-500">Aguarde...</td></tr>
                  ) : processedTransactions.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-600 italic">Sem registros.</td></tr>
                  ) : (
                    processedTransactions.map((t) => (
                      <tr key={t.id} className={`group ${editingId === t.id ? 'bg-indigo-950/30' : 'hover:bg-slate-800/30'}`}>
                        {editingId === t.id ? (
                          <>
                            <td className="px-6 py-3"><input type="date" className="bg-slate-800 text-white rounded px-2 py-1 text-xs w-full" value={editForm?.date} onChange={(e) => setEditForm(prev => prev ? { ...prev, date: e.target.value } : null)} /></td>
                            <td className="px-6 py-3"><input type="text" className="bg-slate-800 text-white rounded px-2 py-1 text-xs w-full" value={editForm?.description} onChange={(e) => setEditForm(prev => prev ? { ...prev, description: e.target.value } : null)} /></td>
                            <td className="px-6 py-3">
                              <div className="flex gap-1 items-center">
                                <select className="bg-slate-800 text-white rounded p-1 text-[10px]" value={editForm?.type} onChange={(e) => setEditForm(prev => prev ? { ...prev, type: e.target.value as TransactionType } : null)}><option value="INCOME">+</option><option value="EXPENSE">-</option></select>
                                <input type="number" className="bg-slate-800 text-white rounded px-2 py-1 text-xs w-full text-right" value={editForm?.amount} onChange={(e) => setEditForm(prev => prev ? { ...prev, amount: parseFloat(e.target.value) || 0 } : null)} />
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right text-[10px] text-slate-500 italic">(editando)</td>
                            <td className="px-6 py-3 text-center">
                              <div className="flex justify-center gap-2">
                                <button onClick={saveEdit} className="text-emerald-500 p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg></button>
                                <button onClick={cancelEditing} className="text-slate-500 p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-5 text-sm text-slate-300">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                            <td className="px-6 py-5 text-sm text-slate-400 group-hover:text-slate-100">{t.description}</td>
                            <td className={`px-6 py-5 text-sm font-bold text-right ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-6 py-5 text-sm font-mono text-right text-slate-200">R$ {t.runningBalance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-6 py-5 text-center">
                              <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEditing(t)} className="text-slate-500 hover:text-indigo-400 p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                                <button onClick={() => deleteTransaction(t.id)} className="text-slate-500 hover:text-rose-500 p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="bg-slate-950/40 px-6 py-6 border-t border-slate-800 text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Saldo Atual</span>
                <p className={`text-3xl font-black ${summary.finalBalance >= 0 ? 'text-white' : 'text-rose-500'}`}>
                  R$ {summary.finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 mt-16 pb-8 text-center text-slate-700 text-[10px] uppercase font-bold tracking-widest">
        &copy; {new Date().getFullYear()} Controle INSS - Gestão Financeira Inteligente
      </footer>
    </div>
  );
};

export default App;
