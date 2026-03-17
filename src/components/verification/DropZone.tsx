"use client";

import React, { useRef, useState } from "react";

interface DropZoneProps {
  onFileDrop: (file: File) => void;
  isLoading: boolean;
}

export function DropZone({ onFileDrop, isLoading }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileDrop(file);
  };

  return (
    <div className={`max-w-2xl mx-auto ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>
      <div
        className={`relative border-2 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-emerald-500 bg-emerald-500/10"
            : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/30"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          if (isLoading) return;
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".vex"
          disabled={isLoading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileDrop(file);
          }}
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-2">
            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-zinc-100 mb-1">
              Drop VEX Capsule
            </h3>
            <p className="text-zinc-500">
              Drag and drop your .vex file here or click to browse
            </p>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700 text-xs text-zinc-400">
              Zero Server-Side
            </span>
            <span className="px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700 text-xs text-zinc-400">
              Pure WASM Verification
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
