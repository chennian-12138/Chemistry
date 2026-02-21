"use client"

const Loader = dynamic(
  () => import("@/src/loading/loading_text"),
  { ssr: false }
);
import dynamic from 'next/dynamic';

export default function loading(){
    return (
        <Loader/>
    )
}