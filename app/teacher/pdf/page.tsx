"use client";
import SmartphoneFrame from "../../../components/frame/SmartphoneFrame";
import SmartphoneHeader from "../../../components/frame/SmartphoneHeader";
import CommonFooter from "../../../components/CommonFooter";
import DesktopFrame from "../../../components/frame/DesktopFrame";
import { useState } from "react";
import StudentBell from "../../../components/student/StudentBell";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SmartphoneFrame>
        <SmartphoneHeader />
        <div style={{ position: 'absolute', top: '25mm', right: '3mm', zIndex: 50 }}><StudentBell count={3} /></div>
        <main className="flex-1 p-4">
          <h1>先生用PDF画面</h1>
          <p>ここに先生向けの機能やUIを追加できます。</p>
        </main>
        <CommonFooter />
      </SmartphoneFrame>
    </div>
  );
}
