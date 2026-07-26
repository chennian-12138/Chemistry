import React from "react";
import styled from "styled-components";

const Loader = () => {
  return (
    <StyledWrapper>
      <svg
        aria-label="Benzene ring alternating between its two Kekulé resonance structures"
        role="img"
        viewBox="0 0 120 120"
        className="loader"
      >
        <polygon
          points="60,20 94.6,40 94.6,80 60,100 25.4,80 25.4,40"
          className="loader__ring"
        />
        <g className="loader__bonds loader__bonds--a">
          <path d="M63.4 30.1 L84.2 42.1" pathLength="1" />
          <path d="M84.2 77.9 L63.4 89.9" pathLength="1" />
          <path d="M32.4 72 L32.4 48" pathLength="1" />
        </g>
        <g className="loader__bonds loader__bonds--b">
          <path d="M87.6 48 L87.6 72" pathLength="1" />
          <path d="M56.6 89.9 L35.8 77.9" pathLength="1" />
          <path d="M35.8 42.1 L56.6 30.1" pathLength="1" />
        </g>
      </svg>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .loader {
    --dur: 4s;
    display: block;
    margin: auto;
    width: 9em;
    height: auto;
  }

  .loader__ring {
    fill: none;
    stroke: #3f3f3f;
    stroke-width: 3.5;
    stroke-linejoin: round;
  }

  .loader__bonds {
    fill: none;
    stroke: #161616;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 0.5 0.001;
    stroke-dashoffset: 0;
    animation-duration: var(--dur);
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
  }

  .loader__bonds--a {
    animation-name: kekule-a;
  }

  .loader__bonds--b {
    animation-name: kekule-b;
  }

  /* Double bonds retract from the middle into the ring vertices,
     then grow back out from the vertices at the alternate positions. */
  @keyframes kekule-a {
    0%,
    20% {
      stroke-dasharray: 0.5 0.001;
      opacity: 1;
    }

    27% {
      stroke-dasharray: 0.08 0.84;
      opacity: 1;
    }

    30%,
    70% {
      stroke-dasharray: 0.0001 1;
      opacity: 0;
    }

    77% {
      stroke-dasharray: 0.08 0.84;
      opacity: 1;
    }

    80%,
    100% {
      stroke-dasharray: 0.5 0.001;
      opacity: 1;
    }
  }

  @keyframes kekule-b {
    0%,
    30% {
      stroke-dasharray: 0.0001 1;
      opacity: 0;
    }

    37% {
      stroke-dasharray: 0.08 0.84;
      opacity: 1;
    }

    40%,
    60% {
      stroke-dasharray: 0.5 0.001;
      opacity: 1;
    }

    67% {
      stroke-dasharray: 0.08 0.84;
      opacity: 1;
    }

    70%,
    100% {
      stroke-dasharray: 0.0001 1;
      opacity: 0;
    }
  }
`;

export default Loader;
