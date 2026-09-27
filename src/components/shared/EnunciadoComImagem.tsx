"use client";

import { TextoFormatado } from "./TextoFormatado";

interface EnunciadoComImagemProps {
  enunciado: string;
  imagemUrl: string | null;
  className?: string;
}

// Aceita [IMAGEM], [imagem], [Imagem] etc — não é sensível a maiúsculas.
const MARCADOR_IMAGEM = /\[imagem\]/i;

/**
 * Renderiza o enunciado de uma questão, posicionando a imagem no lugar
 * exato indicado pelo marcador `[IMAGEM]` digitado pela Admin no texto.
 * O marcador nunca aparece pro aluno — é substituído pela imagem real.
 *
 * Se o marcador não existir no enunciado (questões cadastradas antes dessa
 * funcionalidade, ou que não precisam de posição específica), a imagem
 * aparece no final do texto — mantendo compatibilidade com o que já foi
 * cadastrado sem o marcador.
 */
export function EnunciadoComImagem({
  enunciado,
  imagemUrl,
  className,
}: EnunciadoComImagemProps) {
  if (!imagemUrl) {
    return <TextoFormatado texto={enunciado} className={className} />;
  }

  const match = enunciado.match(MARCADOR_IMAGEM);

  if (!match || match.index === undefined) {
    return (
      <div className={className}>
        <TextoFormatado texto={enunciado} />
        <img
          src={imagemUrl}
          alt="Imagem da questão"
          className="mt-3 max-h-80 rounded-md border border-border object-contain"
        />
      </div>
    );
  }

  const antes = enunciado.slice(0, match.index);
  const depois = enunciado.slice(match.index + match[0].length);

  return (
    <div className={className}>
      {antes.trim() && <TextoFormatado texto={antes} />}
      <img
        src={imagemUrl}
        alt="Imagem da questão"
        className="my-3 max-h-80 rounded-md border border-border object-contain"
      />
      {depois.trim() && <TextoFormatado texto={depois} />}
    </div>
  );
}