import {
  GlowCard,
  PhoneMockup,
  PricingCard,
  Tek9Logo,
} from '@/components/tek9'

const brands = [
  'Grill House',
  'Supplements UK',
  'Auto Parts',
  'Coffee Club',
  'Fashion Store',
]

const features = [
  'AI Order Taking',
  'Smart Upsells',
  'Secure Payments',
  'Order Management',
  'Analytics Dashboard',
  'Multiple Integrations',
]

const useCases = [
  'Restaurants',
  'Coffee Shops',
  'Shopify Stores',
  'Auto Parts',
  'Supplements',
]

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0B0F1A] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.22),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#0B0F1A,#070A12)]" />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Tek9Logo />
        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-300 md:flex">
          <a href="#features" className="transition hover:text-white">
            Features
          </a>
          <a href="#pricing" className="transition hover:text-white">
            Pricing
          </a>
          <a href="#customers" className="transition hover:text-white">
            Customers
          </a>
          <a href="/login" className="transition hover:text-white">
            Login
          </a>
          <a
            href="/signup"
            className="rounded-2xl bg-violet-400 px-5 py-3 font-black text-slate-950 transition hover:bg-violet-300"
          >
            Start Free Trial
          </a>
        </nav>
        <a
          href="/signup"
          className="rounded-2xl bg-violet-400 px-4 py-3 text-sm font-black text-slate-950 md:hidden"
        >
          Start
        </a>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
        <div>
          <span className="inline-flex rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-sm font-bold text-violet-100">
            AI-Powered WhatsApp Ordering
          </span>
          <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Turn WhatsApp Conversations Into More Sales.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            tek9 AI takes orders, suggests products, and gets customers to
            checkout - all inside WhatsApp.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="/signup"
              className="rounded-2xl bg-gradient-to-r from-violet-400 to-cyan-300 px-6 py-4 text-center text-sm font-black text-slate-950 shadow-[0_0_40px_rgba(168,85,247,0.25)] transition hover:scale-[1.02]"
            >
              Start Free Trial
            </a>
            <a
              href="#demo"
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-center text-sm font-black text-white transition hover:bg-white/10"
            >
              Watch Demo
            </a>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            {['No Coding', '5 Min Setup', '14-Day Free Trial'].map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300"
              >
                {pill}
              </span>
            ))}
          </div>
        </div>

        <div id="demo" className="relative">
          <div className="absolute inset-6 -z-10 rounded-full bg-violet-500/20 blur-3xl" />
          <PhoneMockup />
        </div>
      </section>

      <section id="customers" className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">
            Trusted by fast-moving operators
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {brands.map((brand) => (
              <GlowCard key={brand} className="px-4 py-4 text-center">
                <span className="font-black text-slate-200">{brand}</span>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="A complete ordering workflow in three moves."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ['01', 'Connect Your Business', 'Add your brand, products and WhatsApp ordering setup.'],
            ['02', 'AI Takes Orders', 'tek9 understands customer messages, confirms orders and suggests add-ons.'],
            ['03', 'Get Paid & Manage', 'Track orders, update statuses and move customers to checkout.'],
          ].map(([step, title, copy]) => (
            <GlowCard key={step} className="p-6">
              <span className="text-sm font-black text-cyan-200">{step}</span>
              <h3 className="mt-4 text-xl font-black text-white">{title}</h3>
              <p className="mt-3 leading-7 text-slate-400">{copy}</p>
            </GlowCard>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <SectionHeading
          eyebrow="Features"
          title="Built for WhatsApp-first commerce."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <GlowCard key={feature} className="p-6 transition hover:-translate-y-1">
              <div className="mb-5 h-11 w-11 rounded-2xl border border-violet-300/20 bg-violet-400/10 shadow-[0_0_24px_rgba(168,85,247,0.22)]" />
              <h3 className="text-xl font-black text-white">{feature}</h3>
              <p className="mt-3 leading-7 text-slate-400">
                Automate the repetitive work while keeping every customer flow
                clear, measurable and easy to manage.
              </p>
            </GlowCard>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <SectionHeading
          eyebrow="Use cases"
          title="One engine for many WhatsApp businesses."
        />
        <div className="mt-10 flex flex-wrap gap-3">
          {useCases.map((useCase) => (
            <span
              key={useCase}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 font-bold text-slate-200"
            >
              {useCase}
            </span>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <SectionHeading
          eyebrow="Pricing"
          title="Launch lean, scale when the orders do."
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <PricingCard
            name="Starter"
            price="£29"
            description="For a single brand validating WhatsApp ordering."
            features={['1 business', 'Menu manager', 'Basic order dashboard']}
          />
          <PricingCard
            name="Growth"
            price="£99"
            description="For growing teams that want automation and upsells."
            features={['Multiple menus', 'AI upsell prompts', 'Priority support']}
            highlighted
          />
          <PricingCard
            name="Pro"
            price="£299"
            description="For operators scaling across brands and workflows."
            features={['Multi-business tools', 'Advanced analytics', 'Custom integrations']}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <GlowCard className="p-8 text-center sm:p-12">
          <h2 className="text-4xl font-black tracking-tight text-white">
            Start selling through WhatsApp today.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Create your tek9 workspace, add a business and turn customer
            messages into managed orders.
          </p>
          <a
            href="/signup"
            className="mt-8 inline-flex rounded-2xl bg-violet-400 px-6 py-4 text-sm font-black text-slate-950 transition hover:bg-violet-300"
          >
            Start Free Trial
          </a>
        </GlowCard>
      </section>
    </main>
  )
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string
  title: string
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
        {title}
      </h2>
    </div>
  )
}
