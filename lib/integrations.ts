export const INTEGRATION_CATEGORIES = [
  'pos_payments',
  'ecommerce',
  'bookings_appointments',
  'messaging_communication',
  'delivery_fulfilment',
  'accounting',
  'automation',
  'other',
] as const

export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number]

export type IntegrationSupportLevel =
  | 'ready'
  | 'priority'
  | 'coming_soon'
  | 'available_later'

export type IntegrationDefinition = {
  provider: string
  label: string
  category: IntegrationCategory
  description: string
  support: IntegrationSupportLevel
}

export const INTEGRATION_DEFINITIONS: IntegrationDefinition[] = [
  {
    provider: 'square',
    label: 'Square',
    category: 'pos_payments',
    description: 'POS and in-person/card payment processing.',
    support: 'priority',
  },
  {
    provider: 'stripe',
    label: 'Stripe',
    category: 'pos_payments',
    description: 'Online checkout and payment processing.',
    support: 'ready',
  },
  {
    provider: 'clover',
    label: 'Clover',
    category: 'pos_payments',
    description: 'POS terminals and retail payments.',
    support: 'coming_soon',
  },
  {
    provider: 'lightspeed',
    label: 'Lightspeed',
    category: 'pos_payments',
    description: 'Retail and restaurant POS integration.',
    support: 'coming_soon',
  },
  {
    provider: 'sumup',
    label: 'SumUp',
    category: 'pos_payments',
    description: 'Card readers and payment acceptance.',
    support: 'available_later',
  },
  {
    provider: 'zettle',
    label: 'Zettle',
    category: 'pos_payments',
    description: 'POS and payment devices by PayPal Zettle.',
    support: 'available_later',
  },
  {
    provider: 'shopify',
    label: 'Shopify',
    category: 'ecommerce',
    description: 'Product catalog and order sync from Shopify.',
    support: 'ready',
  },
  {
    provider: 'woocommerce',
    label: 'WooCommerce',
    category: 'ecommerce',
    description: 'Catalog sync for WordPress stores.',
    support: 'coming_soon',
  },
  {
    provider: 'bigcommerce',
    label: 'BigCommerce',
    category: 'ecommerce',
    description: 'Product and order sync from BigCommerce.',
    support: 'available_later',
  },
  {
    provider: 'appointedd',
    label: 'Appointedd',
    category: 'bookings_appointments',
    description: 'Booking availability and appointment creation.',
    support: 'priority',
  },
  {
    provider: 'square_bookings',
    label: 'Square Bookings',
    category: 'bookings_appointments',
    description: 'Booking and calendar workflow via Square.',
    support: 'coming_soon',
  },
  {
    provider: 'calendly',
    label: 'Calendly',
    category: 'bookings_appointments',
    description: 'Appointment scheduling workflows.',
    support: 'available_later',
  },
  {
    provider: 'google_calendar',
    label: 'Google Calendar',
    category: 'bookings_appointments',
    description: 'Calendar sync for bookings and availability.',
    support: 'priority',
  },
  {
    provider: 'whatsapp_cloud_api',
    label: 'WhatsApp Cloud API',
    category: 'messaging_communication',
    description: 'Direct WhatsApp messaging integration.',
    support: 'priority',
  },
  {
    provider: 'twilio_whatsapp',
    label: 'Twilio WhatsApp',
    category: 'messaging_communication',
    description: 'WhatsApp messaging via Twilio.',
    support: 'ready',
  },
  {
    provider: 'sms',
    label: 'SMS',
    category: 'messaging_communication',
    description: 'SMS notifications and customer messaging.',
    support: 'coming_soon',
  },
  {
    provider: 'email',
    label: 'Email',
    category: 'messaging_communication',
    description: 'Transactional and marketing email integration.',
    support: 'coming_soon',
  },
  {
    provider: 'uber_direct',
    label: 'Uber Direct',
    category: 'delivery_fulfilment',
    description: 'On-demand delivery dispatch and tracking.',
    support: 'available_later',
  },
  {
    provider: 'stuart',
    label: 'Stuart',
    category: 'delivery_fulfilment',
    description: 'Courier dispatch and local delivery.',
    support: 'available_later',
  },
  {
    provider: 'shipday',
    label: 'Shipday',
    category: 'delivery_fulfilment',
    description: 'Delivery fleet tracking and dispatch.',
    support: 'available_later',
  },
  {
    provider: 'deliveroo',
    label: 'Deliveroo',
    category: 'delivery_fulfilment',
    description: 'Marketplace channel order integration.',
    support: 'coming_soon',
  },
  {
    provider: 'just_eat',
    label: 'Just Eat',
    category: 'delivery_fulfilment',
    description: 'Marketplace channel order integration.',
    support: 'coming_soon',
  },
  {
    provider: 'xero',
    label: 'Xero',
    category: 'accounting',
    description: 'Accounting sync for invoices and payouts.',
    support: 'available_later',
  },
  {
    provider: 'quickbooks',
    label: 'QuickBooks',
    category: 'accounting',
    description: 'Accounting sync for bookkeeping and reports.',
    support: 'available_later',
  },
  {
    provider: 'zapier',
    label: 'Zapier',
    category: 'automation',
    description: 'Automation workflows across SaaS tools.',
    support: 'coming_soon',
  },
  {
    provider: 'make',
    label: 'Make',
    category: 'automation',
    description: 'Custom automation and integration scenarios.',
    support: 'coming_soon',
  },
]

export const INTEGRATION_PROVIDER_KEYS = INTEGRATION_DEFINITIONS.map(
  (item) => item.provider
) as string[]

export const INTEGRATION_CATALOG = new Map(
  INTEGRATION_DEFINITIONS.map((item) => [item.provider, item])
)

export const INTEGRATION_CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  pos_payments: 'POS / Payments',
  ecommerce: 'E-commerce',
  bookings_appointments: 'Bookings / Appointments',
  messaging_communication: 'Messaging / Communication',
  delivery_fulfilment: 'Delivery / Fulfilment',
  accounting: 'Accounting',
  automation: 'Automation',
  other: 'Other',
}

export function isIntegrationProvider(value: string) {
  return INTEGRATION_CATALOG.has(value)
}

export function getIntegrationDefinition(provider: string) {
  return INTEGRATION_CATALOG.get(provider)
}
