import { useRef, useState, useCallback } from "react";
import { Move } from "lucide-react";

interface Position {
  x: number; // 0–100
  y: number; // 0–100
}

interface ImagePositionerProps {
  imageUrl: string;
  initialPosition?: Position;
  aspectClass?: string; // e.g. "h-48" for banner, "h-64 w-64" for square cover
  onSave: (position: Position) => void;
  onCancel?: () => void;
  label?: string;
}

export function ImagePositioner({
  imageUrl,
  initialPosition = { x: 50, y: 50 },
  aspectClass = "h-48",
  onSave,
  onCancel,
  label = "Drag to reposition",
}: ImagePositionerProps) {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const calcPosition = useCallback((clientX: number, clientY: number): Position => {
    if (!containerRef.current) return position;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }, [position]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setPosition(calcPosition(e.clientX, e.clientY));

    const onMove = (ev: MouseEvent) => {
      setPosition(calcPosition(ev.clientX, ev.clientY));
    };
    const onUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setPosition(calcPosition(touch.clientX, touch.clientY));
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setPosition(calcPosition(touch.clientX, touch.clientY));
  };
  const handleTouchEnd = () => setIsDragging(false);

  return (
    <div className="flex flex-col gap-3">
      {/* Preview container */}
      <div
        ref={containerRef}
        className={`relative w-full ${aspectClass} overflow-hidden rounded-xl select-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={imageUrl}
          alt="Reposition preview"
          draggable={false}
          className="w-full h-full object-cover pointer-events-none"
          style={{ objectPosition: `${position.x}% ${position.y}%` }}
        />

        {/* Instruction overlay — fades out while dragging */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none ${
            isDragging ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-white/90">
            <Move size={12} />
            {label}
          </div>
        </div>

        {/* Live crosshair */}
        <div
          className="absolute w-5 h-5 pointer-events-none transition-none"
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="w-full h-full rounded-full border-2 border-[#c9a84c] bg-[#c9a84c]/20 shadow-lg" />
        </div>
      </div>

      {/* Position readout */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>
          Focal point: <span className="text-[#c9a84c] font-mono">{Math.round(position.x)}%</span> /{" "}
          <span className="text-[#c9a84c] font-mono">{Math.round(position.y)}%</span>
        </span>
        <button
          type="button"
          onClick={() => setPosition({ x: 50, y: 50 })}
          className="text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
        >
          Reset center
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave(position)}
          className="flex-1 bg-[#c9a84c] text-black font-bold py-2.5 rounded-xl text-sm hover:bg-[#d4b86a] transition-colors active:scale-95"
        >
          Save Position
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 border border-white/10 text-gray-400 rounded-xl text-sm hover:text-white hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
