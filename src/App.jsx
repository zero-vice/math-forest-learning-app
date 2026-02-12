import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";

// ============================================
// SOUND EFFECTS
// ============================================
const audioCtx = typeof window !== "undefined" ? new (window.AudioContext || window.webkitAudioContext)() : null;
function playSound(type) {
  if (!audioCtx) return;
  try {
    audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination); gain.gain.value = 0.07;
    const t = audioCtx.currentTime;
    const sounds = {
      correct: () => { osc.type="sine"; [659,784,988,1175].forEach((f,i)=>osc.frequency.setValueAtTime(f,t+i*.08)); gain.gain.exponentialRampToValueAtTime(.001,t+.45); osc.start(); osc.stop(t+.45); },
      wrong: () => { osc.type="triangle"; osc.frequency.setValueAtTime(330,t); osc.frequency.setValueAtTime(220,t+.15); gain.gain.exponentialRampToValueAtTime(.001,t+.3); osc.start(); osc.stop(t+.3); },
      levelup: () => { osc.type="sine"; [523,659,784,1047,1319].forEach((f,i)=>osc.frequency.setValueAtTime(f,t+i*.1)); gain.gain.exponentialRampToValueAtTime(.001,t+.7); osc.start(); osc.stop(t+.7); },
      sparkle: () => { osc.type="sine"; osc.frequency.setValueAtTime(1200,t); osc.frequency.exponentialRampToValueAtTime(2400,t+.1); gain.gain.value=.04; gain.gain.exponentialRampToValueAtTime(.001,t+.15); osc.start(); osc.stop(t+.15); },
      prize: () => { osc.type="sine"; [523,659,784,1047,1319,1568].forEach((f,i)=>osc.frequency.setValueAtTime(f,t+i*.09)); gain.gain.value=.09; gain.gain.exponentialRampToValueAtTime(.001,t+.8); osc.start(); osc.stop(t+.8); },
      badge: () => { osc.type="sine"; [440,554,659,880,1047].forEach((f,i)=>osc.frequency.setValueAtTime(f,t+i*.1)); gain.gain.value=.08; gain.gain.exponentialRampToValueAtTime(.001,t+.65); osc.start(); osc.stop(t+.65); },
    };
    (sounds[type] || sounds.sparkle)();
  } catch(e){}
}

// ============================================
// GAME CONTENT
// ============================================
const FOREST_CREATURES = ["🦊","🦉","🦋","🐇","🦌","🐿️","🦔","🐸","🌸","🍄"];
const FAIRY_CREATURES = ["🧚","🧚‍♀️","🦄","🐉","🏰","👸","🌙","⭐","🪄","✨"];
const CORRECT_MSGS = ["Magical! ✨","You cast the spell! 🪄","Enchanting! 🌟","The fairy is proud! 🧚","Spell-tacular! 💫","Pure magic! 💎","The unicorn cheers! 🦄","Wonderful! 🌈","You're glowing! 🔮","The forest celebrates! 🌻"];
const WRONG_MSGS = ["The spell fizzled — try again! 🪄","Almost! One more try! 🌟","The fairy believes in you! 🧚","Stir the cauldron again! 🧪","The owl says think carefully 🦉"];
const BADGE_ICONS = ["🌟","💎","🔮","🧪","👑","🦄","🐉","🌈","🪄","⭐","💖","🏰","🦋","🌸","🍄","✨","🧚","🦊","🦉","🐇","🎭","🎪","💫","🌙","🎀","🫧","🪻","🩵","🎠","🪽"];
const BADGE_NAMES = ["Starlight","Diamond","Mystic","Alchemist","Royal","Unicorn","Dragon","Rainbow","Wizard","Celestial","Heartkeeper","Castle","Butterfly","Blossom","Mushroom","Sparkle","Fairy","Fox","Owl","Bunny","Masquerade","Carnival","Comet","Moonbeam","Ribbon","Bubble","Orchid","Crystal","Carousel","Winged"];
const PRIZE_ICONS = ["🎁","🎀","🎊","🎪","🏆","🎠","🎡","🎢","🧸","🎮"];

const SKILLS = {
  addition:       { name: "Addition Spells",       emoji: "🪄", maxLevel: 8, color: "#a78bfa" },
  subtraction:    { name: "Subtraction Charms",    emoji: "🔮", maxLevel: 8, color: "#f472b6" },
  multiplication: { name: "Multiply Enchantments", emoji: "🧪", maxLevel: 6, color: "#fbbf24" },
  wordProblems:   { name: "Story Quests",          emoji: "🏰", maxLevel: 6, color: "#34d399" },
};

const DEFAULT_LEVELS = {addition:0,subtraction:0,multiplication:0,wordProblems:0};
const DEFAULT_XP = {addition:0,subtraction:0,multiplication:0,wordProblems:0};

