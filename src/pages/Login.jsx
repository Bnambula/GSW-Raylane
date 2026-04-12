import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Btn } from '../components/UI';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const { login, loading } = useAuth();
  const nav = useNavigate();

  const submit = async e => {
    e.preventDefault(); setErr('');
    try {
      const u = await login(email, password);
      nav(u.role === 'admin' ? '/admin' : u.role === 'operator' ? '/operator' : '/');
    } catch(e) { setErr(e.response?.data?.error || 'Login failed'); }
  };

  const inp = { width:'100%', height:50, padding:'0 16px', border:'2px solid var(--gray-200)', borderRadius:'var(--r-md)', fontSize:15, outline:'none', fontFamily:'var(--font-body)', background:'var(--white)', transition:'border-color 0.2s' };

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,var(--gsw-blue-dark) 0%,var(--gsw-blue) 60%,var(--gsw-blue-mid) 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:72, height:72, background:'var(--gold)', borderRadius:20, marginBottom:14, boxShadow:'0 8px 24px rgba(255,199,44,0.4)' }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:900, color:'var(--gsw-blue-dark)' }}>RL</span>
          </div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:900, color:'white', letterSpacing:'-0.5px' }}>Raylane Express</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginTop:4 }}>Uganda's Premier Transport Platform</div>
        </div>

        {/* Card */}
        <div style={{ background:'white', borderRadius:24, padding:32, boxShadow:'0 24px 60px rgba(16,32,72,0.4)' }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, color:'var(--gsw-blue)', marginBottom:24, textAlign:'center' }}>Sign In</h2>

          {/* Demo credentials */}
          <div style={{ background:'var(--gold-light)', border:'1.5px solid var(--gold)', borderRadius:12, padding:12, marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--gsw-blue)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Demo Credentials</div>
            {[['Admin','admin@raylane.ug','admin123'],['Operator','gaaga@buses.ug','operator123']].map(([r,e,p])=>(
              <div key={r} style={{ fontSize:12, color:'var(--gsw-blue-dark)', marginBottom:3, cursor:'pointer' }}
                onClick={()=>{setEmail(e);setPassword(p);}}>
                <strong>{r}:</strong> {e} / {p}
              </div>
            ))}
            <div style={{ fontSize:10, color:'var(--gray-400)', marginTop:4 }}>Click to auto-fill</div>
          </div>

          <form onSubmit={submit}>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--gray-600)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="admin@raylane.ug" required style={inp} onFocus={e=>e.target.style.borderColor='var(--gold)'} onBlur={e=>e.target.style.borderColor='var(--gray-200)'}/>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--gray-600)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Password</label>
              <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="••••••••" required style={inp} onFocus={e=>e.target.style.borderColor='var(--gold)'} onBlur={e=>e.target.style.borderColor='var(--gray-200)'}/>
            </div>
            {err && <div style={{ background:'#FEE2E2', color:'var(--red)', padding:'10px 14px', borderRadius:'var(--r-md)', marginBottom:14, fontSize:13, textAlign:'center' }}>{err}</div>}
            <Btn type="submit" full disabled={loading} style={{ height:52, fontSize:16, background:'var(--gsw-blue)', color:'white', borderRadius:'var(--r-md)' }}>
              {loading ? '⏳ Signing in…' : 'Sign In →'}
            </Btn>
          </form>

          <div style={{ textAlign:'center', marginTop:20 }}>
            <button onClick={()=>nav('/')} style={{ background:'none', border:'none', color:'var(--gray-400)', fontSize:13, cursor:'pointer', fontFamily:'var(--font-body)' }}>
              🚌 Continue as Passenger →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
