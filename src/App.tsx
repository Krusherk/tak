import { useEffect, useRef, useState } from 'react';
import { Wallet, Trophy, User, Sparkles, Gamepad2, ArrowRight } from 'lucide-react';

const TRACK_WIDTH = 800;
const TRACK_HEIGHT = 600;
const KART_SPEED = 4.5;
const TURN_SPEED = 0.08;
const TAIL_SPACING = 5;

interface Point { x: number; y: number; angle: number; }
interface Cup { x: number; y: number; active: boolean; }

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [balance, setBalance] = useState(0.00);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  const kart = useRef<Point>({ x: 400, y: 300, angle: 0 });
  const trail = useRef<Point[]>([]); 
  const targetLength = useRef<number>(15);
  const keys = useRef<{ [key: string]: boolean }>({});
  const [cup, setCup] = useState<Cup>({ x: 600, y: 300, active: true });

  const startGame = () => {
    kart.current = { x: 400, y: 300, angle: 0 };
    trail.current = [];
    targetLength.current = 15;
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
    spawnCup();
  };

  const spawnCup = () => {
    setCup({
      x: 60 + Math.random() * (TRACK_WIDTH - 120),
      y: 60 + Math.random() * (TRACK_HEIGHT - 120),
      active: true
    });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      const k = kart.current;

      if (keys.current['ArrowLeft'] || keys.current['KeyA']) k.angle -= TURN_SPEED;
      if (keys.current['ArrowRight'] || keys.current['KeyD']) k.angle += TURN_SPEED;

      k.x += Math.cos(k.angle) * KART_SPEED;
      k.y += Math.sin(k.angle) * KART_SPEED;

      trail.current.unshift({ x: k.x, y: k.y, angle: k.angle });
      
      const maxHistory = targetLength.current * TAIL_SPACING;
      if (trail.current.length > maxHistory) {
        trail.current.pop();
      }

      // Check wall collision
      if (k.x < 5 || k.x > TRACK_WIDTH - 5 || k.y < 5 || k.y > TRACK_HEIGHT - 5) {
        setGameOver(true);
        setIsPlaying(false);
        return;
      }

      // Check self collision (give head start to not hit immediate neck)
      for (let i = TAIL_SPACING * 4; i < trail.current.length; i += TAIL_SPACING) {
        const seg = trail.current[i];
        if (seg) {
            const dist = Math.hypot(k.x - seg.x, k.y - seg.y);
            if (dist < 12) {
            setGameOver(true);
            setIsPlaying(false);
            return;
            }
        }
      }

      // Check eating
      if (cup.active) {
        const dist = Math.hypot(k.x - cup.x, k.y - cup.y);
        if (dist < 25) {
          targetLength.current += 3;
          setScore(s => s + 10);
          setBalance(b => b + 0.50);
          spawnCup();
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid Pattern
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke(); }
      for (let i = 0; i < canvas.height; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke(); }

      // Draw Cup (Node)
      if (cup.active) {
        ctx.save();
        ctx.translate(cup.x, cup.y);
        ctx.fillStyle = '#FF0055';
        ctx.shadowColor = '#FF0055';
        ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFF'; 
        ctx.beginPath(); ctx.arc(-2, -2, 2, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }

      // Draw Tail
      for (let i = trail.current.length - 1; i >= 0; i -= TAIL_SPACING) {
        const seg = trail.current[i];
        if (!seg) continue;
        ctx.save();
        ctx.translate(seg.x, seg.y);
        ctx.rotate(seg.angle);
        const ratio = 1 - (i / trail.current.length);
        ctx.fillStyle = `hsla(320, 100%, ${60 + ratio * 20}%, ${ratio + 0.2})`;
        ctx.shadowColor = '#FF00AA';
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(0, 0, 6 + ratio * 2, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }

      // Draw Head (Kart)
      ctx.save();
      ctx.translate(k.x, k.y);
      ctx.rotate(k.angle);
      ctx.fillStyle = '#00FFFF';
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, 8);
      ctx.lineTo(-8, -8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      animId = window.requestAnimationFrame(loop);
    };

    animId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(animId);
  }, [isPlaying, gameOver, cup]);

  return (
    <div className="min-h-screen bg-[#030305] text-white font-sans overflow-hidden selection:bg-pink-500/30">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-pink-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />

      <nav className="relative z-50 border-b border-white/5 bg-[#030305]/60 backdrop-blur-2xl px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 shadow-lg shadow-pink-500/20">
              <Gamepad2 className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              BRO.FUN
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/40">
            <button className="text-white hover:text-white transition-colors">Play</button>
            <button className="hover:text-white transition-colors">Leaderboard</button>
            <button className="hover:text-white transition-colors">Rewards</button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-mono font-medium">{balance.toFixed(2)} MONAD</span>
          </div>
          <button className="px-5 py-2 text-sm font-semibold rounded-full bg-white text-black hover:bg-white/90 transition-all shadow-lg shadow-white/10 flex items-center gap-2">
            <Wallet size={16} />
            Connect 
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10 flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 w-full rounded-3xl p-1 bg-gradient-to-b from-white/10 to-transparent shadow-2xl">
          <div className="relative w-full aspect-[4/3] bg-[#0A0A0C] rounded-[22px] overflow-hidden flex items-center justify-center ring-1 ring-white/5">
            <canvas
              ref={canvasRef}
              width={TRACK_WIDTH}
              height={TRACK_HEIGHT}
              className="w-full h-full object-contain"
            />
            
            {!isPlaying && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center ring-1 ring-white/10">
                {gameOver && (
                  <div className="mb-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400 mb-2">
                      WRECKED
                    </h2>
                    <p className="text-white/60 font-mono text-lg">Score: {score}</p>
                  </div>
                )}
                <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-500/20 rotate-3 hover:rotate-6 transition-transform">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-4 tracking-tight">
                  {gameOver ? "Ride Again?" : "Web3 Snake Kart"}
                </h2>
                <p className="text-white/40 mb-8 max-w-sm">
                  Steer with Arrow Keys. Eat the nodes. Grow your tail. Don't crash.
                </p>
                <button 
                  onClick={startGame}
                  className="group relative px-8 py-4 bg-white text-black font-bold text-lg rounded-full flex items-center gap-3 hover:scale-105 transition-all duration-300"
                >
                  {gameOver ? "Retry Drive" : "Start Engine"}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

            {isPlaying && (
              <div className="absolute top-6 left-6 flex items-center gap-4">
                <div className="px-4 py-2 rounded-full bg-black/50 backdrop-blur border border-white/10 text-white font-mono font-bold flex items-center gap-2 shadow-lg">
                  <Sparkles size={16} className="text-pink-500" />
                  Score: {score}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-[350px] flex flex-col gap-6">
          <div className="rounded-3xl bg-white/[0.02] border border-white/5 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-pink-500/20 text-pink-500">
                <Trophy size={18} />
              </div>
              <h3 className="font-semibold tracking-tight text-lg text-white/90">Top Racers</h3>
            </div>
            
            <div className="space-y-4">
              {[
                { name: 'whaddadem', pts: '80.7k' },
                { name: 'chadding', pts: '57.9k' },
                { name: 'leo', pts: '57.3k' },
                { name: 'monadG', pts: '49.9k' },
              ].map((player, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer p-2 -mx-2 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-white/20 font-mono text-sm w-4">{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-white/10" />
                    <span className="font-medium text-white/70 group-hover:text-white transition-colors">{player.name}</span>
                  </div>
                  <span className="text-emerald-400 font-mono text-sm">{player.pts}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/5 p-6 backdrop-blur-xl">
            <h3 className="font-semibold tracking-tight text-lg mb-6 flex items-center gap-2 text-white/90">
              <User size={18} className="text-blue-400" />
              Daily Quests
            </h3>
            
            <div className="space-y-3">
              {[
                { label: 'Share on X', reward: '+150 MON', done: false },
                { label: 'Win 3 Races', reward: '+300 MON', done: true },
                { label: 'Refer a Bro', reward: '+500 MON', done: false },
              ].map((q, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5">
                  <span className={`text-sm font-medium ${q.done ? 'text-white/20 line-through' : 'text-white/80'}`}>
                    {q.label}
                  </span>
                  <span className={`text-xs font-mono px-2 py-1 rounded-md ${q.done ? 'bg-white/5 text-white/20' : 'bg-emerald-400/10 text-emerald-400'}`}>
                    {q.reward}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
