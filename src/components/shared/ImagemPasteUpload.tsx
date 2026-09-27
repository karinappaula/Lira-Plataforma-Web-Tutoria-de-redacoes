"use client";

import { useCallback, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadImagemQuestao } from "@/services/cloudinary";

interface ImagemPasteUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

/**
 * Campo de imagem para o formulário de questão.
 *
 * Suporta duas formas de entrada, pensadas para o fluxo real da Admin
 * copiando conteúdo de um PDF de prova:
 * - Colar (Ctrl+V): clica no campo e cola uma imagem copiada do PDF/print.
 * - Selecionar arquivo: fallback tradicional via input file.
 *
 * Em ambos os casos, o arquivo é enviado direto pro Cloudinary
 * (uploadImagemQuestao) e o componente só devolve a URL final via onChange
 * — toda a lógica de upload fica isolada no service, não aqui.
 */
export function ImagemPasteUpload({ value, onChange }: ImagemPasteUploadProps) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const enviarArquivo = useCallback(
    async (arquivo: File | Blob) => {
      setErro(null);
      setEnviando(true);
      try {
        const url = await uploadImagemQuestao(arquivo);
        onChange(url);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao enviar imagem.");
      } finally {
        setEnviando(false);
      }
    },
    [onChange]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLDivElement>) => {
      const item = Array.from(e.clipboardData.items).find((i) =>
        i.type.startsWith("image/")
      );
      if (!item) return;
      const arquivo = item.getAsFile();
      if (arquivo) {
        e.preventDefault();
        enviarArquivo(arquivo);
      }
    },
    [enviarArquivo]
  );

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (arquivo) enviarArquivo(arquivo);
    e.target.value = "";
  };

  if (value) {
    return (
      <div className="relative inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value}
          alt="Imagem da questão"
          className="max-h-48 rounded-md border border-border object-contain"
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow"
          aria-label="Remover imagem"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        onPaste={handlePaste}
        tabIndex={0}
        role="button"
        aria-label="Colar ou selecionar imagem da questão"
        className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted/30 text-sm text-muted-foreground outline-none transition-colors focus:border-primary"
      >
        {enviando ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Enviando imagem...</span>
          </>
        ) : (
          <>
            <ImagePlus className="h-5 w-5" />
            <span>Clique aqui e cole a imagem (Ctrl+V)</span>
            <span>
              ou{" "}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-primary underline underline-offset-2"
              >
                selecione um arquivo
              </button>
            </span>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {erro && <p className="mt-1 text-sm text-destructive">{erro}</p>}
    </div>
  );
}
