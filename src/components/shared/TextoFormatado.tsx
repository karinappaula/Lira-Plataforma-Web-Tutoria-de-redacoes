"use client";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

interface TextoFormatadoProps {
  texto: string;
  className?: string;
}

/**
 * Renderiza texto com suporte a Markdown básico: **negrito**, *itálico*, e
 * preserva quebras de linha simples (cada linha do texto original vira uma
 * quebra visual — não precisa de linha em branco entre parágrafos, o que
 * bate com o jeito que o enunciado é salvo hoje, uma linha por linha do PDF
 * original).
 *
 * Segurança: NÃO usa rehype-raw nem dangerouslySetInnerHTML. Qualquer HTML
 * digitado pela Admin (ex: <script>) é sempre escapado como texto puro,
 * nunca executado — o suporte a Markdown não abre brecha de XSS.
 *
 * Usado tanto no preview do formulário de cadastro (Admin) quanto, mais pra
 * frente, na tela de simulado do aluno — para o enunciado sempre aparecer
 * formatado do mesmo jeito nos dois lugares.
 */
export function TextoFormatado({ texto, className }: TextoFormatadoProps) {
  if (!texto.trim()) {
    return (
      <p className={`italic text-muted-foreground ${className ?? ""}`}>
        (nada para pré-visualizar ainda)
      </p>
    );
  }

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {texto}
      </ReactMarkdown>
    </div>
  );
}
