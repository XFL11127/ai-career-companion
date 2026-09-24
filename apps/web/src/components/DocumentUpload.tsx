'use client'

import { useRef, useState } from 'react'
import { FileText, Loader2, Upload } from 'lucide-react'
import { extractDocumentText } from '@/lib/document'

export function DocumentUpload({
  accept,
  label = '上传文件',
  hint,
  onExtract,
  disabled = false,
}: {
  accept: string
  label?: string
  hint?: string
  onExtract: (text: string, file: File) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [chars, setChars] = useState(0)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file?: File) => {
    if (!file) return
    setParsing(true)
    setError('')
    try {
      const text = await extractDocumentText(file)
      if (!text.trim()) throw new Error('没有提取到文本，可能是扫描版文件或加密文件')
      setName(file.name)
      setChars(text.length)
      onExtract(text, file)
    } catch (e) {
      setError(e instanceof Error ? e.message : '文件解析失败')
    } finally {
      setParsing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={disabled || parsing}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white/60 px-4 py-2 text-sm font-medium text-ink transition hover:border-accent/40 hover:text-accent disabled:opacity-50"
      >
        {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {parsing ? '正在解析…' : label}
      </button>
      {name && (
        <span className="ml-3 inline-flex items-center gap-1 text-xs text-forest">
          <FileText className="h-3.5 w-3.5" />
          {name} · {chars.toLocaleString()} 字
        </span>
      )}
      {hint && !name && <p className="mt-2 text-xs text-ink/45">{hint}</p>}
      {error && <p className="mt-2 text-xs text-accent">{error}</p>}
    </div>
  )
}
