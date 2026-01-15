
export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  runningBalance?: number;
}

export interface Summary {
  initialBalance: number;
  totalIncome: number;
  totalExpenses: number;
  finalBalance: number;
}
