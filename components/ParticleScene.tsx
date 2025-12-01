import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { HandData, ParticlePoint, ParticleMode } from '../types';
import { generateTextParticles, generateSphereParticles } from '../utils/textUtils';

// Add type declarations for React Three Fiber elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      pointsMaterial: any;
      ambientLight: any;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      pointsMaterial: any;
      ambientLight: any;
    }
  }
}

const PARTICLE_COUNT = 4000;
const LERP_SPEED = 0.05;

interface ParticlesProps {
  handData: HandData;
}

const Particles: React.FC<ParticlesProps> = ({ handData }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  
  // Store target positions
  const targetsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3));
  
  // Color transition refs
  const targetColor = useRef(new THREE.Color('#ffffff'));
  const currentColor = useRef(new THREE.Color('#ffffff'));

  // Current active mode to prevent recalculating targets unnecessarily
  const [activeMode, setActiveMode] = useState<ParticleMode>(ParticleMode.IDLE);

  // Pre-calculate shapes
  const shapes = useMemo(() => {
    return {
      [ParticleMode.IDLE]: generateSphereParticles(PARTICLE_COUNT, 8),
      [ParticleMode.MSG_1]: generateTextParticles('宝宝，加油！', 60),
      [ParticleMode.MSG_2]: generateTextParticles('我爱你', 100),
      [ParticleMode.MSG_3]: generateTextParticles('♥', 180),
    };
  }, []);

  // Update logic to set targets based on gesture
  useEffect(() => {
    let newMode = ParticleMode.IDLE;
    if (handData.gesture === 1) newMode = ParticleMode.MSG_1;
    else if (handData.gesture === 2) newMode = ParticleMode.MSG_2;
    else if (handData.gesture === 3) newMode = ParticleMode.MSG_3;
    
    // Only update if mode changes or if we haven't set initial targets
    if (newMode !== activeMode) {
      setActiveMode(newMode);
      
      const targetPoints = shapes[newMode];
      const arr = targetsRef.current;
      
      // Fill target array
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Wrap around points if we have more particles than shape points
        const pt = targetPoints.length > 0 ? targetPoints[i % targetPoints.length] : {x:0, y:0, z:0};
        arr[i * 3] = pt.x;
        arr[i * 3 + 1] = pt.y;
        arr[i * 3 + 2] = pt.z;
      }

      // Update target color
      switch (newMode) {
        case ParticleMode.MSG_1: targetColor.current.set('#00ffff'); break;
        case ParticleMode.MSG_2: targetColor.current.set('#ff69b4'); break;
        case ParticleMode.MSG_3: targetColor.current.set('#ff0000'); break;
        default: targetColor.current.set('#ffffff'); break;
      }
    }
  }, [handData.gesture, activeMode, shapes]);

  useFrame((state) => {
    if (!pointsRef.current) return;

    // Smooth Color Transition
    if (materialRef.current) {
      currentColor.current.lerp(targetColor.current, 0.05);
      materialRef.current.color.copy(currentColor.current);
    }

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const targets = targetsRef.current;
    
    // Hand Control Logic
    // spread: 0 (closed) -> 1 (open)
    // Interaction 1: Contraction (Closed) vs Diffusion (Open)
    // If open (spread > 0.5), add noise/expansion. If closed, pull tight to target.
    
    const time = state.clock.getElapsedTime();
    
    // Map spread to a "chaos" factor
    // Prompt: Hand Open/Close control Diffusion/Contraction
    // Let's say Closed (0) = Tight formation. Open (1) = Expanded/Exploded.
    const expansion = handData.presence ? handData.spread * 15 : 0; // 0 to 15 units of random spread
    const tightness = handData.presence ? (1.0 - handData.spread) : 0.8; // 0 to 1
    
    const noiseFreq = 0.5;
    const noiseAmp = expansion;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      
      // Target Coordinates
      const tx = targets[i3];
      const ty = targets[i3 + 1];
      const tz = targets[i3 + 2];

      // Current Coordinates
      const cx = positions[i3];
      const cy = positions[i3 + 1];
      const cz = positions[i3 + 2];

      // Add sine wave noise based on spread (Diffusion)
      // When spread is high, target is offset by large sine waves
      const noiseX = Math.sin(time * 2 + i) * noiseAmp;
      const noiseY = Math.cos(time * 3 + i) * noiseAmp;
      const noiseZ = Math.sin(time * 1.5 + i) * noiseAmp;

      // Final Target we want to move towards this frame
      const targetX = tx + noiseX;
      const targetY = ty + noiseY;
      const targetZ = tz + noiseZ;

      // Lerp for smooth transition
      // Adjust speed based on tightness? Tighter = faster snap?
      const speed = LERP_SPEED * (tightness * 2 + 0.5); 

      positions[i3] += (targetX - cx) * speed;
      positions[i3 + 1] += (targetY - cy) * speed;
      positions[i3 + 2] += (targetZ - cz) * speed;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  // Initial random positions
  const initialPositions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
      arr[i] = (Math.random() - 0.5) * 50;
    }
    return arr;
  }, []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={initialPositions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.15}
        color="#ffffff"
        sizeAttenuation={true}
        transparent={true}
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

const ParticleScene: React.FC<{ handData: HandData }> = ({ handData }) => {
  return (
    <div className="w-full h-full absolute top-0 left-0 bg-gradient-to-b from-gray-900 to-black">
      <Canvas dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 25]} fov={60} />
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 3} />
        <ambientLight intensity={0.5} />
        <Particles handData={handData} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};

export default ParticleScene;