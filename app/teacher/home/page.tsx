"use client";
import SmartphoneFrame from "../../../components/frame/SmartphoneFrame";
import SmartphoneHeader from "../../../components/frame/SmartphoneHeader";
import CommonFooter from "../../../components/CommonFooter";
import StudentBell from "../../../components/student/StudentBell";
import Toukei from "../../../components/maker/toukei";
import type { PieData } from "../../../types/toukei";

export default function Home() {
  // 仮の学校情報
  const schoolInfo = { school: "サンプル小学校", grade: 6, className: "2" };
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SmartphoneFrame>
        <SmartphoneHeader />
        <div style={{ position: 'absolute', top: '25mm', right: '3mm', zIndex: 50 }}><StudentBell count={3} /></div>
        <main className="flex-1 p-4 flex flex-col items-center justify-center">
          {/* 学校名と学年クラス表示 */}
          <div style={{
          textAlign: "center",
          marginBottom: 6,
          border: "1px solid #bbb",
          borderRadius: 7,
          padding: "4px 0 2px 0",
          background: "#fafafa",
          width: "75%",
          margin: "-0.5cm auto 6px auto"
        }}>
        <div style={{ fontSize: 15, fontWeight: "bold" }}>{schoolInfo?.school || "学校名"}</div>
        <div style={{ fontSize: 13 }}>{schoolInfo ? `${schoolInfo.grade}年${schoolInfo.className}組` : "学年組"}</div>
      </div>

          {/* 仮データ */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
            <Toukei 
              data={[
                { label: "A", value: 10 },
                { label: "B", value: 20 },
                { label: "C", value: 30 },
                { label: "D", value: 40 },
              ]}
              size={320}
            />
          </div>
        </main>
        <CommonFooter />
      </SmartphoneFrame>
    </div>
  );
}
