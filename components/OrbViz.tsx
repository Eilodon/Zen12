
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface OrbProps {
  analyser: AnalyserNode | null;
  emotion: string;
  frequencyData?: Uint8Array;
}

// --- 1. DEEP PEARL PALETTES (Tương phản & Nổi khối) ---
// Concept:
// A (Core/Shadow): Màu trầm, đậm để tạo khối trên nền trắng.
// B (Main/Body): Màu chủ đạo của cảm xúc, nhẹ nhàng.
// C (Rim/Edge): Màu rực rỡ nhưng đậm đà để viền không bị mất.

const PALETTES: Record<string, [string, string, string]> = {
  // Neutral: Powder Pink Core -> Rose Cream Body -> Burnt Orange Edge
  // Changed Core from #a8a29e (Grey) to #fecdd3 (Soft Pink Shadow)
  neutral:  ["#fecdd3", "#fff1f2", "#ea580c"], 
  
  // Emotions
  joyful:   ["#ca8a04", "#fde047", "#b45309"], // Dark Gold -> Lemon -> Bronze
  sad:      ["#475569", "#bae6fd", "#0369a1"], // Slate -> Sky -> Ocean Deep
  anxious:  ["#c2410c", "#fed7aa", "#7c2d12"], // Rust -> Peach -> Dark Wood
  calm:     ["#0f766e", "#a7f3d0", "#064e3b"], // Teal Deep -> Mint -> Forest
  seeking:  ["#7e22ce", "#e9d5ff", "#4c1d95"], // Purple -> Lilac -> Deep Violet
  stressed: ["#be123c", "#fecdd3", "#881337"], // Crimson -> Rose -> Wine
  confused: ["#0e7490", "#a5f3fc", "#164e63"], // Cyan Dark -> Ice -> Abyss
  lonely:   ["#4338ca", "#c7d2fe", "#1e1b4b"], // Indigo -> Periwinkle -> Midnight
};

const DEFAULT_PALETTE: [string, string, string] = ["#fecdd3", "#fff1f2", "#ea580c"];

// --- 2. CONTRAST SHADER (Tạo khối & Giảm chói) ---

