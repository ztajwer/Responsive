"use client";

import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { extendGltfLoader, getModelUrl } from "@/lib/modelAssets";
import { optimizeModelForGpu } from "@/lib/gpuModelOptimize";
import { fitProductToUniformSize, prepareProductMaterials } from "@/lib/productModelUtils";
import { colors } from "@/lib/colors";
import type { Product } from "@/lib/products";

function DetailLights() {
  return (
    <>
      <ambientLight intensity={0.55} color={colors.white} />
      <hemisphereLight args={[colors.cream, colors.tablePeach, 0.42]} />
      <directionalLight position={[2.4, 3.8, 2.2]} intensity={1.05} color={colors.white} />
      <directionalLight position={[-2.2, 2.4, -1.4]} intensity={0.38} color={colors.roseGoldLight} />
      <pointLight position={[0, 1.6, 1.2]} intensity={0.35} color={colors.goldLight} distance={4} />
    </>
  );
}

function DetailProductModel({ modelFile, displaySize }: { modelFile: string; displaySize: number }) {
  const groupRef = useRef<THREE.Group>(null);
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

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.28;
  });

  return (
    <group ref={groupRef}>
      <primitive object={productRoot} />
    </group>
  );
}

function ResponsiveCamera() {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const mobile = size.width < 768;
    camera.position.set(0, mobile ? 0.18 : 0.14, mobile ? 1.85 : 2.05);
    camera.fov = mobile ? 34 : 30;
    camera.near = 0.05;
    camera.far = 100;
    camera.lookAt(0, mobile ? 0.08 : 0.06, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  return null;
}

function DetailScene({ product }: { product: Product }) {
  const { size } = useThree();
  const mobile = size.width < 768;
  const displaySize = mobile ? 0.22 : 0.2;

  return (
    <>
      <ResponsiveCamera />
      <DetailLights />
      <OrbitControls
        makeDefault
        target={[0, mobile ? 0.08 : 0.06, 0]}
        enableDamping
        dampingFactor={0.12}
        enableZoom={false}
        enablePan={false}
        rotateSpeed={mobile ? 0.55 : 0.45}
        minPolarAngle={Math.PI * 0.22}
        maxPolarAngle={Math.PI * 0.48}
        minAzimuthAngle={-Math.PI * 0.55}
        maxAzimuthAngle={Math.PI * 0.55}
      />
      <Suspense fallback={null}>
        <DetailProductModel modelFile={product.modelFile} displaySize={displaySize} />
      </Suspense>
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.16}
        scale={mobile ? 2.4 : 2.8}
        blur={2.8}
        far={2.2}
        color="#3D2B1F"
        frames={1}
        resolution={256}
      />
    </>
  );
}

export default function ProductDetailCanvas({ product }: { product: Product }) {
  return (
    <div className="relative h-full min-h-[min(52dvh,440px)] w-full overflow-hidden bg-gradient-to-b from-[#F7EFE6] via-maj-cream to-[#F0E4D6] md:min-h-full">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 72% 58% at 50% 42%, rgba(212,175,55,0.14) 0%, transparent 68%)",
        }}
      />
      <Canvas
        className="touch-pan-y"
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        camera={{ position: [0, 0.14, 2.05], fov: 30, near: 0.05, far: 100 }}
      >
        <DetailScene product={product} />
      </Canvas>
      <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center font-sans text-[8px] uppercase tracking-[0.38em] text-maj-brown/45 sm:bottom-4 sm:text-[9px]">
        Drag to rotate
      </p>
    </div>
  );
}
