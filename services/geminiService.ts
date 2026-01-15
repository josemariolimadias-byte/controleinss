
import { GoogleGenAI } from "@google/genai";
import { Transaction, Summary } from "../types";

export const getFinancialAdvice = async (transactions: Transaction[], summary: Summary) => {
  if (transactions.length === 0) return "Adicione lançamentos para receber insights financeiros.";

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return "Configuração de IA pendente. Adicione a API_KEY nas variáveis de ambiente.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Atue como um especialista financeiro para aposentados e pensionistas do INSS brasileiros. 
        Analise o seguinte resumo financeiro em Reais (R$):
        - Saldo Inicial: R$ ${summary.initialBalance.toFixed(2)}
        - Total de Entradas: R$ ${summary.totalIncome.toFixed(2)}
        - Total de Saídas: R$ ${summary.totalExpenses.toFixed(2)}
        - Saldo Final: R$ ${summary.finalBalance.toFixed(2)}
        
        Transações recentes:
        ${transactions.slice(-5).map(t => `- ${t.date}: ${t.description} (R$ ${t.amount.toFixed(2)} - ${t.type === 'INCOME' ? 'Entrada' : 'Saída'})`).join('\n')}

        Dê um conselho curto (máximo 3 frases) e motivador em português.
      `,
    });
    return response.text || "Não foi possível gerar um conselho no momento.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "A IA está descansando agora. Tente novamente em breve.";
  }
};
