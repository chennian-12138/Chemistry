import React from "react";
import styled from "styled-components";

const Loader = () => {
  return (
    <StyledWrapper>
      <svg
        aria-label="Rocking Erlenmeyer flask with bubbles rising and popping at the surface"
        role="img"
        viewBox="0 0 120 140"
        className="loader"
      >
        <clipPath id="flask-liquid-clip">
          <path d="M48 16 V44 L22 112 Q20 120 30 120 H90 Q100 120 98 112 L72 44 V16 Z" />
        </clipPath>
        <g clipPath="url(#flask-liquid-clip)">
          <path
            d="M0 76 Q10 70 20 76 T40 76 T60 76 T80 76 T100 76 T120 76 T140 76 T160 76 V140 H0 Z"
            className="loader__liquid"
          />
        </g>
        <g className="loader__bubbles">
          <circle cx="53" cy="114" r="3" className="loader__bubble loader__bubble--1" />
          <circle cx="65" cy="116" r="2.2" className="loader__bubble loader__bubble--2" />
          <circle cx="68" cy="112" r="1.8" className="loader__bubble loader__bubble--3" />
          <circle cx="52" cy="116" r="2" className="loader__bubble loader__bubble--4" />
          <circle cx="60" cy="118" r="3.4" className="loader__bubble loader__bubble--5" />
          <circle cx="63" cy="118" r="2.6" className="loader__bubble loader__bubble--6" />
        </g>
        <path
          d="M48 16 V44 L22 112 Q20 120 30 120 H90 Q100 120 98 112 L72 44 V16"
          className="loader__flask"
        />
        <path d="M42 16 H78" className="loader__rim" />
      </svg>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .loader {
    --dur: 2.8s;
    font-size: 14px;
    display: block;
    margin: auto;
    width: 8em;
    height: auto;
    transform-origin: 50% 96%;
    animation: rock var(--dur) ease-in-out infinite;
  }

  .loader__flask {
    fill: none;
    stroke: var(--foreground);
    stroke-width: 3.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .loader__rim {
    fill: none;
    stroke: var(--foreground);
    stroke-width: 5;
    stroke-linecap: round;
  }

  .loader__liquid {
    fill: var(--chart-2);
    opacity: 0.5;
    animation: liquid-wave var(--dur) linear infinite;
  }

  .loader__bubble {
    fill: var(--chart-1);
    opacity: 0;
    transform-box: fill-box;
    transform-origin: center;
    animation: bubble-rise calc(var(--dur) * 1.15) linear infinite;
  }

  .loader__bubble--1 {
    animation-delay: 0s;
  }

  .loader__bubble--2 {
    animation-delay: calc(var(--dur) * -0.4);
  }

  .loader__bubble--3 {
    animation-delay: calc(var(--dur) * -0.75);
  }

  .loader__bubble--4 {
    animation-delay: calc(var(--dur) * -0.2);
  }

  .loader__bubble--5 {
    animation-delay: calc(var(--dur) * -0.6);
  }

  .loader__bubble--6 {
    animation-delay: calc(var(--dur) * -0.9);
  }

  @keyframes rock {
    0%,
    100% {
      transform: rotate(-5deg);
    }

    50% {
      transform: rotate(5deg);
    }
  }

  @keyframes liquid-wave {
    from {
      transform: translateX(0);
    }

    to {
      transform: translateX(-40px);
    }
  }

  /* 气泡只升到液面附近（约 -42px 处，y≈72）即破裂淡出，
     不会像之前那样一路飘出瓶口。 */
  @keyframes bubble-rise {
    0% {
      translate: 0 0;
      scale: 0.5;
      opacity: 0;
    }

    6% {
      opacity: 1;
    }

    70% {
      translate: 1.5px -30px;
      scale: 1;
      opacity: 1;
    }

    92% {
      translate: -1.5px -40px;
      scale: 1.05;
      opacity: 0.85;
    }

    100% {
      translate: 0 -42px;
      scale: 1.1;
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .loader,
    .loader__liquid,
    .loader__bubble {
      animation: none;
    }
  }
`;

export default Loader;
