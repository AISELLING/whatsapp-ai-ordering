import type { ReactNode } from 'react'

type ClassName = {
  className?: string
}

export function Tek9Logo({ className = '' }: ClassName) {
  return (
    <a href="/" className={`flex items-center gap-3 ${className}`}>
      <span className="grid h-10 w-10 place-items-center rounded-2xl border border-violet-300/20 bg-violet-500/15 text-lg font-black text-white shadow-[0_0_30px_rgba(168,85,247,0.35)]">
        t9
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-black tracking-tight text-white">
          tek9
        </span>
        <span className="block text-xs font-semibold text-slate-400">
          WhatsApp AI Ordering
        </span>
      </span>
    </a>
  )
}

export function GlowCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.045] shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  className = '',
}: {
  label: string
  value: ReactNode
  hint?: string
  className?: string
}) {
  return (
    <GlowCard className={`p-5 ${className}`}>
      <p className="text-sm font-semibold text-slate-400">{label}</p>
      <div className="mt-3 text-3xl font-black tracking-tight text-white">
        {value}
      </div>
      {hint && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
    </GlowCard>
  )
}

export function StatusBadge({
  status,
  className = '',
}: {
  status?: string
  className?: string
}) {
  const value = status || 'pending'
  const normalized = value.toLowerCase()
  const palette =
    normalized === 'paid' || normalized === 'completed' || normalized === 'ready'
      ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200'
      : normalized === 'rejected' || normalized === 'failed'
        ? 'border-rose-300/20 bg-rose-400/10 text-rose-200'
        : normalized === 'accepted' || normalized === 'preparing'
          ? 'border-cyan-300/20 bg-cyan-400/10 text-cyan-200'
          : 'border-violet-300/20 bg-violet-400/10 text-violet-200'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold capitalize ${palette} ${className}`}
    >
      {value.replaceAll('_', ' ')}
    </span>
  )
}

export function PricingCard({
  name,
  price,
  description,
  features,
  highlighted = false,
}: {
  name: string
  price: string
  description: string
  features: string[]
  highlighted?: boolean
}) {
  return (
    <GlowCard
      className={`relative p-6 transition hover:-translate-y-1 hover:border-violet-300/40 ${
        highlighted ? 'border-violet-300/40 bg-violet-500/10' : ''
      }`}
    >
      {highlighted && (
        <span className="absolute right-5 top-5 rounded-full border border-violet-300/30 bg-violet-400/15 px-3 py-1 text-xs font-bold text-violet-100">
          Most popular
        </span>
      )}
      <h3 className="text-xl font-black text-white">{name}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">
        {description}
      </p>
      <p className="mt-6 text-4xl font-black tracking-tight text-white">
        {price}
        <span className="text-base font-semibold text-slate-500">/mo</span>
      </p>
      <a
        href="/signup"
        className={`mt-6 inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-black transition ${
          highlighted
            ? 'bg-violet-400 text-slate-950 hover:bg-violet-300'
            : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
        }`}
      >
        Start Free Trial
      </a>
      <ul className="mt-6 space-y-3 text-sm text-slate-300">
        {features.map((feature) => (
          <li key={feature} className="flex gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.8)]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </GlowCard>
  )
}

export function PhoneMockup({ className = '' }: ClassName) {
  return (
    <div
      className={`mx-auto w-full max-w-[360px] rounded-[2rem] border border-white/15 bg-slate-950 p-3 shadow-[0_0_80px_rgba(124,58,237,0.3)] ${className}`}
    >
      <div className="overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#08111c]">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-4 py-3">
          <div>
            <p className="text-sm font-black text-white">tek9 AI</p>
            <p className="text-xs text-emerald-300">online now</p>
          </div>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
            WhatsApp
          </span>
        </div>
        <div className="space-y-3 p-4">
          <Bubble side="customer">Hi, can I get 2 burgers and a coke?</Bubble>
          <Bubble>
            Sure! Here&apos;s your order:
            <br />
            2x Classic Burger
            <br />
            1x Coke
            <br />
            Total: £20.50
          </Bubble>
          <Bubble>Would you like fries with that?</Bubble>
          <Bubble side="customer">Yes please!</Bubble>
          <Bubble>Great! Added fries.</Bubble>
          <button className="w-full rounded-2xl bg-gradient-to-r from-violet-400 to-cyan-300 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(103,232,249,0.25)]">
            Pay £25.50
          </button>
        </div>
      </div>
    </div>
  )
}

function Bubble({
  children,
  side = 'ai',
}: {
  children: ReactNode
  side?: 'ai' | 'customer'
}) {
  return (
    <div className={`flex ${side === 'customer' ? 'justify-end' : ''}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${
          side === 'customer'
            ? 'bg-violet-400 text-slate-950'
            : 'border border-white/10 bg-white/[0.06] text-slate-100'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
