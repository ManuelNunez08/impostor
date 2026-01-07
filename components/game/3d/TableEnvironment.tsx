'use client';

import { useRef } from 'react';
import { Mesh } from 'three';

export default function TableEnvironment() {
  const tableRef = useRef<Mesh>(null);
  const pillarRef = useRef<Mesh>(null);
  const platformRef = useRef<Mesh>(null);

  return (
    <group>
      {/* Large cylindrical base/pillar */}
      <mesh ref={pillarRef} position={[0, -2, 0]}>
        <cylinderGeometry args={[4, 4, 4, 32]} />
        <meshStandardMaterial 
          color="#2a2a2a" 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Platform surface on top of pillar */}
      <mesh ref={platformRef} position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[4.5, 4.5, 0.3, 32]} />
        <meshStandardMaterial 
          color="#3a2a1a" 
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* Main table on top of platform */}
      <mesh ref={tableRef} position={[0, 0.4, 0]}>
        {/* Table top - circular wooden planks style */}
        <cylinderGeometry args={[2.5, 2.5, 0.2, 32]} />
        <meshStandardMaterial 
          color="#6b4e37" 
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>

      {/* Table pedestal/support */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.6, 16]} />
        <meshStandardMaterial 
          color="#5a3e27" 
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
}

