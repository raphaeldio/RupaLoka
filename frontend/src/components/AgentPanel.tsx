import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAgent } from '../lib/agentStore'
import { ApiError, postChat, shouldUseScript, splitAnswer } from '../lib/api'
import type { ChatResponse, HistoryTurn } from '../lib/api.types'
import Mascot from './Mascot'

type Msg =
  | { kind: 'script'; text: string }
  | { kind: 'user'; text: string }
  | { kind: 'answer'; resp: ChatResponse }
  | { kind: 'notice'; text: string }

const MAX_LEN = 500

/** Nama dan visual maskot belum final (T-005); sementara "Pemandu". */
export const AGENT_NAME = 'Pemandu'

function Answer({ resp, onSuggest }: { resp: ChatResponse; onSuggest: (q: string) => void }) {
  const parts = splitAnswer(resp.answer, resp.citations)
  return (
    <div>
      <p className="leading-relaxed">
        {parts.map((p, i) =>
          p.type === 'text' ? (
            <span key={i}>{p.text}</span>
          ) : (
            <a
              key={i}
              href={p.citation.url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              title={p.citation.title}
              className="mx-0.5 inline-grid min-w-5 place-items-center rounded-md bg-teal-50 px-1 align-baseline text-[11px] font-extrabold text-teal hover:bg-teal hover:text-white"
            >
              {p.n}
              <span className="sr-only">: sumber {p.citation.title}</span>
            </a>
          ),
        )}
      </p>
      {resp.grounded && resp.citations.length > 0 && (
        <ol className="mt-2 space-y-0.5 border-t border-garis pt-2 text-[11px] text-redup">
          {resp.citations.map((c, i) => (
            <li key={c.chunk_id}>
              [{i + 1}]{' '}
              {c.url ? (
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                  {c.title}
                </a>
              ) : (
                c.title
              )}
            </li>
          ))}
        </ol>
      )}
      {!resp.grounded && resp.suggestions.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {resp.suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => onSuggest(s)}
                className="rounded-full border border-teal/40 bg-white px-2.5 py-1 text-xs font-semibold text-teal hover:bg-teal hover:text-white"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Isi chatbot pemandu (F-010–F-014). Skrip per fase dari `useAgent().say`; tanya bebas
 * memanggil /api/chat. Bila AI gagal (jaringan, 429, 503), tampil pemberitahuan dan alur
 * tetap berjalan dengan skrip.
 */
export default function AgentPanel({ cityId, onClose }: { cityId: string; onClose?: () => void }) {
  const scripts = useAgent((s) => s.scripts)
  const request = useAgent((s) => s.request)
  const mood = useAgent((s) => s.mood)
  const setMood = useAgent((s) => s.setMood)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [history, setHistory] = useState<HistoryTurn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const ctrlRef = useRef<AbortController | null>(null)
  const shownScript = useRef(0)
  const lastRequest = useRef<number | null>(null)

  useEffect(() => {
    const fresh = scripts.filter((s) => s.id > shownScript.current)
    if (fresh.length === 0) return
    shownScript.current = fresh.at(-1)!.id
    setMsgs((m) => [...m, ...fresh.map((s) => ({ kind: 'script' as const, text: s.text }))])
  }, [scripts])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, busy])

  useEffect(() => () => ctrlRef.current?.abort(), [])

  const ask = async (text: string, lessonId?: string | null) => {
    const message = text.trim().slice(0, MAX_LEN)
    if (!message || busy) return
    const context = useAgent.getState().context
    setMsgs((m) => [...m, { kind: 'user', text: message }])
    setInput('')
    setBusy(true)
    setMood('thinking')
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    try {
      const resp = await postChat(
        {
          city_id: cityId,
          context: { phase: context.phase ?? null, lesson_id: lessonId ?? context.lesson_id ?? null },
          message,
          history: history.slice(-6),
        },
        ctrl.signal,
      )
      setMsgs((m) => [...m, { kind: 'answer', resp }])
      setHistory((h) =>
        [...h, { role: 'user' as const, content: message }, { role: 'assistant' as const, content: resp.answer }].slice(-6),
      )
      setMood('talking')
    } catch (err) {
      if (ctrl.signal.aborted) return
      let notice = 'Maaf, pemandu belum bisa menjawab sekarang. Kamu tetap bisa melanjutkan petualangan.'
      if (err instanceof ApiError && err.status === 429) notice = 'Pertanyaannya banyak sekali! Tunggu sebentar, lalu coba lagi, ya.'
      else if (!shouldUseScript(err)) notice = 'Pertanyaan ini belum bisa diproses. Coba tulis dengan kalimat lain.'
      setMsgs((m) => [...m, { kind: 'notice', text: notice }])
      setMood('idle')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (mood !== 'talking') return
    const id = window.setTimeout(() => setMood('idle'), 1600)
    return () => window.clearTimeout(id)
  }, [mood, setMood])

  useEffect(() => {
    if (request && request.id !== lastRequest.current) {
      lastRequest.current = request.id
      void ask(request.text, request.lessonId)
    }
    // ask sengaja bukan dependensi: hanya permintaan baru yang memicu pengiriman.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void ask(input)
  }

  return (
    <section aria-label={`Chat ${AGENT_NAME}`} className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-garis bg-white shadow-melayang">
      <header className="flex items-center gap-3 border-b border-garis bg-teal-50/60 px-4 py-3">
        <Mascot mood={mood} className="size-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-teal">{AGENT_NAME}</p>
          <p className="text-[11px] text-redup">Menjawab dari sumber terverifikasi saja</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup chat"
            className="grid size-8 place-items-center rounded-full text-redup hover:bg-white hover:text-tinta"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </header>

      <div ref={listRef} role="log" aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
        {msgs.map((m, i) => {
          if (m.kind === 'user') {
            return (
              <p key={i} className="ml-8 rounded-2xl rounded-br-md bg-teal px-3 py-2 text-white">
                {m.text}
              </p>
            )
          }
          const tone =
            m.kind === 'notice' ? 'bg-amber-50 text-tinta' : m.kind === 'answer' && !m.resp.grounded ? 'bg-pasir/60' : 'bg-kertas'
          return (
            <div key={i} className={`mr-4 rounded-2xl rounded-bl-md px-3 py-2 ${tone}`}>
              {m.kind === 'answer' ? <Answer resp={m.resp} onSuggest={(q) => void ask(q)} /> : <p>{m.text}</p>}
            </div>
          )
        })}
        {busy && (
          <p className="mr-4 w-fit rounded-2xl bg-kertas px-3 py-2 text-redup" aria-label="Pemandu sedang mengetik">
            <span className="motion-safe:animate-pulse">…</span>
          </p>
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-garis p-3">
        <label htmlFor={`tanya-${cityId}`} className="sr-only">
          Tanya {AGENT_NAME}
        </label>
        <input
          id={`tanya-${cityId}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={MAX_LEN}
          placeholder="Tanya tentang budaya kota ini…"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-2xl border border-garis bg-kertas px-3 py-2 text-sm outline-none focus:border-teal"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-2xl bg-teal px-4 py-2 text-sm font-extrabold text-white transition hover:bg-teal-600 disabled:opacity-50"
        >
          Tanya
        </button>
      </form>
    </section>
  )
}
