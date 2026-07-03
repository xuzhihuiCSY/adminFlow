import type { Language } from "@/lib/i18n";
import type { Program } from "@/lib/programs";

export type ApplicationProcessStep = {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
};

export function getApplicationProcess(program: Program, language: Language) {
  const portal = getApplicationPortal(program, language);
  const isUndergraduate = program.level === "Undergraduate";

  if (language === "zh") {
    return [
      {
        title: `创建或登录${portal}账号`,
        description: "从本页的官方申请入口开始申请，使用学校或平台要求的邮箱和身份信息注册。",
        href: program.links.apply,
        linkLabel: "打开申请入口"
      },
      {
        title: "选择项目、学期并填写申请表",
        description: `在申请表中选择 ${program.school} 的 ${program.program}，并确认入学学期、个人信息、教育经历和联系方式。`,
        href: program.links.admission,
        linkLabel: "查看录取说明"
      },
      {
        title: "准备并提交要求材料",
        description: isUndergraduate
          ? "按学校本科录取页面提交高中成绩、文书、英语能力证明和其他要求材料。"
          : "按项目录取页面提交成绩单、简历、陈述、推荐信和其他项目要求材料。",
        href: program.links.admission,
        linkLabel: "核对材料要求"
      },
      {
        title: "国际学生核对英语能力和补充要求",
        description: "如果你需要提交 TOEFL/IELTS/Duolingo 或成绩认证，按学校国际学生页面确认豁免和最低分要求。",
        href: program.links.international,
        linkLabel: "查看国际学生要求"
      },
      {
        title: "复核、缴费并在截止日前提交",
        description: "提交前检查项目名称、入学季、推荐人、材料状态和申请费；以官方系统显示的提交时间为准。",
        href: program.links.apply,
        linkLabel: "继续申请"
      },
      {
        title: "提交后查看状态并等待结果",
        description: "定期登录官方 portal 和邮箱，处理补件、面试、奖学金或录取回复等后续事项。",
        href: program.links.apply,
        linkLabel: "查看申请状态"
      }
    ];
  }

  return [
    {
      title: `Create or sign in to ${portal}`,
      description:
        "Start from the official application link on this page and register with the email and identity details required by the school or platform.",
      href: program.links.apply,
      linkLabel: "Open application"
    },
    {
      title: "Select the program, term, and complete the form",
      description: `Choose ${program.program} at ${program.school}, then confirm the entry term, personal details, education history, and contact information.`,
      href: program.links.admission,
      linkLabel: "View admission instructions"
    },
    {
      title: "Prepare and submit required materials",
      description: isUndergraduate
        ? "Follow the undergraduate admission page for transcripts, essays, English proficiency, and any additional school requirements."
        : "Follow the program admission page for transcripts, resume, statements, recommendation letters, and any additional program requirements.",
      href: program.links.admission,
      linkLabel: "Check material requirements"
    },
    {
      title: "Check international applicant requirements",
      description:
        "If you need TOEFL/IELTS/Duolingo scores or credential evaluation, confirm waivers and minimum scores on the school's international applicant page.",
      href: program.links.international,
      linkLabel: "View international requirements"
    },
    {
      title: "Review, pay, and submit before the deadline",
      description:
        "Before submitting, check the program name, intake, recommenders, material status, and application fee; use the official portal timestamp as the source of truth.",
      href: program.links.apply,
      linkLabel: "Continue application"
    },
    {
      title: "Track status and wait for the decision",
      description:
        "After submission, monitor the official portal and email for checklist updates, interview requests, funding notices, and admission decisions.",
      href: program.links.apply,
      linkLabel: "Check application status"
    }
  ];
}

function getApplicationPortal(program: Program, language: Language) {
  const applyUrl = program.links.apply.toLowerCase();
  const materials = new Set(program.materials);

  if (applyUrl.includes("universityofcalifornia.edu") || materials.has("UC Application")) {
    return "UC Application";
  }

  if (applyUrl.includes("calstate.edu") || materials.has("Cal State Apply Application")) {
    return "Cal State Apply";
  }

  if (language === "zh") {
    return program.level === "Undergraduate" ? "官方本科申请系统" : "官方研究生申请系统";
  }

  return program.level === "Undergraduate"
    ? "the official undergraduate application portal"
    : "the official graduate application portal";
}
