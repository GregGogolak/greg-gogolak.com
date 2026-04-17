"use client";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

// Shaders as string constants (not <script> tags — cleaner than the reference approach)
const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float time;
  uniform float morph;
  uniform float psize;

  // Perlin 3D noise (standard implementation)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  vec3 fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

  float cnoise(vec3 P) {
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod289(Pi0); Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P); vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz; vec4 iz1 = Pi1.zzzz;
    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);
    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);
    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);
    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
    vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000), dot(g010,g010), dot(g100,g100), dot(g110,g110)));
    g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001), dot(g011,g011), dot(g101,g101), dot(g111,g111)));
    g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);
    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 1.2 * n_xyz;
  }

  void main() {
    float f = morph * cnoise(normal + time);
    vNormal = normalize(normal);
    vPosition = position;
    vec4 pos = vec4(position + f * normal, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * pos;
    gl_PointSize = psize;
  }
`;

// Jarvis-palette fragment shader — replaces the RGB noise with cyan/warm-white bloom
const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float time;
  uniform float intensity;   // overall brightness, driven by volume
  uniform float warmth;      // 0..1, pushes core toward warm white

  // Reuse noise (minified since it's identical to vertex shader)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  vec3 fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
  float cnoise(vec3 P) {
    vec3 Pi0 = floor(P); vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod289(Pi0); Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P); vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz; vec4 iz1 = Pi1.zzzz;
    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);
    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);
    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);
    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
    vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000), dot(g010,g010), dot(g100,g100), dot(g110,g110)));
    g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001), dot(g011,g011), dot(g101,g101), dot(g111,g111)));
    g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);
    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }

  void main() {
    // Jarvis palette
    vec3 cyanDeep   = vec3(0.04, 0.28, 0.42);   // #0a4a6b
    vec3 cyanMid    = vec3(0.23, 0.70, 0.85);   // #3ab4d9
    vec3 cyanBright = vec3(0.48, 0.88, 1.00);   // #7ae0ff
    vec3 warmCore   = vec3(1.00, 0.96, 0.88);   // #fff5e0
    vec3 warmHot    = vec3(1.00, 0.99, 0.93);   // #fff9ee

    // Noise drives cloud-like structure
    float n1 = cnoise(vNormal * 1.2 + time * 0.5);
    float n2 = cnoise(vNormal * 3.0 - time * 0.3);
    float n3 = cnoise(vNormal * 6.0 + time * 0.8);

    float structure = n1 * 0.6 + n2 * 0.3 + n3 * 0.1;
    structure = structure * 0.5 + 0.5; // normalise 0..1

    // Fresnel — brighter on edges facing camera perpendicular (rim light)
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);

    // Layer the palette
    vec3 color = mix(cyanDeep, cyanMid, structure);
    color = mix(color, cyanBright, pow(structure, 3.0));

    // Warm core bleed — concentrated noise hotspots go warm white
    float hotspot = smoothstep(0.75, 1.0, structure);
    color = mix(color, warmCore, hotspot * 0.85);
    color = mix(color, warmHot, pow(hotspot, 4.0) * warmth);

    // Rim glow
    color += cyanBright * fresnel * 0.5 * intensity;

    // Overall brightness modulation from voice volume
    color *= (0.6 + intensity * 0.8);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function Glob({ volume = 0, userVolume = 0, status = "idle", bootPhase = 1 }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const materialRef = useRef(null);
  const meshRef = useRef(null);
  const rafRef = useRef(null);
  const uniformsRef = useRef({
    time: { value: 0 },
    morph: { value: 1.5 },
    psize: { value: 2.0 },
    intensity: { value: 0.3 },
    warmth: { value: 0 },
  });

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(25, width / height, 0.1, 1000);
    camera.position.set(0, 0, 180);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // fully transparent clear
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // High-poly icosahedron — 20 subdivisions gives ~8000 vertices for smooth morphing
    const geometry = new THREE.IcosahedronGeometry(24, 20);
    const material = new THREE.ShaderMaterial({
      uniforms: uniformsRef.current,
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
    });
    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      const dt = clock.getDelta();
      uniformsRef.current.time.value += dt * 0.4;

      if (meshRef.current) {
        meshRef.current.rotation.y += dt * 0.15;
        meshRef.current.rotation.x += dt * 0.05;
      }

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafRef.current);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // React to volume, userVolume, status changes via GSAP tweens on uniforms
  useEffect(() => {
    if (!uniformsRef.current) return;

    const combined = Math.max(volume, userVolume * 0.6);
    const targetMorph = status === "idle" ? 0.5 : 1.2 + combined * 6.0;
    const targetIntensity = status === "idle" ? 0.15 : 0.4 + combined * 0.7;
    const targetWarmth = status === "speaking" ? 0.7 + volume * 0.3 : 0.1;

    gsap.to(uniformsRef.current.morph, { value: targetMorph, duration: 0.3, overwrite: "auto" });
    gsap.to(uniformsRef.current.intensity, { value: targetIntensity * bootPhase, duration: 0.25, overwrite: "auto" });
    gsap.to(uniformsRef.current.warmth, { value: targetWarmth, duration: 0.5, overwrite: "auto" });
  }, [volume, userVolume, status, bootPhase]);

  return (
    <div
      ref={mountRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />
  );
}
