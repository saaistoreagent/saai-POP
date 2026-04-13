import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "편의점 POP 자동 생성기",
  description: "AI로 편의점 POP를 자동 생성하세요. 가격표, 행사 안내, 신상품 홍보, 시즌 POP까지.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "POP" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#3B82F6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          // 개발 모드 이미지/리소스 로딩 에러 서프레스
          window.addEventListener('error', function(e) {
            if (e instanceof Event && !(e instanceof ErrorEvent)) {
              e.stopImmediatePropagation();
              e.preventDefault();
            }
          }, true);
        `}} />
      </head>
      <body className="min-h-full bg-gray-100">{children}</body>
    </html>
  );
}
