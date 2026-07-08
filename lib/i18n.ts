import type { Program, ProgramStatus } from "@/lib/programs";

export type Language = "zh" | "en";

export const languageLabels: Record<Language, string> = {
  zh: "中文",
  en: "English"
};

export const copy = {
  zh: {
    navPrograms: "流程 / 项目库",
    navRankings: "学校排行",
    navMyList: "我的清单",
    languageToggle: "切换语言",
    heroBadge: "美国大学申请信息导航",
    heroTitle: "先看清美国留学流程，再开始筛学校。",
    heroDescription:
      "用一张 roadmap 梳理选校、预算、申请、签证和行前准备；准备进入选校阶段时，再用项目库对比开放状态、截止日期和官方申请入口。",
    filters: "筛选",
    searchLabel: "搜索项目",
    searchPlaceholder: "按学校、项目或州搜索",
    state: "州",
    degree: "学位类型",
    level: "项目层级",
    status: "申请状态",
    gre: "GRE",
    all: "全部",
    undergraduate: "本科",
    master: "硕士",
    doctoral: "博士",
    graduate: "研究生",
    open: "已开放",
    notOpen: "未开放",
    closed: "已截止",
    openApplicationPrograms: "开放申请的项目",
    notOpenApplicationPrograms: "未开放项目",
    closedApplicationPrograms: "已截止项目",
    applicationOpens: "开放申请时间",
    groupProgramCount: (count: number) => `${count} 个项目`,
    required: "需要",
    optional: "可选",
    notRequired: "不需要",
    resetFilters: "重置筛选",
    programs: "项目",
    programCount: (shown: number, total: number) => `${shown} / ${total} 个项目`,
    noPrograms: "没有找到项目",
    noProgramsDescription: "调整搜索或筛选条件以扩大结果范围。",
    viewDetails: "查看详情",
    save: "保存",
    saved: "已保存",
    addToList: "加入我的清单",
    removeFromList: "从我的清单移除",
    backToPrograms: "返回项目库",
    saveThisProgram: "保存这个项目",
    applyNow: "立即申请",
    applicationDeadline: "申请截止日期",
    applicationWindows: "申请窗口",
    greRequirement: "GRE 要求",
    toeflRequirement: "TOEFL 要求",
    testingPolicyNote: "提交申请前，请到官方录取页面确认最新考试政策。",
    toeflPolicyNote:
      "最低分数或政策摘要。如果申请人有两年及以上的美国学校学习经历，多数学校可以免除 TOEFL 要求，请以官方录取页面为准。",
    applicationMaterials: "申请材料",
    schoolOverview: "学校概况",
    schoolType: "学校类型",
    publicSchool: "公立",
    privateSchool: "私立",
    city: "城市",
    acceptanceRate: "录取率",
    acceptanceRateScope: "数据口径",
    dataSource: "数据来源",
    sourceType: "来源类型",
    officialSource: "官方来源",
    governmentThirdPartySource: "可靠外部来源：美国教育部 College Scorecard",
    thirdPartySource: "可靠第三方来源",
    lastUpdated: "更新时间",
    noReliableData: "暂无可靠公开数据",
    sourceLink: "查看来源",
    officialLinks: "官方链接",
    programWebsite: "项目官网",
    admissionPage: "录取页面",
    internationalStudentPage: "国际学生页面",
    myList: "我的清单",
    myListDescription: "保存在当前浏览器本地。无需账号或后端。",
    savedCount: (count: number) => `已保存 ${count} 个项目`,
    noSavedPrograms: "还没有保存项目",
    noSavedProgramsDescription: "从项目库添加项目，用来比较截止日期和官方申请链接。",
    browsePrograms: "浏览项目",
    deadlinePassed: "已过截止日期",
    opensOn: (date: string) => `${date} 开放申请`,
    cycle: "申请季",
    dueToday: "今天截止",
    oneDayLeft: "还剩 1 天",
    daysLeft: (days: number) => `还剩 ${days} 天`,
    daysUntilDeadline: (days: number) => `距离截止还有 ${days} 天`,
    varies: "视项目而定"
  },
  en: {
    navPrograms: "Roadmap / Programs",
    navRankings: "Rankings",
    navMyList: "My List",
    languageToggle: "Switch language",
    heroBadge: "US university application navigator",
    heroTitle: "Understand the US study process before shortlisting schools.",
    heroDescription:
      "Use the roadmap to move through research, funding, applications, student visa, and departure planning. When you are ready, compare program status, deadlines, and official application links in the catalog.",
    filters: "Filters",
    searchLabel: "Search programs",
    searchPlaceholder: "Search by school, program, or state",
    state: "State",
    degree: "Degree",
    level: "Level",
    status: "Status",
    gre: "GRE",
    all: "All",
    undergraduate: "Undergraduate",
    master: "Master",
    doctoral: "Doctoral",
    graduate: "Graduate",
    open: "Open",
    notOpen: "Not Open",
    closed: "Closed",
    openApplicationPrograms: "Open Applications",
    notOpenApplicationPrograms: "Not Yet Open",
    closedApplicationPrograms: "Closed Applications",
    applicationOpens: "Application Opens",
    groupProgramCount: (count: number) => `${count} ${count === 1 ? "program" : "programs"}`,
    required: "Required",
    optional: "Optional",
    notRequired: "Not Required",
    resetFilters: "Reset filters",
    programs: "Programs",
    programCount: (shown: number, total: number) => `${shown} of ${total} programs`,
    noPrograms: "No programs found",
    noProgramsDescription: "Adjust the search or filters to broaden the catalog.",
    viewDetails: "View Details",
    save: "Save",
    saved: "Saved",
    addToList: "Add to my list",
    removeFromList: "Remove from my list",
    backToPrograms: "Back to programs",
    saveThisProgram: "Save this program",
    applyNow: "Apply Now",
    applicationDeadline: "Application Deadline",
    applicationWindows: "Application Windows",
    greRequirement: "GRE Requirement",
    toeflRequirement: "TOEFL Requirement",
    testingPolicyNote: "Confirm testing policy on the admission page before applying.",
    toeflPolicyNote:
      "Minimum score or policy summary. Most schools may waive TOEFL for applicants with two or more years of study at a U.S. school; confirm on the official admission page.",
    applicationMaterials: "Application Materials",
    schoolOverview: "School Overview",
    schoolType: "School Type",
    publicSchool: "Public",
    privateSchool: "Private",
    city: "City",
    acceptanceRate: "Acceptance Rate",
    acceptanceRateScope: "Data Scope",
    dataSource: "Data Source",
    sourceType: "Source Type",
    officialSource: "Official source",
    governmentThirdPartySource: "Reliable external source: U.S. Department of Education College Scorecard",
    thirdPartySource: "Reliable third-party source",
    lastUpdated: "Last Updated",
    noReliableData: "No reliable public data",
    sourceLink: "View source",
    officialLinks: "Official Links",
    programWebsite: "Program Website",
    admissionPage: "Admission Page",
    internationalStudentPage: "International Student Page",
    myList: "My List",
    myListDescription: "Saved locally in this browser. No account or backend required.",
    savedCount: (count: number) => `${count} saved ${count === 1 ? "program" : "programs"}`,
    noSavedPrograms: "No saved programs yet",
    noSavedProgramsDescription:
      "Add programs from the catalog to compare deadlines and official application links.",
    browsePrograms: "Browse programs",
    deadlinePassed: "Deadline passed",
    opensOn: (date: string) => `Opens ${date}`,
    cycle: "Cycle",
    dueToday: "Due today",
    oneDayLeft: "1 day left",
    daysLeft: (days: number) => `${days} days left`,
    daysUntilDeadline: (days: number) => `${days} days until deadline`,
    varies: "Varies"
  }
} as const;

