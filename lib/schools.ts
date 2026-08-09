import schoolsData from "@/data/schools.json";
import schoolRankingsData from "@/data/school-rankings.json";
import schoolMottosData from "@/data/school-mottos.json";
import { programs } from "@/lib/programs";

export type SchoolProfile = {
  schoolType: "Public" | "Private";
  city: string;
  acceptanceRate: string | null;
  acceptanceRateScope: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceType?: "official" | "government-third-party" | "third-party";
  updated: string;
  scorecard?: {
    unitId: string;
    sourceInstitution: string;
    sourceLabel: string;
    sourceUrl: string;
    updated: string;
    tuitionOutOfState: number | null;
    tuitionInState: number | null;
    estimatedAttendance: number | null;
    averageGrantAid: number | null;
    undergraduateSize: number | null;
    internationalStudentRate: number | null;
    admissionRate: number | null;
    pellGrantRate: number | null;
    meanEarnings10Years: number | null;
    completionRate: number | null;
    retentionRate: number | null;
  };
};

const schoolProfiles = schoolsData as Record<string, SchoolProfile>;

export type SchoolMotto = {
  original: string;
  en: string;
  zh: string;
  sourceUrl: string;
  unofficial?: boolean;
};

const schoolMottos = schoolMottosData as Record<string, SchoolMotto>;

export type SchoolRankingSource = {
  name: string;
  edition: string;
  url: string;
  country: string;
  updated: string;
};

export type CwurRanking = {
  sourceInstitution: string;
  worldRank: number;
  nationalRank: number;
  score: number;
  sourceUrl: string;
};

const schoolRankingSource = schoolRankingsData.source as SchoolRankingSource;
const cwurRankings = schoolRankingsData.rankings as Record<string, CwurRanking>;

export type SchoolRankingEntry = SchoolProfile & {
  school: string;
  ranking: CwurRanking;
  acceptanceRateValue: number | null;
  programCount: number;
  undergraduateProgramCount: number;
  graduateProgramCount: number;
};

export function getSchoolProfile(school: string) {
  return schoolProfiles[school] ?? null;
}

export function getSchoolMotto(school: string) {
  return schoolMottos[school] ?? null;
}

export function getSchoolRankingSource() {
  return schoolRankingSource;
}

export function getSchoolRankings() {
  const programCounts = programs.reduce<
    Record<string, { total: number; undergraduate: number; graduate: number }>
  >((counts, program) => {
    const current = counts[program.school] ?? {
      total: 0,
      undergraduate: 0,
      graduate: 0
    };

    current.total += 1;

    if (program.level === "Undergraduate") {
      current.undergraduate += 1;
    } else {
      current.graduate += 1;
    }

    counts[program.school] = current;
    return counts;
  }, {});

  return Object.entries(schoolProfiles)
    .flatMap(([school, profile]) => {
      const counts = programCounts[school] ?? {
        total: 0,
        undergraduate: 0,
        graduate: 0
      };
      const ranking = cwurRankings[school];

      if (!ranking || counts.undergraduate < 1 || counts.graduate < 1) {
        return [];
      }

      return [{
        school,
        ...profile,
        ranking,
        acceptanceRateValue: parseAcceptanceRate(profile.acceptanceRate),
        programCount: counts.total,
        undergraduateProgramCount: counts.undergraduate,
        graduateProgramCount: counts.graduate
      }];
    })
    .sort((left, right) => {
      return left.ranking.worldRank - right.ranking.worldRank;
    });
}

function parseAcceptanceRate(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/[\d.]+/);
  return match ? Number(match[0]) : null;
}
