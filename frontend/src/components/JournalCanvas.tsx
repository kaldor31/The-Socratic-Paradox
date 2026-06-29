import { useRef, useEffect, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import { Eraser, Undo2, Redo2, Trash2 } from 'lucide-react';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 300;
const DPR = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

function getCanvasBg() {
  if (typeof window === 'undefined') return '#121214';
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim();
  return raw ? `rgb(${raw})` : '#121214';
}

export interface JournalCanvasRef {
  getDataUrl: () => string;
  clear: () => void;
  hasDrawing: () => boolean;
  undo: () => void;
  redo: () => void;
}

interface JournalCanvasProps {
  initialDrawing?: string;
  onChange?: () => void;
}

interface HistoryItem {
  data: ImageData;
  strokeCount: number;
}

export const JournalCanvas = forwardRef<JournalCanvasRef, JournalCanvasProps>(
  function JournalCanvas({ initialDrawing, onChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const isDrawingRef = useRef(false);
    const strokeCountRef = useRef(0);
    const [color, setColor] = useState('#d4a85d');
    const [brushSize, setBrushSize] = useState(4);
    const [isEraser, setIsEraser] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const onChangeRef = useRef(onChange);
    const bgColorRef = useRef(getCanvasBg());
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    onChangeRef.current = onChange;

    const getSnapshot = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return null;
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }, []);

    const applySnapshot = useCallback((item: HistoryItem) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.putImageData(item.data, 0, 0);
      strokeCountRef.current = item.strokeCount;
      onChangeRef.current?.();
    }, []);

    const pushSnapshot = useCallback(() => {
      const snapshot = getSnapshot();
      if (!snapshot) return;
      setHistory(prev => {
        const next = prev.slice(0, historyIndex + 1);
        next.push({ data: snapshot, strokeCount: strokeCountRef.current });
        return next;
      });
      setHistoryIndex(prev => prev + 1);
    }, [getSnapshot, historyIndex]);

    const resetCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;
      const bgColor = getCanvasBg();
      bgColorRef.current = bgColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      strokeCountRef.current = 0;

      const blank = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([{ data: blank, strokeCount: 0 }]);
      setHistoryIndex(0);
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = CANVAS_WIDTH * DPR;
      canvas.height = CANVAS_HEIGHT * DPR;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctxRef.current = ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(DPR, DPR);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      resetCanvas();

      if (initialDrawing) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          strokeCountRef.current = 1;
          const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setHistory([{ data: snapshot, strokeCount: 1 }]);
          setHistoryIndex(0);
          onChangeRef.current?.();
        };
        img.src = initialDrawing;
      }
    }, [initialDrawing, resetCanvas]);

    const getCoordinates = (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const touch = 'touches' in e ? (e.touches[0] ?? e.changedTouches[0]) : undefined;
      const clientX = touch ? touch.clientX : (e as MouseEvent).clientX;
      const clientY = touch ? touch.clientY : (e as MouseEvent).clientY;
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
      lastPointRef.current = { x, y };
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = isEraser ? bgColorRef.current : color;
      ctx.lineWidth = isEraser ? brushSize * 3 : brushSize;
      if (isEraser) {
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      } else {
        ctx.shadowBlur = Math.max(2, brushSize * 0.6);
        ctx.shadowColor = 'rgba(0,0,0,0.18)';
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
      }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const ctx = ctxRef.current;
      if (!ctx) return;
      const { x, y } = getCoordinates(e.nativeEvent);
      const last = lastPointRef.current;
      if (last) {
        const midX = (last.x + x) / 2;
        const midY = (last.y + y) / 2;
        ctx.quadraticCurveTo(last.x, last.y, midX, midY);
        ctx.stroke();
      } else {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      lastPointRef.current = { x, y };
    };

    const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const ctx = ctxRef.current;
      if (!ctx) return;
      const { x, y } = getCoordinates(e.nativeEvent);
      const last = lastPointRef.current;
      if (last) {
        ctx.quadraticCurveTo(last.x, last.y, x, y);
        ctx.stroke();
      }
      ctx.closePath();
      isDrawingRef.current = false;
      lastPointRef.current = null;
      strokeCountRef.current += 1;
      pushSnapshot();
      onChangeRef.current?.();
    };

    const getDataUrl = () => {
      const canvas = canvasRef.current;
      return canvas ? canvas.toDataURL('image/png') : '';
    };

    const clear = useCallback(() => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.fillStyle = bgColorRef.current;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      strokeCountRef.current = 0;
      pushSnapshot();
      onChangeRef.current?.();
    }, [pushSnapshot]);

    const hasDrawing = () => strokeCountRef.current > 0;

    const undo = useCallback(() => {
      if (historyIndex <= 0) return;
      const item = history[historyIndex - 1];
      if (item) applySnapshot(item);
      setHistoryIndex(prev => prev - 1);
    }, [historyIndex, history, applySnapshot]);

    const redo = useCallback(() => {
      if (historyIndex >= history.length - 1) return;
      const item = history[historyIndex + 1];
      if (item) applySnapshot(item);
      setHistoryIndex(prev => prev + 1);
    }, [historyIndex, history, applySnapshot]);

    useImperativeHandle(ref, () => ({ getDataUrl, clear, hasDrawing, undo, redo }));

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {['#d4a85d', '#e07a5f', '#81b29a', '#f2cc8f', '#ffffff', '#121214'].map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); setIsEraser(false); }}
                className={`h-6 w-6 rounded-full border-2 transition-all ${color === c && !isEraser ? 'border-marble-700 ring-2 ring-accent-gold scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
            <button
              onClick={() => setIsEraser(prev => !prev)}
              className={`ml-1 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${isEraser ? 'border-accent-gold bg-accent-gold/20' : 'border-marble-700 hover:border-marble-600'}`}
              aria-label="Eraser"
            >
              <Eraser size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="rounded-full border border-marble-600 shadow-sm"
              style={{
                width: Math.max(12, brushSize * 1.5),
                height: Math.max(12, brushSize * 1.5),
                backgroundColor: isEraser ? bgColorRef.current : color,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
              }}
              aria-hidden="true"
            />
            <input
              type="range"
              min={1}
              max={20}
              value={brushSize}
              onChange={e => setBrushSize(Number(e.target.value))}
              className="w-28 accent-accent-gold"
              aria-label="Brush size"
            />
            <button onClick={undo} disabled={historyIndex <= 0} className="btn-secondary p-2 disabled:opacity-40" aria-label="Undo">
              <Undo2 size={18} />
            </button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="btn-secondary p-2 disabled:opacity-40" aria-label="Redo">
              <Redo2 size={18} />
            </button>
            <button onClick={clear} className="btn-secondary p-2 text-red-400 hover:bg-red-500/10" aria-label="Clear">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH * DPR}
          height={CANVAS_HEIGHT * DPR}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full cursor-crosshair touch-none rounded-xl border border-marble-700"
          style={{ backgroundColor: 'rgb(var(--canvas-bg))' }}
        />
      </div>
    );
  }
);