const stateLabels: Record<string, Record<Language, string>> = {
  Arizona: { zh: "亚利桑那州", en: "Arizona" },
  California: { zh: "加利福尼亚州", en: "California" },
  Georgia: { zh: "佐治亚州", en: "Georgia" },
  Colorado: { zh: "科罗拉多州", en: "Colorado" },
  Connecticut: { zh: "康涅狄格州", en: "Connecticut" },
  Florida: { zh: "佛罗里达州", en: "Florida" },
  Illinois: { zh: "伊利诺伊州", en: "Illinois" },
  Indiana: { zh: "印第安纳州", en: "Indiana" },
  Maryland: { zh: "马里兰州", en: "Maryland" },
  Massachusetts: { zh: "马萨诸塞州", en: "Massachusetts" },
  Michigan: { zh: "密歇根州", en: "Michigan" },
  Minnesota: { zh: "明尼苏达州", en: "Minnesota" },
  "New Jersey": { zh: "新泽西州", en: "New Jersey" },
  "New York": { zh: "纽约州", en: "New York" },
  "North Carolina": { zh: "北卡罗来纳州", en: "North Carolina" },
  Ohio: { zh: "俄亥俄州", en: "Ohio" },
  Pennsylvania: { zh: "宾夕法尼亚州", en: "Pennsylvania" },
  "Rhode Island": { zh: "罗得岛州", en: "Rhode Island" },
  Tennessee: { zh: "田纳西州", en: "Tennessee" },
  Texas: { zh: "德克萨斯州", en: "Texas" },
  Utah: { zh: "犹他州", en: "Utah" },
  Virginia: { zh: "弗吉尼亚州", en: "Virginia" },
  "New Hampshire": { zh: "新罕布什尔州", en: "New Hampshire" },
  Washington: { zh: "华盛顿州", en: "Washington" },
  Wisconsin: { zh: "威斯康星州", en: "Wisconsin" }
};

