import { Canvas } from "@react-three/fiber";
import { useGLTF, Center } from "@react-three/drei";
import { Suspense, useMemo } from "react";

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => scene.clone(), [scene]);
  return (
    <Center>
      <primitive object={model} scale={0.85} />
    </Center>
  );
}

/** Bare GLB on the map — no frame, no spin. */
export default function VenueModel3D({
  modelPath,
  size = 52,
}: {
  modelPath: string;
  size?: number;
}) {
  return (
    <div
      className="surna-venue-model-canvas"
      style={{ width: size, height: size, background: "transparent" }}
    >
      <Canvas
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [2.1, 1.35, 2.4], fov: 30 }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 4]} intensity={1.15} />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} />
        <Suspense fallback={null}>
          <Model url={modelPath} />
        </Suspense>
      </Canvas>
    </div>
  );
}
