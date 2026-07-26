import React from "react";
import styled from "styled-components";

const Loader = () => {
  return (
    <StyledWrapper>
      <svg
        aria-label="Rocking Erlenmeyer flask with bubbles rising out of its mouth"
        role="img"
        viewBox="0 0 120 140"
        className="loader"
      >
        <clipPath id="flask-liquid-clip">
          <path d="M48 16 V44 L22 112 Q20 120 30 120 H90 Q100 120 98 112 L72 44 V16 Z" />
        </clipPath>
        <g clipPath="url(#flask-liquid-clip)">
          <path
            d="M0 78 Q10 72 20 78 T40 78 T60 78 T80 78 T100 78 T120 78 T140 78 T160 78 V140 H0 Z"
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
    display: block;
    margin: auto;
    width: 8em;
    height: auto;
    transform-origin: 50% 96%;
    animation: rock 3.2s ease-in-out infinite;
  }

  .loader__flask {
    fill: none;
    stroke: #262626;
    stroke-width: 3.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .loader__rim {
    fill: none;
    stroke: #262626;
    stroke-width: 5;
    stroke-linecap: round;
  }

  .loader__liquid {
    fill: #b3b3b3;
    animation: liquid-wave 2.6s linear infinite;
  }

  .loader__bubble {
    fill: #f0f0f0;
    stroke: #8c8c8c;
    stroke-width: 0.75;
    opacity: 0;
    transform-box: fill-box;
    transform-origin: center;
    animation: bubble-rise 3.6s linear infinite;
  }

  .loader__bubble--1 {
    animation-duration: 3.4s;
    animation-delay: 0s;
  }

  .loader__bubble--2 {
    animation-duration: 4.2s;
    animation-delay: -1.2s;
  }

  .loader__bubble--3 {
    animation-duration: 3s;
    animation-delay: -2.1s;
  }

  .loader__bubble--4 {
    animation-duration: 3.8s;
    animation-delay: -0.6s;
  }

  .loader__bubble--5 {
    animation-duration: 3.2s;
    animation-delay: -1.7s;
  }

  .loader__bubble--6 {
    animation-duration: 4.4s;
    animation-delay: -2.8s;
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

  @keyframes bubble-rise {
    0% {
      translate: 0 0;
      scale: 0.5;
      opacity: 0;
    }

    8% {
      opacity: 0.9;
    }

    35% {
      translate: 2px -42px;
    }

    65% {
      translate: -2px -78px;
    }

    88% {
      opacity: 0.9;
    }

    100% {
      translate: 0 -118px;
      scale: 1.05;
      opacity: 0;
    }
  }
`;

export default Loader;
