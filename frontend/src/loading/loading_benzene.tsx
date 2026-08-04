import React from "react";
import styled from "styled-components";

const Loader = () => {
  return (
    <StyledWrapper>
      <svg
        aria-label="Benzene ring oscillating between its two Kekulé structures through the delocalized ring"
        role="img"
        viewBox="0 0 120 120"
        className="loader"
      >
        <polygon
          points="60,20 94.6,40 94.6,80 60,100 25.4,80 25.4,40"
          className="loader__ring"
        />
        {/* 离域圆：六边形内切圆（边心距 = 40·cos30° ≈ 34.6） */}
        <circle
          cx="60"
          cy="60"
          r="34.6"
          pathLength="1"
          className="loader__circle"
        />
        <g className="loader__bonds loader__bonds--a">
          <path d="M63.4 30.1 L84.2 42.1" />
          <path d="M84.2 77.9 L63.4 89.9" />
          <path d="M32.4 72 L32.4 48" />
        </g>
        <g className="loader__bonds loader__bonds--b">
          <path d="M87.6 48 L87.6 72" />
          <path d="M56.6 89.9 L35.8 77.9" />
          <path d="M35.8 42.1 L56.6 30.1" />
        </g>
      </svg>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .loader {
    --dur: 3.2s;
    font-size: 14px;
    display: block;
    margin: auto;
    width: 9.5em;
    height: auto;
  }

  .loader__ring {
    fill: none;
    stroke: var(--foreground);
    stroke-width: 3;
    stroke-linejoin: round;
    opacity: 0.9;
  }

  .loader__bonds {
    fill: none;
    stroke: var(--chart-1);
    stroke-width: 3.4;
    stroke-linecap: round;
    /* 以 view-box（六边形）中心为缩放原点：
       双键隐去时向中心收拢，出现时从中心展开 */
    transform-origin: 50% 50%;
    animation-duration: var(--dur);
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
  }

  .loader__bonds--a {
    animation-name: bond-a;
  }

  .loader__bonds--b {
    animation-name: bond-b;
  }

  .loader__circle {
    fill: none;
    stroke: var(--chart-1);
    stroke-width: 3.4;
    stroke-linecap: round;
    stroke-dasharray: 0.03 0.97;
    transform-box: fill-box;
    transform-origin: center;
    /* delocalized 控显示/缩放，circle-flow 让缺口绕圆缓缓移动（电子云流动） */
    animation:
      delocalized var(--dur) ease-in-out infinite,
      circle-flow var(--dur) linear infinite;
  }

  /* 三态循环 A → 圆 → B → 圆：
     双键隐去时 scale 收缩向中心，圆同时从中心长出 → “聚拢成圆” */
  @keyframes bond-a {
    0% {
      opacity: 0;
      scale: 0.5;
    }

    6% {
      opacity: 1;
      scale: 1;
    }

    36% {
      opacity: 1;
      scale: 1;
    }

    42% {
      opacity: 0;
      scale: 0.5;
    }

    100% {
      opacity: 0;
      scale: 0.5;
    }
  }

  @keyframes bond-b {
    0% {
      opacity: 0;
      scale: 0.5;
    }

    52% {
      opacity: 0;
      scale: 0.5;
    }

    58% {
      opacity: 1;
      scale: 1;
    }

    84% {
      opacity: 1;
      scale: 1;
    }

    90% {
      opacity: 0;
      scale: 0.5;
    }

    100% {
      opacity: 0;
      scale: 0.5;
    }
  }

  @keyframes delocalized {
    0%,
    2% {
      opacity: 1;
      scale: 1;
    }

    8% {
      opacity: 0;
      scale: 0.5;
    }

    36% {
      opacity: 0;
      scale: 0.5;
    }

    42% {
      opacity: 1;
      scale: 1;
    }

    50% {
      opacity: 1;
      scale: 1;
    }

    56% {
      opacity: 0;
      scale: 0.5;
    }

    84% {
      opacity: 0;
      scale: 0.5;
    }

    90% {
      opacity: 1;
      scale: 1;
    }

    100% {
      opacity: 1;
      scale: 1;
    }
  }

  /* 缺口绕圆一周 = 电子在离域环上流动 */
  @keyframes circle-flow {
    from {
      stroke-dashoffset: 0;
    }

    to {
      stroke-dashoffset: -1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .loader__bonds,
    .loader__circle {
      animation: none;
      opacity: 0;
      scale: 1;
    }

    .loader__bonds--a {
      opacity: 1;
    }
  }
`;

export default Loader;
