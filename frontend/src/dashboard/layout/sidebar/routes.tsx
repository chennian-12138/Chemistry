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
    
    // History这里先放点东西占位，后面再调整。
    History:[
    {
        title:'DA-Reaction',
        url:'#',
        icon: BookSearch,
    },
    {
        title:'Synthesis-of-Aspirin',
        url:'#',
        icon:FlaskConical,
    },
    {
        title:'Dialogue',
        url:'#',
        icon:Bot,
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

    User: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },

}

export default function RoutesPage() {
  return null;
}