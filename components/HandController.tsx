import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { HandData } from '../types';

interface HandControllerProps {
  onHandUpdate: (data: HandData) => void;
}

// Manually define connections since they might not be exported by the ESM bundle
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

const HandController: React.FC<HandControllerProps> = ({ onHandUpdate }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const requestRef = useRef<number | null>(null);
  const handsRef = useRef<any>(null);

  useEffect(() => {
    const initializeMediaPipe = async () => {
      try {
        // Dynamic imports to bypass static analysis issues with CDN modules
        const mpHands = await import('@mediapipe/hands');
        const mpDrawing = await import('@mediapipe/drawing_utils');

        // Robustly retrieve classes/functions
        // @ts-ignore
        const HandsClass = mpHands.Hands || mpHands.default?.Hands;
        // @ts-ignore
        const drawConnectorsFn = mpDrawing.drawConnectors || mpDrawing.default?.drawConnectors;
        // @ts-ignore
        const drawLandmarksFn = mpDrawing.drawLandmarks || mpDrawing.default?.drawLandmarks;

        if (!HandsClass) {
          console.error("MediaPipe Hands class could not be found.");
          setLoading(false);
          return;
        }

        const hands = new HandsClass({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });
        handsRef.current = hands;

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results: any) => {
          setLoading(false);
          const canvas = canvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw video frame if available in results
          if (results.image) {
             ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
          }

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];

            // Draw landmarks for visual feedback
            if (drawConnectorsFn) {
              drawConnectorsFn(ctx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
            }
            if (drawLandmarksFn) {
              drawLandmarksFn(ctx, landmarks, { color: '#FF0000', lineWidth: 1 });
            }

            // Analyze Gesture
            const gesture = detectGesture(landmarks);
            const spread = calculateHandSpread(landmarks);

            onHandUpdate({
              gesture,
              spread,
              presence: true
            });
          } else {
            onHandUpdate({
              gesture: 0,
              spread: 0,
              presence: false
            });
          }
          ctx.restore();
        });

        // Start processing loop
        const tick = async () => {
          if (
            webcamRef.current &&
            webcamRef.current.video &&
            webcamRef.current.video.readyState === 4 &&
            handsRef.current
          ) {
            const video = webcamRef.current.video;
            try {
              await handsRef.current.send({ image: video });
            } catch (error) {
              console.error("Error sending frame to hands:", error);
            }
          }
          requestRef.current = requestAnimationFrame(tick);
        };

        requestRef.current = requestAnimationFrame(tick);

      } catch (error) {
        console.error("Failed to load MediaPipe:", error);
        setLoading(false);
      }
    };

    initializeMediaPipe();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detectGesture = (landmarks: any[]): number => {
    const wrist = landmarks[0];
    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const ringTip = landmarks[16];
    const ringPip = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];

    // Distance calculation for checking extension relative to palm size
    const isExtended = (tip: any, pip: any) => {
      const distTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
      const distPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
      return distTip > distPip * 1.1; 
    };

    const indexOpen = isExtended(indexTip, indexPip);
    const middleOpen = isExtended(middleTip, middlePip);
    const ringOpen = isExtended(ringTip, ringPip);
    const pinkyOpen = isExtended(pinkyTip, pinkyPip);

    // Gesture 3: (Index, Middle, Ring)
    if (indexOpen && middleOpen && ringOpen && !pinkyOpen) return 3;
    // Gesture 2: (Index, Middle)
    if (indexOpen && middleOpen && !ringOpen && !pinkyOpen) return 2;
    // Gesture 1: (Index)
    if (indexOpen && !middleOpen && !ringOpen && !pinkyOpen) return 1;
    
    return 0;
  };

  const calculateHandSpread = (landmarks: any[]): number => {
    const thumbTip = landmarks[4];
    const pinkyTip = landmarks[20];
    const wrist = landmarks[0];
    const middlePip = landmarks[9]; // Middle MCP

    const spreadDist = Math.hypot(thumbTip.x - pinkyTip.x, thumbTip.y - pinkyTip.y);
    const handSize = Math.hypot(wrist.x - middlePip.x, wrist.y - middlePip.y);

    let ratio = spreadDist / (handSize || 1);
    const minRatio = 0.5;
    const maxRatio = 1.8;
    
    return Math.min(Math.max((ratio - minRatio) / (maxRatio - minRatio), 0), 1);
  };

  return (
    <div className="absolute bottom-4 right-4 z-50 w-48 h-36 bg-black/50 border border-white/20 rounded-lg overflow-hidden shadow-lg backdrop-blur-sm">
       {loading && <div className="absolute inset-0 flex items-center justify-center text-xs text-white bg-black/80 z-10">Loading Vision Model...</div>}
       <Webcam
         ref={webcamRef}
         className="absolute inset-0 w-full h-full object-cover opacity-0"
         mirrored
         width={640}
         height={480}
       />
       <canvas
         ref={canvasRef}
         className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
         width={640}
         height={480}
       />
       <div className="absolute bottom-1 left-2 text-[10px] text-white/80 font-mono z-20 pointer-events-none">
         AI Vision Control
       </div>
    </div>
  );
};

export default HandController;