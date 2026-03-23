import {
    BookSearch,
    Bot,
    FlaskConical,
    BookUp,
    MailQuestionMark,
    Settings,
    Users,
    ShieldCheck
} from "lucide-react";

export const routes = {
    Application:[
    {
        name:'ReactDic',
        Path:'/dashboard/reactdic',
        icon: BookSearch,
    },
    {
        name:'RetroSynthesisAnalysis',
        Path:'/dashboard/retrosynthesisanalysis',
        icon:FlaskConical,
    },
    {
        name:'AskAI',
        Path:'/dashboard/askai',
        icon:Bot,
    },
    {
        name:'DataUp',
        Path:'/dashboard/dataup',
        icon:BookUp,
    },
    {
        name:'Review',
        Path:'/dashboard/review',
        icon:ShieldCheck
    },
    ],

    // secondary navigation
    NavSecondary:[
        {
            name: "Settings",
            Path: "/dashboard/settings",
            icon: Settings
        },
        {
            name: "Feedback",
            Path: "/dashboard/feedback",
            icon: MailQuestionMark,
        },
        {
            name: "AboutOurselves",
            Path: "/dashboard/aboutourselves",
            icon: Users
        },
    ],
}