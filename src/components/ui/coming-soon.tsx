import { PageHeader } from "@/components/ui/page-header";

type ComingSoonProps = {
  title: string;
  description?: string;
};

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
        <p className="text-sm font-medium text-zinc-900">Coming soon</p>
        <p className="mt-2 text-sm text-zinc-500">
          This section is on the roadmap. Mock data is active elsewhere.
        </p>
      </section>
    </>
  );
}
