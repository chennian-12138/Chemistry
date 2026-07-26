"use client";

import React from "react";
import LoadingDNA from "@/src/loading/loading_DNA";
import LoadingBenzene from "@/src/loading/loading_benzene";
import LoadingFlask from "@/src/loading/loading_flask";

const loaders = [
  { title: "DNA 双螺旋", Component: LoadingDNA },
  { title: "苯环共振式", Component: LoadingBenzene },
  { title: "锥形瓶气泡", Component: LoadingFlask },
];

export default function DashboardPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "48px",
        flexWrap: "wrap",
        padding: "48px",
      }}
    >
      {loaders.map(({ title, Component }) => (
        <figure
          key={title}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
            padding: "32px 48px",
            border: "1px solid #d0d3d9",
            borderRadius: "12px",
            margin: 0,
          }}
        >
          <Component />
          <figcaption style={{ fontSize: "14px", color: "#666" }}>
            {title}
          </figcaption>
        </figure>
      ))}
    </main>
  );
}