// ============================================
// PROBLEM GENERATOR
// ============================================
function genProblem(skill, level) {
  let a, b, answer, display, hint;
  switch(skill) {
    case "addition": {
      const R=[[1,5],[1,9],[2,12],[5,18],[5,25],[10,50],[20,80],[50,200]];
      const [mn,mx]=R[Math.min(level,R.length-1)];
      a=Math.floor(Math.random()*(mx-mn+1))+mn; b=Math.floor(Math.random()*(mx-mn+1))+mn;
      answer=a+b; display=`${a} + ${b} = ?`;
      hint=level<=1?`🧚 Start at ${a}, count up ${b}!`:level<=3?`🦉 ${a} + ${Math.floor(b/2)} = ${a+Math.floor(b/2)}, then +${b-Math.floor(b/2)}!`:`🪄 Split: ${a} + ${Math.floor(b/10)*10} = ${a+Math.floor(b/10)*10}, +${b%10}=?`;
      break;
    }
    case "subtraction": {
      const R=[[1,5],[1,9],[3,15],[5,20],[8,30],[10,50],[20,80],[50,200]];
      const [mn,mx]=R[Math.min(level,R.length-1)];
      a=Math.floor(Math.random()*(mx-mn+1))+mn; b=Math.floor(Math.random()*Math.min(a,mx))+1;
      if(b>a)[a,b]=[b,a]; answer=a-b; display=`${a} − ${b} = ?`;
      hint=level<=1?`🧚 Start at ${a}, count back ${b}!`:level<=3?`🦉 What + ${b} = ${a}?`:`🪄 ${a} − ${Math.floor(b/2)} = ${a-Math.floor(b/2)}, then −${b-Math.floor(b/2)}!`;
      break;
    }
    case "multiplication": {
      const mM=[2,3,5,5,8,10][Math.min(level,5)];
      a=Math.floor(Math.random()*mM)+1; b=Math.floor(Math.random()*mM)+1;
      if(level<=1){a=Math.min(a,3);b=Math.min(b,5);}
      answer=a*b; display=`${a} × ${b} = ?`;
      hint=`🧪 ${a} groups of ${b}: ${Array.from({length:Math.min(a,5)},()=>b).join(" + ")}${a>5?" + ...":""}=?`;
      break;
    }
    case "wordProblems": {
      const fc=FAIRY_CREATURES[Math.floor(Math.random()*FAIRY_CREATURES.length)];
      const T=[
        ()=>{const n1=Math.floor(Math.random()*5)+2,n2=Math.floor(Math.random()*5)+1;return{display:`${fc} A fairy has ${n1} crystals and finds ${n2} more. How many now?`,answer:n1+n2,hint:`🧚 ${n1} + ${n2} = ?`};},
        ()=>{const n1=Math.floor(Math.random()*6)+4,n2=Math.floor(Math.random()*(n1-1))+1;return{display:`${fc} The dragon had ${n1} coins and gave ${n2} away. How many left?`,answer:n1-n2,hint:`🐉 ${n1} − ${n2} = ?`};},
        ()=>{const n1=Math.floor(Math.random()*8)+5,n2=Math.floor(Math.random()*8)+3;return{display:`${fc} The wizard picked ${n1} mushrooms, then ${n2} more. How many total?`,answer:n1+n2,hint:`🍄 ${n1} + ${n2} = ?`};},
        ()=>{const n1=Math.floor(Math.random()*10)+8,n2=Math.floor(Math.random()*5)+2,n3=Math.floor(Math.random()*3)+1;return{display:`${fc} A unicorn had ${n1} flowers. Gave ${n2} to bunny and ${n3} to owl. How many left?`,answer:n1-n2-n3,hint:`🦄 ${n1} − ${n2} = ${n1-n2}, then − ${n3} = ?`};},
        ()=>{const n1=Math.floor(Math.random()*4)+2,n2=Math.floor(Math.random()*5)+2;return{display:`${fc} The queen has ${n1} chests with ${n2} gems each. How many gems?`,answer:n1*n2,hint:`👑 ${n1} × ${n2} = ?`};},
        ()=>{const n1=Math.floor(Math.random()*5)+3,n2=Math.floor(Math.random()*5)+3,n3=Math.floor(Math.random()*4)+2;return{display:`${fc} The bakery has ${n1} cupcakes, ${n2} cookies, and ${n3} cakes. How many?`,answer:n1+n2+n3,hint:`🧁 ${n1}+${n2}=${n1+n2}, +${n3}=?`};},
      ];
      const ti=T[Math.min(Math.floor(Math.random()*Math.min(level+2,T.length)),T.length-1)]();
      answer=ti.answer;display=ti.display;hint=ti.hint;break;
    }
  }
  const wrong=new Set();let s=0;
  while(wrong.size<3&&s<30){s++;const off=Math.floor(Math.random()*5)+1+Math.floor(Math.random()*3);const w=Math.random()>.5?answer+off:Math.max(0,answer-off);if(w!==answer&&w>=0)wrong.add(w);}
  while(wrong.size<3)wrong.add(answer+wrong.size+7);
  return{display,answer,hint,choices:[...wrong,answer].sort(()=>Math.random()-.5),skill};
}

// ============================================
// COMPONENTS
// ============================================
function Particles(){
  const ps=Array.from({length:14},(_,i)=>({id:i,emoji:["✨","🌿","🍃","🌸","🦋","⭐","💫","🍄","🌙","🪄"][i%10],left:Math.random()*100,delay:Math.random()*25,dur:18+Math.random()*22,size:10+Math.random()*14}));
  return <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>{ps.map(p=><div key={p.id} style={{position:"absolute",left:`${p.left}%`,bottom:"-30px",fontSize:`${p.size}px`,animation:`floatUp ${p.dur}s linear ${p.delay}s infinite`,opacity:.3}}>{p.emoji}</div>)}</div>;
}

function BadgeSlot({earned,icon,name,isNew}){
  return <div style={{width:50,height:50,borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:earned?"rgba(255,215,0,.1)":"rgba(255,255,255,.03)",border:earned?"2px solid rgba(255,215,0,.3)":"2px dashed rgba(255,255,255,.08)",transition:"all .4s",animation:isNew?"badgePop .6s ease":"none",...(earned?{boxShadow:"0 0 16px rgba(255,215,0,.12)"}:{})}}>
    <span style={{fontSize:earned?22:15,filter:earned?"none":"grayscale(1) opacity(.15)"}}>{earned?icon:"❔"}</span>
    {earned&&<span style={{fontSize:6,fontWeight:700,opacity:.5,marginTop:1}}>{name}</span>}
  </div>;
}

function PrizeSlot({unlocked,index}){
  const icon=PRIZE_ICONS[index%PRIZE_ICONS.length];
  return <div style={{width:46,height:50,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:14,background:unlocked?"linear-gradient(135deg,rgba(255,215,0,.15),rgba(255,107,157,.15))":"rgba(255,255,255,.02)",border:unlocked?"2px solid rgba(255,215,0,.4)":"2px dashed rgba(255,255,255,.06)",animation:unlocked?"glow 2s ease infinite":"none"}}>
    <span style={{fontSize:unlocked?24:16,filter:unlocked?"none":"grayscale(1) opacity(.12)"}}>{icon}</span>
    {unlocked&&<span style={{fontSize:6,fontWeight:800,color:"#ffd700",marginTop:1}}>PRIZE!</span>}
  </div>;
}

function SaveDot({status}){
  if(status==="idle")return null;
  const c={saving:"#a78bfa",saved:"#34d399",failed:"#f87171"};
  const l={saving:"☁️ Saving...",saved:"☁️ Saved ✓",failed:"⚠️ Retry..."};
  return <div style={{position:"fixed",top:10,right:10,zIndex:200,display:"flex",alignItems:"center",gap:5,background:`${c[status]}20`,border:`1px solid ${c[status]}44`,padding:"3px 10px",borderRadius:8,fontSize:11,fontWeight:700,color:c[status],fontFamily:"'Nunito',sans-serif",animation:"fadeInUp .2s ease"}}>{l[status]}</div>;
}

