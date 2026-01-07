'use client';

import { useRef } from 'react';
import { Mesh, Group } from 'three';

interface ChairProps {
  position: [number, number, number];
  rotation?: number;
  color?: string;
}

const CHAIR_COLORS = [
  '#3B82F6', // blue
  '#F97316', // reddish-orange
  '#FBBF24', // yellow/tan
  '#84CC16', // olive green
  '#8B5CF6', // purple
  '#EF4444', // red
];

export default function Chair({ 
  position, 
  rotation = 0,
  color = CHAIR_COLORS[0]
}: ChairProps) {
  const chairRef = useRef<Group>(null);

  return (
    <group ref={chairRef} position={position} rotation={[0, rotation, 0]}>
      {/* Chair seat */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.6, 0.1, 0.6]} />
        <meshStandardMaterial 
          color={color}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Chair backrest */}
      <mesh position={[0, 0.5, -0.25]}>
        <boxGeometry args={[0.6, 0.4, 0.1]} />
        <meshStandardMaterial 
          color={color}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Chair frame - wooden legs */}
      {/* Front left leg */}
      <mesh position={[-0.25, 0.15, 0.25]}>
        <boxGeometry args={[0.05, 0.3, 0.05]} />
        <meshStandardMaterial 
          color="#5a3e27"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* Front right leg */}
      <mesh position={[0.25, 0.15, 0.25]}>
        <boxGeometry args={[0.05, 0.3, 0.05]} />
        <meshStandardMaterial 
          color="#5a3e27"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* Back left leg */}
      <mesh position={[-0.25, 0.15, -0.25]}>
        <boxGeometry args={[0.05, 0.3, 0.05]} />
        <meshStandardMaterial 
          color="#5a3e27"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* Back right leg */}
      <mesh position={[0.25, 0.15, -0.25]}>
        <boxGeometry args={[0.05, 0.3, 0.05]} />
        <meshStandardMaterial 
          color="#5a3e27"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
}

export { CHAIR_COLORS };

