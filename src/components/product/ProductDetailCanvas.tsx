"use client";

import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, useGLTF } from "@react-three/drei";
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
      <hemisphereLight args={[colors.cream, "#8A7358", 0.38]} />
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
    optimizeModelForGpu(productRoot, 768);
    productRoot.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) mesh.renderOrder = 12;
    });
  }, [productRoot, displaySize]);

  return <primitive object={productRoot} />;
}

function ResponsiveCamera() {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const mobile = size.width < 768;
    camera.position.set(0, mobile ? 0.12 : 0.08, mobile ? 2.05 : 2.25);
    camera.fov = mobile ? 32 : 28;
    camera.near = 0.05;
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

  return (
    <>
      <ResponsiveCamera />
      <DetailLights />
      <Environment preset="studio" environmentIntensity={0.45} />
      <OrbitControls
        makeDefault
        target={[0, mobile ? 0.06 : 0.04, 0]}
        enableDamping
        dampingFactor={0.08}
        enableZoom
        enablePan={false}
        minDistance={mobile ? 1.35 : 1.5}
        maxDistance={mobile ? 3.2 : 3.6}
        rotateSpeed={mobile ? 0.52 : 0.42}
        zoomSpeed={0.65}
        minPolarAngle={Math.PI * 0.18}
        maxPolarAngle={Math.PI * 0.52}
      />
      <Suspense fallback={null}>
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
        resolution={512}
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
    <div className="relative h-full w-full">
      <Canvas
        className="touch-pan-y"
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        camera={{ position: [0, 0.08, 2.25], fov: 28, near: 0.05, far: 100 }}
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
