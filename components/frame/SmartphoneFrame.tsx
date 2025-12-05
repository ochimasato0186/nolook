import React from "react";

/**
 * 実寸大スマホフレーム（iPhone 12/13/14/15 Pro基準: 390x844px）
 */
const SmartphoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    minHeight: "100vh",
    width: "100vw",
    background: "#222a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    overflow: "auto"
  }}>
    <div style={{
      width: "100vw",
      minWidth: "320px",
      maxWidth: "100vw",
      height: "100vh",
      maxHeight: "100vh",
      border: "none",
      borderRadius: "0",
      boxShadow: "0 0 32px 8px #0008, 0 8px 32px #0006",
      position: "relative",
      background: "#fff",
      overflow: "auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      boxSizing: "border-box"
    }}>
      {/* ヘッダー上部エリア（ノッチ下からヘッダーまで） */}
      <div style={{
        width: "100%",
        height: "86px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 1100
      }} />
      {/* 画面エリア */}
      <div
        style={{
          width: "100%",
          minHeight: "100vh",
          position: "relative",
          zIndex: 1200,
          paddingTop: 30,
          background: "#ffffff",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {children}
      </div>
    </div>
  </div>
);

export default SmartphoneFrame;
