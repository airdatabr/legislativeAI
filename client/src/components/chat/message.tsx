import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function Message({ role, content, timestamp }: MessageProps) {
  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (role === 'user') {
    return (
      <div className="message-bubble flex justify-end">
        <div className="max-w-3xl bg-primary text-white p-4 rounded-lg rounded-br-none shadow-sm">
          <div className="text-sm whitespace-pre-wrap">{content}</div>
          <div className="text-xs text-blue-100 mt-2">
            {formatTimestamp(timestamp)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-bubble flex justify-start">
      <div className="max-w-4xl bg-white p-4 rounded-lg rounded-bl-none shadow-sm border border-gray-200">
        <div className="flex items-start">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
            <Bot className="text-green-600" size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
            <div className="text-xs text-gray-500 mt-3">
              {formatTimestamp(timestamp)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
