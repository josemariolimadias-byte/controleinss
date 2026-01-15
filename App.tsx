
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, TransactionType, Summary } from './types';
import { getFinancialAdvice } from './services/geminiService';

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

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { initial, trans } = JSON.parse(saved);
        setInitialBalance(initial || 0);
        setTransactions(trans || []);
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ initial: initialBalance, trans: transactions }));
  }, [initialBalance, transactions]);

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

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || parseFloat(amount) <= 0) return;

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      date,
      description,
      amount: parseFloat(amount),
      type
    };

    setTransactions([...transactions, newTransaction]);
    setDescription('');
    setAmount('');
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const fetchAdvice = useCallback(async () => {
    setLoadingAdvice(true);
    const advice = await getFinancialAdvice(transactions, summary);
    setAiAdvice(advice);
    setLoadingAdvice(false);
  }, [transactions, summary]);

  return (
    <div className="min-h-screen pb-12 bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Controle INSS</h1>
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
                placeholder="0,00"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Summary Dashboard */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Entradas Totais</p>
              <h2 className="text-2xl font-bold text-emerald-400">R$ {summary.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
            </div>
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Saídas Totais</p>
              <h2 className="text-2xl font-bold text-rose-400">R$ {summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
            </div>
            <div className="bg-indigo-600 p-6 rounded-2xl shadow-xl shadow-indigo-900/20 border border-indigo-500/50">
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Saldo Final Disponível</p>
              <h2 className="text-3xl font-black text-white">R$ {summary.finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
            </div>
          </div>

          {/* New Transaction Form */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
            <h3 className="text-base font-bold mb-5 flex items-center gap-2 text-white">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
              Novo Lançamento
            </h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Data</label>
                <input 
                  type="date" 
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Descrição</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Auxílio Doença"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    placeholder="0,00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 ml-1">Tipo</label>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none"
                    value={type}
                    onChange={(e) => setType(e.target.value as TransactionType)}
                  >
                    <option value="INCOME">Entrada (+)</option>
                    <option value="EXPENSE">Saída (-)</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] mt-2"
              >
                Confirmar Registro
              </button>
            </form>
          </div>

          {/* AI Insights Card */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <svg className="w-16 h-16 text-indigo-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </div>
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-indigo-400 uppercase tracking-widest">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
              IA Financeira
            </h4>
            <div className="min-h-[60px] flex items-center">
              <p className="text-slate-300 text-sm leading-relaxed italic">
                {aiAdvice || "Analise seus lançamentos para obter dicas personalizadas de economia."}
              </p>
            </div>
            <button 
              onClick={fetchAdvice}
              disabled={loadingAdvice || transactions.length === 0}
              className="mt-4 w-full py-2 px-4 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {loadingAdvice ? (
                <>
                   <svg className="animate-spin h-3 w-3 text-indigo-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   Analisando...
                </>
              ) : "Gerar Insights"}
            </button>
          </div>
        </div>

        {/* Right Column: Statement Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="font-bold text-lg text-white">Extrato de Movimentações</h3>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 bg-slate-800 rounded-lg text-[10px] font-bold text-slate-400 border border-slate-700 uppercase">
                  {transactions.length} registros
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                  <tr>
                    <th className="px-6 py-4 border-b border-slate-800">Data</th>
                    <th className="px-6 py-4 border-b border-slate-800">Descrição</th>
                    <th className="px-6 py-4 border-b border-slate-800 text-right">Valor</th>
                    <th className="px-6 py-4 border-b border-slate-800 text-right">Saldo Parcial</th>
                    <th className="px-6 py-4 border-b border-slate-800 text-center w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {processedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-slate-600 italic text-sm">
                        <div className="flex flex-col items-center gap-3">
                           <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                           Nenhum lançamento registrado até o momento.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    processedTransactions.map((t) => (
                      <tr key={t.id} className="group hover:bg-slate-800/30 transition-all duration-200">
                        <td className="px-6 py-5 text-sm font-medium whitespace-nowrap text-slate-300">
                          {new Date(t.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-400 group-hover:text-slate-100 transition-colors">
                          {t.description}
                        </td>
                        <td className={`px-6 py-5 text-sm font-bold text-right whitespace-nowrap ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          <span className="text-xs opacity-50 mr-1">{t.type === 'INCOME' ? '+' : '-'}</span>
                          R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-5 text-sm font-mono text-right font-bold text-slate-200 whitespace-nowrap">
                          R$ {t.runningBalance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button 
                            onClick={() => deleteTransaction(t.id)}
                            className="text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-all"
                            title="Remover Registro"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="bg-slate-950/40 px-6 py-6 border-t border-slate-800 flex justify-end items-center gap-6">
               <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Saldo Líquido</span>
                <p className={`text-3xl font-black tracking-tight ${summary.finalBalance >= 0 ? 'text-white' : 'text-rose-500'}`}>
                  <span className="text-base font-normal text-slate-500 mr-2">R$</span>
                  {summary.finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center px-4">
            <p className="text-[10px] text-slate-600 uppercase font-medium tracking-tighter italic">
              * Todos os dados são salvos localmente no seu navegador.
            </p>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 mt-16 pb-8 text-center border-t border-slate-900 pt-8">
        <p className="text-slate-600 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Controle Financeiro INSS v2.0</p>
        <p className="text-slate-700 text-[10px]">&copy; {new Date().getFullYear()} - Desenvolvido com foco em acessibilidade e transparência.</p>
      </footer>
    </div>
  );
};

export default App;
