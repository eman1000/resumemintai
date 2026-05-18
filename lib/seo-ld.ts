// lib/seo-ld.ts
//
// JSON-LD helpers for rich-result eligible structured data.
// These return plain objects — pages render them inside
// <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }} />.

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.resumemintai.com').replace(/\/$/, '');

export const SITE = {
  url: SITE_URL,
  name: 'ResumeMint',
  legalName: 'Plenqor LLC',
  logo: `${SITE_URL}/logo/resumemint-wordmark.svg`,
  icon: `${SITE_URL}/logo/resumemint-icon.svg`,
  email: 'support@plenqor.com',
  sameAs: [
    'https://x.com/resumemintai',
    'https://www.linkedin.com/company/resumemintai',
  ],
};

export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE.url}/#org`,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    logo: SITE.logo,
    sameAs: SITE.sameAs,
    contactPoint: [{
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: SITE.email,
      availableLanguage: ['English'],
    }],
  };
}

export function webSiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    publisher: { '@id': `${SITE.url}/#org` },
  };
}

export function softwareApplicationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.name,
    operatingSystem: 'Web',
    applicationCategory: 'BusinessApplication',
    url: SITE.url,
    publisher: { '@id': `${SITE.url}/#org` },
    offers: {
      '@type': 'Offer',
      price: '19.99',
      priceCurrency: 'EUR',
      url: `${SITE.url}/pricing`,
      category: 'subscription',
    },
  };
}

export function faqPageLd(faqs: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function breadcrumbLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE.url}${it.path.startsWith('/') ? it.path : '/' + it.path}`,
    })),
  };
}

export function jsonLdScript(data: unknown) {
  return {
    __html: JSON.stringify(data),
  };
}
