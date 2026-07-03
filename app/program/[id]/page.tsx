import { notFound } from "next/navigation";

import ProgramDetail from "@/components/ProgramDetail";
import { getProgramById, programs } from "@/lib/programs";

export function generateStaticParams() {
  return programs.map((program) => ({
    id: program.id
  }));
}

type ProgramDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProgramDetailPage({ params }: ProgramDetailPageProps) {
  const { id } = await params;
  const program = getProgramById(id);

  if (!program) {
    notFound();
  }

  return <ProgramDetail program={program} />;
}
