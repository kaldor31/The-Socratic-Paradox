import { useRef, useEffect, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import { Eraser, Undo2, Redo2, Trash2 } from 'lucide-react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const BG_COLOR = '#121214';

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
    const [brushSize, setBrushSize] = useState(3);
    const [isEraser, setIsEraser] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const getSnapshot = useCallback(() => {
      const ctx = ctxRef.current;
      return ctx ? ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT) : null;
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
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      strokeCountRef.current = 0;

      const blank = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      setHistory([{ data: blank, strokeCount: 0 }]);
      setHistoryIndex(0);
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctxRef.current = ctx;
      resetCanvas();

      if (initialDrawing) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          strokeCountRef.current = 1;
          const snapshot = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
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
      ctx.strokeStyle = isEraser ? BG_COLOR : color;
      ctx.lineWidth = isEraser ? brushSize * 3 : brushSize;
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const ctx = ctxRef.current;
      if (!ctx) return;
      const { x, y } = getCoordinates(e.nativeEvent);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.closePath();
      isDrawingRef.current = false;
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
      ctx.fillStyle = BG_COLOR;
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
                className={`h-6 w-6 rounded-full border-2 transition-all ${color === c && !isEraser ? 'border-white scale-110' : 'border-transparent'}`}
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
