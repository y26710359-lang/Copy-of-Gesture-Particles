import { ParticlePoint } from '../types';

export const generateTextParticles = (text: string, fontSize: number = 100): ParticlePoint[] => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const width = 1024;
  const height = 512;
  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${fontSize}px "Inter", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.fillText(text, width / 2, height / 2);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const points: ParticlePoint[] = [];

  // Sampling rate to control density
  const step = 4; 

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      const alpha = data[index]; // Use red channel or alpha

      // If pixel is white enough
      if (alpha > 128) {
        points.push({
          x: (x - width / 2) * 0.05, // Scale down to world units
          y: -(y - height / 2) * 0.05, // Invert Y
          z: 0
        });
      }
    }
  }

  return points;
};

// Generate a sphere shape for IDLE state
export const generateSphereParticles = (count: number, radius: number): ParticlePoint[] => {
  const points: ParticlePoint[] = [];
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    points.push({ x, y, z });
  }
  return points;
};