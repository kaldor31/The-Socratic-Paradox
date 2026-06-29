import { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;

export interface JournalCanvasRef {
  getDataUrl: () => string;
  clear: () => void;
  hasDrawing: () => boolean;
}

interface JournalCanvasProps {
  initialDrawing?: string;
  onChange?: () => void;
}

export const JournalCanvas = forwardRef<JournalCanvasRef, JournalCanvasProps>(
  function JournalCanvas({ initialDrawing, onChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const isDrawingRef = useRef(false);
    const hasDrawingRef = useRef(false);
    const [color, setColor] = useState('#d4a85d');
    const [brushSize, setBrushSize] = useState(3);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#121214';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctxRef.current = ctx;
      hasDrawingRef.current = false;

      if (initialDrawing) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          hasDrawingRef.current = true;
        };
        img.src = initialDrawing;
      }
    }, [initialDrawing]);

    const getCoordinates = (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
      const x = ((clientX - rect.left) / rect.width) * CANVAS_WIDTH;
      const y = ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
      return { x, y };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const ctx = ctxRef.current;
      if (!ctx) return;
      isDrawingRef.current = true;
      const { x, y } = getCoordinates(e.nativeEvent);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const ctx = ctxRef.current;
      if (!ctx) return;
      const { x, y } = getCoordinates(e.nativeEvent);
      ctx.lineTo(x, y);
      ctx.stroke();
      hasDrawingRef.current = true;
      onChange?.();
    };

    const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.closePath();
      isDrawingRef.current = false;
    };

    const getDataUrl = () => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      return canvas.toDataURL('image/png');
    };

    const clear = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.fillStyle = '#121214';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      hasDrawingRef.current = false;
      onChange?.();
    };

    const hasDrawing = () => hasDrawingRef.current;

    useImperativeHandle(ref, () => ({ getDataUrl, clear, hasDrawing }));

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {['#d4a85d', '#e07a5f', '#81b29a', '#f2cc8f', '#ffffff', '#121214'].map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <input
            type="range"
            min={1}
            max={12}
            value={brushSize}
            onChange={e => setBrushSize(Number(e.target.value))}
            className="w-32 accent-accent-gold"
            aria-label="Brush size"
          />
        </div>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full cursor-crosshair rounded-xl border border-marble-700 bg-marble-900"
        />
      </div>
    );
  }
);
