import React, { useEffect, useRef, useState } from 'react';
import { Trophy, Wallet, Users, Heart, MessageSquare, Twitter, X, User } from 'lucide-react';

const TRACK_WIDTH = 800;
const TRACK_HEIGHT = 600;

interface Kart {
  x: number;
  y: number;
  angle: number;
  speed: number;
}

interface Cup {
  x: number;
  y: number;
  active: boolean;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [balance, setBalance] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [broPoints, setBroPoints] = useState(33202);

  const keys = useRef<{ [key: string]: boolean }>({});
  const kart = useRef<Kart>({ x: 400, y: 300, angle: 0, speed: 0 });
  
  // Neon track bounds (simple oval)
  const trackPath = useRef<Path2D>();

  const [cups, setCups] = useState<Cup[]>([]);

  useEffect(() => {
    // Generate initial cups
    const initialCups = Array.from({ length: 5 }).map(() => ({
      x: 100 + Math.random() * 600,
      y: 100 + Math.random() * 400,
      active: true,
    }));
    setCups(initialCups);
    
    trackPath.current = new Path2D();
    trackPath.current.ellipse(400, 300, 300, 200, 0, 0, 2 * Math.PI);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: {x: number, y: number, alpha: number}[] = [];

    const loop = () => {
      const k = kart.current;

      // Controls
      if (keys.current['ArrowUp'] || keys.current['KeyW']) {
        k.speed += 0.2;
      } else if (keys.current['ArrowDown'] || keys.current['KeyS']) {
        k.speed -= 0.2;
      } else {
        k.speed *= 0.95; // Friction
      }

      if (Math.abs(k.speed) > 0.1) {
        if (keys.current['ArrowLeft'] || keys.current['KeyA']) {
          k.angle -= 0.05 * Math.sign(k.speed);
        }
        if (keys.current['ArrowRight'] || keys.current['KeyD']) {
          k.angle += 0.05 * Math.sign(k.speed);
        }
      }

      // Max speed limit
      k.speed = Math.max(-3, Math.min(k.speed, 6));

      // Update pos
      const nextX = k.x + Math.cos(k.angle) * k.speed;
      const nextY = k.y + Math.sin(k.angle) * k.speed;
      
      // Simple bound checking inside canvas
      if (nextX > 50 && nextX < canvas.width - 50) k.x = nextX;
      else k.speed *= -0.5;
      
      if (nextY > 50 && nextY < canvas.height - 50) k.y = nextY;
      else k.speed *= -0.5;

      // Exhaust particles
      if (Math.abs(k.speed) > 2) {
        particles.push({
          x: k.x - Math.cos(k.angle) * 20 + (Math.random() - 0.5) * 10,
          y: k.y - Math.sin(k.angle) * 20 + (Math.random() - 0.5) * 10,
          alpha: 1
        });
      }

      // Draw Background
      ctx.fillStyle = '#0A0014'; // Dark background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Neon Track limits
      ctx.save();
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 15;
      if (trackPath.current) {
        ctx.stroke(trackPath.current);
        ctx.strokeStyle = '#FF007F';
        ctx.shadowColor = '#FF007F';
        ctx.lineWidth = 1;
        ctx.stroke(trackPath.current);
      }
      ctx.restore();

      // Collect cups
      setCups(prev => {
        let changed = false;
        const nextCups = prev.map(c => {
          if (!c.active) return c;
          const dist = Math.hypot(c.x - k.x, c.y - k.y);
          if (dist < 30) {
            changed = true;
            setBalance(b => b + 1.25);
            return { ...c, active: false };
          }
          return c;
        });
        
        // respawn if all inactive
        if (changed && nextCups.every(c => !c.active)) {
           return nextCups.map(() => ({
              x: 100 + Math.random() * 600,
              y: 100 + Math.random() * 400,
              active: true
           }));
        }
        return nextCups;
      });

      // Draw Cups
      cups.forEach(c => {
        if (!c.active) return;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.fillStyle = '#D2143A';
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(-10, -15);
        ctx.lineTo(10, -15);
        ctx.lineTo(7, 15);
        ctx.lineTo(-7, 15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.strokeRect(-10, -10, 20, 2);
        ctx.restore();
      });

      // Draw Particles
      particles.forEach(p => {
        ctx.fillStyle = `rgba(0, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        p.alpha -= 0.05;
      });
      particles = particles.filter(p => p.alpha > 0);

      // Draw Kart (Cyberpunk top-down car)
      ctx.save();
      ctx.translate(k.x, k.y);
      ctx.rotate(k.angle);
      
      // Car body
      ctx.fillStyle = '#FF007F';
      ctx.shadowColor = '#FF007F';
      ctx.shadowBlur = 10;
      ctx.fillRect(-15, -10, 30, 20);
      
      // Windshield
      ctx.fillStyle = '#00FFFF';
      ctx.shadowBlur = 0;
      ctx.fillRect(0, -8, 8, 16);
      
      // Wheels
      ctx.fillStyle = '#111';
      ctx.fillRect(-12, -12, 8, 4);
      ctx.fillRect(4, -12, 8, 4);
      ctx.fillRect(-12, 8, 8, 4);
      ctx.fillRect(4, 8, 8, 4);

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, cups]);

  return (
    <div className="min-h-screen bg-bro-dark text-white font-sans overflow-hidden flex flex-col">
      {/* Top Navigation */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 relative z-10 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 hover:text-neon-pink transition-colors">
            <User size={18} /> Support
          </button>
          <button className="flex items-center gap-2 hover:text-neon-pink transition-colors">
            <Users size={18} /> Referrals
          </button>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
          {/* Logo element representing Red Solo Cup */}
          <div className="w-6 h-8 bg-bro-red rounded-b-md border-t-2 border-white transform origin-bottom perspective-[200px] rotate-x-12 shadow-[0_0_15px_#D2143A]"></div>
          <h1 className="text-2xl font-black tracking-wider text-white select-none mr-4">BRO.FUN</h1>
          <span className="text-neon-pink font-mono text-xs font-bold border border-neon-pink px-2 py-0.5 rounded tracking-widest uppercase">Beta</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:border-neon-cyan/50 transition-colors">
            <Wallet size={18} className="text-neon-cyan" />
            <span className="font-mono font-bold">{balance.toFixed(2)} MONAD</span>
          </div>
          <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-bold transition-all border border-white/20">
            Sign in
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex w-full max-w-[1600px] mx-auto px-6 py-8 gap-8 relative z-0">
        
        {/* Cinematic Game Area (Left/Center) */}
        <div className="flex-1 relative flex flex-col items-center justify-center">
          
          {/* Neon BG ambiance */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-neon-pink/5 rounded-full blur-[120px] pointer-events-none"></div>
          
          <div className="relative group rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,255,255,0.1)] bg-black">
            
            <canvas 
              ref={canvasRef} 
              width={TRACK_WIDTH} 
              height={TRACK_HEIGHT} 
              className={`block max-w-full rounded-2xl ${isPlaying ? 'cursor-none' : 'opacity-50 blur-sm'}`}
            />

            {!isPlaying && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-20 bg-bro-red rounded-b-xl border-t-4 border-white shadow-[0_0_30px_#D2143A]"></div>
                  <div className="w-16 h-20 bg-bro-red rounded-b-xl border-t-4 border-white shadow-[0_0_30px_#D2143A]"></div>
                  <div className="w-16 h-20 bg-bro-red rounded-b-xl border-t-4 border-white shadow-[0_0_30px_#D2143A]"></div>
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <button className="bg-bro-red hover:bg-red-600 text-white font-bold text-xl px-12 py-4 rounded-xl shadow-[0_0_20px_#D2143A] transition-all transform hover:scale-105 uppercase tracking-wide">
                    Sign in
                  </button>
                  <span className="text-white/50 font-bold uppercase">or</span>
                  <button 
                    onClick={() => setIsPlaying(true)}
                    className="bg-white text-black hover:bg-gray-200 font-bold text-xl px-12 py-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-all transform hover:scale-105 uppercase tracking-wide"
                  >
                    Play Demo
                  </button>
                </div>
                <a href="#" className="text-sm text-white/50 hover:text-white underline underline-offset-4 mt-6">How does this work?</a>
                
                <p className="mt-8 text-neon-cyan font-mono animate-pulse">Controls: WASD or Arrow Keys to Drive!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar (Leaderboard & Points) */}
        <div className="w-[380px] flex flex-col gap-6 shrink-0 relative z-10">
          
          {/* Leaderboard */}
          <div className="bg-[#110A1A] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-center py-4 border-b border-white/10 bg-black/30">
              <h2 className="text-lg font-black uppercase tracking-widest text-white shadow-neon-pink drop-shadow-[0_0_8px_#FF007F]">Leaderboard</h2>
            </div>
            <div className="flex border-b border-white/10">
              <button className="flex-1 py-3 text-xs font-bold tracking-widest text-white/50 hover:text-white transition-colors uppercase">Weekly</button>
              <button className="flex-1 py-3 bg-bro-red text-white text-xs font-bold tracking-widest uppercase">All Time</button>
            </div>
            
            <div className="flex justify-between px-6 py-3 text-[10px] uppercase font-black text-white/40 tracking-widest border-b border-white/5">
              <span>Player</span>
              <span>Bro Points</span>
            </div>

            <div className="flex flex-col">
              {[
                { name: 'whaddadem', pts: '+60,745 MON' },
                { name: 'chadding', pts: '+57,966 MON' },
                { name: 'leo', pts: '+57,394 MON' },
                { name: 'Oblonecoinob', pts: '+49,942 MON' },
                { name: 'Demonidus', pts: '+47,550 MON' },
                { name: 'JAGS', pts: '+37,644 MON' },
                { name: '343434', pts: '+33,205 MON' },
                { name: 'MonadRunClub', pts: '+33,202 MON' },
              ].map((player, i) => (
                <div key={i} className={`flex justify-between items-center px-6 py-3 hover:bg-white/5 transition-colors cursor-pointer group ${i < 3 ? 'text-white' : 'text-white/70'}`}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-white/30 text-xs w-4">{i + 1}</span>
                    <span className="font-bold text-sm group-hover:text-neon-cyan transition-colors">{player.name}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#00FF00] drop-shadow-[0_0_5px_rgba(0,255,0,0.3)]">{player.pts}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Earn Points */}
          <div className="bg-[#110A1A] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/30">
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Earn More Bro Points</h2>
              <span className="text-neon-pink font-mono font-bold text-sm animate-pulse">{broPoints.toLocaleString()}</span>
            </div>
            
            <div className="flex flex-col">
              {[
                { label: 'Refer friends', icon: Users, reward: '+100', progress: '0/5' },
                { label: 'Follow @bro_dot_fun', icon: Twitter, reward: '+150' },
                { label: 'Like this', icon: Heart, reward: '+50' },
                { label: 'Retweet this', icon: Share2, reward: '+50' },
                { label: 'Comment on this', icon: MessageSquare, reward: '+50' },
              ].map((task, i) => (
                <button key={i} className="flex justify-between items-center px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-colors text-left group">
                  <div className="flex items-center gap-3">
                    <div className="text-bro-red group-hover:text-neon-pink transition-colors">
                      <task.icon size={16} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white/90 group-hover:text-white block">{task.label}</span>
                      {task.progress && <span className="text-xs font-mono text-white/40">{task.progress}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm">{task.reward}</span>
                    <span className="text-white/30 group-hover:text-white/80 transform group-hover:translate-x-1 transition-all">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
        </div>

      </main>
      
      {/* Bottom Floating Menu / Overlay UI logic could go here */}
    </div>
  );
}
