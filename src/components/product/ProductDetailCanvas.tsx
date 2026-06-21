"use client";

import { Suspense, useLayoutEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { extendGltfLoader, getModelUrl } from "@/lib/modelAssets";
import { optimizeModelForGpu } from "@/lib/gpuModelOptimize";
import { fitProductToUniformSize, prepareProductMaterials } from "@/lib/productModelUtils";
import { colors } from "@/lib/colors";
import type { Product } from "@/lib/products";

function DetailLights() {
  return (
    <>
      <ambientLight intensity={0.62} color={colors.white} />
      <hemisphereLight args={[colors.cream, "#8A7358", 0.42]} />
      <directionalLight position={[2.2, 4.5, 3]} intensity={1.1} color="#FFF9F2" />
      <directionalLight position={[-2.8, 2.2, -1.2]} intensity={0.35} color={colors.roseGoldLight} />
      <pointLight position={[0.5, 1.4, 2]} intensity={0.4} color={colors.goldLight} distance={6} />
    </>
  );
}

function DetailProductModel({
  modelFile,
  displaySize,
}: {
  modelFile: string;
  displaySize: number;
}) {
  const url = useMemo(() => getModelUrl(modelFile), [modelFile]);
  const { scene: productRoot } = useGLTF(url, false, false, extendGltfLoader);

  useLayoutEffect(() => {
    fitProductToUniformSize(productRoot, displaySize);
    prepareProductMaterials(productRoot);
    optimizeModelForGpu(productRoot, 512);
    productRoot.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) mesh.renderOrder = 12;
    });
  }, [productRoot, displaySize]);

  return <primitive object={productRoot} />;
}

function ModelFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-maj-gold/25 border-t-maj-gold" />
        <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-maj-brown/50">Loading 3D</p>
      </div>
    </Html>
  );
}

function ResponsiveCamera() {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const mobile = size.width < 768;
    camera.position.set(0, mobile ? 0.12 : 0.08, mobile ? 2.05 : 2.25);
    camera.fov = mobile ? 32 : 28;
    camera.near = 0.01;
    camera.far = 100;
    camera.lookAt(0, mobile ? 0.06 : 0.04, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  return null;
}

function DetailScene({
  product,
  displaySize,
}: {
  product: Product;
  displaySize: number;
}) {
  const { size } = useThree();
  const mobile = size.width < 768;
  const targetY = mobile ? 0.06 : 0.04;
  const minZoom = Math.max(0.22, displaySize * 0.38);
  const maxZoom = mobile ? 5.5 : 6.5;

  return (
    <>
      <ResponsiveCamera />
      <DetailLights />
      <OrbitControls
        makeDefault
        target={[0, targetY, 0]}
        enableDamping
        dampingFactor={0.06}
        enableZoom
        enablePan
        screenSpacePanning
        minDistance={minZoom}
        maxDistance={maxZoom}
        rotateSpeed={mobile ? 0.65 : 0.55}
        zoomSpeed={mobile ? 1.05 : 1.2}
        panSpeed={mobile ? 0.85 : 0.95}
        minPolarAngle={0.08}
        maxPolarAngle={Math.PI - 0.08}
      />
      <Suspense fallback={<ModelFallback />}>
        <DetailProductModel modelFile={product.modelFile} displaySize={displaySize} />
      </Suspense>
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.14}
        scale={mobile ? 2.2 : 2.6}
        blur={3.5}
        far={2}
        color="#3D2B1F"
        frames={1}
        resolution={256}
      />
    </>
  );
}

interface ProductDetailCanvasProps {
  product: Product;
  displaySize: number;
}

export default function ProductDetailCanvas({ product, displaySize }: ProductDetailCanvasProps) {
  return (
    <div className="relative h-full w-full" style={{ touchAction: "none" }}>
      <Canvas
        className="touch-pan-y"
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        camera={{ position: [0, 0.08, 2.25], fov: 28, near: 0.01, far: 100 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
      >
        <DetailScene product={product} displaySize={displaySize} />
      </Canvas>
    </div>
  );
}
