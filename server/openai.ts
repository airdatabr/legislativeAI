import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export async function generateLegislativeResponse(question: string): Promise<string> {
  try {
    const systemPrompt = `Você é um assistente especializado em legislação municipal brasileira. 
    Você tem acesso a uma base de dados completa de leis, decretos e portarias municipais.
    
    Suas respostas devem:
    - Ser precisas e baseadas em legislação real
    - Incluir referências específicas (números de leis, artigos, decretos)
    - Usar formatação Markdown para melhor legibilidade
    - Ser profissionais e adequadas para funcionários públicos
    - Incluir informações sobre vigência e possíveis revogações
    
    Responda sempre em português brasileiro de forma clara e objetiva.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || "Desculpe, não foi possível processar sua consulta.";
  } catch (error) {
    console.error("Error generating AI response:", error);
    throw new Error("Falha ao processar consulta com IA");
  }
}

export async function generateConversationTitle(firstMessage: string): Promise<string> {
  try {
    // Validate input
    if (!firstMessage || firstMessage.trim() === '') {
      return "Nova Consulta";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Gere um título curto e descritivo (máximo 40 caracteres) para uma conversa sobre legislação municipal baseado na primeira pergunta. Responda apenas com o título, sem aspas ou formatação adicional."
        },
        { role: "user", content: firstMessage.trim() }
      ],
      temperature: 0.3,
      max_tokens: 20,
    });

    return response.choices[0].message.content?.slice(0, 40) || "Nova Consulta";
  } catch (error) {
    console.error("Error generating conversation title:", error);
    return "Nova Consulta";
  }
}

export async function generateLawsResponse(question: string): Promise<string> {
  try {
    // Para teste, usa a URL do OpenAI se não tiver configuração específica
    const apiUrl = process.env.INTERNAL_LAWS_API_URL || 'https://api.openai.com/v1/chat/completions';
    const apiKey = process.env.INTERNAL_LAWS_API_KEY || process.env.OPENAI_API_KEY;
    
    // Estrutura o request igual ao ChatGPT/OpenAI
    const requestBody = {
      model: "gpt-4o", // Modelo padrão
      messages: [
        {
          role: "system",
          content: "Você é um assistente legislativo da Câmara Municipal de Cabedelo, Paraíba. Especialize-se em legislação municipal brasileira, fornecendo respostas sobre leis, decretos, portarias e regulamentações municipais. Sempre cite fontes legais específicas quando possível, incluindo números de artigos e datas de publicação."
        },
        {
          role: "user", 
          content: question
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    };

    // Headers idênticos ao padrão OpenAI
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    // Adiciona autorização se a chave estiver disponível
    if (apiKey && apiKey.trim() !== '') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    console.log(`[Laws API] Calling ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`[Laws API] HTTP error! status: ${response.status}`);
      throw new Error(`API de Leis retornou erro: ${response.status}`);
    }

    const data = await response.json();
    
    // Processa resposta no formato OpenAI
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content || "Não foi possível obter resposta da base de leis.";
    }
    
    // Fallback para outros formatos de resposta
    if (data.response) {
      return data.response;
    }
    
    if (data.message) {
      return data.message;
    }

    console.warn("[Laws API] Formato de resposta não reconhecido:", data);
    return "Resposta recebida da API de leis em formato não esperado.";
    
  } catch (error) {
    console.error("Error calling laws API:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    throw new Error(`Falha ao consultar a base de dados de leis: ${errorMessage}`);
  }
}
