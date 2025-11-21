# Frontend Guideline Document

This document outlines the frontend setup for your Distributor Application. It covers the architecture, design principles, styling, component structure, state management, routing, performance optimizations, testing, and a final summary. It uses everyday language so anyone—even non-technical stakeholders—can understand how our frontend is organized and why.

---

## 1. Frontend Architecture

**Overview**
- Framework: Next.js (App Router) running on the Bun JavaScript runtime.  
- Language: TypeScript for end-to-end type safety.  
- UI Library: `shadcn/ui` components for consistent, accessible building blocks.  
- Styling: Tailwind CSS for utility-first, responsive design.  
- Data Fetching: TanStack Query (React Query) for server-state caching and invalidation.  
- Client-State: Zustand for local UI state (e.g., POS cart).  
- Monorepo Layout (via Bun Workspaces):  
  • `apps/web/` – Next.js frontend  
  • `apps/api/` – Express backend  
  • `packages/shared-types/` – Zod schemas and TypeScript interfaces shared across both  

**How It Supports Scalability, Maintainability, Performance**  
- **Scalability:** Modular folder structure (`app/`, `components/`, `hooks/`, `lib/`) makes it easy to add new features without clutter. Monorepo sharing enforces consistency and reduces duplication.  
- **Maintainability:** TypeScript + Zod schemas guarantee data contracts between frontend and backend. Reusable UI components and provider patterns keep code DRY.  
- **Performance:** Next.js App Router allows server components (fast initial render) and client components (for interactivity). Bun offers ultra-fast startup times. Code splitting, static generation (SSG), and lazy loading minimize bundle sizes.

---

## 2. Design Principles

1. **Usability:**  
   - Intuitive layouts and clear calls to action.  
   - Consistent navigation patterns across pages.  
2. **Accessibility:**  
   - Follow WCAG guidelines (semantic HTML, proper ARIA attributes, keyboard focus).  
   - Contrast ratios meet or exceed AA standards.  
3. **Responsiveness:**  
   - Mobile-first approach with utility classes for breakpoints.  
   - Flexible grid and flex layouts adjust seamlessly to screen sizes.  
4. **Consistency:**  
   - Shared design tokens (colors, spacing, typography).  
   - Centralized layout in `app/layout.tsx` ensures uniform headers, footers, and sidebars.  
5. **Clarity & Feedback:**  
   - Loading indicators and error messages inform the user of system state.  
   - Disabled states for buttons prevent accidental double-submits.

These principles guide every UI decision, from choosing component variants in `shadcn/ui` to spacing utilities in Tailwind.

---

## 3. Styling and Theming

**Styling Approach**  
- Utility-first styling with Tailwind CSS.  
- No separate CSS or SASS files—configuration lives in `tailwind.config.ts`.  
- BEM or extra modifiers are only used for very complex custom components; otherwise, Tailwind classes suffice.

**Theming**  
- Light and dark modes powered by CSS variables in `:root` and a context/provider for toggling.  
- Customize via `tailwind.config.ts` under the `theme.extend` section.

**Visual Style**  
- Modern flat design: clean surfaces, subtle shadows, simple iconography.  

**Color Palette**  
- Primary: #4F46E5 (Indigo-600)  
- Secondary: #9333EA (Purple-600)  
- Accent: #10B981 (Emerald-500)  
- Background (Light): #F9FAFB  
- Surface (Cards, Panels): #FFFFFF  
- Text Primary: #111827  
- Text Secondary: #6B7280  
- Danger/Error: #DC2626  
- Success: #059669

**Typography**  
- Font Family: Inter, system-UI fallback  
- Base font size: 16px with responsive scaling via Tailwind’s `text-sm`, `text-base`, `text-lg` utilities  
- Line height and letter spacing use Tailwind defaults for readability

---

## 4. Component Structure

**Folder Layout**
- `app/` – Next.js routes, layouts, and page files.  
- `components/`  
  • `ui/` – Wrapped `shadcn/ui` components and brand-specific variants.  
  • `common/` – Generic components (Buttons, Modals, Tables).  
  • `pos/` – POS-specific UI like `Cart.tsx`.  
