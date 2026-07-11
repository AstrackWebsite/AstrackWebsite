export interface NavItem {
  label: string;
  href: string;
  /** Out-of-scope for v1 — shown in nav as a disabled placeholder. */
  placeholder?: boolean;
}

export interface NavSection {
  heading?: string;
  items: NavItem[];
}

/** The hamburger navigation. Mirrors the spec's side menu. */
export const NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Staff", href: "/staff" },
      { label: "Projects", href: "/projects" },
      { label: "Plant & Equipment", href: "/plant" },
      { label: "Air Monitoring", href: "/air-monitoring" },
      { label: "Personal Monitoring", href: "/personal-monitoring" },
      { label: "Accident & Incident", href: "/incidents" },
      { label: "Audits", href: "/audits" },
      { label: "Project Planner", href: "/project-planner" },
    ],
  },
  {
    heading: "Coming later",
    items: [
      { label: "Client Portal", href: "/client-portal", placeholder: true },
    ],
  },
];
