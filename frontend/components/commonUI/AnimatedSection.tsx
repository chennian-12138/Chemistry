"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  animationType?: "fade-up" | "fade-left" | "fade-right" | "scale";
  delay?: number;
  threshold?: number;
}

export default function AnimatedSection({ 
  children, 
  className = "", 
  animationType = "fade-up",
  delay = 0,
  threshold = 0.1 
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -50px 0px"
      }
    );

    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold]);

  const getAnimationClass = () => {
    if (!isVisible) {
      switch (animationType) {
        case "fade-left":
          return "opacity-0 translate-x-[-50px]";
        case "fade-right":
          return "opacity-0 translate-x-[50px]";
        case "scale":
          return "opacity-0 scale-95";
        default:
          return "opacity-0 translate-y-10";
      }
    }
    
    return "opacity-100 translate-y-0 scale-100";
  };

  const animationDuration = delay > 0 ? `${delay}s` : "0.6s";

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${getAnimationClass()}`}
      style={{ 
        transitionDuration: animationDuration,
        transitionDelay: `${delay * 1000}ms`
      }}
    >
      {children}
    </div>
  );
}