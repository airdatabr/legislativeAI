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
