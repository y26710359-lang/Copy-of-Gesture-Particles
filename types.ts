export interface HandData {
  gesture: number; // 0 (none), 1, 2, 3
  spread: number; // 0.0 (closed) to 1.0 (open)
  presence: boolean;
}

export enum ParticleMode {
  IDLE = 'IDLE',
  MSG_1 = 'MSG_1',
  MSG_2 = 'MSG_2',
  MSG_3 = 'MSG_3'
}

export interface ParticlePoint {
  x: number;
  y: number;
  z: number;
}