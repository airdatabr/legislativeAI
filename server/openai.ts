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
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Gere um título curto e descritivo (máximo 40 caracteres) para uma conversa sobre legislação municipal baseado na primeira pergunta. Responda apenas com o título, sem aspas ou formatação adicional."
        },
        { role: "user", content: firstMessage }
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
    // Chamada para sua API interna da base de leis
    const response = await fetch(process.env.INTERNAL_LAWS_API_URL || 'http://localhost:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_LAWS_API_KEY || ''}`
      },
      body: JSON.stringify({
        message: question,
        include_sources: true // Incluir fontes para citações específicas
      })
    });

    if (!response.ok) {
      throw new Error(`API da base de leis retornou status: ${response.status}`);
    }

    const data = await response.json();
    
    // Assumindo que sua API retorna o conteúdo em um campo específico
    // Você pode ajustar conforme a estrutura real da resposta
    return data.response || data.message || data.answer || "Não foi possível processar sua consulta sobre a base de leis municipais.";
    
  } catch (error) {
    console.error("Erro ao consultar base de leis interna:", error);
    
    // Fallback para OpenAI se a API interna falhar
    console.log("Usando fallback para OpenAI...");
    const fallbackResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é um assistente legislativo especializado na base de leis municipais do Brasil, especificamente da Câmara Municipal de Cabedelo, Paraíba.

IMPORTANTE: Você deve responder EXCLUSIVAMENTE com base em leis, decretos, portarias e regulamentações municipais.

Suas respostas devem:
- Citar especificamente leis municipais, decretos ou portarias
- Incluir números de artigos, parágrafos e incisos quando relevante
- Indicar datas de publicação quando possível
- Se não encontrar informação específica na base legal municipal, dizer claramente que não há regulamentação municipal específica sobre o assunto

Formato da resposta:
1. Resposta direta à pergunta
2. Base legal (lei/decreto/portaria com número e data)
3. Artigos específicos citados
4. Observações adicionais se relevantes`
        },
        {
          role: "user",
          content: question
        }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    return fallbackResponse.choices[0].message.content || "Erro ao consultar base de leis municipais.";
  }
}
