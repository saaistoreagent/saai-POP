'use client';

import { POPSize } from '@/types/pop';

interface A4SheetProps {
  size: POPSize;
  children: React.ReactNode[];
}

/** A4 용지 (794 x 1123px) 위에 POP을 배치 + 절취선 */
export default function A4Sheet({ size, children }: A4SheetProps) {
  const needsCutGuide = size.perA4 > 1;

  return (
    <div
      id="a4-sheet"
      className="bg-white shadow-xl relative"
      style={{ width: 794, height: 1123 }}
    >
      <div
        className="flex flex-wrap content-start"
        style={{ width: 794, height: 1123 }}
      >
        {children.map((child, i) => {
          const col = i % size.cols;
          const row = Math.floor(i / size.cols);
          const isLastCol = col === size.cols - 1;
          const isLastRow = row === size.rows - 1;

          return (
            <div
              key={i}
              className="overflow-hidden flex-shrink-0 relative"
              style={{ width: size.width, height: size.height }}
            >
              {child}

              {/* 세로 절취선 */}
              {needsCutGuide && !isLastCol && (
                <div className="absolute top-0 right-0 h-full" style={{ borderRight: '1.5px dashed #aaa' }} />
              )}
              {/* 가로 절취선 */}
              {needsCutGuide && !isLastRow && (
                <div className="absolute bottom-0 left-0 w-full" style={{ borderBottom: '1.5px dashed #aaa' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
