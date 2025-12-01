import React, { useState, useCallback } from 'react';
import HandController from './components/HandController';
import ParticleScene from './components/ParticleScene';
import { HandData } from './types';

function App() {
  const [handData, setHandData] = useState<HandData>({
    gesture: 0,
    spread: 0,
    presence: false
  });

  const handleHandUpdate = useCallback((data: HandData) => {
    setHandData(data);
  }, []);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert("链接已复制！\n你可以直接粘贴发送给TA，对方点击即可体验。\n(Link copied!)");
    }).catch(() => {
      // Fallback for some browsers
      prompt("请复制以下链接发送给TA：", url);
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* 3D Scene Background */}
      <ParticleScene handData={handData} />

      {/* Hand Controller (Vision) */}
      <HandController onHandUpdate={handleHandUpdate} />

      {/* UI Overlay */}
      <div className="absolute top-6 left-6 z-40 max-w-sm pointer-events-none select-none">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight drop-shadow-md">
          Magic Particles
        </h1>
        <div className="space-y-2 text-sm text-gray-200 bg-black/30 p-4 rounded-xl backdrop-blur-md border border-white/10 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold">1</span>
            <span>☝️ 食指 (Index): <strong className="text-white">宝宝，加油！</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-300 flex items-center justify-center font-bold">2</span>
            <span>✌️ 剪刀手 (V-Sign): <strong className="text-white">我爱你</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-300 flex items-center justify-center font-bold">3</span>
            <span>🤟 三指 (3 Fingers): <strong className="text-white">♥</strong></span>
          </div>
          <div className="mt-4 pt-2 border-t border-white/10 text-xs text-gray-400">
            <p>🖐️ <strong>张开手掌:</strong> 粒子扩散 (Scatter)</p>
            <p>👊 <strong>握紧拳头:</strong> 粒子凝聚 (Gather)</p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mt-4 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] transition-colors duration-300 ${handData.presence ? 'bg-green-500 text-green-500' : 'bg-red-500 text-red-500'}`} />
          <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
            {handData.presence ? 'Camera Active' : 'Waiting for Hand...'}
          </span>
        </div>
      </div>

      {/* Share Button (Clickable) */}
      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={handleShare}
          className="group flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/10 transition-all active:scale-95"
        >
          <span className="text-xl">🔗</span>
          <span className="text-sm font-medium">生成分享链接</span>
        </button>
      </div>
    </div>
  );
}

export default App;