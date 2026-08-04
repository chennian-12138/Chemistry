import React from "react";
import styled from "styled-components";

// rung 数量：12 根均匀分布，每根相位差 30°
const RUNG_COUNT = 12;

const Loader = () => {
  return (
    <StyledWrapper>
      <div
        aria-label="Circular DNA double helix rotating"
        role="img"
        className="dna"
      >
        <div className="dna__axis" />
        <div className="dna__guide" />
        {Array.from({ length: RUNG_COUNT }, (_, i) => (
          <span
            key={i}
            className="rung"
            style={{ "--i": i } as React.CSSProperties}
          >
            <span className="rung__half rung__half--a" />
            <span className="rung__half rung__half--b" />
          </span>
        ))}
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .dna {
    --dur: 1.8s;
    font-size: 14px;
    --size: 9.6em;
    --radius: 3.1em;
    --rung-len: 1.8em;
    --rung-w: 0.38em;
    --strand-a: var(--chart-1);
    --strand-b: var(--chart-2);
    position: relative;
    width: var(--size);
    height: var(--size);
  }

  /* 中心轴：给旋转一个锚点，强化“绕轴转动”的读数 */
  .dna__axis {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 0.45em;
    height: 0.45em;
    margin: -0.225em 0 0 -0.225em;
    border-radius: 50%;
    background: var(--foreground);
    opacity: 0.85;
  }

  /* 螺旋横截面轮廓 */
  .dna__guide {
    position: absolute;
    left: 50%;
    top: 50%;
    width: calc(var(--radius) * 2);
    height: calc(var(--radius) * 2);
    margin: calc(var(--radius) * -1) 0 0 calc(var(--radius) * -1);
    border: 1px solid var(--border);
    border-radius: 50%;
  }

  /* 每根碱基对：锚在内侧端点，绕环轴摆动。
     基础 transform 只做定位（旋转 + 平移），动画用独立的 scale 属性
     与之叠加，摆动时从内侧向外伸出 → 翻转为 -1 时缩向中心 = 转到背面。 */
  .rung {
    position: absolute;
    left: 50%;
    top: 50%;
    width: var(--rung-len);
    height: var(--rung-w);
    margin-top: calc(var(--rung-w) / -2);
    transform: rotate(calc(var(--i) * 30deg))
      translateX(calc(var(--radius) - var(--rung-len) / 2));
    transform-origin: 0 50%;
    animation: swing var(--dur) linear infinite;
    animation-delay: calc(var(--dur) * -0.0833333 * var(--i));
  }

  .rung__half {
    position: absolute;
    top: 0;
    height: 100%;
    width: 50%;
  }

  .rung__half--a {
    left: 0;
    background: var(--strand-a);
    border-radius: 0.3em 0 0 0.3em;
  }

  .rung__half--b {
    right: 0;
    background: var(--strand-b);
    border-radius: 0 0.3em 0.3em 0;
  }

  /* 匀速三角波：正面全长高亮，背面缩到中心并变暗，构成绕轴旋转的螺旋 */
  @keyframes swing {
    0%,
    100% {
      scale: 1 1;
      opacity: 1;
    }

    50% {
      scale: -1 1;
      opacity: 0.25;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dna,
    .rung {
      animation: none;
    }
  }
`;

export default Loader;
