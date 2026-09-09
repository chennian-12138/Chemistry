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
  LayoutDashboard,
} from "lucide-react";

export const routes = {
  Application: [
    {
      name: "反应查询",
      i18nKey: "nav.reactionSearch",
      Path: "/dashboard/reactdic",
      icon: BookSearch,
    },
    {
      name: "逆反应分析",
      i18nKey: "nav.retroSynthesis",
      Path: "/dashboard/retrosynthesisanalysis",
      icon: FlaskConical,
    },
    {
      name: "文献速递",
      i18nKey: "nav.literature",
      Path: "/dashboard/literature",
      icon: Newspaper,
    },

    {
      name: "问问AI",
      i18nKey: "nav.askAi",
      Path: "/dashboard/askai",
      icon: Bot,
    },
    {
      name: "数据上传",
      i18nKey: "nav.dataUpload",
      Path: "/dashboard/dataup",
      icon: BookUp,
    },
    {
      name: "数据审查",
      i18nKey: "nav.dataReview",
      Path: "/dashboard/review",
      icon: ShieldCheck,
    },
  ],

  // secondary navigation
  NavSecondary: [
    {
      name: "个人信息",
      i18nKey: "nav.settings",
      Path: "/dashboard/settings",
      icon: Settings,
    },
    {
      name: "问题反馈",
      i18nKey: "nav.feedback",
      Path: "/dashboard/feedback",
      icon: MailQuestionMark,
    },
    {
      name: "关于我们",
      i18nKey: "nav.about",
      Path: "/dashboard/aboutourselves",
      icon: Users,
    },
  ],

  // 管理员的 secondary navigation（"关于我们"替换为"管理后台"）
  NavAdmin: [
    {
      name: "个人信息",
      i18nKey: "nav.settings",
      Path: "/dashboard/settings",
      icon: Settings,
    },
    {
      name: "问题反馈",
      i18nKey: "nav.feedback",
      Path: "/dashboard/feedback",
      icon: MailQuestionMark,
    },
    {
      name: "管理后台",
      i18nKey: "nav.admin",
      Path: "/dashboard/admin",
      icon: LayoutDashboard,
    },
  ],
};
