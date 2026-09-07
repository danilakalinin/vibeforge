import { useRef } from "react";

interface Props {
  direction: "horizontal" | "vertical";
  onResize: (delta: number) => void;
}

export function ResizeHandle({ direction, onResize }: Props) {
  const startPos = useRef<number>(0);

  const isH = direction === "horizontal";

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    startPos.current = isH ? e.clientX : e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const current = isH ? e.clientX : e.clientY;
    const delta = current - startPos.current;
    startPos.current = current;
    onResize(delta);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`relative shrink-0 flex items-center justify-center group bg-surface-600 hover:bg-brand-500 transition-colors z-10
        ${isH ? "w-px cursor-col-resize" : "h-px cursor-row-resize"}`}
    >
      {/* Invisible wider hit area so a 1px seam is still easy to grab. */}
      <div className={isH ? "absolute w-2 h-full cursor-col-resize" : "absolute h-2 w-full cursor-row-resize"} />
    </div>
  );
}