// ============================================
// AUTH SCREEN
// ============================================
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      let result;
      if (mode === "signup") {
        result = await supabase.auth.signUp({ email, password });
        if (result.error) throw result.error;
        // Some Supabase configs auto-confirm; if not, show message
        if (result.data?.user?.identities?.length === 0) {
          setError("Account already exists. Try logging in.");
          setLoading(false); return;
        }
        if (!result.data.session) {
          setError("Check your email to confirm, then log in!");
          setLoading(false); return;
        }
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
      }
      onAuth(result.data.session);
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
    setLoading(false);
  }

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(170deg,#0c0a1d,#1a103a,#0d2137,#0a2a1a)",fontFamily:"'Nunito',sans-serif",color:"#ede4d4",padding:20}}>
      <Particles />
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:380,animation:"fadeInUp .5s ease"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:64,marginBottom:8,animation:"bounce 3s ease infinite"}}>🏰</div>
          <h1 style={{fontFamily:"'Fredoka One',cursive",fontSize:32,background:"linear-gradient(90deg,#ffd700,#ff6b9d,#a78bfa,#34d399)",backgroundSize:"300%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 6s linear infinite",marginBottom:4}}>Math Forest</h1>
          <p style={{opacity:.4,fontSize:13,fontWeight:600}}>A Magical Math Adventure</p>
        </div>

        <div style={{background:"rgba(255,255,255,.04)",border:"1.5px solid rgba(255,255,255,.08)",borderRadius:22,padding:28,backdropFilter:"blur(10px)"}}>
          <div style={{display:"flex",gap:0,marginBottom:22,borderBottom:"1px solid rgba(255,255,255,.06)"}}>
            {["login","signup"].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,background:"none",border:"none",padding:"10px 0",color:"#ede4d4",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer",opacity:mode===m?1:.4,borderBottom:mode===m?"2px solid #a78bfa":"2px solid transparent",transition:"all .2s"}}>{m==="login"?"Log In":"Sign Up"}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <label style={{fontSize:12,fontWeight:700,opacity:.5,display:"block",marginBottom:6}}>EMAIL</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="parent@email.com" style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1.5px solid rgba(255,255,255,.12)",borderRadius:12,padding:"12px 16px",fontSize:15,fontWeight:600,color:"#ede4d4",fontFamily:"'Nunito',sans-serif",outline:"none",marginBottom:14,boxSizing:"border-box"}} />

            <label style={{fontSize:12,fontWeight:700,opacity:.5,display:"block",marginBottom:6}}>PASSWORD</label>
            <input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1.5px solid rgba(255,255,255,.12)",borderRadius:12,padding:"12px 16px",fontSize:15,fontWeight:600,color:"#ede4d4",fontFamily:"'Nunito',sans-serif",outline:"none",marginBottom:20,boxSizing:"border-box"}} />

            {error && <div style={{background:"rgba(244,67,54,.1)",border:"1px solid rgba(244,67,54,.2)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,fontWeight:600,color:"#f87171"}}>{error}</div>}

            <button type="submit" disabled={loading} style={{width:"100%",background:"linear-gradient(135deg,#a78bfa,#7c5cfc)",border:"none",borderRadius:14,padding:"14px",fontSize:16,fontWeight:800,color:"white",cursor:"pointer",fontFamily:"'Nunito',sans-serif",opacity:loading?.6:1,transition:"all .2s"}}>
              {loading ? "..." : mode === "login" ? "Enter the Forest 🌲" : "Create Account ✨"}
            </button>
          </form>

          <p style={{textAlign:"center",fontSize:11,opacity:.3,marginTop:16,fontWeight:600}}>
            {mode==="login"?"Don't have an account? Tap Sign Up above":"Already have an account? Tap Log In above"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(170deg,#0c0a1d,#1a103a,#0d2137,#0a2a1a)",fontFamily:"'Nunito',sans-serif",color:"#ede4d4"}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:56}}>🏰</div><div style={{fontSize:16,fontWeight:700,opacity:.6,marginTop:8}}>Loading...</div></div>
      </div>
    );
  }

  if (!session) {
    return <><GlobalStyles /><AuthScreen onAuth={setSession} /></>;
  }

  return <><GlobalStyles /><Game session={session} /></>;
}

// ============================================
// GLOBAL STYLES
// ============================================
function GlobalStyles() {
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    html,body{overscroll-behavior:none;}
    @keyframes floatUp{0%{transform:translateY(0) rotate(0);opacity:0}8%{opacity:.4}92%{opacity:.2}100%{transform:translateY(-115vh) rotate(360deg);opacity:0}}
    @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
    @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    @keyframes fadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes celebratePop{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}
    @keyframes shimmer{0%{background-position:-300% center}100%{background-position:300% center}}
    @keyframes wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}
    @keyframes glow{0%,100%{box-shadow:0 0 12px rgba(255,215,0,.2)}50%{box-shadow:0 0 28px rgba(255,215,0,.5)}}
    @keyframes starPop{0%{transform:scale(1)}30%{transform:scale(1.6)}100%{transform:scale(1)}}
    @keyframes badgePop{0%{transform:scale(0) rotate(-20deg);opacity:0}50%{transform:scale(1.3) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0)}}
    @keyframes prizeGlow{0%{box-shadow:0 0 20px rgba(255,215,0,.3)}50%{box-shadow:0 0 40px rgba(255,215,0,.6)}100%{box-shadow:0 0 20px rgba(255,215,0,.3)}}
    @keyframes confettiFall{0%{transform:translateY(-20px) rotate(0);opacity:1}100%{transform:translateY(80px) rotate(360deg);opacity:0}}
    @keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
  `}</style>;
}

// ============================================
// GAME COMPONENT
// ============================================
function Game({ session }) {
  const userId = session.user.id;
  const [screen, setScreen] = useState("home");
  const [skill, setSkill] = useState(null);
  const [problem, setProblem] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [selAns, setSelAns] = useState(null);
  const [typedAns, setTypedAns] = useState("");
  const [useTyped, setUseTyped] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sesOk, setSesOk] = useState(0);
  const [sesN, setSesN] = useState(0);
  const [sesStart, setSesStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [creature, setCreature] = useState("🧚");
  const [celeb, setCeleb] = useState(null);
  const [sLevels, setSLevels] = useState({...DEFAULT_LEVELS});
  const [sXP, setSXP] = useState({...DEFAULT_XP});
  const [stars, setStars] = useState(0);
  const [potions, setPotions] = useState(0);
  const [cOk, setCOk] = useState(0);
  const [cBad, setCBad] = useState(0);
  const [att, setAtt] = useState(0);
  const [starPopAnim, setStarPopAnim] = useState(false);
  const [name, setName] = useState("");
  const [doneScr, setDoneScr] = useState(false);
  const [badges, setBadges] = useState([]);
  const [newBI, setNewBI] = useState(-1);
  const [badgePopup, setBadgePopup] = useState(null);
  const [prizePopup, setPrizePopup] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [loaded, setLoaded] = useState(false);
  const inpRef = useRef(null);
  const timerRef = useRef(null);
  const saveQueueRef = useRef(null);

  // --- CLOUD SAVE ---
  const cloudSave = useCallback(async (sl, xp, st, bs, pot, nm, bg) => {
    setSaveStatus("saving");
    // Debounce: cancel previous pending save
    if (saveQueueRef.current) clearTimeout(saveQueueRef.current);

    return new Promise((resolve) => {
      saveQueueRef.current = setTimeout(async () => {
        try {
          const { error } = await supabase
            .from("profiles")
            .upsert({
              id: userId,
              name: nm,
              skill_levels: sl,
              skill_xp: xp,
              total_stars: st,
              best_streak: bs,
              potions: pot,
              badges: bg,
              updated_at: new Date().toISOString(),
            });
          if (error) throw error;
          setSaveStatus("saved");
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setSaveStatus("idle"), 1500);
          resolve(true);
        } catch (e) {
          console.error("Save error:", e);
          setSaveStatus("failed");
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setSaveStatus("idle"), 4000);
          resolve(false);
        }
      }, 500); // 500ms debounce
    });
  }, [userId]);

  // Immediate save (no debounce) for critical moments like badges
  const immediateSave = useCallback(async (sl, xp, st, bs, pot, nm, bg) => {
    if (saveQueueRef.current) clearTimeout(saveQueueRef.current);
    setSaveStatus("saving");
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: userId, name: nm, skill_levels: sl, skill_xp: xp,
          total_stars: st, best_streak: bs, potions: pot, badges: bg,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      setSaveStatus("saved");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSaveStatus("idle"), 1500);
      return true;
    } catch (e) {
      console.error("Immediate save error:", e);
      setSaveStatus("failed");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSaveStatus("idle"), 4000);
      return false;
    }
  }, [userId]);

  // --- CLOUD LOAD ---
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();
        if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
        if (data) {
          if (data.skill_levels) setSLevels(data.skill_levels);
          if (data.skill_xp) setSXP(data.skill_xp);
          if (typeof data.total_stars === "number") setStars(data.total_stars);
          if (typeof data.best_streak === "number") setBestStreak(data.best_streak);
          if (typeof data.potions === "number") setPotions(data.potions);
          if (data.name) setName(data.name);
          if (data.badges) setBadges(data.badges);
        }
      } catch (e) {
        console.error("Load error:", e);
      }
      setLoaded(true);
    })();
  }, [userId]);

  // Timer
  useEffect(() => {
    if (!sesStart) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - sesStart) / 60000)), 3000);
    return () => clearInterval(iv);
  }, [sesStart]);

  function startPractice(sk) {
    playSound("sparkle"); setSkill(sk); setScreen("practice");
    setSesOk(0); setSesN(0); setStreak(0); setSesStart(Date.now()); setElapsed(0);
    setCOk(0); setCBad(0); setDoneScr(false); setClaimed(false);
    nextProb(sk, sLevels[sk]);
  }

  function nextProb(sk, lv) {
    const s = sk || skill, l = lv !== undefined ? lv : sLevels[s];
    setProblem(genProblem(s, l));
    setFeedback(null); setShowHint(false); setSelAns(null); setTypedAns(""); setAtt(0);
    setCreature([...FOREST_CREATURES, ...FAIRY_CREATURES][Math.floor(Math.random() * 20)]);
    setUseTyped(l >= 4);
    setTimeout(() => { if (inpRef.current) inpRef.current.focus(); }, 150);
  }

  function claimBadge() {
    if (claimed) return;
    setClaimed(true);
    playSound("badge");
    const idx = badges.length;
    const nb = { icon: BADGE_ICONS[idx % BADGE_ICONS.length], name: BADGE_NAMES[idx % BADGE_NAMES.length], date: new Date().toLocaleDateString(), skill, correct: sesOk, total: sesN };
    const allB = [...badges, nb];
    setBadges(allB);
    setNewBI(idx);
    setBadgePopup(nb);
    setTimeout(() => { setBadgePopup(null); setNewBI(-1); }, 2500);

    // IMMEDIATE save for badges
    immediateSave(sLevels, sXP, stars, bestStreak, potions, name, allB);

    if (allB.length % 5 === 0) {
      setTimeout(() => { setPrizePopup(true); playSound("prize"); }, 2800);
      setTimeout(() => { setPrizePopup(false); goHome(); }, 7500);
    } else {
      setTimeout(() => goHome(), 3000);
    }
  }

  function checkAns(ans) {
    const num = typeof ans === "string" ? parseInt(ans) : ans;
    if (isNaN(num)) return;
    setSelAns(num);
    const ok = num === problem.answer;

    if (ok) {
      playSound("correct");
      setFeedback({ type: "correct", msg: CORRECT_MSGS[Math.floor(Math.random() * CORRECT_MSGS.length)] });
      const ns = streak + 1; setStreak(ns);
      const nb = Math.max(bestStreak, ns); setBestStreak(nb);
      setCOk(c => c + 1); setCBad(0);
      if (att === 0) { setStarPopAnim(true); setTimeout(() => setStarPopAnim(false), 800); }

      const xpG = att === 0 ? 3 : att === 1 ? 2 : 1;
      const nXP = { ...sXP, [skill]: sXP[skill] + xpG };
      const xpN = 8 + sLevels[skill] * 4;
      let nL = { ...sLevels }; let nP = potions;
      if (nXP[skill] >= xpN && nL[skill] < SKILLS[skill].maxLevel) {
        nL[skill]++; nXP[skill] = 0; nP++;
        playSound("levelup");
        setCeleb({ text: "Level Up!", sub: `${SKILLS[skill].name} → Level ${nL[skill]} 🧪` });
        setTimeout(() => setCeleb(null), 2800);
      }
      if (cOk + 1 >= 5) nXP[skill] = Math.min(nXP[skill] + 2, xpN);

      const nS = stars + (att === 0 ? 1 : 0);
      setStars(nS); setSXP(nXP); setSLevels(nL); setPotions(nP);
      setSesOk(c => c + 1);

      // Debounced cloud save after each correct answer
      cloudSave(nL, nXP, nS, nb, nP, name, badges);

      if (sesN + 1 >= 10 && elapsed >= 8) {
        setTimeout(() => setDoneScr(true), 1600);
      } else {
        setTimeout(() => nextProb(skill, nL[skill]), 1500);
      }
    } else {
      playSound("wrong"); setAtt(a => a + 1);
      setFeedback({ type: "wrong", msg: WRONG_MSGS[Math.floor(Math.random() * WRONG_MSGS.length)] });
      setStreak(0); setCOk(0);
      const nw = cBad + 1; setCBad(nw);
      if (nw >= 3 && sLevels[skill] > 0) {
        const nl = { ...sLevels, [skill]: sLevels[skill] - 1 };
        setSLevels(nl); setCBad(0); cloudSave(nl, sXP, stars, bestStreak, potions, name, badges);
      }
      if (att >= 1) setShowHint(true);
      if (att >= 2) {
        setFeedback({ type: "show", msg: `The answer is ${problem.answer}! You'll get the next one! 💪` });
        setTimeout(() => nextProb(), 2800);
      } else { setSelAns(null); setTypedAns(""); setTimeout(() => { if (inpRef.current) inpRef.current.focus(); }, 100); }
    }
    setSesN(t => t + 1);
  }

  function goHome() { playSound("sparkle"); setScreen("home"); setDoneScr(false); setBadgePopup(null); setPrizePopup(false); }
  async function handleLogout() { await supabase.auth.signOut(); }

  const totLv = Object.values(sLevels).reduce((a, b) => a + b, 0);
  const rank = totLv < 4 ? "Apprentice" : totLv < 10 ? "Enchanter" : totLv < 18 ? "Sorcerer" : totLv < 26 ? "Archmage" : "Grand Wizard";
  const rankE = totLv < 4 ? "🌱" : totLv < 10 ? "🪄" : totLv < 18 ? "🔮" : totLv < 26 ? "🧙" : "👑";

  const totalSlots = Math.max(Math.ceil((badges.length + 1) / 5) * 5, 10);
  const rows = [];
  for (let i = 0; i < totalSlots; i += 5) {
    rows.push({ start: i, badges: Array.from({ length: 5 }, (_, j) => badges[i + j] || null), complete: i + 5 <= badges.length });
  }

  if (!loaded) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(170deg,#0c0a1d,#1a103a,#0d2137,#0a2a1a)", fontFamily: "'Nunito',sans-serif", color: "#ede4d4" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 56 }}>🏰</div><div style={{ fontSize: 16, fontWeight: 700, opacity: .6, marginTop: 8 }}>Loading your adventure...</div></div>
    </div>
  );

  // ===================== RENDER =====================
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(170deg,#0c0a1d 0%,#1a103a 25%,#0d2137 50%,#0a2a1a 80%,#0c1a0c 100%)", fontFamily: "'Nunito','Quicksand',sans-serif", color: "#ede4d4", position: "relative", overflow: "hidden" }}>
      <style>{`
        .card{background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.08);border-radius:20px;padding:22px 18px;cursor:pointer;transition:all .3s;backdrop-filter:blur(10px)}
        .card:hover{transform:translateY(-3px);border-color:rgba(255,215,0,.3);box-shadow:0 8px 32px rgba(0,0,0,.3)}
        .cb{background:rgba(255,255,255,.06);border:2px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 20px;font-size:22px;font-weight:800;color:#ede4d4;cursor:pointer;transition:all .2s;font-family:'Nunito',sans-serif;min-width:72px}
        .cb:hover:not(:disabled){background:rgba(255,255,255,.12);border-color:rgba(167,139,250,.5);transform:scale(1.06)}
        .cb:active:not(:disabled){transform:scale(.95)}
        .cb.ok{background:rgba(52,211,153,.2)!important;border-color:#34d399!important;animation:pulse .5s}
        .cb.no{background:rgba(244,67,54,.15)!important;border-color:rgba(244,67,54,.5)!important}
        .cb:disabled{cursor:default;opacity:.6}
        .pill{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.06);padding:5px 12px;border-radius:10px;font-size:13px;font-weight:700;border:1px solid rgba(255,255,255,.06)}
        .ti{background:rgba(255,255,255,.07);border:2px solid rgba(255,255,255,.15);border-radius:16px;padding:14px 20px;font-size:26px;font-weight:800;color:#ede4d4;text-align:center;width:140px;font-family:'Nunito',sans-serif;outline:none}
        .ti:focus{border-color:rgba(167,139,250,.5);box-shadow:0 0 20px rgba(167,139,250,.12)}
        .mb{background:linear-gradient(135deg,#a78bfa,#7c5cfc);border:none;border-radius:16px;padding:14px 28px;font-size:16px;font-weight:800;color:white;cursor:pointer;font-family:'Nunito',sans-serif;transition:all .2s;box-shadow:0 4px 16px rgba(124,92,252,.3)}
        .mb:disabled{opacity:.4;cursor:default}
        .gb{background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);border-radius:12px;padding:8px 16px;color:#ede4d4;font-family:'Nunito',sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:all .2s}
        .gb:hover{background:rgba(255,255,255,.1)}
        .hb{background:rgba(167,139,250,.12);border:none;border-radius:12px;padding:7px 16px;color:#c4b5fd;font-weight:700;font-size:13px;cursor:pointer;font-family:'Nunito',sans-serif}
      `}</style>

      <Particles />
      <SaveDot status={saveStatus} />

      {/* Level up overlay */}
      {celeb && <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,8,30,.7)", backdropFilter: "blur(8px)", animation: "fadeInUp .3s" }}>
        <div style={{ textAlign: "center", animation: "celebratePop .6s" }}>
          <div style={{ fontSize: 80, marginBottom: 12, animation: "wiggle .5s ease .3s" }}>🎉</div>
          <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 36, background: "linear-gradient(90deg,#ffd700,#ff6b9d,#a78bfa,#ffd700)", backgroundSize: "300%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 2s linear infinite", marginBottom: 8 }}>{celeb.text}</div>
          <div style={{ fontSize: 18, opacity: .7, fontWeight: 600 }}>{celeb.sub}</div>
        </div>
      </div>}

      {/* Badge popup */}
      {badgePopup && <div style={{ position: "fixed", inset: 0, zIndex: 101, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,8,30,.75)", backdropFilter: "blur(8px)", animation: "fadeInUp .3s" }}>
        <div style={{ textAlign: "center", animation: "celebratePop .6s" }}>
          <div style={{ fontSize: 72, marginBottom: 8, animation: "badgePop .6s" }}>{badgePopup.icon}</div>
          <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, color: "#ffd700", marginBottom: 4 }}>Badge Earned!</div>
          <div style={{ fontSize: 18, fontWeight: 700, opacity: .8, marginBottom: 6 }}>{badgePopup.name} Badge</div>
          <div style={{ fontSize: 13, opacity: .5, fontWeight: 600 }}>Session #{badges.length}</div>
        </div>
      </div>}

      {/* Prize popup */}
      {prizePopup && <div style={{ position: "fixed", inset: 0, zIndex: 102, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,8,30,.85)", backdropFilter: "blur(12px)", animation: "fadeInUp .3s" }}>
        {Array.from({ length: 24 }, (_, i) => <div key={i} style={{ position: "absolute", left: `${5 + Math.random() * 90}%`, top: `${10 + Math.random() * 40}%`, fontSize: 14 + Math.random() * 14, animation: `confettiFall ${1.5 + Math.random() * 2}s ease ${Math.random() * .8}s forwards`, opacity: .9, pointerEvents: "none" }}>{["🎉", "✨", "⭐", "💫", "🌟", "🎊", "💖", "🦄", "🌈", "👑"][i % 10]}</div>)}
        <div style={{ textAlign: "center", animation: "celebratePop .6s", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 88, marginBottom: 16, animation: "prizeGlow 1.5s ease infinite", borderRadius: "50%", width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>{PRIZE_ICONS[Math.floor((badges.length - 1) / 5) % PRIZE_ICONS.length]}</div>
          <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 32, background: "linear-gradient(90deg,#ffd700,#ff6b9d,#a78bfa,#ffd700)", backgroundSize: "300%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 2s linear infinite", marginBottom: 10 }}>Prize Unlocked!</div>
          <div style={{ fontSize: 16, opacity: .8, fontWeight: 700, lineHeight: 1.7, marginBottom: 16 }}>🎉 5 sessions complete! 🎉<br />Time to claim your prize<br />from Mom & Dad!</div>
          <button className="mb" style={{ background: "linear-gradient(135deg,#ffd700,#ff9500)", color: "#1a1a2e" }} onClick={() => { setPrizePopup(false); goHome(); }}>Yay! 🎉</button>
        </div>
      </div>}

      <div style={{ position: "relative", zIndex: 1, maxWidth: 560, margin: "0 auto", padding: "20px 16px", minHeight: "100vh" }}>

        {/* ===== HOME ===== */}
        {screen === "home" && (
          <div style={{ animation: "fadeInUp .5s" }}>
            <div style={{ textAlign: "center", marginBottom: 20, paddingTop: 8 }}>
              <div style={{ fontSize: 52, marginBottom: 4, animation: "bounce 3.5s ease infinite" }}>🏰</div>
              <h1 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 32, lineHeight: 1.1, background: "linear-gradient(90deg,#ffd700,#ff6b9d,#a78bfa,#34d399)", backgroundSize: "300%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 6s linear infinite", marginBottom: 6 }}>Math Forest</h1>
              <p style={{ opacity: .4, fontSize: 13, fontWeight: 600 }}>A Magical Math Adventure</p>
            </div>

            {!name ? (
              <div style={{ background: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.15)", borderRadius: 18, padding: 20, marginBottom: 20, textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>🧚 What's your name, young wizard?</div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <input id="ni" style={{ background: "rgba(255,255,255,.07)", border: "1.5px solid rgba(255,255,255,.15)", borderRadius: 12, padding: "10px 16px", fontSize: 16, fontWeight: 700, color: "#ede4d4", fontFamily: "'Nunito',sans-serif", outline: "none", width: 160, textAlign: "center" }} placeholder="Your name..." maxLength={20}
                    onKeyDown={e => { if (e.key === "Enter" && e.target.value.trim()) { const n = e.target.value.trim(); setName(n); immediateSave(sLevels, sXP, stars, bestStreak, potions, n, badges); playSound("sparkle"); } }} />
                  <button className="mb" style={{ padding: "10px 18px", fontSize: 14 }} onClick={() => { const el = document.getElementById("ni"); if (el?.value.trim()) { const n = el.value.trim(); setName(n); immediateSave(sLevels, sXP, stars, bestStreak, potions, n, badges); playSound("sparkle"); } }}>Go! ✨</button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", marginBottom: 18, fontSize: 15, fontWeight: 700 }}>Welcome back, <span style={{ color: "#ffd700" }}>{name}</span>! {rankE} <span style={{ opacity: .5 }}>{rank}</span></div>
            )}

            <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 22, flexWrap: "wrap" }}>
              <div className="pill">⭐ <strong>{stars}</strong></div>
              <div className="pill">🔥 <strong>{bestStreak}</strong></div>
              <div className="pill">🧪 <strong>{potions}</strong></div>
              <div className="pill">🏅 <strong>{badges.length}</strong></div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {Object.entries(SKILLS).map(([k, sk]) => {
                const lv = sLevels[k], xp = sXP[k], xpN = 8 + lv * 4, pct = Math.round((xp / xpN) * 100);
                return (
                  <div key={k} className="card" onClick={() => startPractice(k)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 50, height: 50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, background: `${sk.color}10`, borderRadius: 14, border: `1px solid ${sk.color}22` }}>{sk.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                          <span style={{ fontWeight: 800, fontSize: 15 }}>{sk.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 800, background: `${sk.color}20`, color: sk.color, padding: "2px 8px", borderRadius: 7 }}>Lv.{lv}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: `linear-gradient(90deg,${sk.color},${sk.color}88)`, transition: "width .5s" }} />
                        </div>
                        <div style={{ fontSize: 10, opacity: .35, marginTop: 3, fontWeight: 600 }}>{xp}/{xpN} XP • tap to practice</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Badge preview */}
            <div style={{ marginTop: 20, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 18, padding: "16px", cursor: "pointer" }} onClick={() => { setScreen("badges"); playSound("sparkle"); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>🏅 Badge Collection</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>View All →</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center", marginBottom: 8 }}>
                {Array.from({ length: 5 }, (_, i) => { const bi = Math.floor(badges.length / 5) * 5 + i; const e = bi < badges.length; return <div key={i} style={{ width: 38, height: 38, borderRadius: 10, background: e ? "rgba(255,215,0,.1)" : "rgba(255,255,255,.03)", border: e ? "1.5px solid rgba(255,215,0,.25)" : "1.5px dashed rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: e ? 18 : 13 }}>{e ? badges[bi].icon : "❔"}</div>; })}
                <div style={{ fontSize: 13, opacity: .3, margin: "0 2px" }}>→</div>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1.5px dashed rgba(255,215,0,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, opacity: .4 }}>🎁</div>
              </div>
              <div style={{ fontSize: 11, opacity: .4, fontWeight: 600, textAlign: "center" }}>
                {badges.length === 0 ? "Complete a session to earn your first badge!" :
                  badges.length % 5 === 0 ? "🎉 Prize unlocked! Start the next row!" :
                    `${5 - badges.length % 5} more session${5 - badges.length % 5 !== 1 ? "s" : ""} until next prize! 🎁`}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24 }}>
              <button className="gb" style={{ fontSize: 11, opacity: .4 }} onClick={handleLogout}>Log Out</button>
              <button className="gb" style={{ fontSize: 11, opacity: .4 }} onClick={async () => {
                if (confirm("Reset all progress?")) {
                  const f = { ...DEFAULT_LEVELS }; const fx = { ...DEFAULT_XP };
                  setSLevels(f); setSXP(fx); setStars(0); setBestStreak(0); setPotions(0); setName(""); setBadges([]); setClaimed(false);
                  immediateSave(f, fx, 0, 0, 0, "", []);
                }
              }}>Reset</button>
            </div>
          </div>
        )}

        {/* ===== BADGES ===== */}
        {screen === "badges" && (
          <div style={{ animation: "fadeInUp .5s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <button className="gb" onClick={() => { setScreen("home"); playSound("sparkle"); }}>← Back</button>
              <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: "#ffd700" }}>🏅 My Badges</div>
              <div style={{ width: 60 }} />
            </div>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, opacity: .6, marginBottom: 4 }}>{badges.length} badge{badges.length !== 1 ? "s" : ""} • {Math.floor(badges.length / 5)} prize{Math.floor(badges.length / 5) !== 1 ? "s" : ""}</div>
              <div style={{ fontSize: 12, opacity: .35, fontWeight: 600 }}>Complete 5 sessions to unlock a prize!</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {rows.map((row, ri) => (
                <div key={ri} style={{ background: row.complete ? "rgba(255,215,0,.04)" : "rgba(255,255,255,.02)", border: row.complete ? "1.5px solid rgba(255,215,0,.15)" : "1.5px solid rgba(255,255,255,.05)", borderRadius: 20, padding: "14px 10px", animation: `slideIn .4s ease ${ri * .06}s both`, ...(row.complete ? { boxShadow: "0 0 20px rgba(255,215,0,.06)" } : {}) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "0 4px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, opacity: .35 }}>Sessions {row.start + 1}–{row.start + 5}</span>
                    {row.complete && <span style={{ fontSize: 9, fontWeight: 800, color: "#ffd700", background: "rgba(255,215,0,.12)", padding: "2px 7px", borderRadius: 6 }}>✅ COMPLETE</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                    {row.badges.map((b, bi) => <BadgeSlot key={bi} earned={!!b} icon={b?.icon || "❔"} name={b?.name || ""} isNew={newBI === row.start + bi} />)}
                    <div style={{ fontSize: 14, opacity: row.complete ? .7 : .12, margin: "0 2px" }}>→</div>
                    <PrizeSlot unlocked={row.complete} index={ri} />
                  </div>
                  {row.badges.some(b => b) && <div style={{ display: "flex", gap: 3, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    {row.badges.filter(b => b).map((b, i) => <div key={i} style={{ fontSize: 8, opacity: .3, fontWeight: 600, background: "rgba(255,255,255,.04)", padding: "2px 6px", borderRadius: 5 }}>{b.icon} {b.correct}/{b.total} • {b.date}</div>)}
                  </div>}
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 20, padding: "14px", background: "rgba(167,139,250,.06)", borderRadius: 16, border: "1px solid rgba(167,139,250,.1)" }}>
              <div style={{ fontSize: 26, marginBottom: 4 }}>{badges.length === 0 ? "🌟" : badges.length < 5 ? "🧚" : badges.length < 10 ? "🦄" : "👑"}</div>
              <div style={{ fontSize: 14, fontWeight: 700, opacity: .7 }}>
                {badges.length === 0 ? "Complete a session to earn a badge!" : badges.length % 5 === 0 ? "Start the next row!" : `${5 - badges.length % 5} more until next prize! 🎁`}
              </div>
            </div>
          </div>
        )}

        {/* ===== PRACTICE ===== */}
        {screen === "practice" && problem && !doneScr && (
          <div style={{ animation: "fadeInUp .4s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <button className="gb" onClick={goHome}>← Back</button>
              <div style={{ display: "flex", gap: 6 }}>
                <div className="pill">⏱️ {elapsed}m</div>
                {streak > 0 && <div className="pill" style={{ color: "#ff6b9d", background: "rgba(255,107,157,.12)", animation: streak >= 5 ? "glow 1.5s ease infinite" : "none" }}>🔥 {streak}</div>}
              </div>
            </div>
            <div style={{ textAlign: "center", marginBottom: 6, fontSize: 12, fontWeight: 700, opacity: .4, letterSpacing: 1.5, textTransform: "uppercase" }}>{SKILLS[skill].emoji} {SKILLS[skill].name} • Level {sLevels[skill]}</div>
            <div style={{ textAlign: "center", marginBottom: 20, fontSize: 13, opacity: .35, fontWeight: 600 }}>{sesOk}/{sesN} spells cast ✨</div>
            <div style={{ background: "rgba(255,255,255,.04)", border: "1.5px solid rgba(255,255,255,.08)", borderRadius: 24, padding: "28px 22px", marginBottom: 20, position: "relative", backdropFilter: "blur(8px)" }}>
              <div style={{ position: "absolute", top: -18, right: 16, fontSize: 36, animation: "bounce 2.5s ease infinite" }}>{creature}</div>
              {starPopAnim && <div style={{ position: "absolute", top: -16, left: 16, fontSize: 28, animation: "starPop .8s ease forwards" }}>⭐</div>}
              <div style={{ fontFamily: skill === "wordProblems" ? "'Nunito',sans-serif" : "'Fredoka One',cursive", fontSize: skill === "wordProblems" ? 17 : 30, textAlign: "center", lineHeight: 1.6, padding: "12px 0" }}>{problem.display}</div>
            </div>
            {!showHint && !(feedback?.type === "correct") && !(feedback?.type === "show") && <div style={{ textAlign: "center", marginBottom: 14 }}><button className="hb" onClick={() => { setShowHint(true); playSound("sparkle"); }}>💡 Need a hint?</button></div>}
            {showHint && <div style={{ background: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.15)", borderRadius: 16, padding: "12px 18px", marginBottom: 18, fontSize: 14, lineHeight: 1.55, animation: "fadeInUp .3s" }}>{problem.hint}</div>}
            {(!feedback || feedback.type === "wrong") && (
              useTyped ? (
                <div style={{ display: "flex", justifyContent: "center", gap: 10, alignItems: "center", marginBottom: 14 }}>
                  <input ref={inpRef} className="ti" type="number" inputMode="numeric" placeholder="?" value={typedAns} onChange={e => setTypedAns(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && typedAns) checkAns(typedAns); }} />
                  <button className="mb" onClick={() => checkAns(typedAns)} disabled={!typedAns}>Cast! 🪄</button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {problem.choices.map((c, i) => <button key={i} className={`cb ${selAns !== null && c === problem.answer ? "ok" : selAns === c && c !== problem.answer ? "no" : ""}`} onClick={() => checkAns(c)} disabled={feedback?.type === "correct"}>{c}</button>)}
                </div>
              )
            )}
            {feedback && <div style={{ textAlign: "center", padding: "16px 20px", borderRadius: 18, marginBottom: 16, animation: "fadeInUp .3s", background: feedback.type === "correct" ? "rgba(52,211,153,.1)" : feedback.type === "show" ? "rgba(255,152,0,.1)" : "rgba(244,67,54,.08)", border: `1px solid ${feedback.type === "correct" ? "rgba(52,211,153,.2)" : feedback.type === "show" ? "rgba(255,152,0,.2)" : "rgba(244,67,54,.15)"}` }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{feedback.msg}</div>
              {feedback.type === "correct" && streak > 0 && streak % 5 === 0 && <div style={{ fontSize: 13, marginTop: 4, opacity: .6 }}>🔥 {streak} in a row!</div>}
            </div>}
            {elapsed >= 8 && sesN > 0 && <div style={{ background: "rgba(255,215,0,.06)", border: "1px solid rgba(255,215,0,.1)", borderRadius: 14, padding: "10px 16px", textAlign: "center", fontSize: 13, fontWeight: 600, marginTop: 8, opacity: .7 }}>🌟 {elapsed}min • {sesOk}/{sesN} • {Math.round((sesOk / Math.max(sesN, 1)) * 100)}%</div>}
          </div>
        )}

        {/* ===== SESSION DONE ===== */}
        {doneScr && (
          <div style={{ animation: "fadeInUp .5s", textAlign: "center", paddingTop: 28 }}>
            <div style={{ fontSize: 68, marginBottom: 14, animation: "bounce 2s ease infinite" }}>🌟</div>
            <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, background: "linear-gradient(90deg,#ffd700,#ff6b9d,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 12 }}>Amazing Session{name ? `, ${name}` : ""}!</h2>
            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[{ e: "⏱️", v: `${elapsed}m`, l: "TIME" }, { e: "✅", v: `${sesOk}/${sesN}`, l: "CORRECT" }, { e: "🎯", v: `${Math.round((sesOk / Math.max(sesN, 1)) * 100)}%`, l: "ACCURACY" }, { e: "🔥", v: `${bestStreak}`, l: "BEST STREAK" }].map((s, i) =>
                  <div key={i} style={{ textAlign: "center" }}><div style={{ fontSize: 26 }}>{s.e}</div><div style={{ fontSize: 20, fontWeight: 900 }}>{s.v}</div><div style={{ fontSize: 10, opacity: .4, fontWeight: 600 }}>{s.l}</div></div>
                )}
              </div>
            </div>
            {!claimed ? (
              <div style={{ background: "rgba(255,215,0,.06)", border: "1.5px solid rgba(255,215,0,.15)", borderRadius: 18, padding: "20px", marginBottom: 20, animation: "slideIn .5s ease .2s both" }}>
                <div style={{ fontSize: 40, marginBottom: 6 }}>🏅</div>
                <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 18, color: "#ffd700", marginBottom: 6 }}>You earned a session badge!</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center", marginBottom: 12 }}>
                  {Array.from({ length: 5 }, (_, i) => { const idx = Math.floor(badges.length / 5) * 5 + i; const e = idx < badges.length; const nx = idx === badges.length; return <div key={i} style={{ width: 30, height: 30, borderRadius: 8, background: e ? "rgba(255,215,0,.12)" : nx ? "rgba(167,139,250,.15)" : "rgba(255,255,255,.03)", border: e ? "1.5px solid rgba(255,215,0,.3)" : nx ? "2px solid rgba(167,139,250,.4)" : "1.5px dashed rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: e ? 14 : nx ? 16 : 11, animation: nx ? "pulse 1.5s ease infinite" : "none" }}>{e ? badges[idx]?.icon : nx ? "🏅" : "❔"}</div>; })}
                  <div style={{ fontSize: 11, opacity: .3, margin: "0 2px" }}>→</div>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,.02)", border: "1.5px dashed rgba(255,215,0,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, opacity: .4 }}>🎁</div>
                </div>
                <button className="mb" style={{ background: "linear-gradient(135deg,#ffd700,#ff9500)", color: "#1a1a2e", animation: "pulse 2s ease infinite", fontSize: 17, padding: "14px 32px" }} onClick={claimBadge}>Claim Badge! 🏅✨</button>
                <div style={{ fontSize: 11, opacity: .4, marginTop: 8, fontWeight: 600 }}>
                  {(5 - badges.length % 5) === 1 ? "🎁 This unlocks your PRIZE!" : `${5 - badges.length % 5} badges until next prize 🎁`}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 14, opacity: .5, fontWeight: 600, marginBottom: 16 }}>✅ Badge claimed & saved to cloud!</div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="gb" onClick={() => { setClaimed(false); setDoneScr(false); nextProb(); }}>Keep Going 💪</button>
              {!claimed && <button className="gb" onClick={claimBadge}>Done for Today</button>}
            </div>
            <p style={{ opacity: .35, fontSize: 12, fontWeight: 600, marginTop: 16 }}>The magical forest is proud of you! 🌳</p>
          </div>
        )}
      </div>
    </div>
  );
}
