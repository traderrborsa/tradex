'use client';

import { useId, useRef, useState, type MouseEvent } from 'react';

interface Props {
  accept: string;
  hint?: string;
  file: File | null;
  previewUrl?: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

function UploadIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 16V4m0 0 4 4m-4-4-4 4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function FileUpload({
  accept,
  hint,
  file,
  previewUrl,
  onChange,
  disabled = false,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const isImagePreview =
    previewUrl && (!file || file.type.startsWith('image/'));
  const hasFile = Boolean(file || previewUrl);

  function openPicker() {
    if (!disabled) inputRef.current?.click();
  }

  function clearFile(e: MouseEvent) {
    e.stopPropagation();
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Dosya yükle"
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        className={`rounded-xl border border-dashed p-4 transition ${
          dragOver
            ? 'border-foreground bg-elevated'
            : 'border-border bg-elevated/40'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-border-strong hover:bg-elevated'}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled) return;
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) onChange(dropped);
        }}
      >
        {isImagePreview ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex w-full items-center justify-center rounded-lg border border-border bg-card p-4">
              <img
                src={previewUrl}
                alt="Önizleme"
                className="max-h-36 w-auto max-w-full object-contain"
              />
            </div>
            <p className="max-w-full truncate text-sm text-muted">
              {file?.name ?? 'Yüklenen görsel'}
            </p>
          </div>
        ) : file ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card text-muted">
              <span className="text-xs font-bold uppercase">
                {file.name.split('.').pop()?.slice(0, 4) ?? 'DOS'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-subtle">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <div className="text-subtle">
              <UploadIcon />
            </div>
            <p className="text-sm text-muted">Dosyayı sürükleyip bırakın veya tıklayın</p>
          </div>
        )}

        {hasFile && !disabled && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={clearFile}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-950/30"
            >
              Kaldır
            </button>
          </div>
        )}
      </div>

      {hint && <p className="text-xs text-subtle">{hint}</p>}
    </div>
  );
}
