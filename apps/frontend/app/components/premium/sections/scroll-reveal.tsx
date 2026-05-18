"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { cn } from "@/app/lib/utils";

export interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  animation?: "fade" | "slide-up" | "slide-left" | "slide-right" | "scale" | "blur" | "zoom";
  delay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
  staggerChildren?: boolean;
  staggerDelay?: number;
}

export function ScrollReveal({
  children,
  className,
  animation = "fade",
  delay = 0,
  duration = 600,
  threshold = 0.1,
  once = true,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, once]);

  const animationClasses: Record<string, string> = {
    fade: "opacity-0 translate-y-8",
    "slide-up": "opacity-0 translate-y-12",
    "slide-left": "opacity-0 -translate-x-12",
    "slide-right": "opacity-0 translate-x-12",
    scale: "opacity-0 scale-90",
    blur: "opacity-0 blur-sm",
    zoom: "opacity-0 scale-75",
  };

  const visibleClasses: Record<string, string> = {
    fade: "opacity-100 translate-y-0",
    "slide-up": "opacity-100 translate-y-0",
    "slide-left": "opacity-100 translate-x-0",
    "slide-right": "opacity-100 translate-x-0",
    scale: "opacity-100 scale-100",
    blur: "opacity-100 blur-0",
    zoom: "opacity-100 scale-100",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all ease-out",
        isVisible ? visibleClasses[animation] : animationClasses[animation],
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export interface ScrollRevealGroupProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  animation?: "fade" | "slide-up" | "slide-left" | "slide-right" | "scale";
  once?: boolean;
}

export function ScrollRevealGroup({
  children,
  className,
  staggerDelay = 100,
  animation = "fade",
  once = true,
}: ScrollRevealGroupProps) {
  return (
    <div className={cn("contents", className)} data-stagger-delay={staggerDelay} data-animation={animation}>
      {typeof children === "object" && children !== null
        ? Array.isArray(children)
          ? children.map((child, index) => (
              <ScrollReveal
                key={index}
                animation={animation}
                delay={index * staggerDelay}
                once={once}
              >
                {child}
              </ScrollReveal>
            ))
          : children
        : children}
    </div>
  );
}

export interface ParallaxSectionProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  direction?: "up" | "down";
}

export function ParallaxSection({
  children,
  className,
  speed = 0.5,
  direction = "up",
}: ParallaxSectionProps) {
  const [offset, setOffset] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const scrolled = window.scrollY;
      const elementTop = rect.top + scrolled;
      const relativeScroll = scrolled - elementTop;
      const directionMultiplier = direction === "up" ? -1 : 1;
      setOffset(relativeScroll * speed * directionMultiplier);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed, direction]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ transform: `translateY(${offset}px)` }}
    >
      {children}
    </div>
  );
}

export interface CounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  startOnVisible?: boolean;
}

export function Counter({
  end,
  duration = 2000,
  suffix = "",
  prefix = "",
  className,
  startOnVisible = true,
}: CounterProps) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!startOnVisible) {
      setHasStarted(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [startOnVisible, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(eased * end));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration, hasStarted]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

export interface ScrollProgressProps {
  className?: string;
  color?: string;
  height?: number;
}

export function ScrollProgress({ className, color, height = 3 }: ScrollProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={cn("fixed top-0 left-0 w-full z-[9999]", className)}
      style={{ height }}
    >
      <div
        className="h-full transition-all duration-100 ease-out"
        style={{
          width: `${progress}%`,
          background: color || "linear-gradient(90deg, #a78bfa, #4ade80)",
        }}
      />
    </div>
  );
}

export interface AnimateOnScrollProps {
  children: ReactNode;
  className?: string;
  type?: "fade" | "bounce" | "pulse" | "shake" | "spin";
  duration?: number;
  delay?: number;
  triggerOnce?: boolean;
}

export function AnimateOnScroll({
  children,
  className,
  type = "fade",
  duration = 600,
  delay = 0,
  triggerOnce = true,
}: AnimateOnScrollProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [triggerOnce]);

  return (
    <div
      ref={ref}
      className={cn(
        isVisible ? "animate-scroll-fade" : "opacity-0",
        className
      )}
      style={{
        animationDuration: `${duration}ms`,
        animationDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
}

export function MagneticButton({ children, className, strength = 0.3 }: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = (e.clientX - centerX) * strength;
      const deltaY = (e.clientY - centerY) * strength;

      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    };

    const handleMouseLeave = () => {
      element.style.transform = "translate(0, 0)";
    };

    element.addEventListener("mousemove", handleMouseMove);
    element.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      element.removeEventListener("mousemove", handleMouseMove);
      element.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [strength]);

  return (
    <div ref={ref} className={cn("transition-transform duration-300 ease-out", className)}>
      {children}
    </div>
  );
}

export interface StaggerRevealProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
  animation?: "fade" | "slide-up" | "scale";
}

export function StaggerReveal({
  children,
  className,
  staggerDelay = 100,
  animation = "fade",
}: StaggerRevealProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.isArray(children) ? (
        children.map((child, index) => (
          <ScrollReveal
            key={index}
            animation={animation}
            delay={index * staggerDelay}
          >
            {child}
          </ScrollReveal>
        ))
      ) : (
        <ScrollReveal animation={animation}>{children}</ScrollReveal>
      )}
    </div>
  );
}