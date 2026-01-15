
import { GoogleGenAI } from "@google/genai";
import { Transaction, Summary } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const getFinancialAdvice = async (transactions: Transaction[], summary: Summary) => {
  if (transactions.length === 0) return "Adicione lançamentos para receber insights financeiros.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Atue como um especialista financeiro para aposentados e pensionistas do INSS. 
        Analise o seguinte resumo financeiro:
        - Saldo Inicial: R$ ${summary.initialBalance.toFixed(2)}
        - Total de Entradas: R$ ${summary.totalIncome.toFixed(2)}
        - Total de Saídas: R$ ${summary.totalExpenses.toFixed(2)}
        - Saldo Final: R$ ${summary.finalBalance.toFixed(2)}
        
        Transações recentes:
        ${transactions.slice(-5).map(t => `- ${t.date}: ${t.description} (R$ ${t.amount.toFixed(2)} - ${t.type})`).join('\n')}

        Dê um conselho curto (máximo 3 frases) e motivador sobre a saúde financeira deste usuário.
      `,
    });
    return response.text || "Não foi possível gerar um conselho no momento.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Erro ao obter insights da IA.";
  }
};
