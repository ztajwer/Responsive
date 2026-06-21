"use client";

import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
      <ambientLight intensity={0.58} color={colors.white} />
      <hemisphereLight args={[colors.tableCream, colors.tablePeach, 0.48]} />
      <directionalLight position={[2.6, 4.2, 2.4]} intensity={1.15} color={colors.white} />
      <directionalLight position={[-2.4, 2.8, -1.6]} intensity={0.42} color={colors.roseGoldLight} />
      <pointLight position={[0, 1.8, 1.4]} intensity={0.48} color={colors.goldLight} distance={5} />
      <pointLight position={[0.8, 0.4, -0.6]} intensity={0.22} color={colors.gold} distance={3} />
    </>
  );
}

function DetailPedestal() {
  return (
    <mesh position={[0, -0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <ringGeometry args={[0.22, 0.34, 64]} />
      <meshStandardMaterial
        color={colors.tableCream}
        metalness={0.42}
        roughness={0.38}
        emissive={new THREE.Color(colors.gold)}
        emissiveIntensity={0.04}
      />
    </mesh>
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
    groupRef.current.rotation.y += delta * 0.22;
  });

  return (
    <group ref={groupRef} position={[0, 0.02, 0]}>
      <primitive object={productRoot} />
    </group>
  );
}

function ResponsiveCamera() {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const mobile = size.width < 768;
    camera.position.set(0, mobile ? 0.2 : 0.16, mobile ? 1.78 : 1.95);
    camera.fov = mobile ? 33 : 29;
    camera.near = 0.05;
    camera.far = 100;
    camera.lookAt(0, mobile ? 0.1 : 0.08, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  return null;
}

function DetailScene({ product }: { product: Product }) {
  const { size } = useThree();
  const mobile = size.width < 768;
  const displaySize = mobile ? 0.24 : 0.22;

  return (
    <>
      <ResponsiveCamera />
      <DetailLights />
      <Environment preset="apartment" environmentIntensity={0.35} />
      <OrbitControls
        makeDefault
        target={[0, mobile ? 0.1 : 0.08, 0]}
        enableDamping
        dampingFactor={0.1}
        enableZoom={false}
        enablePan={false}
        rotateSpeed={mobile ? 0.58 : 0.48}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.46}
        minAzimuthAngle={-Math.PI * 0.6}
        maxAzimuthAngle={Math.PI * 0.6}
      />
      <DetailPedestal />
      <Suspense fallback={null}>
        <DetailProductModel modelFile={product.modelFile} displaySize={displaySize} />
      </Suspense>
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.2}
        scale={mobile ? 2.6 : 3}
        blur={3.2}
        far={2.4}
        color="#3D2B1F"
        frames={1}
        resolution={512}
      />
    </>
  );
}

export default function ProductDetailCanvas({ product }: { product: Product }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 68% 55% at 50% 38%, rgba(212,175,55,0.18) 0%, transparent 70%), radial-gradient(ellipse 90% 70% at 50% 100%, rgba(164,134,104,0.08) 0%, transparent 55%)",
        }}
      />
      <div className="pointer-events-none absolute inset-4 rounded-[1rem] border border-maj-gold/10 sm:inset-5" />
      <Canvas
        className="touch-pan-y"
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        camera={{ position: [0, 0.16, 1.95], fov: 29, near: 0.05, far: 100 }}
      >
        <DetailScene product={product} />
      </Canvas>
      <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center font-sans text-[8px] uppercase tracking-[0.42em] text-maj-brown/40 sm:text-[9px]">
        Drag to admire · 360° view
      </p>
    </div>
  );
}