const materialLabels: Record<string, Record<Language, string>> = {
  Transcript: { zh: "成绩单", en: "Transcript" },
  "High School Transcript": { zh: "高中成绩单", en: "High School Transcript" },
  Resume: { zh: "简历", en: "Resume" },
  "Statement of Purpose": { zh: "目的陈述", en: "Statement of Purpose" },
  "Recommendation Letters": { zh: "推荐信", en: "Recommendation Letters" },
  "Personal Statement": { zh: "个人陈述", en: "Personal Statement" },
  "Personal History Statement": { zh: "个人经历陈述", en: "Personal History Statement" },
  "Research Interests": { zh: "研究兴趣", en: "Research Interests" },
  Essays: { zh: "申请文书", en: "Essays" },
  "Recommendation Letter": { zh: "推荐信", en: "Recommendation Letter" },
  Interview: { zh: "面试", en: "Interview" }
  ,
  "Cal State Apply Application": {
    zh: "Cal State Apply 申请表",
    en: "Cal State Apply Application"
  },
  "UC Application": { zh: "UC 申请表", en: "UC Application" },
  "Common App or institutional application": {
    zh: "Common App 或学校申请表",
    en: "Common App or institutional application"
  },
  "English Proficiency": { zh: "英语能力证明", en: "English Proficiency" },
  "Self-reported Coursework": { zh: "自报课程信息", en: "Self-reported Coursework" },
  "Application Fee": { zh: "申请费", en: "Application Fee" }
};

export function getStateLabel(state: string, language: Language) {
  return stateLabels[state]?.[language] ?? state;
}

export function getLevelLabel(level: Program["level"], language: Language) {
  if (language === "zh") {
    return level === "Undergraduate" ? "本科" : "研究生";
  }

  return level;
}

export function getAvailabilityLabel(availability: ProgramStatus, language: Language) {
  if (language === "zh") {
    if (availability === "Open") {
      return "已开放";
    }

    if (availability === "Closed") {
      return "已截止";
    }

    return "未开放";
  }

  return availability === "Closed" ? "Closed" : availability;
}

export function getMaterialLabel(material: string, language: Language) {
  return materialLabels[material]?.[language] ?? material;
}

export function getGreLabel(gre: Program["gre"], language: Language) {
  if (language === "zh") {
    if (gre === true) {
      return "GRE 需要";
    }

    if (gre === "Optional") {
      return "GRE 可选";
    }

    return "GRE 不需要";
  }

  if (gre === true) {
    return "GRE Required";
  }

  if (gre === "Optional") {
    return "GRE Optional";
  }

  return "GRE Not Required";
}

export function getGreValueLabel(gre: Program["gre"], language: Language) {
  if (language === "zh") {
    if (gre === true) {
      return "需要";
    }

    if (gre === "Optional") {
      return "可选";
    }

    return "不需要";
  }

  if (gre === true) {
    return "Required";
  }

  if (gre === "Optional") {
    return "Optional";
  }

  return "Not Required";
}

export function getToeflLabel(toefl: Program["toefl"], language: Language) {
  if (typeof toefl === "number") {
    return `${toefl}+`;
  }

  return copy[language].varies;
}

export function formatProgramDate(value: string, language: Language, long = false) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    month: long ? "long" : "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}
