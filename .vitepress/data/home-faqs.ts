/**
 * Questions for the FAQ section on the home page. The same list feeds the FAQPage JSON-LD in seo.ts,
 * so the structured data always matches the page. Answers use two bits of Markdown: [text](url) links
 * and `code`. Keep every answer true to the kits and the docs.
 */
export interface HomeFaq {
  question: string;
  answer: string;
}

export const homeFaqs: HomeFaq[] = [
  {
    question: 'What is a multi-tenant SaaS in Laravel, and how does SaaS Laravel handle it?',
    answer:
      'A multi-tenant SaaS runs one Laravel app for many customers, and each customer (tenant) only sees their own data. SaaS Laravel uses stancl/tenancy in multi-database mode, so every tenant gets its own database and the domain of each request decides which tenant is active. See the [multi-tenancy docs](/docs/core/multi-tenancy.html).',
  },
  {
    question: 'How do the central database and the tenant databases work?',
    answer:
      'The central database holds your tenants, their domains, your own admin users, global settings and the queue. Each tenant database holds that customer’s users, roles, menus and sessions. Each side has its own migrations and seeders, and the [database docs](/docs/core/database.html) list every table.',
  },
  {
    question: 'How do I manage tenants from the central admin?',
    answer:
      'The Tenants screen in the central app lets you create, edit and delete tenants, with search, a status filter and counts. Creating a tenant makes its database, runs the tenant migrations and seeders, and can email an invitation to the tenant’s admin. You can mark a tenant as active, trial or suspended, and deleting a tenant drops its database. See [managing tenants](/docs/core/multi-tenancy.html#managing-tenants).',
  },
  {
    question: 'How do I run tenant migrations and seeders?',
    answer:
      'Tenant migrations live in `database/migrations/tenant` and run on their own when you create a tenant. For existing tenants, run `php artisan tenants:migrate` (add `--tenants=1` for a single tenant) and `php artisan tenants:seed`. Read more in [tenant migrations and seeders](/blog/laravel-tenant-migrations-seeders.html).',
  },
  {
    question: 'Does each tenant get its own subdomain?',
    answer:
      'Yes. Each tenant gets one or more subdomains of your app domain, like acme.your-app.com, and one of them is the primary domain. Each domain can have its own app name, default language and sign-in options. Fully custom domains like app.customer.com aren’t built in, but [this guide](/blog/laravel-tenant-custom-domains.html) shows how to add them.',
  },
  {
    question: 'Is each tenant’s data kept separate from other customers?',
    answer:
      'Yes. Every tenant has its own database, so one tenant’s queries can’t reach another tenant’s rows. Cache entries are tagged per tenant, file storage gets its own folder per tenant, and queued jobs remember which tenant they belong to. All tenant databases sit on the same database server, and [single vs multi-database tenancy](/blog/single-vs-multi-database-tenancy-laravel.html) explains the trade-offs.',
  },
  {
    question: 'Which Laravel and PHP versions does it need, and which frontends can I pick?',
    answer:
      'The kits run on Laravel 13 and need PHP 8.4 or newer, Composer 2, a current Node LTS and MySQL. You pick Vue, React or Svelte with Inertia, or Livewire with Blade, and every kit has the same SaaS features. See the [requirements](/docs/getting-started/requirements.html).',
  },
  {
    question: 'Is billing included, and can I use my own payment gateway?',
    answer:
      'No, billing isn’t included, on purpose. You add the provider that fits your product, like Stripe, Paddle or Razorpay. [Laravel Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing.html) shows one way to add it.',
  },
  {
    question: 'How do I pay and get access to the code?',
    answer:
      'You pay once through GitHub Sponsors. As soon as the payment goes through, your GitHub account gets an invitation to the private kit repository, and you keep access, including every weekly update. There’s no subscription. See [how to pay](/how-to-pay.html).',
  },
  {
    question: 'Can I use the kit for client projects?',
    answer:
      'Yes. The license lets you build unlimited projects for yourself or for clients and hand the finished app over to them. You can’t resell, share or publish the kit’s source code. Read the [license](/license.html).',
  },
];

/** The answer as plain text, as it reads on the page (link text kept, Markdown removed). */
export const faqPlainText = (answer: string): string => answer.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`([^`]+)`/g, '$1');

export type FaqPart = { type: 'text' | 'code'; text: string } | { type: 'link'; text: string; href: string };

/** Splits an answer into text, `code` and [link](url) parts for rendering. */
export const faqParts = (answer: string): FaqPart[] =>
  answer
    .split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`)/)
    .filter(Boolean)
    .map((part): FaqPart => {
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

      if (link) {
        return { type: 'link', text: link[1], href: link[2] };
      }

      return part.startsWith('`') && part.endsWith('`') ? { type: 'code', text: part.slice(1, -1) } : { type: 'text', text: part };
    });