- `hooks/` – Custom React hooks (e.g., `useAuth`, `useCart`).  
- `lib/` – Utilities and API client (`api-client.ts`).

**Reusability & Maintainability**
- Each component lives in its own folder with `.tsx`, `.test.tsx`, and optional style files.  
- Shared logic (like formatting dates or currency) lives in `lib/utils.ts`.  
- Provider pattern ensures global services (Auth, Theme) are available via React Context.

---

## 5. State Management

1. **Server State:**  
   - **React Query (TanStack Query)** handles data fetching, caching, and background refetches.  
   - Queries and mutations are defined in `hooks/queries` and `hooks/mutations`.  
2. **Client State:**  
   - **Zustand** manages ephemeral UI state (cart items, offline queue).  
   - Stores defined in `stores/` with actions and selectors.  
3. **Authentication State:**  
   - Custom `AuthContext` provides user info and JWT tokens.  
   - Token renewal and RBAC checks happen inside this provider.  
4. **Shared Types & Validation:**  
   - Zod schemas in `packages/shared-types/` ensure the same shape of data on both frontend and backend.

---

## 6. Routing and Navigation

- **Next.js App Router:** File-system based routing in `app/`.  
- **Layouts & Nested Routes:**  
  • `app/layout.tsx` for global UI.  
  • `app/dashboard/` for authenticated sections.  
- **Protected Routes:**  
  • `AuthGuard` component wraps routes needing login/roles.  
- **Client-side Navigation:**  
  • Use Next.js `<Link>` for internal links.  
  • Highlight active menu items using `usePathname()`.

---

## 7. Performance Optimization

1. **Server Components & SSG:**  
   - Render static pages at build time when data is known.  
   - Use Server Components for read-only pages to reduce bundle size.  
2. **Code Splitting & Lazy Loading:**  
   - Dynamically import heavy components (charts, maps) with `next/dynamic`.  
3. **Asset Optimization:**  
   - Next.js `Image` component for responsive, lazy-loaded images.  
   - Purge unused CSS via Tailwind’s `content` paths.  
4. **Caching:**  
   - HTTP caching headers for static assets.  
   - React Query’s stale-while-revalidate pattern for data freshness.  
5. **Runtime:**  
   - Bun for sub-10ms cold starts and lightning-fast script execution.

---

## 8. Testing and Quality Assurance

1. **Unit Tests:**  
   - Vitest for pure functions, utility modules, Zod validators, business logic in hooks and stores.  
2. **Integration Tests:**  
   - React Testing Library for component behavior (forms, buttons, modals).  
3. **End-to-End Tests:**  
   - Playwright scripts covering key user flows:  
     • Sign-up / Sign-in  
     • Price Scheme CRUD  
     • POS checkout  
4. **Linting & Formatting:**  
   - ESLint with TypeScript rulesets.  
   - Prettier for consistent code style.  
5. **Continuous Integration:**  
   - GitHub Actions (or similar) run tests, lint, and type checks on every pull request.

---

## 9. Conclusion and Overall Frontend Summary

Our Distributor Application’s frontend is built with performance, scalability, and developer joy in mind. By combining Next.js (App Router) with Bun, TypeScript, Tailwind CSS, and a component-driven approach, we achieve:  
- **Fast Load Times:** Server components, SSG, and Bun ensure minimal waiting.  
- **Easy Maintenance:** Modular code, shared types, and clear folder structure.  
- **Consistent UX:** Design principles enforcing usability, accessibility, and responsiveness.  
- **Robust State Handling:** React Query for server data, Zustand for client state, and shared Zod schemas.  
- **High Quality:** Comprehensive testing and linting guard against regressions.  

This setup empowers teams to deliver new features—like advanced POS workflows or bulk imports—quickly and confidently, all while providing end users with a smooth, responsive experience.

*End of Frontend Guideline Document*