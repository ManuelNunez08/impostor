'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { ReactNode } from 'react';

interface Scene3DProps {
  children: ReactNode;
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  enableControls?: boolean;
}

export default function Scene3D({ 
  children, 
  cameraPosition = [0, 8, 10],
  cameraTarget = [0, 0, 0],
  enableControls = true
}: Scene3DProps) {
  return (
    <div className="w-full h-[700px] bg-black">
      <Canvas>
        {/* Camera */}
        <PerspectiveCamera 
          makeDefault 
          position={cameraPosition} 
          fov={50}
        />
        
        {/* Camera Controls */}
        {enableControls && (
          <OrbitControls 
            target={cameraTarget}
            enablePan={false}
            minDistance={5}
            maxDistance={20}
            enableZoom={true}
            enableRotate={true}
          />
        )}
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1}
          castShadow
        />
        <directionalLight 
          position={[-10, 8, -5]} 
          intensity={0.5}
        />
        <pointLight 
          position={[0, 8, 0]} 
          intensity={0.6}
          distance={20}
        />
        
        {/* Dark background fog for depth */}
        <fog attach="fog" args={['#000000', 15, 30]} />
        
        {/* Scene content */}
        {children}
      </Canvas>
    </div>
  );
}

