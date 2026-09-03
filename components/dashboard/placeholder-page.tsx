type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center py-16">
      <div className="panel-card max-w-md p-10 text-center">
        <h2 className="text-xl font-extrabold text-[var(--text-primary)]">{title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-tertiary)]">
          {description}
        </p>
      </div>
    </div>
  );
}
