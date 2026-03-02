"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getReactionById } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Beaker } from "lucide-react";

import Header from "@/src/dashboard/ReactDic/Detail/Header";
import MainContent from "@/src/dashboard/ReactDic/Detail/MainContent";
import Sidebar from "@/src/dashboard/ReactDic/Detail/Sidebar";

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
      <div className="p-8 md:p-12 space-y-12 max-w-7xl mx-auto animate-pulse">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-16 w-3/4 mb-10" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[550px] w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[400px] w-full rounded-2xl" />
            <Skeleton className="h-[300px] w-full rounded-2xl" />
          </div>
        </div>
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
    <div className="flex-1 w-full space-y-10 pt-10 pb-24 px-6 md:px-12 max-w-[1400px] mx-auto animate-in fade-in zoom-in-95 duration-700 ease-out">
      <Header reaction={reaction} onBack={() => router.back()} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 xl:gap-16">
        <MainContent reaction={reaction} />
        <div className="xl:col-span-1">
          <Sidebar reaction={reaction} />
        </div>
      </div>
    </div>
  );
}
