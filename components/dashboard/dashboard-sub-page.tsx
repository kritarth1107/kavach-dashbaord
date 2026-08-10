import { PlaceholderPage } from "@/components/dashboard/placeholder-page";

type SubPageProps = {
  title: string;
  description: string;
};

export function DashboardSubPage({ title, description }: SubPageProps) {
  return <PlaceholderPage title={title} description={description} />;
}
