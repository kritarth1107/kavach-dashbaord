import type { McpIntegrationPartner } from "@/lib/api";

export type IntegrationPartnerMeta = {
  key: McpIntegrationPartner;
  title: string;
  subtitle: string;
  logoSrc: string;
  href: string;
  tagline: string;
};

export const INTEGRATION_PARTNERS: IntegrationPartnerMeta[] = [
  {
    key: "swiggy",
    title: "Swiggy Food",
    subtitle: "Restaurant meals and food delivery",
    logoSrc: "/assets/swiggy.svg",
    href: "/dashboard/integrations/swiggy",
    tagline: "Order food from Saheli chat using your Swiggy account.",
  },
  {
    key: "instamart",
    title: "Instamart",
    subtitle: "Groceries and daily essentials",
    logoSrc: "/assets/instamart.svg",
    href: "/dashboard/integrations/instamart",
    tagline: "Stock up on groceries through Saheli with live Instamart prices.",
  },
  {
    key: "zepto",
    title: "Zepto",
    subtitle: "10-minute grocery delivery",
    logoSrc: "/assets/zepto.svg",
    href: "/dashboard/integrations/zepto",
    tagline: "Quick grocery runs from Saheli via your Zepto account.",
  },
];

export const INTEGRATION_PARTNER_BY_KEY = Object.fromEntries(
  INTEGRATION_PARTNERS.map((p) => [p.key, p]),
) as Record<McpIntegrationPartner, IntegrationPartnerMeta>;

export function isIntegrationPartner(value: string): value is McpIntegrationPartner {
  return value === "swiggy" || value === "instamart" || value === "zepto";
}
