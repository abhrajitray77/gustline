import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

const SOURCES = [
  { label: "Actual wind (FUELHH)", href: "https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream" },
  { label: "Wind forecasts (WINDFOR)", href: "https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream" },
];

const PROJECT = [
  { label: "API docs", href: "/api/docs" },
  { label: "Source code", href: "https://github.com/abhrajitray77/gustline" },
];

const NOTES = [
  "Times are UK local time.",
  "Actuals are averaged to hourly to match the forecasts.",
  "GB day-ahead auctions close at about 09:20 (EPEX) and 09:50 (N2EX) UK time.",
];

export function Footer() {
  return (
    // On desktop the footer breaks out of the page column into a full width bar at the bottom of the page.
    <footer className="mt-16 rounded-2xl border bg-card px-5 py-6 text-sm md:px-6 lg:mx-[calc(50%-50vw)] lg:-mb-10 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:px-[5vw] lg:py-8">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-2">
          <p className="flex items-center gap-2 font-semibold tracking-wide">
            <img src="/favicon.svg" alt="" className="size-5" /> GUSTLINE
          </p>
          <p className="max-w-sm text-muted-foreground">Day-ahead wind outlook for a GB supplier's trading desk. Pilot covering purchase decisions made in January 2026.</p>
        </div>
        <LinkColumn title="Data, Elexon BMRS" links={SOURCES} />
        <LinkColumn title="Project" links={PROJECT} />
      </div>
      <Separator className="my-5" />
      <div className="flex flex-col gap-3 text-xs text-faint lg:flex-row lg:items-center lg:justify-between">
        <ul className="flex flex-wrap gap-x-6 gap-y-1">
          {NOTES.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <p className="shrink-0">© {new Date().getFullYear()} Abhrajit Ray. All rights reserved.</p>
      </div>
    </footer>
  );
}

function LinkColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium tracking-wide text-faint uppercase">{title}</p>
      <ul className="space-y-1.5">
        {links.map((link) => (
          <li key={link.href}>
            <FooterLink href={link.href}>{link.label}</FooterLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="group inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
      <ArrowUpRight className="size-3.5 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
    </a>
  );
}
