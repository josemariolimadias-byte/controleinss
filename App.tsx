
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, TransactionType, Summary } from './types';
import { getFinancialAdvice } from './services/geminiService';

// Mock Supabase Integration logic (simulated)
// In a real scenario, you would use @supabase/supabase-js
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

  // Load data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { initial, trans } = JSON.parse(saved);
      setInitialBalance(initial || 0);
      setTransactions(trans || []);
    }
  }, []);

  // Save data
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
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg">
              <svg className="w-8 h-8 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Controle INSS</h1>
          </div>
          
          <div className="flex items-center gap-4 bg-indigo-800 p-2 rounded-xl border border-indigo-600">
            <label className="text-xs font-semibold uppercase opacity-80 px-2">Saldo Inicial:</label>
            <input 
              type="number" 
              className="bg-indigo-900 border-none rounded px-3 py-1 w-32 font-mono text-lg focus:ring-2 focus:ring-white outline-none"
              value={initialBalance}
              onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Input and Summary */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-slate-500 text-sm font-medium">Entradas Totais</p>
              <h2 className="text-2xl font-bold text-green-600">R$ {summary.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-slate-500 text-sm font-medium">Saídas Totais</p>
              <h2 className="text-2xl font-bold text-red-600">R$ {summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
            </div>
            <div className="bg-indigo-50 p-6 rounded-2xl shadow-md border-2 border-indigo-100">
              <p className="text-indigo-600 text-sm font-bold uppercase tracking-wider">Saldo Final</p>
              <h2 className="text-3xl font-black text-indigo-900">R$ {summary.finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Novo Lançamento
            </h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                <input 
                  type="date" 
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Recebimento Aposentadoria"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select 
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
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
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg active:scale-95"
              >
                Adicionar Lançamento
              </button>
            </form>
          </div>

          {/* AI Advice Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </div>
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
              Insights Inteligentes
            </h4>
            <p className="text-indigo-100 text-sm italic mb-4">
              {aiAdvice || "Clique abaixo para obter uma análise da sua situação financeira."}
            </p>
            <button 
              onClick={fetchAdvice}
              disabled={loadingAdvice || transactions.length === 0}
              className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
            >
              {loadingAdvice ? "Analisando..." : "Gerar novo conselho"}
            </button>
          </div>
        </div>

        {/* Right: Statement Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Extrato Detalhado</h3>
              <span className="text-xs text-slate-400 font-mono">{transactions.length} lançamentos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                    <th className="px-6 py-4 text-right">Saldo Parcial</th>
                    <th className="px-6 py-4 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedTransactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                        Nenhum lançamento encontrado. Comece adicionando um acima!
                      </td>
                    </tr>
                  )}
                  {processedTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {t.description}
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold text-right whitespace-nowrap ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-right font-bold text-slate-900 whitespace-nowrap">
                        R$ {t.runningBalance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => deleteTransaction(t.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1"
                          title="Excluir"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase font-bold">Saldo Total Final</p>
                <p className={`text-2xl font-black ${summary.finalBalance >= 0 ? 'text-indigo-900' : 'text-red-700'}`}>
                  R$ {summary.finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 mt-12 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} Controle INSS - Seu extrato financeiro simplificado.</p>
      </footer>
    </div>
  );
};

export default App;