const vertexShader = `
  uniform float uTime;
  uniform float uIntensity;
  
  varying vec2 vUv;
  varying float vDisplacement;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  // Simplex Noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Noise for organic movement
    float noiseVal = snoise(vec3(position.x * 0.9, position.y * 0.9, uTime * 0.25));
    
    // Control displacement to keep shape solid
    float amp = 0.05 + (uIntensity * 0.2); 
    
    vDisplacement = noiseVal;
    
    vec3 newPos = position + normal * (noiseVal * amp);
    
    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uColorA; // Core/Shadow (Darker)
  uniform vec3 uColorB; // Body/Light (Lighter)
  uniform vec3 uColorC; // Rim (Vibrant)
  
  varying vec2 vUv;
  varying float vDisplacement;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    // 1. Lighting Calculation (Key Light from Top-Right)
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float NdotL = max(dot(normal, lightDir), 0.0);
    
    // 2. Base Gradient (Core vs Body)
    // Use NdotL to create shadow side vs light side
    // Darker Core (A) in shadows, Lighter Body (B) in light
    vec3 baseColor = mix(uColorA, uColorB, NdotL * 0.8 + 0.2);
    
    // Add subtle noise texture to the base
    baseColor += (vDisplacement * 0.05);

    // 3. Fresnel Rim (The Outline)
    // Thinner, sharper rim to define edges against white background
    float fresnel = pow(1.0 - dot(normal, viewDir), 4.0);
    
    // 4. Specular Highlight (The Gloss)
    // Tighter highlight
    vec3 halfDir = normalize(lightDir + viewDir);
    float specAngle = max(dot(normal, halfDir), 0.0);
    float specular = pow(specAngle, 64.0); 
    
    // 5. Composition
    vec3 finalColor = baseColor;
    
    // Add Rim (Color C) - Additive but weighted
    finalColor = mix(finalColor, uColorC, fresnel * 0.7);
    
    // Add Specular (White) - Reduced intensity to avoid washout
    finalColor += vec3(1.0) * specular * 0.3;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// --- 3. COMPONENTS ---

const LiquidOrb = ({ 
  emotion, 
  frequencyData,
  detail 
}: { 
  emotion: string, 
  frequencyData?: Uint8Array,
  detail: number
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Color Refs
  const colorARef = useRef(new THREE.Color(DEFAULT_PALETTE[0]));
  const colorBRef = useRef(new THREE.Color(DEFAULT_PALETTE[1]));
  const colorCRef = useRef(new THREE.Color(DEFAULT_PALETTE[2]));

  const targetA = useRef(new THREE.Color(DEFAULT_PALETTE[0]));
  const targetB = useRef(new THREE.Color(DEFAULT_PALETTE[1]));
  const targetC = useRef(new THREE.Color(DEFAULT_PALETTE[2]));

  useEffect(() => {
    const palette = PALETTES[emotion] || DEFAULT_PALETTE;
    targetA.current.set(palette[0]);
    targetB.current.set(palette[1]);
    targetC.current.set(palette[2]);
  }, [emotion]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uColorA: { value: new THREE.Color(DEFAULT_PALETTE[0]) },
    uColorB: { value: new THREE.Color(DEFAULT_PALETTE[1]) },
    uColorC: { value: new THREE.Color(DEFAULT_PALETTE[2]) },
  }), []);

  useFrame((state) => {
    if (!materialRef.current || !meshRef.current) return;

    const time = state.clock.elapsedTime;
    
    let energy = 0;
    if (frequencyData && frequencyData.length > 0) {
       energy = frequencyData.slice(0, 10).reduce((a,b)=>a+b,0) / 10 / 255;
    }

    // Color Transitions
    colorARef.current.lerp(targetA.current, 0.03); 
    colorBRef.current.lerp(targetB.current, 0.03);
    colorCRef.current.lerp(targetC.current, 0.03);

    materialRef.current.uniforms.uColorA.value.copy(colorARef.current);
    materialRef.current.uniforms.uColorB.value.copy(colorBRef.current);
    materialRef.current.uniforms.uColorC.value.copy(colorCRef.current);

    // Time & Pulse
    materialRef.current.uniforms.uTime.value += 0.005 + (energy * 0.01);
    
    // Idle Breathing
    const breath = Math.sin(time * 0.8) * 0.05; 
    const targetIntensity = 0.1 + breath + (energy * 1.0);
    
    materialRef.current.uniforms.uIntensity.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uIntensity.value, 
        targetIntensity, 
        0.1
    );

    // Slow rotation
    meshRef.current.rotation.y = time * 0.08;
    meshRef.current.rotation.z = Math.sin(time * 0.2) * 0.1;
  });

  return (
    <group>
      {/* Main Core */}
      <mesh ref={meshRef} scale={1.4}>
        <icosahedronGeometry args={[1, detail]} />
        <shaderMaterial 
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
        />
      </mesh>
      
      {/* Subtle Shadow/Glow underneath to ground it */}
      <mesh position={[0, -0.1, -0.5]} scale={1.55}>
         <sphereGeometry args={[1, 32, 32]} />
         <meshBasicMaterial 
            transparent
            opacity={0.1}
            color="#000000" // Dark shadow for contrast
            side={THREE.BackSide}
         />
      </mesh>
    </group>
  );
};

const ColoredParticles = ({ count = 40, emotion, frequencyData }: { count?: number, emotion: string, frequencyData?: Uint8Array }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const colorsRef = useRef<Float32Array | null>(null);
    
    // Determine particle color based on emotion (Use the Rim color for visibility)
    const particleColor = useMemo(() => {
        const p = PALETTES[emotion] || DEFAULT_PALETTE;
        return new THREE.Color(p[2]); // Use Accent/Rim color
    }, [emotion]);

    const particles = useMemo(() => {
      const temp = [];
      for(let i=0; i<count; i++) {
         const theta = Math.random() * Math.PI * 2; 
         const phi = Math.acos((Math.random() * 2) - 1); 
         temp.push({
           theta, phi,
           r: 3.2 + Math.random() * 3, 
           dTheta: (Math.random() - 0.5) * 0.0008, 
           dPhi: (Math.random() - 0.5) * 0.0008,
           // UPDATED: Finer particle size for elegance
           baseScale: Math.random() * 0.025 + 0.01, 
           phase: Math.random() * Math.PI * 2,
         });
      }
      return temp;
    }, [count]);
  
    useFrame((state) => {
      if(!meshRef.current) return;
      
      let energy = 0;
      if (frequencyData && frequencyData.length > 0) {
        energy = frequencyData.slice(10, 20).reduce((a,b)=>a+b,0) / 10 / 255;
      }
  
      particles.forEach((p, i) => {
        p.theta += p.dTheta * (1 + energy);
        p.phi += p.dPhi * (1 + energy);
        
        const x = p.r * Math.sin(p.phi) * Math.cos(p.theta);
        const y = p.r * Math.sin(p.phi) * Math.sin(p.theta);
        const z = p.r * Math.cos(p.phi);
        
        dummy.position.set(x, y, z);
        
        // Twinkle
        const twinkle = Math.sin(state.clock.elapsedTime * 2 + p.phase) * 0.5 + 0.5;
        const finalScale = p.baseScale * (0.8 + twinkle * 0.4) * (1 + energy);
        
        dummy.scale.setScalar(finalScale);
        dummy.lookAt(state.camera.position);
        
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      
      // Update color instance (slow lerp)
      if (meshRef.current) {
          meshRef.current.instanceMatrix.needsUpdate = true;
          (meshRef.current.material as THREE.MeshBasicMaterial).color.lerp(particleColor, 0.05);
      }
    });
  
    return (
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <circleGeometry args={[1, 8]} />
        <meshBasicMaterial 
            color="#ffffff" // Will be overridden by instance color lerp above
            transparent 
            opacity={0.6} 
            side={THREE.DoubleSide}
            depthWrite={false}
        />
      </instancedMesh>
    )
};

// --- MAIN EXPORT ---
export default function OrbViz({ analyser, emotion, frequencyData }: OrbProps) {
  const [isVisible, setIsVisible] = useState(true);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const detail = isMobile ? 24 : 48; 

  useEffect(() => {
    const handleVisibilityChange = () => setIsVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <div className="w-full h-full absolute inset-0 z-0 pointer-events-none fade-in">
      <Canvas 
        dpr={[1, 2]} 
        frameloop={isVisible ? 'always' : 'never'}
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ 
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
        }}
      >
        {/* Adjusted Lighting: Less intensity to prevent washout */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
        <pointLight position={[-5, -5, 2]} intensity={0.4} color="#ffffff" />

        <LiquidOrb 
          emotion={emotion} 
          frequencyData={frequencyData} 
          detail={detail}
        />
        
        <ColoredParticles count={isMobile ? 30 : 50} emotion={emotion} frequencyData={frequencyData} />
        
      </Canvas>
    </div>
  );
}
