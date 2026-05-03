'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/tek9'

const tones = ['Friendly', 'Professional', 'Upsell', 'Minimal']

export default function AiSettingsPage() {
  const [tone, setTone] = useState('Friendly')
  const [upsellsEnabled, setUpsellsEnabled] = useState(true)
  const [responses, setResponses] = useState({
    deliveryTime: 'Delivery usually takes 30-45 minutes.',
    outOfStock: 'Sorry, that item is currently unavailable. Can I suggest an alternative?',
    refundPolicy: 'Refunds are reviewed by the store team after the order is checked.',
  })
  const [message, setMessage] = useState('')

  const saveSettings = () => {
    setMessage('AI settings saved locally. Backend persistence is not connected yet.')
  }

  return (
    <>
      <section className="mb-6">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">
          AI controls
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
          AI Settings
        </h1>
        <p className="mt-2 text-slate-400">
          Configure the conversation style and default customer responses.
        </p>
      </section>

      {message && (
        <p className="mb-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-cyan-100">
          {message}
        </p>
      )}

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <GlowCard className="p-5">
          <h2 className="text-2xl font-black text-white">AI Tone</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {tones.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTone(item)}
                className={`rounded-2xl border p-5 text-left transition ${
                  tone === item
                    ? 'border-violet-300/40 bg-violet-400/15'
                    : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
                }`}
              >
                <span className="text-lg font-black text-white">{item}</span>
                <span className="mt-2 block text-sm leading-6 text-slate-400">
                  {toneDescription(item)}
                </span>
              </button>
            ))}
          </div>

          <label className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <span>
              <span className="block font-black text-white">Smart upsells</span>
              <span className="mt-1 block text-sm text-slate-400">
                Let tek9 suggest relevant add-ons during the conversation.
              </span>
            </span>
            <input
              type="checkbox"
              checked={upsellsEnabled}
              onChange={(event) => setUpsellsEnabled(event.target.checked)}
              className="h-5 w-5 accent-violet-400"
            />
          </label>
        </GlowCard>

        <GlowCard className="p-5">
          <h2 className="text-2xl font-black text-white">Preview</h2>
          <div className="mt-5 rounded-2xl border border-white/10 bg-[#08111c] p-4">
            <p className="text-sm font-black text-cyan-200">tek9 AI</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Hi! I can help with your order today. Would you like any add-ons
              before checkout?
            </p>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Backend persistence is intentionally a placeholder until the AI
            settings API is added.
          </p>
        </GlowCard>
      </section>

      <GlowCard className="mt-5 p-5">
        <h2 className="text-2xl font-black text-white">Custom Responses</h2>
        <div className="mt-5 grid gap-4">
          <Field label="Delivery time">
            <textarea
              value={responses.deliveryTime}
              onChange={(event) =>
                setResponses({ ...responses, deliveryTime: event.target.value })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Out of stock">
            <textarea
              value={responses.outOfStock}
              onChange={(event) =>
                setResponses({ ...responses, outOfStock: event.target.value })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Refund policy">
            <textarea
              value={responses.refundPolicy}
              onChange={(event) =>
                setResponses({ ...responses, refundPolicy: event.target.value })
              }
              className={inputClass}
            />
          </Field>
        </div>
        <button
          type="button"
          onClick={saveSettings}
          className="mt-5 rounded-2xl bg-violet-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-violet-300"
        >
          Save
        </button>
      </GlowCard>
    </>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-200">
      {label}
      {children}
    </label>
  )
}

function toneDescription(tone: string) {
  if (tone === 'Professional') return 'Clear, concise and operations-focused.'
  if (tone === 'Upsell') return 'Helpful suggestions with stronger add-on prompts.'
  if (tone === 'Minimal') return 'Short replies for fast ordering.'
  return 'Warm, conversational and customer-friendly.'
}

const inputClass =
  'min-h-28 w-full resize-y rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-300/50'
