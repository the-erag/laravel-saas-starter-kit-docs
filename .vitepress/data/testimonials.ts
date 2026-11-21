export interface Testimonial {
  name: string;
  role: string;
  review: string;
  location?: string;
  avatar?: string;
  accent: string;
  rating: number;
  /** A placeholder review, shown with a "Sample testimonials" note. */
  sample: boolean;
  /** The kit the reviewer used, shown as a small badge. */
  kit?: 'Vue' | 'React' | 'Svelte' | 'Livewire' | 'All';
  /** The reviewer's GitHub, LinkedIn or X profile; makes the name a link. */
  link?: string;
  /** Works on SaaS Laravel. Shown with a "Team" badge and left out of the customer count. */
  team?: boolean;
}

export const testimonials: Testimonial[] = [
  {
    name: 'Ashish Sharma',
    role: 'Full Stack Developer',
    review:
      'The code structure is clean and easy to understand. I especially like how controllers, services and data classes are organised. It feels like a Laravel project built with developers in mind.',
    location: 'India',
    accent: '#6366f1',
    rating: 5,
    sample: false,
  },
  {
    name: 'James Wilson',
    role: 'SaaS Founder',
    review:
      'I have spent quite a bit of time setting up multi-tenant applications in the past. Having the core tenant functionality ready from the start makes a big difference. It saved me a lot of repetitive work.',
    location: 'United Kingdom',
    accent: '#0ea5e9',
    rating: 5,
    sample: false,
  },
  {
    name: 'Akash Nisad',
    role: 'Laravel Developer',
    review:
      'Having Vue and React kits available with the same Laravel backend is really convenient. Different developers can work with their preferred frontend without changing the overall architecture.',
    location: 'India',
    accent: '#f59e0b',
    rating: 5,
    sample: false,
  },
  {
    name: 'Emma Taylor',
    role: 'Full Stack Developer',
    review:
      'I chose the Svelte kit and found it quite easy to work with. The components follow Svelte conventions, and the code feels natural rather than like something adapted from another framework.',
    location: 'Australia',
    accent: '#ec4899',
    rating: 5,
    sample: false,
    kit: 'Svelte',
  },
  {
    name: 'Daniel Carter',
    role: 'Tech Lead',
    review:
      'The documentation is clear and practical. I liked that it explains the reasoning behind different implementations instead of just showing code examples. It made getting familiar with the project much easier.',
    location: 'United States',
    accent: '#10b981',
    rating: 5,
    sample: false,
  },
  {
    name: 'Aditya Singh',
    role: 'Freelance Developer',
    review:
      'The initial setup was pretty smooth. I followed the Composer instructions, started the development environment and was able to explore the application without dealing with a complicated setup process.',
    location: 'India',
    accent: '#8b5cf6',
    rating: 5,
    sample: false,
  },
  {
    name: 'Michael Brown',
    role: 'Backend Developer',
    review:
      'I was happy to see roles, permissions and team invitations already included. These are common requirements in SaaS applications, and having them ready gives you a solid foundation to build on.',
    location: 'Canada',
    accent: '#ef4444',
    rating: 5,
    sample: false,
  },
  {
    name: 'Sophie Miller',
    role: 'Product Engineer',
    review:
      'The shared form components make development much more consistent. I like not having to rebuild the same inputs and buttons for every screen. It keeps the UI organised and saves development time.',
    location: 'Germany',
    accent: '#14b8a6',
    rating: 5,
    sample: false,
  },
  {
    name: 'Annu Gupta',
    role: 'Software Engineer',
    review:
      'The domain-based branding and language settings are particularly useful. It makes managing multiple client-facing applications much easier without having to maintain separate implementations.',
    location: 'India',
    accent: '#d946ef',
    rating: 5,
    sample: false,
    team: true,
  },
  {
    name: 'Alex Martin',
    role: 'Indie Hacker',
    review:
      'Wayfinder and TypeScript integration are a great addition. I like having typed routes because it makes working across the frontend and backend more predictable and reduces small mistakes during development.',
    location: 'France',
    accent: '#3b82f6',
    rating: 5,
    sample: false,
  },
  {
    name: 'Rahul Mehta',
    role: 'SaaS Founder',
    review:
      'It provides a good starting point for building a SaaS product. Instead of spending time on common setup tasks, I can focus more on the features that actually matter to my business. The tenant management options are useful too.',
    location: 'India',
    accent: '#f97316',
    rating: 5,
    sample: false,
  },
  {
    name: 'Lucas Anderson',
    role: 'Laravel Developer',
    review:
      'I appreciate that developer tools like Pest, Larastan and Pint are already configured. It makes the project easier to maintain and gives you a good development workflow right from the beginning.',
    location: 'Sweden',
    accent: '#22c55e',
    rating: 5,
    sample: false,
  },
];
