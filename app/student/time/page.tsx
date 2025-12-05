"use client";
import SmartphoneFrame from "../../../components/frame/SmartphoneFrame";
import "../../../styles/student-responsive.css";
import SmartphoneHeader from "../../../components/frame/SmartphoneHeader";
import StudentFooter from "../../../components/student/StudentFooter";
import Calendar from "../../../components/maker/Calendar";
import StudentBell from "../../../components/student/StudentBell";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#fff' }}>
      <SmartphoneFrame>
            <SmartphoneHeader />
            <div style={{ position: 'absolute', top: '25mm', right: '3mm', zIndex: 50 }}><StudentBell count={3} /></div>
        <main className="flex-1 p-4 flex flex-col items-center justify-center">
          <div style={{ marginTop: "-210px", paddingBottom: "2cm" }}>
            <Calendar />
          </div>
        </main>
        <StudentFooter />
      </SmartphoneFrame>
    </div>
  );
}
