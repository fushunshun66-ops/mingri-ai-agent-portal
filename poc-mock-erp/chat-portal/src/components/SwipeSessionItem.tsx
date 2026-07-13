import { useRef, useState, useCallback } from "react";
import type { TouchEvent, MouseEvent } from "react";
import type { Session } from "../types/message";

interface SwipeSessionItemProps {
  session: Session;
  isActive: boolean;
  isRunning: boolean;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  expandedId: string | null;
  onExpand: (id: string | null) => void;
  children: React.ReactNode;
}

const MAX_SWIPE = 120;
const THRESHOLD = 48;
const CLICK_THRESHOLD = 10;

export function SwipeSessionItem({
  session,
  isActive,
  isRunning,
  onLoad,
  onDelete,
  onArchive,
  expandedId,
  onExpand,
  children,
}: SwipeSessionItemProps) {
  const [translateX, setTranslateX] = useState(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const translateXRef = useRef(0);
  const isVerticalRef = useRef(false);
  const isSwipingRef = useRef(false);
  const isTouchedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setTranslateX(0);
    onExpand(null);
  }, [onExpand]);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      startXRef.current = e.touches[0].clientX;
      startYRef.current = e.touches[0].clientY;
      isVerticalRef.current = false;
      isSwipingRef.current = false;
      isTouchedRef.current = true;
      if (expandedId && expandedId !== session.id) {
        onExpand(null);
      }
    },
    [expandedId, session.id, onExpand]
  );

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const deltaX = e.touches[0].clientX - startXRef.current;
    const deltaY = e.touches[0].clientY - startYRef.current;

    if (!isSwipingRef.current && !isVerticalRef.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        isVerticalRef.current = true;
        return;
      }
      isSwipingRef.current = true;
    }

    if (isVerticalRef.current) return;

    if (deltaX > 0) {
      translateXRef.current = 0;
      setTranslateX(0);
      return;
    }

    e.preventDefault();
    const clamped = Math.max(deltaX, -MAX_SWIPE);
    translateXRef.current = clamped;
    setTranslateX(clamped);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (isVerticalRef.current || !isSwipingRef.current) return;

    const lastX = translateXRef.current;

    if (lastX < -THRESHOLD) {
      setTranslateX(-MAX_SWIPE);
      onExpand(session.id);
    } else if (Math.abs(lastX) < CLICK_THRESHOLD) {
      reset();
      onLoad(session.id);
    } else {
      reset();
    }
  }, [session.id, onExpand, reset, onLoad]);

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (isTouchedRef.current) {
        isTouchedRef.current = false;
        return;
      }
      if (expandedId === session.id) {
        reset();
        return;
      }
      if (expandedId) {
        onExpand(null);
      }
      onLoad(session.id);
    },
    [expandedId, session.id, onExpand, onLoad, reset]
  );

  const isExpanded = expandedId === session.id;

  return (
    <div className="swipe-item-container" ref={containerRef}>
      <div className="swipe-actions">
        <button
          type="button"
          className="swipe-action swipe-action--archive"
          onClick={(e) => {
            e.stopPropagation();
            reset();
            onArchive(session.id);
          }}
          aria-label="归档"
        >
          归档
        </button>
        <button
          type="button"
          className="swipe-action swipe-action--delete"
          onClick={(e) => {
            e.stopPropagation();
            reset();
            onDelete(session.id);
          }}
          aria-label="删除"
        >
          删除
        </button>
      </div>
      <div
        className="swipe-item-content"
        style={{
          transform: `translateX(${isExpanded ? -MAX_SWIPE : translateX}px)`,
          transition: isSwipingRef.current ? "none" : "transform 0.25s ease",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {children}
      </div>
    </div>
  );
}
