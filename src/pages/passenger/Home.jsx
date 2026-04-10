import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const CITIES = ['Kampala','Mbale','Gulu','Mbarara','Jinja','Masaka','Lira','Arua','Fort Portal','Kabale','Entebbe','Tororo','Soroti','Iganga'];

// Hero slides — Ugandan landscapes & transport
const SLIDES = [
  { bg:'linear-gradient(135deg,#0B1628 0%,#1a3a5c 50%,#0B1628 100%)', headline:'Travel Uganda in Comfort', sub:'Book your seat in seconds', emoji:'🚌', accent:'#F5A623' },
  { bg:'linear-gradient(135deg,#004D3A 0%,#00885A 40%,#006644 100%)', headline:'Safe. Reliable. On Time.', sub:'Real-time seat selection & instant tickets', emoji:'🎫', accent:'#00C896' },
  { bg:'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)', headline:'Send Parcels Anywhere', sub:'Trackable door-to-door delivery', emoji:'📦', accent:'#F5A623' },
];

const POPULAR = [
  { from:'Kampala', to:'Mbale',   time:'4h 30m', from_price:25000, img:'🏔️' },
  { from:'Kampala', to:'Gulu',    time:'5h',      from_price:35000, img:'🌿' },
  { from:'Kampala', to:'Mbarara', time:'3h 30m',  from_price:22000, img:'🏞️' },
  { from:'Kampala', to:'Jinja',   time:'1h 30m',  from_price:12000, img:'🌊' },
  { from:'Kampala', to:'Lira',    time:'6h',       from_price:40000, img:'🌅' },
  { from:'Kampala', to:'Kabale',  time:'5h 30m',  from_price:30000, img:'⛰️' },
];

const WHY = [
  { icon:'🔒', title:'Secure Booking',   desc:'Encrypted payments via MTN & Airtel MoMo' },
  { icon:'📍', title:'Live Tracking',    desc:'Track your bus and parcels in real-time' },
  { icon:'🎫', title:'E-Ticket',         desc:'QR code ticket on your phone — no printing' },
  { icon:'⚡', title:'Instant Confirm',  desc:'Seat locked and confirmed in under 60 seconds' },
  { icon:'🔄', title:'Easy Reschedule',  desc:'Change or cancel with one tap' },
  { icon:'💰', title:'Best Fares',       desc:'Compare all operators for lowest price' },
];

const fmtTime   = d => { const dt=new Date(d); return dt.toLocaleTimeString('en-UG',{hour:'2-digit',minute:'2-digit'}); };
const fmtDate   = d => { const dt=new Date(d); return dt.toLocaleDateString('en-UG',{weekday:'short',day:'numeric',month:'short'}); };

