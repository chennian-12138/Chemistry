export default function AboutOurselvesPage() {
  return (
    <main className="w-full px-6 py-16 md:px-10 md:py-20">
      {/* ====== 页面标题与团队简介 ====== */}
      <section className="mb-16 md:mb-20">
        <h1 className="mb-4 text-3xl font-medium tracking-tight text-foreground md:text-4xl">
          关于我们
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
          本项目为中国药科大学理学院大创项目成果，
          我们希望借助这个平台，让各位同学能掌握到基础有机化学的学习方法，
          欢迎交流使用！你们的每一次点击都是对我们莫大的鼓励！
        </p>
      </section>

      {/* ====== 高亮成员 ====== */}
      <section className="mb-12 flex justify-center">
        <h2 className="sr-only">团队成员</h2>
        <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2">
          {teamMembers
            .filter((m) => m.highlighted)
            .map((member) => (
              <MemberCard key={member.name} member={member} />
            ))}
        </div>
      </section>

      {/* ====== 团队成员网格 ====== */}
      <section>
        <h2 className="sr-only">团队成员</h2>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {teamMembers
            .filter((m) => !m.highlighted)
            .map((member) => (
              <MemberCard key={member.name} member={member} />
            ))}
        </div>
      </section>
    </main>
  );
}

/* ==========================================================
   类型定义
   ========================================================== */

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  expertise: string[];
  contact: string;
  avatarInitial: string;
  highlighted?: boolean;
}

/* ==========================================================
   成员数据
   ========================================================== */

const teamMembers: TeamMember[] = [
  {
    name: "江辰",
    role: "指导教师",
    bio: "中国药科大学理学院副教授，Kekule.js开发者，中国药科大学有机化学网页开发人。",
    expertise: ["Kekule.js"],
    contact: "",
    avatarInitial: "江",
    highlighted: true,
  },
  {
    name: "陈祺睿",
    role: "项目负责人",
    bio: " 负责平台整体的搭建与完善。",
    expertise: ["React / Next.js", "数据可视化", "UI/UX 设计"],
    contact: "2020231011@stu.edu.cn",
    avatarInitial: "陈",
    highlighted: true,
  },
  {
    name: "祁依卉",
    role: "数据录入/前端开发工程师",
    bio: "专注于页面美化设计与数据的录入核对。",
    expertise: ["数据录入", "页面开发"],
    contact: "2020241343@stu.cpu.edu.cn",
    avatarInitial: "祁",
  },
  {
    name: "孙娅楠",
    role: "数据录入/前端开发",
    bio: "负责各反应数据的录入与校对，并为平台设计页面。",
    expertise: ["数据录入", "页面开发"],
    contact: "2020241387@stu.cpu.edu.cn",
    avatarInitial: "孙",
  },
  {
    name: "张依琳",
    role: "数据录入",
    bio: "负责各反应的录入与校对。",
    expertise: ["数据录入"],
    contact: "2741794924@qq.com",
    avatarInitial: "张",
  },
  {
    name: "刘若梅",
    role: "数据录入",
    bio: "负责各反应的录入与校对。",
    expertise: ["数据录入"],
    contact: "3963357128@qq.com",
    avatarInitial: "刘",
  },
];

/* ==========================================================
   成员卡片子组件
   ========================================================== */

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <article
      className={`group flex flex-col rounded-lg border bg-card p-6 transition-colors hover:border-muted-foreground/30 ${
        member.highlighted
          ? "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
          : "border-border"
      }`}
    >
      {/* —— 头像占位 —— */}
      {/* <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-medium text-muted-foreground">
        {member.avatarInitial}
      </div> */}

      {/* —— 姓名与岗位 —— */}
      <h3 className="mb-1 text-lg font-medium text-foreground">
        {member.name}
      </h3>
      <p className="mb-4 text-sm text-muted-foreground">{member.role}</p>

      {/* —— 个人介绍 —— */}
      {member.bio && (
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground/80">
          {member.bio}
        </p>
      )}

      {/* —— 专业标签 —— */}
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

      {/* ——联系方式 ——*/}
      {member.contact && (
        <p className="mt-2 text-sm text-muted-foreground">{member.contact}</p>
      )}
    </article>
  );
}
