// components/Scene.tsx
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo, useEffect, useState, Suspense } from "react";
import { useGLTF, OrbitControls } from "@react-three/drei";
import { Group, Box3, Vector3, Object3D } from "three";

// GLTFローダーを分離したコンポーネント
function GLTFModel() {
  const group = useRef<Group>(null);
  const [scale, setScale] = useState(1);
  
  const { scene } = useGLTF("/models/character.glb?v=8");
  
  // ✅ 読み込んだモデルの大きさを測ってスケーリング
  useEffect(() => {
    if (!scene) return;
    
    try {
      const bbox = new Box3().setFromObject(scene);
      const size = new Vector3();
      bbox.getSize(size);

      console.log("Original size:", size);

      // 目標サイズ（例えば高さを 3 にする）
      const targetHeight = 3;
      const currentHeight = size.y;
      if (currentHeight > 0) {
        const s = (targetHeight / currentHeight) * 1.5;
        setScale(s);
      }
    } catch (err) {
      console.error("Scaling error:", err);
    }
  }, [scene]);

  // アニメーションなし（静止状態）
  // useFrameをコメントアウトしてアニメーションを停止

  if (!scene) {
    return null;
  }

  console.log("Displaying actual 3D model");
  return (
    <group ref={group} scale={[scale, scale, scale]} position={[0, -1.5, 0]}>
      <primitive object={scene.clone(true)} />
    </group>
  );
}

// エラーフォールバック表示
function ErrorFallback() {
  const group = useRef<Group>(null);
  
  // アニメーションなし（静止状態）
  // useFrameをコメントアウトしてアニメーションを停止

  console.log("Displaying error fallback");
  return (
    <group ref={group} position={[0, -1.5, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.3]} />
        <meshStandardMaterial color="red" />
      </mesh>
    </group>
  );
}

function SwimmingClione() {
  return (
    <Suspense fallback={<LoadingCube />}>
      <GLTFModel />
    </Suspense>
  );
}

// ローディング中の表示コンポーネント
function LoadingCube() {
  const group = useRef<Group>(null);
  
  // アニメーションなし（静止状態）
  // useFrameをコメントアウトしてアニメーションを停止

  return (
    <group ref={group} position={[0, -1.5, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color="skyblue" />
      </mesh>
    </group>
  );
}

export default function Scene() {
  return (
    <Canvas
      style={{ width: "100%", height: "100%", background: "transparent" }}
      camera={{ position: [0, 0, 1.2], fov: 60 }}
      gl={{ alpha: true, antialias: true }}
      onError={(error) => {
        console.error("Canvas error:", error);
      }}
    >
      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.0} />
      
      <Suspense fallback={<LoadingCube />}>
        <SwimmingClione />
      </Suspense>
      
      <OrbitControls enablePan={false} enableZoom={true} autoRotate={false} />
    </Canvas>
  );
}
