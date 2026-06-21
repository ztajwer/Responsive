import * as THREE from "three";

/** Center product on ground plane and scale to target visual span. */
export function fitProductToUniformSize(root: THREE.Object3D, targetSpan: number) {
  root.scale.set(1, 1, 1);
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const visualSpan = Math.max(size.x, size.y, size.z);
  if (visualSpan > 0) {
    root.scale.setScalar(targetSpan / visualSpan);
  }

  root.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  const center = fitted.getCenter(new THREE.Vector3());
  root.position.set(-center.x, -fitted.min.y, -center.z);
}

export function prepareProductMaterials(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
}
