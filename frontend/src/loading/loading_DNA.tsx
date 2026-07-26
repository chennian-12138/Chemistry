import React from "react";
import styled from "styled-components";

const Loader = () => {
  return (
    <StyledWrapper>
      <div aria-label="Circular DNA double helix rotating" role="img" className="dna">
        <div className="rung" />
        <div className="rung" />
        <div className="rung" />
        <div className="rung" />
        <div className="rung" />
        <div className="rung" />
        <div className="rung" />
        <div className="rung" />
        <div className="rung" />
        <div className="rung" />
        <div className="rung" />
        <div className="rung" />
        <div className="rung" />
        <div className="rung" />
        <div className="rung" />
        <div className="rung" />
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .dna {
    --size: 120px;
    --speed: 2.4s;
    --step: calc(var(--speed) / -16);
    --radius: 48px;
    --rung-length: 16px;
    --strand-a: #1f1f1f;
    --strand-b: #a3a3a3;
    position: relative;
    width: var(--size);
    height: var(--size);
    margin: auto;
  }

  .dna::before,
  .dna::after {
    content: "";
    position: absolute;
    border: 1.5px solid #dcdcdc;
    border-radius: 50%;
  }

  .dna::before {
    width: calc((var(--radius) + var(--rung-length) / 2) * 2);
    height: calc((var(--radius) + var(--rung-length) / 2) * 2);
    top: calc(50% - (var(--radius) + var(--rung-length) / 2));
    left: calc(50% - (var(--radius) + var(--rung-length) / 2));
  }

  .dna::after {
    width: calc((var(--radius) - var(--rung-length) / 2) * 2);
    height: calc((var(--radius) - var(--rung-length) / 2) * 2);
    top: calc(50% - (var(--radius) - (var(--rung-length) / 2)));
    left: calc(50% - (var(--radius) - (var(--rung-length) / 2)));
  }

  .rung {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 4px;
    height: var(--rung-length);
    margin: calc(var(--rung-length) / -2) 0 0 -2px;
    animation: twist var(--speed) ease-in-out infinite;
  }

  .rung::before,
  .rung::after {
    content: "";
    position: absolute;
    left: 0;
    width: 100%;
    height: 50%;
  }

  .rung::before {
    top: 0;
    background-color: var(--strand-a);
    border-radius: 2px 2px 1px 1px;
  }

  .rung::after {
    bottom: 0;
    background-color: var(--strand-b);
    border-radius: 1px 1px 2px 2px;
  }

  .rung:nth-child(1) {
    transform: rotate(0deg) translateY(calc(var(--radius) * -1));
  }

  .rung:nth-child(2) {
    transform: rotate(22.5deg) translateY(calc(var(--radius) * -1));
    animation-delay: var(--step);
  }

  .rung:nth-child(3) {
    transform: rotate(45deg) translateY(calc(var(--radius) * -1));
    animation-delay: calc(var(--step) * 2);
  }

  .rung:nth-child(4) {
    transform: rotate(67.5deg) translateY(calc(var(--radius) * -1));
    animation-delay: calc(var(--step) * 3);
  }

  .rung:nth-child(5) {
    transform: rotate(90deg) translateY(calc(var(--radius) * -1));
    animation-delay: calc(var(--step) * 4);
  }

  .rung:nth-child(6) {
    transform: rotate(112.5deg) translateY(calc(var(--radius) * -1));
    animation-delay: calc(var(--step) * 5);
  }

  .rung:nth-child(7) {
    transform: rotate(135deg) translateY(calc(var(--radius) * -1));
    animation-delay: calc(var(--step) * 6);
  }

  .rung:nth-child(8) {
    transform: rotate(157.5deg) translateY(calc(var(--radius) * -1));
    animation-delay: calc(var(--step) * 7);
  }

  .rung:nth-child(9) {
    transform: rotate(180deg) translateY(calc(var(--radius) * -1));
    animation-delay: calc(var(--step) * 8);
  }

  .rung:nth-child(10) {
    transform: rotate(202.5deg) translateY(calc(var(--radius) * -1));
    animation-delay: calc(var(--step) * 9);
  }

  .rung:nth-child(11) {
    transform: rotate(225deg) translateY(calc(var(--radius) * -1));
    animation-delay: calc(var(--step) * 10);
  }

  .rung:nth-child(12) {
    transform: rotate(247.5deg) translateY(calc(var(--radius) * -1));
    animation-delay: calc(var(--step) * 11);
  }

  .rung:nth-child(13) {
    transform: rotate(270deg) translateY(calc(var(--radius) * -1));
    animation-delay: calc(var(--step) * 12);
  }

  .rung:nth-child(14) {
    transform: rotate(292.5deg) translateY(calc(var(--radius) * -1));
    animation-delay: calc(var(--step) * 13);
  }

  .rung:nth-child(15) {
    transform: rotate(315deg) translateY(calc(var(--radius) * -1));
    animation-delay: calc(var(--step) * 14);
  }

  .rung:nth-child(16) {
    transform: rotate(337.5deg) translateY(calc(var(--radius) * -1));
    animation-delay: calc(var(--step) * 15);
  }

  @keyframes twist {
    0%,
    100% {
      scale: 1 1;
      opacity: 1;
    }

    25% {
      scale: 1 0;
      opacity: 0.75;
    }

    50% {
      scale: 1 -1;
      opacity: 0.55;
    }

    75% {
      scale: 1 0;
      opacity: 0.75;
    }
  }
`;

export default Loader;
