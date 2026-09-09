"use client";

import { useI18n } from "@/src/i18n/language-provider";

export default function AboutOurselvesPage() {
  const { t, locale } = useI18n();
  const en = locale === "en";

  const members = teamMembers.map((m) => ({
    ...m,
    role: en ? m.roleEn : m.role,
    bio: en ? m.bioEn : m.bio,
    expertise: en ? m.expertiseEn : m.expertise,
  }));

  return (
    <main className="w-full px-6 py-16 md:px-10 md:py-20">
      {/* ====== 页面标题与团队简介 ====== */}
      <section className="mb-16 md:mb-20">
        <h1 className="mb-4 text-3xl font-medium tracking-tight text-foreground md:text-4xl">
          {t("about.title")}
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
          {t("about.intro")}
        </p>
      </section>

      {/* ====== 高亮成员 ====== */}
      <section className="mb-12 flex justify-center">
        <h2 className="sr-only">{t("about.team")}</h2>
        <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2">
          {members
            .filter((m) => m.highlighted)
            .map((member) => (
              <MemberCard key={member.name} member={member} />
            ))}
        </div>
      </section>

      {/* ====== 团队成员网格 ====== */}
      <section>
        <h2 className="sr-only">{t("about.team")}</h2>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {members
            .filter((m) => !m.highlighted)
            .map((member) => (
              <MemberCard key={member.name} member={member} />
            ))}
        </div>
      </section>
    </main>
  );
}

interface TeamMember {
  name: string;
  role: string;
  roleEn: string;
  bio: string;
  bioEn: string;
  expertise: string[];
  expertiseEn: string[];
  contact: string;
  highlighted?: boolean;
}

const teamMembers: TeamMember[] = [
  {
    name: "Jiang Chen",
    role: "指导教师",
    roleEn: "Advisor",
    bio: "中国药科大学理学院副教授，Kekule.js开发者，中国药科大学有机化学网页开发人。",
    bioEn: "Associate professor at China Pharmaceutical University, developer of Kekule.js, and developer of this organic chemistry web platform.",
    expertise: ["Kekule.js"],
    expertiseEn: ["Kekule.js"],
    contact: "",
    highlighted: true,
  },
  {
    name: "Chen Qirui",
    role: "项目负责人",
    roleEn: "Project Lead",
    bio: "负责平台整体的搭建与完善。",
    bioEn: "Responsible for the overall development and maintenance of the platform.",
    expertise: ["React / Next.js", "数据可视化", "UI/UX 设计"],
    expertiseEn: ["React / Next.js", "Data Visualization", "UI/UX Design"],
    contact: "2020231011@stu.edu.cn",
    highlighted: true,
  },
  {
    name: "Qi Yihui",
    role: "数据录入/前端开发工程师",
    roleEn: "Data Curation / Frontend Developer",
    bio: "专注于页面美化设计与数据的录入核对。",
    bioEn: "Focuses on page design, data entry, and validation.",
    expertise: ["数据录入", "页面开发"],
    expertiseEn: ["Data Curation", "Frontend Development"],
    contact: "2020241343@stu.cpu.edu.cn",
  },
  {
    name: "Sun Yanan",
    role: "数据录入/前端开发",
    roleEn: "Data Curation / Frontend Development",
    bio: "负责各反应数据的录入与校对，并为平台设计页面。",
    bioEn: "Responsible for reaction data entry/checking and page design.",
    expertise: ["数据录入", "页面开发"],
    expertiseEn: ["Data Curation", "Frontend Development"],
    contact: "2020241387@stu.cpu.edu.cn",
  },
  {
    name: "Zhang Yilin",
    role: "数据录入",
    roleEn: "Data Curation",
    bio: "负责各反应的录入与校对。",
    bioEn: "Responsible for reaction data entry and proofreading.",
    expertise: ["数据录入"],
    expertiseEn: ["Data Curation"],
    contact: "2741794924@qq.com",
  },
  {
    name: "Liu Ruomei",
    role: "数据录入",
    roleEn: "Data Curation",
    bio: "负责各反应的录入与校对。",
    bioEn: "Responsible for reaction data entry and proofreading.",
    expertise: ["数据录入"],
    expertiseEn: ["Data Curation"],
    contact: "3963357128@qq.com",
  },
];

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <article
      className={`group flex flex-col rounded-lg border bg-card p-6 transition-colors hover:border-muted-foreground/30 ${
        member.highlighted
          ? "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
          : "border-border"
      }`}
    >
      <h3 className="mb-1 text-lg font-medium text-foreground">
        {member.name}
      </h3>
      <p className="mb-4 text-sm text-muted-foreground">{member.role}</p>

      {member.bio && (
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground/80">
          {member.bio}
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-2">
        {member.expertise.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {member.contact && (
        <p className="mt-2 text-sm text-muted-foreground">{member.contact}</p>
      )}
    </article>
  );
}
