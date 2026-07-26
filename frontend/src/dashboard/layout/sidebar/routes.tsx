import {
  BookSearch,
  Bot,
  FlaskConical,
  BookUp,
  MailQuestionMark,
  Settings,
  Users,
  ShieldCheck,
  Newspaper,
} from "lucide-react";

export const routes = {
  Application: [
    {
      name: "反应查询",
      Path: "/dashboard/reactdic",
      icon: BookSearch,
    },
    {
      name: "逆反应分析",
      Path: "/dashboard/retrosynthesisanalysis",
      icon: FlaskConical,
    },
    {
      name: "文献速递",
      Path: "/dashboard/literature",
      icon: Newspaper,
    },

    {
      name: "问问AI",
      Path: "/dashboard/askai",
      icon: Bot,
    },
    {
      name: "数据上传",
      Path: "/dashboard/dataup",
      icon: BookUp,
    },
    {
      name: "数据审查",
      Path: "/dashboard/review",
      icon: ShieldCheck,
    },
  ],

  // secondary navigation
  NavSecondary: [
    {
      name: "个人信息",
      Path: "/dashboard/settings",
      icon: Settings,
    },
    {
      name: "问题反馈",
      Path: "/dashboard/feedback",
      icon: MailQuestionMark,
    },
    {
      name: "关于我们",
      Path: "/dashboard/aboutourselves",
      icon: Users,
    },
  ],
};
