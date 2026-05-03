import { PricingCard, Tek9Logo } from '@/components/tek9'

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#0B0F1A] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.22),transparent_34%),linear-gradient(180deg,#0B0F1A,#070A12)]" />
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Tek9Logo />
        <nav className="flex items-center gap-3">
          <a
            href="/login"
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10"
          >
            Login
          </a>
          <a
            href="/signup"
            className="rounded-2xl bg-violet-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-violet-300"
          >
            Start Free Trial
          </a>
        </nav>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-20 pt-16 text-center sm:px-8">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">
          Pricing
        </p>
        <h1 className="mx-auto mt-4 max-w-4xl text-5xl font-black tracking-tight text-white sm:text-6xl">
          Premium WhatsApp ordering without enterprise drag.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          Pick the plan that matches your order volume. Upgrade as your tek9
          workspace grows.
        </p>

        <div className="mt-12 grid gap-5 text-left lg:grid-cols-3">
          <PricingCard
            name="Starter"
            price="£29"
            description="For one business getting started with WhatsApp ordering."
            features={['1 business workspace', 'Product menu manager', 'Orders dashboard', 'Basic AI order flow']}
          />
          <PricingCard
            name="Growth"
            price="£99"
            description="For operators who want richer automation and upsells."
            features={['Multi-business ready', 'Smart upsell prompts', 'Menu import tools', 'Priority support']}
            highlighted
          />
          <PricingCard
            name="Pro"
            price="£299"
            description="For teams scaling high-volume WhatsApp commerce."
            features={['Advanced workflows', 'Custom integrations', 'Dedicated onboarding', 'Enhanced analytics']}
          />
        </div>
      </section>
    </main>
  )
}
