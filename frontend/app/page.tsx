"use client";

import Image from "next/image";
import Link from "next/link";
import { Atom, BookOpen, Target } from "lucide-react";

import AnimatedSection from "@/components/commonUI/AnimatedSection";
import LuoThink from "./LuoThink.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ThemeSwitchButton from "@/src/dashboard/layout/navbar/navbar-ThemeSwitchButton";
import ClicksChart from "@/components/commonUI/ClicksChart";
import UsersChart from "@/components/commonUI/UsersChart";
import ReactionsChart from "@/components/commonUI/ReactionsChart";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* 板块 1：顶部导航栏 */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold">化学辞典</h1>
            </div>
            <nav className="hidden md:flex items-center space-x-2">
              <ThemeSwitchButton />
              <Link href="/signin" passHref legacyBehavior>
                <Button variant="ghost" className="font-medium">
                  登录
                </Button>
              </Link>
              <Link href="/signup" passHref legacyBehavior>
                <Button className="font-medium">注册</Button>
              </Link>
            </nav>
            <div className="md:hidden flex items-center space-x-2">
              <ThemeSwitchButton />
              <Link href="/signin" passHref legacyBehavior>
                <Button variant="outline" size="sm">
                  登录
                </Button>
              </Link>
              <Link href="/signup" passHref legacyBehavior>
                <Button size="sm">注册</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 板块 2：Hero 核心视觉区 */}
      <main className="flex-1">
        <div className="relative min-h-[80vh] flex items-center justify-center bg-background">
          {/* 极简分子结构线条装饰 */}
          <div className="absolute bottom-0 left-0 right-0 h-1 border-t opacity-20"></div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <AnimatedSection
              animationType="fade-up"
              className="text-center max-w-4xl mx-auto"
            >
              <div className="flex justify-center mb-8">
                <Image
                  src={LuoThink}
                  alt="化学辞典 Logo"
                  width={200}
                  height={200}
                  className="rounded-full shadow-lg"
                />
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 text-foreground">
                化学辞典
              </h1>

              <p className="text-2xl sm:text-3xl text-muted-foreground font-semibold mb-8">
                ChemDic
              </p>

              <p className="text-lg text-muted-foreground leading-relaxed mb-12 max-w-3xl mx-auto">
                中国药科大学创新训练项目成果，基于经典有机化学教材逐章整理反应数据，通过
                SMARTS 规则结构化录入数据库，结合 Kekule.js 实现 Web
                端分子结构可视化，为有机化学初学者提供直观的反应检索工具，解决反应记忆难、结构理解模糊的学习痛点
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Link href="/signin" passHref legacyBehavior>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-12 px-8 text-base shadow-sm"
                  >
                    登录
                  </Button>
                </Link>
                <Link href="/signup" passHref legacyBehavior>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-12 px-8 text-base shadow-lg"
                  >
                    注册
                  </Button>
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </div>

        {/* 板块 3.5：数据概览区 */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t">
          <AnimatedSection
            animationType="fade-up"
            className="flex flex-col items-center text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">
              PLATFORM DATA
            </Badge>
            <h3 className="text-3xl sm:text-4xl font-bold">平台数据概览</h3>
            <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
              实时呈现化学辞典的使用情况与知识库增长，助力每一位有机化学学习者
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            <AnimatedSection animationType="fade-up" delay={0.1}>
              <UsersChart />
            </AnimatedSection>
            <AnimatedSection animationType="fade-up" delay={0.2}>
              <ReactionsChart />
            </AnimatedSection>
            <AnimatedSection animationType="fade-up" delay={0.3}>
              <ClicksChart />
            </AnimatedSection>
          </div>
        </div>

        {/* 板块 3：核心优势区 */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <AnimatedSection
            animationType="fade-up"
            className="flex flex-col items-center text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">
              CORE ADVANTAGES
            </Badge>
            <h3 className="text-3xl sm:text-4xl font-bold">
              三大核心优势 赋能有机化学学习
            </h3>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            {/* 卡片 1：Kekule.js 分子可视化交互 */}
            <AnimatedSection animationType="fade-up" delay={0.1}>
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Atom className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">
                    Kekule.js 分子可视化交互
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    基于江辰副教授开发的 Kekule.js 化学信息学工具包，实现 Web
                    端无插件分子结构展示、编辑与交互，直观理解反应中分子结构变化，突破传统文字检索的局限性
                  </CardDescription>
                </CardContent>
              </Card>
            </AnimatedSection>

            {/* 卡片 2：教材同步 SMARTS 精准检索 */}
            <AnimatedSection animationType="fade-up" delay={0.2}>
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">
                    教材同步 SMARTS 精准检索
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    基于本科有机化学经典教材，人工整理反应并通过 SMARTS
                    规则标准化录入 PostgreSQL
                    数据库，检索结果与教材完全同步，结构匹配精准，无冗余信息
                  </CardDescription>
                </CardContent>
              </Card>
            </AnimatedSection>

            {/* 卡片 3：专为学习者设计的多维度数据 */}
            <AnimatedSection animationType="fade-up" delay={0.3}>
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">
                    专为学习者设计的多维度数据
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    不仅收录反应物 /
                    生成物结构，更完整记录溶剂、温度、浓度等反应条件，贴合基础有机化学学习需求，区别于通用化工数据库，针对性更强
                  </CardDescription>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>
        </div>

        {/* 板块 4：技术支撑区 */}
        {/* <div className="bg-muted/50 border-t">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <AnimatedSection
              animationType="fade-up"
              className="max-w-4xl mx-auto text-center"
            >
              <h3 className="text-3xl font-bold mb-8">
                专业技术支撑 保障学习体验
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                核心技术：Kekule.js（分子可视化）、SMARTS（结构规则）、RDKit（化学解析）、PostgreSQL（数据存储）、Express（后端接口）、Next.js（前端开发）
              </p>
              <p className="text-muted-foreground text-sm font-medium">
                指导教师：江辰 副教授
              </p>
            </AnimatedSection>
          </div>
        </div> */}

        {/* 板块 5：底部 CTA 行动区 */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <AnimatedSection animationType="fade-up">
            <Card className="bg-primary/5 border-primary/10 p-8 sm:p-12 text-center overflow-hidden relative">
              <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-4">
                  即刻开启分子可视化 + 反应检索新体验
                </h3>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
                  登录即可体验教材同步检索与分子可视化的双重功能，能让有机反应学习更系统、更直观。
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/signin" passHref legacyBehavior>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto text-base"
                    >
                      登录
                    </Button>
                  </Link>
                  <Link href="/signup" passHref legacyBehavior>
                    <Button
                      size="lg"
                      className="w-full sm:w-auto text-base shadow-lg"
                    >
                      注册
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </AnimatedSection>
        </div>
      </main>

      {/* 板块 6：页脚区 */}
      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              © 2026 中国药科大学 版权所有
              <br className="hidden sm:inline" />
              本项目为中国药科大学大学生创新训练项目成果，未经许可不得复制或传播。
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed opacity-75">
              中国药科大学理学院大学生创新训练项目 | 指导教师：江辰 副教授 |
              团队成员：陈祺睿，祁依卉，孙娅楠，刘若梅，张依琳
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
