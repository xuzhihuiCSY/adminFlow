import programsData from "@/data/programs.json";
import applicationWindowsData from "@/data/application-windows.json";

export type ProgramLinkSet = {
  program: string;
  admission: string;
  international: string;
  apply: string;
};

export type ApplicationWindow = {
  intake: string;
  opens: string | null;
  deadline: string;
};

export type Program = {
  id: string;
  school: string;
  program: string;
  level: "Undergraduate" | "Graduate";
  degree: string;
  state: string;
  applicationWindows: ApplicationWindow[];
  gre: boolean | "Optional";
  toefl: number | "Varies";
  materials: string[];
  links: ProgramLinkSet;
};

type ProgramBase = Omit<Program, "applicationWindows">;
type ApplicationWindowsByProgramId = Record<string, ApplicationWindow[]>;

export type ProgramStatus = "Open" | "Not Open" | "Closed";
export type DegreeGroup = "Undergraduate" | "Master" | "Doctoral";

export type ComputedApplicationWindow = {
  intake: string;
  opens: string | null;
  deadline: string;
};

const applicationWindowsByProgramId = applicationWindowsData as ApplicationWindowsByProgramId;

export const programs: Program[] = (programsData as ProgramBase[]).map((program) => {
  const applicationWindows = applicationWindowsByProgramId[program.id];

  if (!applicationWindows) {
    throw new Error(`Missing application windows for program: ${program.id}`);
  }

  return {
    ...program,
    applicationWindows
  };
});

export function getProgramById(id: string) {
  return programs.find((program) => program.id === id);
}

export function getDegreeGroup(program: Program): DegreeGroup {
  if (program.degree === "PhD") {
    return "Doctoral";
  }

  if (program.level === "Graduate") {
    return "Master";
  }

  return "Undergraduate";
}

export function getDaysUntilDeadline(deadline: string, now = new Date()) {
  const target = new Date(`${deadline}T23:59:59`);
  const milliseconds = target.getTime() - now.getTime();

  return Math.ceil(milliseconds / (1000 * 60 * 60 * 24));
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseMonthDay(monthDay: string, year: number, endOfDay = false) {
  const [month, day] = monthDay.split("-").map(Number);

  return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
}

function compareMonthDay(left: string, right: string) {
  return left.localeCompare(right);
}

function buildWindow(window: ApplicationWindow, openYear: number) {
  if (!window.opens) {
    const deadlineDate = parseMonthDay(window.deadline, openYear, true);
    const opensDate = new Date(deadlineDate);

    opensDate.setFullYear(opensDate.getFullYear() - 1);
    opensDate.setDate(opensDate.getDate() + 1);
    opensDate.setHours(0, 0, 0, 0);

    return {
      intake: window.intake,
      opens: null,
      deadline: toIsoDate(deadlineDate),
      opensDate,
      deadlineDate
    };
  }

  const opensDate = window.opens
    ? parseMonthDay(window.opens, openYear)
    : new Date(openYear, 0, 1);
  const deadlineYear =
    window.opens && compareMonthDay(window.deadline, window.opens) < 0
      ? openYear + 1
      : openYear;
  const deadlineDate = parseMonthDay(window.deadline, deadlineYear, true);

  return {
    intake: window.intake,
    opens: window.opens ? toIsoDate(opensDate) : null,
    deadline: toIsoDate(deadlineDate),
    opensDate,
    deadlineDate
  };
}

function getWindowCandidates(program: Program, now = new Date()) {
  const year = now.getFullYear();

  return program.applicationWindows
    .flatMap((window) =>
      [year - 1, year, year + 1, year + 2].map((candidateYear) =>
        buildWindow(window, candidateYear)
      )
    )
    .sort((left, right) => left.opensDate.getTime() - right.opensDate.getTime());
}

export function getCurrentApplicationWindow(program: Program, now = new Date()) {
  const match = getWindowCandidates(program, now).find(
    (window) => now.getTime() >= window.opensDate.getTime() && now.getTime() <= window.deadlineDate.getTime()
  );

  return match ? toPublicWindow(match) : null;
}

export function getNextApplicationWindow(program: Program, now = new Date()) {
  const match = getWindowCandidates(program, now).find(
    (window) => window.opensDate.getTime() > now.getTime()
  );

  return match ? toPublicWindow(match) : null;
}

export function getRelevantApplicationWindow(program: Program, now = new Date()) {
  return getCurrentApplicationWindow(program, now) ?? getNextApplicationWindow(program, now);
}

export function getWindowSchedule(program: Program, now = new Date()) {
  return program.applicationWindows.map((window) => toPublicWindow(buildWindow(window, now.getFullYear())));
}

function toPublicWindow(window: ReturnType<typeof buildWindow>): ComputedApplicationWindow {
  return {
    intake: window.intake,
    opens: window.opens,
    deadline: window.deadline
  };
}

export function getProgramStatus(program: Program, now = new Date()): ProgramStatus {
  if (getCurrentApplicationWindow(program, now)) {
    return "Open";
  }

  if (getNextApplicationWindow(program, now)) {
    return "Not Open";
  }

  return "Closed";
}

export function getNextApplicationOpenDate(program: Program, now = new Date()) {
  return getNextApplicationWindow(program, now)?.opens ?? null;
}

export function getGreLabel(gre: Program["gre"]) {
  if (gre === true) {
    return "GRE Required";
  }

  if (gre === "Optional") {
    return "GRE Optional";
  }

  return "GRE Not Required";
}

export function getGreTone(gre: Program["gre"]) {
  if (gre === true) {
    return "default";
  }

  if (gre === "Optional") {
    return "secondary";
  }

  return "outline";
}

export function getAvailabilityTone(status: ProgramStatus) {
  if (status === "Open") {
    return "default";
  }

  if (status === "Closed") {
    return "outline";
  }

  return "secondary";
}
