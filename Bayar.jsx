import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  Bell,
  Calendar,
  Check,
  Copy,
  CreditCard,
  LogOut,
  Plus,
  Receipt,
  Send,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react';

const CATEGORIES = {
  makan: { icon: '🍜', label: 'Makan' },
  trip: { icon: '✈️', label: 'Trip' },
  house: { icon: '🏠', label: 'House' },
  sports: { icon: '⚽', label: 'Sports' },
  event: { icon: '🎉', label: 'Event' },
};

const storage = {
  async get(key, fallback) {
    try {
      const api = window.storage;
      const raw = api?.getItem ? await api.getItem(key) : localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  async set(key, value) {
    const raw = JSON.stringify(value);
    try {
      const api = window.storage;
      if (api?.setItem) await api.setItem(key, raw);
      else localStorage.setItem(key, raw);
    } catch {
      localStorage.setItem(key, raw);
    }
  },
  async remove(key) {
    try {
      const api = window.storage;
      if (api?.removeItem) await api.removeItem(key);
      else localStorage.removeItem(key);
    } catch {
      localStorage.removeItem(key);
    }
  },
};

const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const rm = (value) => `RM ${Number(value || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const todayIso = () => new Date().toISOString().slice(0, 10);
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' });
};
const getParticipantLink = (billId, participantId) => {
  const base = window.location.href.split('#')[0];
  return `${base}#/pay/${billId}/${participantId}`;
};
const isOverdue = (dueDate, paid) => !paid && dueDate && new Date(`${dueDate}T23:59:59`) < new Date();
const hashToRoute = () => window.location.hash.replace(/^#/, '') || '/';
const go = (path) => { window.location.hash = path; };

function injectStyles() {
  if (document.getElementById('bayar-styles')) return;
  const style = document.createElement('style');
  style.id = 'bayar-styles';
  style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    :root { --bg:#F8F9FB; --navy:#0F1F3D; --green:#00C896; --danger:#FF4D4F; --muted:#6B7280; --card:#fff; --shadow:0 2px 16px rgba(0,0,0,.07); --shadow2:0 14px 38px rgba(15,31,61,.13); }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--navy); font-family:Inter, system-ui, sans-serif; }
    button, input, textarea, select { font:inherit; }
    .bayar-app { min-height:100vh; background:radial-gradient(circle at 10% 0%, rgba(0,200,150,.12), transparent 34%), var(--bg); }
    .container { width:min(1120px, calc(100% - 32px)); margin:0 auto; }
    .nav { height:76px; display:flex; align-items:center; justify-content:space-between; gap:18px; }
    .logo { display:inline-flex; align-items:center; border:0; background:transparent; padding:0; cursor:pointer; }
    .logo-mark { display:inline-flex; align-items:center; }
    .logo-img { width:120px; height:auto; object-fit:contain; display:block; }
    .btn { border:0; border-radius:10px; padding:12px 16px; display:inline-flex; align-items:center; justify-content:center; gap:8px; cursor:pointer; transition:200ms ease; font-weight:800; text-decoration:none; white-space:nowrap; }
    .btn:hover { transform:translateY(-1px); }
    .btn-primary { background:var(--navy); color:#fff; box-shadow:0 10px 24px rgba(15,31,61,.18); }
    .btn-accent { background:var(--green); color:var(--navy); box-shadow:0 10px 24px rgba(0,200,150,.24); }
    .btn-ghost { background:#fff; color:var(--navy); box-shadow:var(--shadow); }
    .btn-danger { background:rgba(255,77,79,.1); color:var(--danger); }
    .btn-small { padding:9px 12px; font-size:13px; }
    .btn:disabled { opacity:.55; cursor:not-allowed; transform:none; }
    .card { background:var(--card); border-radius:16px; box-shadow:var(--shadow); transition:250ms ease; border:1px solid rgba(15,31,61,.04); }
    .card:hover { box-shadow:var(--shadow2); }
    .hero { display:grid; grid-template-columns:1.05fr .95fr; gap:42px; align-items:center; padding:64px 0 52px; }
    .eyebrow { color:var(--green); font-weight:900; letter-spacing:.08em; text-transform:uppercase; font-size:12px; }
    .hero h1 { margin:14px 0 14px; font-size:clamp(42px, 8vw, 82px); line-height:.94; letter-spacing:-.08em; }
    .hero p { color:var(--muted); font-size:18px; line-height:1.65; max-width:560px; }
    .hero-actions { display:flex; gap:12px; flex-wrap:wrap; margin-top:26px; }
    .use-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-top:36px; }
    .use-chip { padding:14px 10px; text-align:center; font-weight:800; color:var(--navy); }
    .mock-wrap { position:relative; min-height:470px; display:grid; place-items:center; }
    .orb { position:absolute; inset:26px; border-radius:42px; background:linear-gradient(135deg, rgba(0,200,150,.25), rgba(15,31,61,.09)); filter:blur(.2px); animation:float 5s ease-in-out infinite; }
    .mock-card { position:relative; width:min(390px, 100%); padding:22px; transform:rotate(-2deg); }
    .mock-row { display:flex; justify-content:space-between; gap:12px; padding:14px 0; border-bottom:1px solid #EEF1F5; }
    .progress { height:10px; border-radius:99px; background:#EEF2F6; overflow:hidden; }
    .progress > span { display:block; height:100%; width:0; background:linear-gradient(90deg,var(--green),#4FE3BA); border-radius:inherit; animation:grow 600ms ease forwards; }
    .auth-shell { min-height:calc(100vh - 76px); display:grid; place-items:center; padding:28px 0 60px; }
    .auth-card { width:min(460px, 100%); padding:28px; }
    .form { display:grid; gap:14px; }
    .field { display:grid; gap:7px; }
    .field label { font-size:13px; font-weight:800; color:var(--navy); }
    .input, .select, .textarea { width:100%; border:1px solid #E5E7EB; border-radius:10px; background:#fff; color:var(--navy); padding:13px 14px; outline:none; transition:200ms ease; }
    .textarea { min-height:105px; resize:vertical; }
    .input:focus, .select:focus, .textarea:focus { border-color:var(--navy); box-shadow:0 0 0 4px rgba(15,31,61,.08); }
    .error { padding:11px 12px; border-radius:10px; background:rgba(255,77,79,.1); color:var(--danger); font-weight:700; font-size:13px; }
    .dash { padding:26px 0 96px; }
    .dash-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:22px; }
    .dash-head h1 { margin:0; letter-spacing:-.05em; font-size:clamp(28px,5vw,46px); }
    .muted { color:var(--muted); }
    .summary { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin:18px 0 22px; }
    .summary-card { padding:18px; display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
    .summary-card strong { display:block; font-size:25px; letter-spacing:-.04em; margin-top:8px; }
    .icon-box { width:40px; height:40px; border-radius:13px; background:rgba(0,200,150,.12); color:var(--green); display:grid; place-items:center; }
    .bill-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
    .bill-card { padding:18px; }
    .bill-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    .cat { width:46px; height:46px; border-radius:15px; background:#F3F6FA; display:grid; place-items:center; font-size:24px; }
    .badge { border-radius:99px; padding:6px 10px; font-size:12px; font-weight:900; display:inline-flex; align-items:center; gap:6px; }
    .badge-paid { background:rgba(0,200,150,.12); color:#008C69; }
    .badge-pending { background:#FFF7E6; color:#B76B00; }
    .badge-overdue { background:rgba(255,77,79,.11); color:var(--danger); }
    .bill-actions { display:flex; gap:9px; flex-wrap:wrap; margin-top:16px; }
    .fab { position:fixed; right:22px; bottom:22px; z-index:10; width:62px; height:62px; border-radius:20px; padding:0; }
    .create-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .full { grid-column:1 / -1; }
    .participant { display:grid; grid-template-columns:1fr 1.1fr .75fr auto; gap:10px; align-items:end; padding:12px; border:1px solid #EEF1F5; border-radius:14px; }
    .detail-grid { display:grid; grid-template-columns:.82fr 1.18fr; gap:18px; align-items:start; }
    .ring-wrap { padding:24px; text-align:center; position:sticky; top:20px; }
    .ring { width:210px; height:210px; margin:0 auto 14px; }
    .ring circle.progress-ring { stroke:var(--green); stroke-linecap:round; transform:rotate(-90deg); transform-origin:50% 50%; transition:stroke-dashoffset 700ms ease; }
    .money-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px; }
    .mini-stat { background:#F8FAFC; border-radius:14px; padding:13px; }
    .table { display:grid; gap:10px; }
    .person-row { display:grid; grid-template-columns:1fr auto auto; gap:12px; align-items:center; padding:13px; background:#FBFCFE; border-radius:14px; }
    .person-actions { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
    .share-box { display:flex; gap:10px; align-items:center; padding:12px; background:#F8FAFC; border-radius:14px; overflow:hidden; }
    .share-url { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--muted); font-weight:700; }
    .pay-card { width:min(720px, 100%); padding:24px; margin:26px auto 80px; }
    .pay-shell { min-height:100vh; display:grid; place-items:start center; padding:34px 0 70px; }
    .pay-wrap { width:min(480px, 100%); display:grid; gap:16px; }
    .pay-logo { justify-content:center; margin-bottom:2px; }
    .pay-logo .logo-img { width:92px; }
    .public-pay-card { padding:22px; }
    .pay-title-row { display:flex; gap:14px; align-items:flex-start; }
    .pay-title-row h1 { margin:0 0 6px; font-size:30px; letter-spacing:-.055em; line-height:1; }
    .pay-divider { height:1px; background:#EEF1F5; margin:18px 0; }
    .pay-share-amount { color:var(--green); font-size:38px; font-weight:900; letter-spacing:-.06em; margin:5px 0; }
    .pay-banner { padding:12px 13px; border-radius:14px; font-weight:800; line-height:1.45; }
    .pay-warning { background:#FFF7E6; color:#9A5B00; }
    .pay-info { background:rgba(0,200,150,.12); color:#007D63; text-align:center; }
    .pay-error { background:rgba(255,77,79,.1); color:var(--danger); text-align:center; }
    .sheet-head { display:flex; justify-content:space-between; align-items:center; gap:12px; }
    .sheet-amount { text-align:center; color:var(--green); font-size:38px; font-weight:900; letter-spacing:-.06em; margin:8px 0 16px; }
    .method-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; }
    .method-card { border:1px solid #E5E7EB; background:#fff; border-radius:14px; padding:13px 8px; font-weight:900; color:var(--navy); cursor:pointer; transition:200ms ease; text-align:center; }
    .method-card.active { border-color:var(--green); background:rgba(0,200,150,.1); box-shadow:0 8px 20px rgba(0,200,150,.12); }
    .upload-zone { display:block; width:100%; box-sizing:border-box; border:1.5px dashed #CBD5E1; border-radius:16px; padding:18px; text-align:center; color:var(--muted); font-weight:800; cursor:pointer; background:#FBFCFE; transition:200ms ease; }
    .upload-input { display:none !important; }
    .upload-zone:hover { border-color:var(--green); background:rgba(0,200,150,.06); }
    .receipt-ok { color:#008C69; font-weight:900; margin-top:8px; }
    .success-card { width:min(480px, 100%); padding:28px; text-align:center; margin:0 auto; }
    .powered { display:grid; justify-items:center; gap:4px; margin-top:28px; font-size:13px; font-weight:800; color:var(--muted); }
    .powered .logo-img { width:76px; }
    .empty-card { width:min(480px, 100%); justify-self:center; text-align:center; padding:34px; }
    .empty-card:hover { transform:translateY(-2px); }
    .empty-illust { font-size:46px; margin-bottom:12px; }
    .empty-card .btn { animation:softPulse 900ms ease 1.2s 1; }
    .modal-backdrop { position:fixed; inset:0; background:rgba(15,31,61,.45); display:grid; place-items:center; padding:18px; z-index:30; }
    .modal { width:min(460px, 100%); padding:22px; }
    .toast-wrap { position:fixed; top:18px; right:18px; display:grid; gap:10px; z-index:50; }
    .toast { background:var(--navy); color:#fff; padding:13px 15px; border-radius:13px; box-shadow:var(--shadow2); animation:slideIn 200ms ease; font-weight:800; }
    .skeleton { overflow:hidden; position:relative; min-height:178px; }
    .skeleton:after { content:''; position:absolute; inset:0; transform:translateX(-100%); background:linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent); animation:shimmer 1.1s infinite; }
    .checkmark { width:92px; height:92px; display:block; margin:8px auto 16px; }
    .checkmark path { stroke-dasharray:90; stroke-dashoffset:90; animation:draw .8s ease forwards .1s; }
    @keyframes float { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-12px) rotate(2deg)} }
    @keyframes grow { to { width:var(--w); } }
    @keyframes shimmer { 100% { transform:translateX(100%); } }
    @keyframes slideIn { from { transform:translateY(-8px); opacity:0; } to { transform:none; opacity:1; } }
    @keyframes draw { to { stroke-dashoffset:0; } }
    @keyframes softPulse { 0%,100%{transform:scale(1)} 45%{transform:scale(1.045)} }
    @media (max-width: 880px) { .hero, .detail-grid, .create-grid { grid-template-columns:1fr; } .summary { grid-template-columns:repeat(2,1fr); } .bill-grid { grid-template-columns:1fr; } .mock-wrap { min-height:380px; } .participant { grid-template-columns:1fr; } .ring-wrap { position:static; } }
    @media (max-width: 560px) { .container { width:min(100% - 22px, 1120px); } .nav { height:68px; } .use-grid { grid-template-columns:repeat(2,1fr); } .summary { grid-template-columns:1fr; } .dash-head { flex-direction:column; } .person-row { grid-template-columns:1fr; } .person-actions { justify-content:flex-start; } .money-row { grid-template-columns:1fr; } .hero { padding-top:28px; } .auth-card, .pay-card { padding:18px; } .modal-backdrop { align-items:end; padding:0; } .modal { width:100%; border-radius:22px 22px 0 0; padding:22px 18px 24px; } .method-grid { grid-template-columns:1fr; } }
  `;
  document.head.appendChild(style);
}

function useHashRoute() {
  const [route, setRoute] = useState(hashToRoute());
  useEffect(() => {
    const onHash = () => setRoute(hashToRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const show = (message) => {
    const id = uid('toast');
    setToasts((items) => [...items, { id, message }]);
    setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3000);
  };
  return { toasts, show };
}

function Logo() {
  return <button className="logo" onClick={() => go('/')} aria-label="Bayar home"><span className="logo-mark"><img className="logo-img" src="/Bayar-logo.png" alt="Bayar logo" /></span></button>;
}

function Header({ session, onLogout }) {
  return (
    <div className="container nav">
      <Logo />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {session ? (
          <>
            <button className="btn btn-ghost btn-small" onClick={() => go('/dashboard')}>Dashboard</button>
            <button className="btn btn-danger btn-small" onClick={onLogout}><LogOut size={16} /> Logout</button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost btn-small" onClick={() => go('/login')}>Login</button>
            <button className="btn btn-primary btn-small" onClick={() => go('/signup')}>Get Started</button>
          </>
        )}
      </div>
    </div>
  );
}

function Landing() {
  return (
    <main className="container hero">
      <section>
        <div className="eyebrow">Premium split bill tracker</div>
        <h1>Split bills. Collect payments. No awkward chasing.</h1>
        <p>Bayar helps organizers track shared expenses, see who paid, nudge pending members, and record payments with a polished fintech flow.</p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => go('/signup')}>Get Started <ArrowRight size={18} /></button>
          <button className="btn btn-ghost" onClick={() => go('/login')}>Login</button>
        </div>
        <div className="use-grid">
          {Object.values(CATEGORIES).map((cat) => <div className="card use-chip" key={cat.label}><div style={{ fontSize: 26 }}>{cat.icon}</div>{cat.label}</div>)}
        </div>
      </section>
      <section className="mock-wrap">
        <div className="orb" />
        <div className="card mock-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div><b>Bali Trip 2025</b><div className="muted">4 of 6 paid</div></div>
            <span className="cat">✈️</span>
          </div>
          <div className="progress"><span style={{ '--w': '68%' }} /></div>
          {[['Aina', 'RM 180.00', true], ['Hakim', 'RM 180.00', true], ['Danial', 'RM 180.00', false]].map(([n, a, p]) => (
            <div className="mock-row" key={n}><span>{n}</span><b style={{ color: p ? '#008C69' : '#B76B00' }}>{a}</b></div>
          ))}
          <button className="btn btn-accent" style={{ width: '100%', marginTop: 18 }}>Share payment link</button>
        </div>
      </section>
    </main>
  );
}

function Auth({ mode, users, setUsers, setSession, seedDemo }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const isSignup = mode === 'signup';
  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const email = form.email.trim().toLowerCase();
    if (!email || !form.password || (isSignup && !form.name.trim())) return setError('Complete all fields first.');
    if (isSignup) {
      if (users.some((u) => u.email === email)) return setError('Email already registered.');
      const user = { id: uid('user'), name: form.name.trim(), email, password: form.password, createdAt: new Date().toISOString() };
      const next = [...users, user];
      await storage.set('users', next);
      setUsers(next);
      const session = { userId: user.id, name: user.name, email: user.email };
      await storage.set('session', session);
      setSession(session);
      await seedDemo(user);
      go('/dashboard');
      return;
    }
    const user = users.find((u) => u.email === email && u.password === form.password);
    if (!user) return setError('Invalid email or password.');
    const session = { userId: user.id, name: user.name, email: user.email };
    await storage.set('session', session);
    setSession(session);
    go('/dashboard');
  };
  return (
    <main className="container auth-shell">
      <section className="card auth-card">
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div className="logo" style={{ justifyContent: 'center' }}><span className="logo-mark"><img className="logo-img" src="/Bayar-logo.png" alt="Bayar logo" /></span></div>
          <h1 style={{ margin: '22px 0 6px', letterSpacing: '-.05em' }}>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
          <p className="muted" style={{ margin: 0 }}>{isSignup ? 'Start tracking shared payments today.' : 'Continue collecting without awkward chasing.'}</p>
        </div>
        <form className="form" onSubmit={submit}>
          {error && <div className="error">{error}</div>}
          {isSignup && <Field label="Name" value={form.name} onChange={(v) => update('name', v)} placeholder="Irfan Ariff" />}
          <Field label="Email" type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="you@email.com" />
          <Field label="Password" type="password" value={form.password} onChange={(v) => update('password', v)} placeholder="••••••••" />
          <button className="btn btn-primary" type="submit">{isSignup ? <UserPlus size={18} /> : <CreditCard size={18} />}{isSignup ? 'Sign Up' : 'Login'}</button>
          <button className="btn btn-ghost" type="button" onClick={() => go(isSignup ? '/login' : '/signup')}>{isSignup ? 'Already have an account? Login' : 'New here? Sign Up'}</button>
        </form>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, min, step }) {
  return <div className="field"><label>{label}</label><input className="input" type={type} min={min} step={step} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>;
}

function Dashboard({ session, bills, loading, showToast, onToggleDemo }) {
  const mine = bills.filter((b) => b.organizerId === session?.userId);
  const hasDemo = mine.some((b) => b.demo);
  const stats = useMemo(() => {
    const totalCollected = mine.reduce((sum, b) => sum + b.participants.filter((p) => p.paid).reduce((s, p) => s + Number(p.amount), 0), 0);
    const pending = mine.reduce((sum, b) => sum + b.participants.filter((p) => !p.paid).reduce((s, p) => s + Number(p.amount), 0), 0);
    const overdueBills = mine.filter((b) => b.participants.some((p) => isOverdue(b.dueDate, p.paid))).length;
    return { totalCollected, pending, overdueBills };
  }, [mine]);
  return (
    <main className="container dash">
      <div className="dash-head">
        <div><h1>Good morning, {session?.name} 👋</h1><p className="muted">Track every bill, payment, and pending member in one clean view.</p></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button className={hasDemo ? 'btn btn-danger' : 'btn btn-ghost'} onClick={onToggleDemo}>{hasDemo ? 'Remove demo data' : 'Add demo data'}</button><button className="btn btn-primary" onClick={() => go('/create')}><Plus size={18} /> New Bill</button></div>
      </div>
      <section className="summary">
        <Summary title="Total Bills Created" value={mine.length} icon={<Receipt size={20} />} />
        <Summary title="Total Collected" value={rm(stats.totalCollected)} icon={<Banknote size={20} />} />
        <Summary title="Pending Amount" value={rm(stats.pending)} icon={<Wallet size={20} />} />
        <Summary title="Overdue Bills" value={stats.overdueBills} icon={<Bell size={20} />} danger />
      </section>
      <section className="bill-grid">
        {loading ? [1, 2, 3, 4].map((n) => <div className="card bill-card skeleton" key={n} />) : mine.length ? mine.map((bill) => <BillCard key={bill.id} bill={bill} showToast={showToast} />) : <EmptyState />}
      </section>
      <button className="btn btn-primary fab" onClick={() => go('/create')} aria-label="New Bill"><Plus color="#00C896" size={28} /></button>
    </main>
  );
}

function Summary({ title, value, icon, danger }) {
  return <div className="card summary-card"><div><span className="muted" style={{ fontWeight: 800, fontSize: 13 }}>{title}</span><strong style={{ color: danger ? 'var(--danger)' : 'var(--navy)' }}>{value}</strong></div><div className="icon-box">{icon}</div></div>;
}

function BillCard({ bill, showToast }) {
  const collected = bill.participants.filter((p) => p.paid).reduce((s, p) => s + Number(p.amount), 0);
  const pct = Math.min(100, bill.totalAmount ? (collected / bill.totalAmount) * 100 : 0);
  const paidCount = bill.participants.filter((p) => p.paid).length;
  const cat = CATEGORIES[bill.category] || CATEGORIES.makan;
  const share = () => { navigator.clipboard?.writeText(`${location.origin}${location.pathname}#/pay/${bill.id}`); showToast('Payment link copied!'); };
  return (
    <article className="card bill-card">
      <div className="bill-top"><div><span className="cat">{cat.icon}</span><h3 style={{ margin: '12px 0 4px' }}>{bill.title}</h3><div className="muted"><Calendar size={14} style={{ verticalAlign: -2 }} /> Due {formatDate(bill.dueDate)}</div></div><span className="badge badge-paid">Paid {paidCount}/{bill.participants.length}</span></div>
      <div style={{ marginTop: 16 }}><div className="progress"><span style={{ '--w': `${pct}%` }} /></div><div className="muted" style={{ marginTop: 8, fontWeight: 700 }}>{rm(collected)} of {rm(bill.totalAmount)}</div></div>
      <div className="bill-actions"><button className="btn btn-primary btn-small" onClick={() => go(`/bill/${bill.id}`)}>View</button><button className="btn btn-ghost btn-small" onClick={share}><Send size={15} /> Share</button></div>
    </article>
  );
}

function EmptyState() {
  return <div className="card empty-card full"><div className="empty-illust">🧾✨</div><h2 style={{ margin: '0 0 8px', fontSize: 24, letterSpacing: '-.04em' }}>No bills yet</h2><p className="muted" style={{ margin: '0 auto 20px', fontSize: 16, lineHeight: 1.55 }}>Create your first bill and share the payment link with your group.</p><button className="btn btn-primary" onClick={() => go('/create')}><Plus size={18} /> Create your first bill</button></div>;
}

function CreateBill({ session, bills, setBills }) {
  const [error, setError] = useState('');
  const [split, setSplit] = useState('equal');
  const [form, setForm] = useState({ title: '', category: 'makan', description: '', totalAmount: '', dueDate: todayIso() });
  const [people, setPeople] = useState([{ id: uid('part'), name: '', email: '', amount: '' }, { id: uid('part'), name: '', email: '', amount: '' }]);
  const validPeople = people.filter((p) => p.name.trim() && p.email.trim());
  const totalAmountPreview = Number(form.totalAmount) || 0;
  const customPeopleTotal = people.filter((p) => p.name.trim() && p.email.trim()).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const organizerCustomShare = Math.max(0, totalAmountPreview - customPeopleTotal);
  const updatePerson = (id, key, value) => setPeople((items) => items.map((p) => p.id === id ? { ...p, [key]: value } : p));
  const addPerson = () => setPeople((items) => [...items, { id: uid('part'), name: '', email: '', amount: '' }]);
  const removePerson = (id) => setPeople((items) => items.length > 1 ? items.filter((p) => p.id !== id) : items);
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const totalAmount = Number(form.totalAmount);
    if (!form.title.trim() || !totalAmount || !form.dueDate || validPeople.length < 1) return setError('Complete bill title, amount, due date, and at least one participant.');
    let participants;
    if (split === 'equal') {
      const participantCount = validPeople.length + 1;
      const amount = Number((totalAmount / participantCount).toFixed(2));
      const organizerShare = amount;
      const enteredParticipants = validPeople.map((p, index) => ({ ...p, amount: index === validPeople.length - 1 ? Number((totalAmount - organizerShare - amount * (validPeople.length - 1)).toFixed(2)) : amount }));
      participants = [{ id: uid('part'), name: session.name, email: session.email, amount: organizerShare, isOrganizer: true }, ...enteredParticipants];
    } else {
      const enteredParticipants = validPeople.map((p) => ({ ...p, amount: Number(p.amount || 0) }));
      const customTotal = enteredParticipants.reduce((s, p) => s + Number(p.amount), 0);
      if (customTotal > totalAmount + 0.01) return setError('Participant amounts exceed the total bill. Please adjust.');
      const organizerShare = Number((totalAmount - customTotal).toFixed(2));
      participants = [{ id: uid('part'), name: session.name, email: session.email, amount: organizerShare, isOrganizer: true }, ...enteredParticipants];
    }
    const createdAt = new Date().toISOString();
    const bill = {
      id: uid('bill'), organizerId: session.userId, organizerName: session.name, title: form.title.trim(), category: form.category,
      description: form.description.trim(), totalAmount, dueDate: form.dueDate, createdAt,
      participants: participants.map((p) => ({ id: p.id, name: p.name.trim(), email: p.email.trim().toLowerCase(), amount: Number(p.amount), paid: !!p.isOrganizer, paidAt: p.isOrganizer ? createdAt : null, receipt: null, isOrganizer: !!p.isOrganizer })),
    };
    const next = [bill, ...bills];
    await storage.set('bills', next);
    setBills(next);
    go(`/bill/${bill.id}`);
  };
  return (
    <main className="container dash">
      <div className="dash-head"><div><h1>Create bill</h1><p className="muted">Set the total, add members, and generate a public payment link.</p></div></div>
      <form className="card auth-card" style={{ width: '100%', maxWidth: 900 }} onSubmit={submit}>
        <div className="form create-grid">
          {error && <div className="error full">{error}</div>}
          <Field label="Bill Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Bali Trip 2025" />
          <div className="field"><label>Category</label><select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{Object.entries(CATEGORIES).map(([key, cat]) => <option key={key} value={key}>{cat.icon} {cat.label}</option>)}</select></div>
          <div className="field full"><label>Description</label><textarea className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Flights, hotel, food, and shared transport." /></div>
          <Field label="Total Amount (RM)" type="number" min="0" step="0.01" value={form.totalAmount} onChange={(v) => setForm({ ...form, totalAmount: v })} placeholder="1200.00" />
          <div className="field"><Field label="Due Date" type="date" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />{form.dueDate && <span className="muted" style={{ fontSize: 13, fontWeight: 800 }}>Selected: {formatDate(form.dueDate)}</span>}</div>
          <div className="field full"><label>Split Method</label><select className="select" value={split} onChange={(e) => setSplit(e.target.value)}><option value="equal">Equal split</option><option value="custom">Custom per person</option></select></div>
          {split === 'custom' && <div className="card full" style={{ padding: 14, background: '#FBFCFE' }}><div className="muted" style={{ fontWeight: 900 }}>Your share (you)</div><strong style={{ color: customPeopleTotal > totalAmountPreview && totalAmountPreview ? 'var(--danger)' : 'var(--green)', fontSize: 24, letterSpacing: '-.04em' }}>{rm(organizerCustomShare)}</strong><p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>Auto-calculated from total minus participant custom amounts.</p></div>}
          <div className="full"><h3>Participants</h3><div className="form">{people.map((p) => <div className="participant" key={p.id}><Field label="Name" value={p.name} onChange={(v) => updatePerson(p.id, 'name', v)} placeholder="Aina" /><Field label="Email" type="email" value={p.email} onChange={(v) => updatePerson(p.id, 'email', v)} placeholder="aina@email.com" />{split === 'custom' ? <Field label="Amount" type="number" step="0.01" value={p.amount} onChange={(v) => updatePerson(p.id, 'amount', v)} placeholder="150.00" /> : <div className="muted" style={{ fontWeight: 800 }}>Auto split</div>}<button className="btn btn-danger btn-small" type="button" onClick={() => removePerson(p.id)}><X size={15} /></button></div>)}</div><button className="btn btn-ghost" style={{ marginTop: 12 }} type="button" onClick={addPerson}><Plus size={17} /> Add participant</button></div>
          <button className="btn btn-primary full" type="submit">Create Bill <ArrowRight size={18} /></button>
        </div>
      </form>
    </main>
  );
}

function BillDetail({ bill, showToast }) {
  const [copied, setCopied] = useState(false);
  const [copiedParticipantId, setCopiedParticipantId] = useState('');
  if (!bill) return <NotFound />;
  const collected = bill.participants.filter((p) => p.paid).reduce((s, p) => s + Number(p.amount), 0);
  const remaining = bill.totalAmount - collected;
  const pct = Math.min(100, bill.totalAmount ? (collected / bill.totalAmount) * 100 : 0);
  const radius = 82;
  const circ = 2 * Math.PI * radius;
  const billShareUrl = `${location.origin}${location.pathname}#/pay/${bill.id}`;
  const displayUrl = `bayar.app/pay/${bill.id}`;
  const copy = async () => { await navigator.clipboard?.writeText(billShareUrl); setCopied(true); showToast('Bill link copied to clipboard!'); setTimeout(() => setCopied(false), 1600); };
  const copyParticipant = async (person) => {
    await navigator.clipboard?.writeText(getParticipantLink(bill.id, person.id));
    setCopiedParticipantId(person.id);
    showToast(`${person.name}'s payment link copied!`);
    setTimeout(() => setCopiedParticipantId(''), 2000);
  };
  const wa = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Hey! You have a pending payment for ${bill.title}.\nOpen the bill here: ${billShareUrl} 💳`)}`, '_blank');
  };
  const nudgeViaWhatsApp = (person) => {
    const msg = `Hey ${person.name}! Your share of RM ${Number(person.amount).toFixed(2)} for ${bill.title} is due on ${formatDate(bill.dueDate)}. Pay here: ${getParticipantLink(bill.id, person.id)} 💳`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };
  return (
    <main className="container dash detail-grid">
      <section className="card ring-wrap">
        <div className="cat" style={{ margin: '0 auto 12px' }}>{CATEGORIES[bill.category]?.icon}</div>
        <h1 style={{ margin: '0 0 6px', letterSpacing: '-.05em' }}>{bill.title}</h1><p className="muted">Due {formatDate(bill.dueDate)}</p>
        <svg className="ring" viewBox="0 0 210 210"><circle cx="105" cy="105" r={radius} fill="none" stroke="#EEF2F6" strokeWidth="16" /><circle className="progress-ring" cx="105" cy="105" r={radius} fill="none" strokeWidth="16" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} /><text x="105" y="99" textAnchor="middle" fontSize="33" fontWeight="900" fill="#0F1F3D">{Math.round(pct)}%</text><text x="105" y="126" textAnchor="middle" fontSize="13" fontWeight="800" fill="#6B7280">collected</text></svg>
        <div className="progress"><span style={{ '--w': `${pct}%` }} /></div>
        <div className="money-row"><div className="mini-stat"><div className="muted">Collected</div><b>{rm(collected)}</b></div><div className="mini-stat"><div className="muted">Remaining</div><b>{rm(remaining)}</b></div></div>
      </section>
      <section className="form">
        <div className="card bill-card"><h2>Bill details</h2><p className="muted">{bill.description || 'No description added.'}</p><div className="table">{bill.participants.map((p) => <div className="person-row" key={p.id}><div><b>{p.name}{p.isOrganizer ? ' (you)' : ''}</b><div className="muted">{p.email} · {rm(p.amount)}</div></div><StatusBadge paid={p.paid} overdue={isOverdue(bill.dueDate, p.paid)} /><div className="person-actions">{!p.paid && <button className="btn btn-ghost btn-small" onClick={() => copyParticipant(p)} aria-label={`Copy ${p.name}'s payment link`}>{copiedParticipantId === p.id ? <Check size={15} color="var(--green)" /> : <Copy size={15} />}</button>}{!p.paid && <button className="btn btn-ghost btn-small" onClick={() => nudgeViaWhatsApp(p)}>Nudge 👋</button>}</div></div>)}</div></div>
        <div className="card bill-card"><h2>Bill-level link (fallback)</h2><p className="muted">Share this if you want participants to self-identify, or use the per-person copy buttons above.</p><div className="share-box"><span className="share-url">{displayUrl}</span><button className="btn btn-primary btn-small" onClick={copy}>{copied ? 'Copied! ✓' : <><Copy size={15} /> Copy</>}</button></div><p className="muted" style={{ fontSize: 13, margin: '8px 0 0' }}>For personalized links, use the copy icon next to each participant above.</p><button className="btn btn-accent" style={{ marginTop: 12 }} onClick={wa}>Share via WhatsApp</button></div>
      </section>
    </main>
  );
}

function StatusBadge({ paid, overdue }) {
  if (paid) return <span className="badge badge-paid">✅ Paid</span>;
  if (overdue) return <span className="badge badge-overdue">❌ Overdue</span>;
  return <span className="badge badge-pending">⏳ Pending</span>;
}

function PaymentPage({ bill, participantIdFromRoute, updateBill }) {
  const [participantId, setParticipantId] = useState(participantIdFromRoute || '');
  const [method, setMethod] = useState('FPX');
  const [receipt, setReceipt] = useState('');
  const [modal, setModal] = useState(false);
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    setParticipantId(participantIdFromRoute || '');
    setModal(false);
    setSuccess(false);
    setReceipt('');
  }, [participantIdFromRoute, bill?.id]);
  if (!bill) return <PaymentError />;
  const participant = bill.participants.find((p) => p.id === participantId);
  if (participantIdFromRoute && !participant) return <PaymentError />;
  const cat = CATEGORIES[bill.category] || CATEGORIES.makan;
  const overdue = participant ? isOverdue(bill.dueDate, participant.paid) : false;
  const confirm = async () => {
    const next = { ...bill, participants: bill.participants.map((p) => p.id === participantId ? { ...p, paid: true, paidAt: new Date().toISOString(), receipt: receipt || null, paymentMethod: method } : p) };
    await updateBill(next);
    setModal(false);
    setSuccess(true);
  };
  if (success) return <PaymentSuccess participant={participant} />;
  return (
    <main className="container pay-shell">
      <div className="pay-wrap">
        <div className="logo pay-logo"><span className="logo-mark"><img className="logo-img" src="/Bayar-logo.png" alt="Bayar logo" /></span></div>
        {overdue && <div className="pay-banner pay-warning">⚠️ This bill was due on {formatDate(bill.dueDate)}. You can still confirm payment.</div>}
        <section className="card public-pay-card">
          <div className="pay-title-row"><span className="cat">{cat.icon}</span><div><h1>{bill.title}</h1><p className="muted" style={{ margin: 0, fontWeight: 700 }}>Requested by {bill.organizerName || 'Organizer'}</p></div></div>
          <p className="muted" style={{ lineHeight: 1.6 }}>{bill.description || 'No description added.'}</p>
          <p className="muted" style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 800 }}><Calendar size={16} /> Due {formatDate(bill.dueDate)}</p>
          {!participantIdFromRoute && <div className="field" style={{ marginTop: 12 }}><label>Select your name</label><select className="select" value={participantId} onChange={(e) => setParticipantId(e.target.value)}><option value="">Choose participant</option>{bill.participants.map((p) => <option key={p.id} value={p.id}>{p.name} — {rm(p.amount)} {p.paid ? '(Paid)' : ''}</option>)}</select></div>}
          {participant && <><div className="pay-divider" /><div className="muted" style={{ fontWeight: 900 }}>Your share</div><div className="pay-share-amount">{rm(participant.amount)}</div><p className="muted" style={{ margin: 0 }}>This is your portion of {bill.title}</p></>}
        </section>
        {participant?.paid ? <div className="pay-banner pay-info">✅ You've already confirmed payment for this bill.</div> : <button className="btn btn-primary" style={{ width: '100%' }} disabled={!participant} onClick={() => setModal(true)}>Confirm My Payment <ArrowRight size={18} /></button>}
      </div>
      {modal && <PaymentModal participant={participant} method={method} setMethod={setMethod} receipt={receipt} setReceipt={setReceipt} onClose={() => setModal(false)} onConfirm={confirm} />}
    </main>
  );
}

function PaymentModal({ participant, method, setMethod, receipt, setReceipt, onClose, onConfirm }) {
  const methods = [{ value: 'FPX', label: '🏦 FPX' }, { value: 'Online Banking', label: '💳 Online Banking' }, { value: 'Manual Transfer', label: '📋 Manual Transfer' }];
  return (
    <div className="modal-backdrop">
      <section className="card modal">
        <div className="sheet-head"><h2 style={{ margin: 0, letterSpacing: '-.04em' }}>Complete Payment</h2><button className="btn btn-ghost btn-small" onClick={onClose} aria-label="Close payment modal"><X size={17} /></button></div>
        <div className="sheet-amount">{rm(participant?.amount)}</div>
        <div className="method-grid">{methods.map((item) => <button key={item.value} className={`method-card ${method === item.value ? 'active' : ''}`} onClick={() => setMethod(item.value)}>{item.label}</button>)}</div>
        <label className="upload-zone" style={{ marginTop: 14 }}><input className="upload-input" type="file" onChange={(e) => setReceipt(e.target.files?.[0]?.name || '')} /><div>📎</div><div>Tap to upload receipt (optional)</div>{receipt && <div className="receipt-ok">✓ {receipt}</div>}</label>
        <button className="btn btn-accent" style={{ width: '100%', marginTop: 14 }} onClick={onConfirm}>I've Paid ✓</button>
        <p className="muted" style={{ textAlign: 'center', fontSize: 13, marginBottom: 0 }}>Your payment will be recorded and the organizer will be notified.</p>
      </section>
    </div>
  );
}

function PaymentSuccess({ participant }) {
  return <main className="container pay-shell"><section className="card success-card"><svg className="checkmark" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="rgba(0,200,150,.12)" /><path d="M30 52 L44 66 L72 34" fill="none" stroke="#00C896" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" /></svg><h1 style={{ letterSpacing: '-.05em' }}>Payment Recorded! 🎉</h1><p className="muted" style={{ fontSize: 17, lineHeight: 1.55 }}>Thanks {participant?.name}! Your payment of {rm(participant?.amount)} has been recorded.</p><p className="muted">The organizer has been notified.</p><div className="powered"><img className="logo-img" src="/Bayar-logo.png" alt="Bayar logo" /><span>Powered by Bayar</span></div></section></main>;
}

function PaymentError() {
  return <main className="container pay-shell"><section className="card success-card"><div className="pay-banner pay-error">❌ This payment link is invalid or has expired.</div><div className="powered"><img className="logo-img" src="/Bayar-logo.png" alt="Bayar logo" /><span>Powered by Bayar</span></div></section></main>;
}

function NotFound() {
  return <main className="container auth-shell"><section className="card pay-card" style={{ textAlign: 'center' }}><h1>Not found</h1><p className="muted">This bill or page does not exist.</p><button className="btn btn-primary" onClick={() => go('/')}>Go home</button></section></main>;
}

function Toasts({ items }) {
  return <div className="toast-wrap">{items.map((t) => <div className="toast" key={t.id}>{t.message}</div>)}</div>;
}

export default function BayarApp() {
  const route = useHashRoute();
  const { toasts, show } = useToasts();
  const [users, setUsers] = useState([]);
  const [session, setSession] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    injectStyles();
    (async () => {
      const [storedUsers, storedSession, storedBills] = await Promise.all([storage.get('users', []), storage.get('session', null), storage.get('bills', [])]);
      const clearExistingBillsOnce = !localStorage.getItem('bayar_existing_bills_cleared_once');
      if (clearExistingBillsOnce) {
        await storage.set('bills', []);
        localStorage.setItem('bayar_existing_bills_cleared_once', 'true');
      }
      setUsers(storedUsers);
      setSession(storedSession);
      setBills(clearExistingBillsOnce ? [] : storedBills);
      setTimeout(() => setLoading(false), 520);
    })();
  }, []);

  const seedDemo = async (user) => {
    const existing = await storage.get('bills', []);
    if (existing.some((b) => b.organizerId === user.id && b.demo)) return;
    const demo = [
      demoBill(user, 'Bali Trip 2025', 'trip', 1280, 4, 6, 14),
      demoBill(user, 'Friday Makan Team', 'makan', 360, 3, 5, 3),
      demoBill(user, 'House Utilities May', 'house', 420, 1, 4, -2),
    ];
    const next = [...demo, ...existing];
    await storage.set('bills', next);
    setBills(next);
  };

  const toggleDemoData = async () => {
    if (!session) return;
    const hasDemo = bills.some((b) => b.organizerId === session.userId && b.demo);
    const user = { id: session.userId, name: session.name, email: session.email };
    const next = hasDemo
      ? bills.filter((b) => !(b.organizerId === session.userId && b.demo))
      : [demoBill(user, 'Bali Trip 2025', 'trip', 1280, 4, 6, 14), demoBill(user, 'Friday Makan Team', 'makan', 360, 3, 5, 3), demoBill(user, 'House Utilities May', 'house', 420, 1, 4, -2), ...bills];
    await storage.set('bills', next);
    setBills(next);
    show(hasDemo ? 'Demo data removed' : 'Demo data added');
  };

  const updateBill = async (nextBill) => {
    const next = bills.map((b) => b.id === nextBill.id ? nextBill : b);
    await storage.set('bills', next);
    setBills(next);
  };

  const logout = async () => {
    await storage.remove('session');
    setSession(null);
    go('/login');
  };

  const requireAuth = (view) => session ? view : <Auth mode="login" users={users} setUsers={setUsers} setSession={setSession} seedDemo={seedDemo} />;
  const billId = route.match(/^\/bill\/([^/]+)/)?.[1];
  const payMatch = route.match(/^\/pay\/([^/]+)(?:\/([^/]+))?/);
  const payId = payMatch?.[1];
  const payParticipantId = payMatch?.[2];
  const page = payId ? <PaymentPage bill={bills.find((b) => b.id === payId)} participantIdFromRoute={payParticipantId} updateBill={updateBill} />
    : billId ? requireAuth(<BillDetail bill={bills.find((b) => b.id === billId)} showToast={show} />)
    : route === '/login' ? <Auth mode="login" users={users} setUsers={setUsers} setSession={setSession} seedDemo={seedDemo} />
    : route === '/signup' ? <Auth mode="signup" users={users} setUsers={setUsers} setSession={setSession} seedDemo={seedDemo} />
    : route === '/dashboard' ? requireAuth(<Dashboard session={session} bills={bills} loading={loading} showToast={show} onToggleDemo={toggleDemoData} />)
    : route === '/create' ? requireAuth(<CreateBill session={session} bills={bills} setBills={setBills} />)
    : route === '/' ? <Landing /> : <NotFound />;

  return <div className="bayar-app">{!payId && <Header session={session} onLogout={logout} />}{page}<Toasts items={toasts} /></div>;
}

function demoBill(user, title, category, total, paidCount, peopleCount, dueOffset) {
  const due = new Date();
  due.setDate(due.getDate() + dueOffset);
  const names = ['Aina', 'Hakim', 'Danial', 'Maya', 'Idris', 'Adam'];
  const amount = Number((total / peopleCount).toFixed(2));
  return {
    id: uid('bill'), organizerId: user.id, organizerName: user.name, title, category, demo: true,
    description: `${CATEGORIES[category].label} expenses shared with the group.`, totalAmount: total,
    dueDate: due.toISOString().slice(0, 10), createdAt: new Date().toISOString(),
    participants: Array.from({ length: peopleCount }).map((_, index) => ({
      id: uid('part'), name: names[index], email: `${names[index].toLowerCase()}@email.com`, amount: index === peopleCount - 1 ? Number((total - amount * (peopleCount - 1)).toFixed(2)) : amount,
      paid: index < paidCount, paidAt: index < paidCount ? new Date().toISOString() : null, receipt: null,
    })),
  };
}
