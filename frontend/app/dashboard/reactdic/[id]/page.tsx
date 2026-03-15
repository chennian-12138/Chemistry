"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getReactionById } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Beaker, Loader2 } from "lucide-react";

import Header from "@/src/dashboard/ReactDic/Detail/Header";
import MainContent from "@/src/dashboard/ReactDic/Detail/MainContent";
import ReactionPredict from "@/src/dashboard/ReactDic/Detail/ReactionPredict";

export default function ReactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [reaction, setReaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        const res = await getReactionById(id);
        if (res.success) {
          setReaction(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch reaction details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
        </div>
        <p className="text-lg font-medium text-muted-foreground animate-pulse tracking-wide">
          正在加载反应详情...
        </p>
      </div>
    );
  }

  if (!reaction) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-muted/30 p-8 rounded-full mb-6">
          <Beaker className="w-16 h-16 text-muted-foreground opacity-60" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-3">
          Reaction Not Found
        </h2>
        <p className="text-muted-foreground text-lg mb-10 max-w-md">
          The chemical reaction you are looking for does not exist, or you may
          not have permission to view it.
        </p>
        <Button
          onClick={() => router.back()}
          size="lg"
          className="px-8 shadow-md"
        >
          <ArrowLeft className="w-5 h-5 mr-3" />
          Back to Search
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full space-y-6 pt-6 pb-24 px-6 md:px-12 max-w-[1100px] mx-auto animate-in fade-in zoom-in-95 duration-700 ease-out">
      <Header reaction={reaction} onBack={() => router.back()} />
      <MainContent reaction={reaction} />
      <ReactionPredict reaction={reaction} />
    </div>
  );
}