export default function Home() {
  const nav = useNavigate();
  const [from,    setFrom]    = useState('Kampala');
  const [to,      setTo]      = useState('');
  const [date,    setDate]    = useState('');
  const [slide,   setSlide]   = useState(0);
  const [promos,  setPromos]  = useState([]);
  const [upcoming,setUpcoming]= useState([]);
  const [tracked, setTracked] = useState('');
  const [trackErr,setTrackErr]= useState('');
  const [searchQ, setSearchQ] = useState('');
  const [showFrom,setShowFrom]= useState(false);
  const [showTo,  setShowTo]  = useState(false);

  // Auto-advance hero
  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s+1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    api.get('/promotions?active=true').then(r => setPromos(r.data||[])).catch(()=>{});
    api.get('/trips/search?from=Kampala').then(r => setUpcoming((r.data||[]).slice(0,6))).catch(()=>{});
  }, []);

  const swap = () => { const t=from; setFrom(to); setTo(t); };

  const search = e => {
    e && e.preventDefault();
    if (!to) return;
    const p = new URLSearchParams({ from, to });
    if (date) p.set('date', date);
    nav(`/search?${p}`);
  };

  const trackTicket = async e => {
    e.preventDefault(); setTrackErr('');
    try { await api.get(`/bookings/track/${tracked}`); nav(`/track?code=${tracked}`); }
    catch { setTrackErr('Ticket not found. Check your code.'); }
  };

  const filteredCities = (q, exclude) => CITIES.filter(c => c !== exclude && (!q || c.toLowerCase().includes(q.toLowerCase())));

  const CityPicker = ({ value, onChange, placeholder, show, setShow, exclude, label }) => (
    <div style={{ position:'relative', flex:1 }}>
      <label style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.07em', display:'block', marginBottom:4 }}>{label}</label>
      <div onClick={() => { setShow(true); }} style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.12)', borderRadius:12, padding:'12px 14px', cursor:'pointer', border:`1.5px solid ${show?'var(--gold)':'rgba(255,255,255,0.2)'}`, transition:'all 0.2s' }}>
        <span style={{ fontSize:16 }}>📍</span>
        <span style={{ fontSize:15, fontWeight:600, color: value?'white':'rgba(255,255,255,0.45)', flex:1 }}>{value||placeholder}</span>
        {value && <span onClick={e=>{e.stopPropagation();onChange('');}} style={{ color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:18 }}>×</span>}
      </div>
      {show && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', borderRadius:12, boxShadow:'0 12px 40px rgba(0,0,0,0.25)', zIndex:200, overflow:'hidden', marginTop:4 }}>
          <input autoFocus value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder={`Search ${label.toLowerCase()}...`}
            style={{ width:'100%', padding:'12px 16px', border:'none', borderBottom:'1px solid #E5E8EE', fontSize:14, outline:'none', boxSizing:'border-box' }}/>
          <div style={{ maxHeight:220, overflowY:'auto' }}>
            {filteredCities(searchQ, exclude).map(c => (
              <div key={c} onClick={() => { onChange(c); setShow(false); setSearchQ(''); }}
                style={{ padding:'12px 16px', cursor:'pointer', fontSize:14, fontWeight:c===value?700:400, color:c===value?'var(--gold)':'#0B1628', background:c===value?'#FFF4E0':'white', transition:'background 0.1s' }}
                onMouseEnter={e=>e.target.style.background=c===value?'#FFF4E0':'#F7F8FA'}
                onMouseLeave={e=>e.target.style.background=c===value?'#FFF4E0':'white'}>
                📍 {c}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const s = SLIDES[slide];

  return (
    <div style={{ minHeight:'100vh', background:'var(--gray-50)' }}
         onClick={() => { setShowFrom(false); setShowTo(false); }}>

      {/* ── HERO ── */}
      <div style={{ background:s.bg, minHeight:'88vw', maxHeight:520, position:'relative', overflow:'hidden', transition:'background 1s ease' }}>
        {/* Animated circles */}
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(255,255,255,0.04)', top:-80, right:-60, animation:'pulse 4s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.04)', bottom:-40, left:-40, animation:'pulse 6s ease-in-out infinite reverse' }}/>
        <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.1);opacity:1}}`}</style>

        {/* Logo bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', position:'relative', zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ background:'var(--gold)', borderRadius:12, width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:900, fontSize:16, color:'var(--navy)' }}>RL</div>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:800, color:'white', letterSpacing:'-0.3px', lineHeight:1 }}>Raylane</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.55)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Express</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => nav('/track')} style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:20, padding:'7px 14px', color:'white', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)' }}>🎫 My Tickets</button>
            <button onClick={() => nav('/login')} style={{ background:'var(--gold)', border:'none', borderRadius:20, padding:'7px 14px', color:'var(--navy)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-body)' }}>Sign In</button>
          </div>
        </div>

        {/* Hero content */}
        <div style={{ padding:'8px 20px 28px', position:'relative', zIndex:10 }}>
          <div style={{ fontSize:40, marginBottom:8, transition:'opacity 0.5s' }}>{s.emoji}</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:900, color:'white', margin:'0 0 6px', letterSpacing:'-0.8px', lineHeight:1.1 }}>{s.headline}</h1>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.65)', margin:'0 0 20px' }}>{s.sub}</p>

          {/* Slide dots */}
          <div style={{ display:'flex', gap:6, marginBottom:20 }}>
            {SLIDES.map((_,i) => (
              <div key={i} onClick={() => setSlide(i)} style={{ width:i===slide?24:7, height:7, borderRadius:99, background:i===slide?s.accent:'rgba(255,255,255,0.3)', cursor:'pointer', transition:'all 0.3s' }}/>
            ))}
          </div>

          {/* Search card */}
          <div style={{ background:'rgba(11,22,40,0.7)', backdropFilter:'blur(20px)', borderRadius:20, padding:18, border:'1px solid rgba(255,255,255,0.12)' }}
               onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', gap:10, marginBottom:12, alignItems:'flex-end' }}>
              <CityPicker value={from} onChange={setFrom} placeholder='From' show={showFrom} setShow={v=>{setShowFrom(v);setShowTo(false);}} exclude={to} label='From'/>
              <button onClick={swap} style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:10, width:40, height:40, color:'var(--gold)', fontSize:18, cursor:'pointer', flexShrink:0, marginBottom:0 }}>⇄</button>
              <CityPicker value={to} onChange={setTo} placeholder='To' show={showTo} setShow={v=>{setShowTo(v);setShowFrom(false);}} exclude={from} label='To'/>
            </div>

            {/* Date picker */}
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.07em', display:'block', marginBottom:4 }}>Travel Date (optional)</label>
              <input type='date' value={date} onChange={e=>setDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                style={{ width:'100%', height:46, padding:'0 14px', background:'rgba(255,255,255,0.12)', border:'1.5px solid rgba(255,255,255,0.2)', borderRadius:12, color:date?'white':'rgba(255,255,255,0.45)', fontSize:14, outline:'none', fontFamily:'var(--font-body)', boxSizing:'border-box' }}/>
            </div>

            <button onClick={search} style={{ width:'100%', height:52, background: to?'var(--gold)':'rgba(255,255,255,0.2)', border:'none', borderRadius:14, color: to?'var(--navy)':'rgba(255,255,255,0.5)', fontWeight:800, fontSize:16, cursor:to?'pointer':'default', fontFamily:'var(--font-display)', letterSpacing:'-0.3px', transition:'all 0.2s' }}>
              {to ? `Search Trips to ${to} →` : 'Select destination to search'}
            </button>
          </div>
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, padding:'16px 16px 0' }}>
        {[
          ['🚌','Book Trip',    ()=>nav('/search')],
          ['📦','Send Parcel',  ()=>nav('/parcels')],
          ['🎫','My Tickets',   ()=>nav('/track')],
          ['📍','Track Parcel', ()=>nav('/parcels')],
        ].map(([icon,label,action])=>(
          <button key={label} onClick={action} style={{ background:'var(--white)', border:'1px solid var(--gray-200)', borderRadius:14, padding:'14px 8px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, boxShadow:'0 2px 8px rgba(11,22,40,0.06)' }}>
            <span style={{ fontSize:24 }}>{icon}</span>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--navy)' }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ── TRACK TICKET (quick) ── */}
      <div style={{ padding:'16px 16px 0' }}>
        <form onSubmit={trackTicket} style={{ background:'var(--white)', borderRadius:16, padding:16, border:'1px solid var(--gray-200)', display:'flex', gap:8 }}>
          <input value={tracked} onChange={e=>setTracked(e.target.value)} placeholder='Enter ticket code — e.g. RL-A1B2-C3D4'
            style={{ flex:1, height:44, padding:'0 14px', border:'1.5px solid var(--gray-200)', borderRadius:10, fontSize:13, fontFamily:'monospace', outline:'none', letterSpacing:1 }}/>
          <button type='submit' style={{ height:44, padding:'0 16px', background:'var(--navy)', border:'none', borderRadius:10, color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'var(--font-body)', whiteSpace:'nowrap' }}>Track 🔍</button>
        </form>
        {trackErr && <div style={{ fontSize:12, color:'var(--red)', marginTop:6, paddingLeft:4 }}>{trackErr}</div>}
      </div>

      {/* ── LIVE DEALS ── */}
      {promos.length > 0 && (
        <div style={{ padding:'20px 16px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'var(--navy)', letterSpacing:'-0.4px' }}>🔥 Live Deals</div>
          </div>
          <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:8 }}>
            {promos.map(p => (
              <div key={p.id} onClick={() => nav(`/search?from=${p.route_from||p.routeFrom}&to=${p.route_to||p.routeTo}`)}
                style={{ minWidth:180, background:'linear-gradient(135deg,var(--navy),#1a3a5c)', borderRadius:16, padding:16, cursor:'pointer', flexShrink:0, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:'rgba(245,166,35,0.15)' }}/>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--gold)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>
                  {p.discount_type==='PERCENTAGE'?`${p.discount_value}% OFF`:`UGX ${Number(p.discount_value).toLocaleString()} OFF`}
                </div>
                <div style={{ fontWeight:800, color:'white', fontSize:15, lineHeight:1.2 }}>{p.route_from||p.routeFrom}</div>
                <div style={{ color:'var(--gold)', fontWeight:700 }}>→ {p.route_to||p.routeTo}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:6 }}>{p.promo_name||p.promoName}</div>
                {p.conditions && <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{p.conditions}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── UPCOMING TRIPS ── */}
      {upcoming.length > 0 && (
        <div style={{ padding:'20px 16px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'var(--navy)', letterSpacing:'-0.4px' }}>Trips Today</div>
            <button onClick={() => nav('/search?from=Kampala')} style={{ fontSize:13, color:'var(--gold)', fontWeight:700, background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-body)' }}>See all →</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {upcoming.map(t => {
              const price = t.effective_price||t.price;
              const orig  = t.promo_original_price;
              return (
                <div key={t.id} onClick={() => nav(`/book/${t.id}`)}
                  style={{ background:'var(--white)', borderRadius:16, padding:16, border:'1px solid var(--gray-200)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 2px 8px rgba(11,22,40,0.05)', transition:'transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(11,22,40,0.1)';}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 2px 8px rgba(11,22,40,0.05)';}}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:800, color:'var(--navy)' }}>{t.from_city} → {t.to_city}</span>
                      {t.promo_name && <span style={{ background:'var(--gold)', color:'var(--navy)', fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:99 }}>🏷️ {t.promo_name}</span>}
                      {t.is_raylane_fleet && <span style={{ background:'#E8EDF5', color:'var(--navy)', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99 }}>⭐ Raylane</span>}
                    </div>
                    <div style={{ fontSize:12, color:'var(--gray-400)', display:'flex', gap:12 }}>
                      <span>🕐 {t.departure_time ? fmtTime(t.departure_time) : ''}</span>
                      <span>📅 {t.departure_time ? fmtDate(t.departure_time) : ''}</span>
                      <span>⏱ {t.duration}</span>
                      <span style={{ color:(t.total_seats-t.booked_seats)<10?'var(--red)':'var(--green)' }}>
                        {t.total_seats-t.booked_seats} seats
                      </span>
                    </div>
                    {(t.amenities||[]).length > 0 && (
                      <div style={{ display:'flex', gap:6, marginTop:5, flexWrap:'wrap' }}>
                        {(t.amenities||[]).map(a => <span key={a} style={{ fontSize:10, background:'var(--gray-50)', color:'var(--gray-400)', padding:'2px 8px', borderRadius:99, border:'1px solid var(--gray-200)' }}>{a==='WiFi'?'📶':a==='AC'?'❄️':'🔌'} {a}</span>)}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign:'right', marginLeft:12, flexShrink:0 }}>
                    {orig && <div style={{ fontSize:11, color:'var(--gray-300)', textDecoration:'line-through' }}>UGX {Number(orig/1000).toFixed(0)}K</div>}
                    <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:900, color:t.promo_name?'var(--gold)':'var(--navy)', letterSpacing:'-0.5px' }}>{(price/1000).toFixed(0)}K</div>
                    <div style={{ fontSize:9, color:'var(--gray-400)' }}>UGX</div>
                    <div style={{ marginTop:8, background:'var(--navy)', color:'white', borderRadius:10, padding:'7px 14px', fontSize:12, fontWeight:700 }}>Book →</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── POPULAR ROUTES ── */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'var(--navy)', marginBottom:12, letterSpacing:'-0.4px' }}>Popular Routes</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {POPULAR.map(r => (
            <div key={r.to} onClick={() => nav(`/search?from=${r.from}&to=${r.to}`)}
              style={{ background:'var(--white)', borderRadius:16, padding:16, border:'1px solid var(--gray-200)', cursor:'pointer', position:'relative', overflow:'hidden' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>{r.img}</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:800, color:'var(--navy)', marginBottom:2 }}>{r.from} → {r.to}</div>
              <div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:8 }}>⏱ {r.time}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:9, color:'var(--gray-400)' }}>from</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:800, color:'var(--gold)' }}>{(r.from_price/1000).toFixed(0)}K</div>
                </div>
                <div style={{ background:'var(--navy)', color:'white', borderRadius:8, padding:'5px 10px', fontSize:11, fontWeight:700 }}>Search →</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── WHY RAYLANE ── */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'var(--navy)', marginBottom:12, letterSpacing:'-0.4px' }}>Why Raylane?</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {WHY.map(w => (
            <div key={w.title} style={{ background:'var(--white)', borderRadius:14, padding:14, border:'1px solid var(--gray-200)' }}>
              <div style={{ fontSize:24, marginBottom:6 }}>{w.icon}</div>
              <div style={{ fontWeight:700, fontSize:13, color:'var(--navy)', marginBottom:3 }}>{w.title}</div>
              <div style={{ fontSize:11, color:'var(--gray-400)', lineHeight:1.5 }}>{w.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PARCEL CTA ── */}
      <div style={{ margin:'20px 16px 0' }}>
        <div onClick={() => nav('/parcels')} style={{ background:'linear-gradient(135deg,var(--navy),#1a3a5c)', borderRadius:20, padding:20, cursor:'pointer', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', right:-20, top:-20, width:120, height:120, borderRadius:'50%', background:'rgba(245,166,35,0.12)' }}/>
          <div style={{ position:'absolute', right:20, bottom:-30, width:80, height:80, borderRadius:'50%', background:'rgba(0,200,150,0.1)' }}/>
          <div style={{ fontSize:36, marginBottom:8 }}>📦</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color:'white', marginBottom:4, letterSpacing:'-0.4px' }}>Send a Parcel Today</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', marginBottom:14 }}>Fast, tracked delivery to any city in Uganda</div>
          <div style={{ display:'flex', gap:12 }}>
            {[['📩','Envelope','5K'],['📦','Small','12K'],['🗃️','Large','20K'],['🏋️','Heavy','30K']].map(([i,l,p])=>(
              <div key={l} style={{ background:'rgba(255,255,255,0.1)', borderRadius:10, padding:'8px 10px', textAlign:'center', flex:1 }}>
                <div style={{ fontSize:18 }}>{i}</div>
                <div style={{ fontSize:10, color:'white', fontWeight:700 }}>{l}</div>
                <div style={{ fontSize:10, color:'var(--gold)', fontWeight:800 }}>UGX {p}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:14, background:'var(--gold)', color:'var(--navy)', borderRadius:12, padding:'11px 20px', fontWeight:800, fontSize:14, display:'inline-block' }}>Send Parcel →</div>
        </div>
      </div>

      {/* ── EMERGENCY & SUPPORT ── */}
      <div style={{ margin:'16px 16px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <a href='tel:+256700000000' style={{ textDecoration:'none' }}>
          <div style={{ background:'#FEE2E2', borderRadius:14, padding:14, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:24 }}>📞</span>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:'var(--red)' }}>Emergency</div>
              <div style={{ fontSize:11, color:'#9B1C1C' }}>0700 000 000</div>
            </div>
          </div>
        </a>
        <a href='https://wa.me/256700000000' target='_blank' rel='noreferrer' style={{ textDecoration:'none' }}>
          <div style={{ background:'#E0FFF6', borderRadius:14, padding:14, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:24 }}>💬</span>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:'#00885A' }}>WhatsApp</div>
              <div style={{ fontSize:11, color:'#004D3A' }}>Chat Support</div>
            </div>
          </div>
        </a>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ padding:'24px 16px 100px', textAlign:'center' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:800, color:'var(--navy)', marginBottom:4 }}>🚌 Raylane Express</div>
        <div style={{ fontSize:11, color:'var(--gray-400)' }}>Connecting Uganda, one journey at a time</div>
        <div style={{ fontSize:10, color:'var(--gray-300)', marginTop:8 }}>© 2026 Raylane Express Limited. All rights reserved.</div>
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'var(--white)', borderTop:'1px solid var(--gray-200)', display:'flex', padding:'8px 0 20px', zIndex:100, boxShadow:'0 -4px 20px rgba(11,22,40,0.08)' }}>
        {[['🏠','Home','/'],['🔍','Search','/search'],['📦','Parcels','/parcels'],['🎫','Tickets','/track']].map(([icon,label,path])=>(
          <div key={path} onClick={() => nav(path)}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, cursor:'pointer' }}>
            <div style={{ fontSize:22 }}>{icon}</div>
            <div style={{ fontSize:10, fontWeight:600, color:window.location.pathname===path?'var(--gold)':'var(--gray-400)' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
