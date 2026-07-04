import { notFound } from "next/navigation";
import type { Metadata } from "next";

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

export async function generateMetadata({ params }: ProgramDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const program = getProgramById(id);

  if (!program) {
    return {
      title: "Program not found"
    };
  }

  const title = `${program.school} ${program.program} Deadline, GRE, TOEFL, Official Links`;
  const description = `Check ${program.school} ${program.program} application deadlines, GRE and TOEFL requirements, official program pages, international student links, and application entry.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/program/${program.id}`
    },
    openGraph: {
      title,
      description,
      type: "article"
    }
  };
}

export default async function ProgramDetailPage({ params }: ProgramDetailPageProps) {
  const { id } = await params;
  const program = getProgramById(id);

  if (!program) {
    notFound();
  }

  return <ProgramDetail program={program} />;
}
