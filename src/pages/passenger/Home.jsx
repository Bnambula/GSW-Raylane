import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const CITIES = ['Kampala','Mbale','Gulu','Mbarara','Jinja','Masaka','Lira','Arua','Fort Portal','Kabale','Entebbe','Tororo','Soroti','Iganga'];

// Real Unsplash travel images for Uganda / East Africa
const SLIDES = [
  {
    img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80',
    headline: 'Travel Uganda in Comfort',
    sub: 'Book your seat in 60 seconds — secure, fast, reliable',
    color: '#102048',
  },
  {
    img: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80',
    headline: 'Explore Every Destination',
    sub: 'Kampala to Gulu, Mbale, Kabale and beyond',
    color: '#003322',
  },
  {
    img: 'https://images.unsplash.com/photo-1569959220744-ff553533f492?w=800&q=80',
    headline: 'Send Parcels Anywhere',
    sub: 'Fast tracked delivery across Uganda — same day options',
    color: '#102048',
  },
  {
    img: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=80',
    headline: 'Safe. On Time. Every Time.',
    sub: 'Real-time tracking · e-tickets · seat lock guarantee',
    color: '#1a0540',
  },
];

const ROUTES = [
  { from:'Kampala', to:'Mbale',   time:'4h 30m', price:25000, img:'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&q=70' },
  { from:'Kampala', to:'Gulu',    time:'5h',      price:35000, img:'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400&q=70' },
  { from:'Kampala', to:'Mbarara', time:'3h 30m',  price:22000, img:'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=70' },
  { from:'Kampala', to:'Jinja',   time:'1h 30m',  price:12000, img:'https://images.unsplash.com/photo-1569959220744-ff553533f492?w=400&q=70' },
  { from:'Kampala', to:'Lira',    time:'6h',       price:40000, img:'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=400&q=70' },
  { from:'Kampala', to:'Kabale',  time:'5h 30m',  price:30000, img:'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=70' },
];

const fmtTime = d => new Date(d).toLocaleTimeString('en-UG',{hour:'2-digit',minute:'2-digit'});
const fmtDate = d => new Date(d).toLocaleDateString('en-UG',{weekday:'short',day:'numeric',month:'short'});

export default function Home() {
  const nav = useNavigate();
  const [from,    setFrom]    = useState('Kampala');
  const [to,      setTo]      = useState('');
  const [date,    setDate]    = useState('');
  const [slide,   setSlide]   = useState(0);
  const [promos,  setPromos]  = useState([]);
  const [trips,   setTrips]   = useState([]);
  const [tracked, setTracked] = useState('');
  const [trackErr,setTrackErr]= useState('');
  const [cityQ,   setCityQ]   = useState('');
  const [showFrom,setShowFrom]= useState(false);
  const [showTo,  setShowTo]  = useState(false);

  // Auto advance slides
  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s+1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    api.get('/promotions?active=true').then(r => setPromos(r.data||[])).catch(()=>{});
    api.get('/trips/search?from=Kampala').then(r => setTrips((r.data||[]).slice(0,6))).catch(()=>{});
  }, []);

  const swap = () => { const t=from; setFrom(to||''); setTo(t); };

  const search = e => {
    e && e.preventDefault();
    if (!to) return;
    const p = new URLSearchParams({ from, to });
    if (date) p.set('date', date);
    nav(`/search?${p}`);
  };

  const trackTicket = async e => {
    e.preventDefault(); setTrackErr('');
    try {
      await api.get(`/bookings/track/${tracked}`);
      nav(`/track?code=${tracked}`);
    } catch { setTrackErr('Ticket not found. Check your code.'); }
  };

  const cities = q => CITIES.filter(c => !q || c.toLowerCase().includes(q.toLowerCase()));

  const CityDrop = ({ value, onChange, placeholder, show, onShow, exclude, label }) => (
    <div style={{position:'relative',flex:1}} onClick={e=>e.stopPropagation()}>
      <label style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.65)',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:4}}>{label}</label>
      <div onClick={()=>{onShow(true);setCityQ('');}} style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.14)',borderRadius:12,padding:'11px 14px',cursor:'pointer',border:`1.5px solid ${show?'var(--gold)':'rgba(255,255,255,0.2)'}`,transition:'all 0.2s'}}>
        <span style={{fontSize:15}}>📍</span>
        <span style={{fontSize:15,fontWeight:600,color:value?'white':'rgba(255,255,255,0.45)',flex:1}}>{value||placeholder}</span>
        {value&&<span onClick={e=>{e.stopPropagation();onChange('');}} style={{color:'rgba(255,255,255,0.4)',fontSize:18,cursor:'pointer',lineHeight:1}}>×</span>}
      </div>
      {show&&(
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'white',borderRadius:12,boxShadow:'0 16px 48px rgba(0,0,0,0.25)',zIndex:300,overflow:'hidden'}}>
          <input autoFocus value={cityQ} onChange={e=>setCityQ(e.target.value)} placeholder={`Search ${label}…`}
            style={{width:'100%',padding:'12px 16px',border:'none',borderBottom:'1px solid #E5E8EE',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
          <div style={{maxHeight:200,overflowY:'auto'}}>
            {cities(cityQ).filter(c=>c!==exclude).map(c=>(
              <div key={c} onClick={()=>{onChange(c);onShow(false);setCityQ('');}}
                style={{padding:'11px 16px',cursor:'pointer',fontSize:14,fontWeight:c===value?700:400,color:c===value?'var(--gold-dark)':'#1A2035',background:c===value?'var(--gold-light)':'white',transition:'background 0.1s'}}
                onMouseEnter={e=>e.target.style.background=c===value?'var(--gold-light)':'#F7F8FA'}
                onMouseLeave={e=>e.target.style.background=c===value?'var(--gold-light)':'white'}>
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
    <div style={{minHeight:'100vh',background:'var(--gray-50)'}} onClick={()=>{setShowFrom(false);setShowTo(false);}}>

      {/* ── HERO ── */}
      <div style={{position:'relative',height:560,overflow:'hidden'}}>
        {/* Background images with crossfade */}
        {SLIDES.map((sl,i)=>(
          <div key={i} style={{position:'absolute',inset:0,transition:'opacity 1.2s ease',opacity:i===slide?1:0,zIndex:1}}>
            <img src={sl.img} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} onLoad={()=>}/>
            <div style={{position:'absolute',inset:0,background:`linear-gradient(to bottom, ${sl.color}dd 0%, ${sl.color}88 40%, ${sl.color}ee 100%)`}}/>
          </div>
        ))}

        {/* Content */}
        <div style={{position:'relative',zIndex:10,height:'100%',display:'flex',flexDirection:'column',padding:'0 20px'}}>
          {/* Top bar */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:16,paddingBottom:8}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{background:'var(--gold)',borderRadius:12,width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontWeight:900,fontSize:16,color:'var(--navy-dark)',boxShadow:'0 4px 16px rgba(255,199,44,0.5)'}}>RL</div>
              <div>
                <div style={{fontFamily:'var(--font-display)',fontSize:17,fontWeight:900,color:'white',letterSpacing:'-0.3px',lineHeight:1}}>Raylane Express</div>
                <div style={{fontSize:9,color:'rgba(255,255,255,0.5)',letterSpacing:'0.1em',textTransform:'uppercase'}}>Uganda Transport</div>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>nav('/track')} style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:20,padding:'8px 14px',color:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-body)'}}>🎫 Tickets</button>
              <button onClick={()=>nav('/login')} style={{background:'var(--gold)',border:'none',borderRadius:20,padding:'8px 16px',color:'var(--navy-dark)',fontSize:12,fontWeight:800,cursor:'pointer',fontFamily:'var(--font-body)'}}>Sign In</button>
            </div>
          </div>

          {/* Headline */}
          <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',paddingBottom:0}}>
            <div style={{marginBottom:6}}>
              {SLIDES.map((_,i)=>(
                <button key={i} onClick={()=>setSlide(i)} style={{width:i===slide?24:7,height:7,borderRadius:99,background:i===slide?'var(--gold)':'rgba(255,255,255,0.3)',border:'none',cursor:'pointer',marginRight:4,transition:'all 0.3s',padding:0}}/>
              ))}
            </div>
            <h1 style={{fontFamily:'var(--font-display)',fontSize:30,fontWeight:900,color:'white',margin:'0 0 6px',letterSpacing:'-0.8px',lineHeight:1.1,textShadow:'0 2px 12px rgba(0,0,0,0.3)'}}>{s.headline}</h1>
            <p style={{fontSize:14,color:'rgba(255,255,255,0.75)',margin:'0 0 20px',textShadow:'0 1px 6px rgba(0,0,0,0.3)'}}>{s.sub}</p>

            {/* Search card */}
            <div style={{background:'rgba(16,32,72,0.75)',backdropFilter:'blur(20px)',borderRadius:20,padding:18,border:'1px solid rgba(255,255,255,0.15)'}} onClick={e=>e.stopPropagation()}>
              <div style={{display:'flex',gap:10,marginBottom:12,alignItems:'flex-end'}}>
                <CityDrop value={from} onChange={setFrom} placeholder='From' show={showFrom} onShow={v=>{setShowFrom(v);setShowTo(false);}} exclude={to} label='From'/>
                <button onClick={swap} style={{background:'rgba(255,199,44,0.2)',border:'1.5px solid var(--gold)',borderRadius:10,width:42,height:42,color:'var(--gold)',fontSize:18,cursor:'pointer',flexShrink:0,marginBottom:0}}>⇄</button>
                <CityDrop value={to} onChange={setTo} placeholder='To' show={showTo} onShow={v=>{setShowTo(v);setShowFrom(false);}} exclude={from} label='To'/>
              </div>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.65)',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:4}}>Travel Date (optional)</label>
                <input type='date' value={date} onChange={e=>setDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                  style={{width:'100%',height:46,padding:'0 14px',background:'rgba(255,255,255,0.12)',border:'1.5px solid rgba(255,255,255,0.2)',borderRadius:12,color:date?'white':'rgba(255,255,255,0.4)',fontSize:14,outline:'none',fontFamily:'var(--font-body)',boxSizing:'border-box'}}/>
              </div>
              <button onClick={search} disabled={!to} style={{width:'100%',height:52,background:to?'var(--gold)':'rgba(255,255,255,0.15)',border:'none',borderRadius:14,color:to?'var(--navy-dark)':'rgba(255,255,255,0.4)',fontWeight:800,fontSize:16,cursor:to?'pointer':'default',fontFamily:'var(--font-display)',letterSpacing:'-0.3px',transition:'all 0.2s'}}>
                {to?`Search ${from} → ${to} →`:'Select destination to search'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,padding:'14px 16px 0'}}>
        {[['🚌','Book Trip',()=>nav('/search')],['📦','Parcels',()=>nav('/parcels')],['🎫','My Tickets',()=>nav('/track')],['🔍','Track',()=>nav('/parcels')]].map(([icon,label,action])=>(
          <button key={label} onClick={action} style={{background:'var(--white)',border:'1px solid var(--gray-200)',borderRadius:14,padding:'14px 8px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:5,boxShadow:'var(--shadow-sm)',fontFamily:'var(--font-body)'}}>
            <span style={{fontSize:24}}>{icon}</span>
            <span style={{fontSize:11,fontWeight:700,color:'var(--navy)'}}>{label}</span>
          </button>
        ))}
      </div>

      {/* ── QUICK TRACK ── */}
      <div style={{padding:'14px 16px 0'}}>
        <form onSubmit={trackTicket} style={{background:'var(--white)',borderRadius:14,padding:'12px 14px',border:'1px solid var(--gray-200)',display:'flex',gap:8}}>
          <input value={tracked} onChange={e=>setTracked(e.target.value)} placeholder='Enter ticket code  e.g. RL-A1B2-C3D4'
            style={{flex:1,height:44,padding:'0 12px',border:'1.5px solid var(--gray-200)',borderRadius:10,fontSize:13,fontFamily:'monospace',outline:'none',letterSpacing:1}}/>
          <button type='submit' style={{height:44,padding:'0 16px',background:'var(--navy)',border:'none',borderRadius:10,color:'white',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'var(--font-body)',whiteSpace:'nowrap'}}>Track 🔍</button>
        </form>
        {trackErr&&<div style={{fontSize:12,color:'var(--red)',marginTop:5,paddingLeft:4}}>{trackErr}</div>}
      </div>

      {/* ── LIVE DEALS ── */}
      {promos.length>0&&(
        <div style={{padding:'18px 16px 0'}}>
          <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:800,color:'var(--navy)',marginBottom:10,letterSpacing:'-0.3px'}}>🔥 Live Deals</div>
          <div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:6}}>
            {promos.map(p=>(
              <div key={p.id} onClick={()=>nav(`/search?from=${p.route_from||p.routeFrom}&to=${p.route_to||p.routeTo}`)}
                style={{minWidth:180,background:'linear-gradient(135deg,var(--navy-dark),var(--navy))',borderRadius:16,padding:16,cursor:'pointer',flexShrink:0,position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:'rgba(255,199,44,0.15)'}}/>
                <div style={{fontSize:11,fontWeight:700,color:'var(--gold)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:4}}>
                  {(p.discount_type||p.discountType)==='PERCENTAGE'?`${p.discount_value||p.discountValue}% OFF`:`UGX ${Number(p.discount_value||p.discountValue).toLocaleString()} OFF`}
                </div>
                <div style={{fontWeight:800,color:'white',fontSize:15}}>{p.route_from||p.routeFrom}</div>
                <div style={{color:'var(--gold)',fontWeight:700}}>→ {p.route_to||p.routeTo}</div>
                {(p.promo_name||p.promoName)&&<div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginTop:6}}>{p.promo_name||p.promoName}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TRIPS TODAY ── */}
      <div style={{padding:'18px 16px 0'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:800,color:'var(--navy)',letterSpacing:'-0.3px'}}>Departing Soon</div>
          <button onClick={()=>nav('/search?from=Kampala')} style={{fontSize:13,color:'var(--gold-dark)',fontWeight:700,background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-body)'}}>See all →</button>
        </div>
        {trips.length===0&&(
          <div style={{background:'var(--white)',borderRadius:14,padding:20,textAlign:'center',border:'1px solid var(--gray-200)',color:'var(--gray-400)',fontSize:14}}>
            No upcoming trips loaded. <button onClick={()=>nav('/search')} style={{color:'var(--gold-dark)',background:'none',border:'none',cursor:'pointer',fontWeight:700,fontFamily:'var(--font-body)'}}>Search trips →</button>
          </div>
        )}
        {trips.map(t=>{
          const price = t.effective_price||t.price;
          const orig  = t.promo_original_price||t.original_price;
          const from  = t.from_city||t.from;
          const to    = t.to_city||t.to;
          const dep   = t.departure_time||t.departureTime;
          const avail = t.available_seats!==undefined ? t.available_seats : (t.total_seats||0)-(t.booked_seats||0);
          return(
            <div key={t.id} onClick={()=>nav(`/book/${t.id}`)}
              style={{background:'var(--white)',borderRadius:16,padding:16,border:'1px solid var(--gray-200)',marginBottom:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'var(--shadow-sm)',transition:'transform 0.15s,box-shadow 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='var(--shadow-md)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='var(--shadow-sm)';}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                  <span style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:800,color:'var(--navy)'}}>{from} → {to}</span>
                  {t.promo_name&&<span style={{background:'var(--gold)',color:'var(--navy-dark)',fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:99}}>🏷️ {t.promo_name}</span>}
                  {t.is_raylane_fleet&&<span style={{background:'#EAF0FF',color:'var(--navy)',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:99}}>⭐ Raylane</span>}
                </div>
                <div style={{fontSize:12,color:'var(--gray-400)',display:'flex',gap:10,flexWrap:'wrap'}}>
                  {dep&&<span>🕐 {fmtTime(dep)}</span>}
                  {dep&&<span>📅 {fmtDate(dep)}</span>}
                  <span>⏱ {t.duration}</span>
                  <span style={{color:avail<10?'var(--red)':'var(--green)',fontWeight:600}}>{avail} seats left</span>
                </div>
                {(t.amenities||[]).length>0&&(
                  <div style={{display:'flex',gap:5,marginTop:6,flexWrap:'wrap'}}>
                    {(t.amenities||[]).map(a=><span key={a} style={{fontSize:10,background:'var(--gray-50)',color:'var(--gray-400)',padding:'2px 8px',borderRadius:99,border:'1px solid var(--gray-200)'}}>{a==='WiFi'?'📶':a==='AC'?'❄️':'🔌'} {a}</span>)}
                  </div>
                )}
              </div>
              <div style={{textAlign:'right',marginLeft:12,flexShrink:0}}>
                {orig&&orig>price&&<div style={{fontSize:11,color:'var(--gray-300)',textDecoration:'line-through'}}>UGX {Number(orig/1000).toFixed(0)}K</div>}
                <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:900,color:t.promo_name?'var(--gold-dark)':'var(--navy)',letterSpacing:'-0.5px'}}>{(price/1000).toFixed(0)}K</div>
                <div style={{fontSize:9,color:'var(--gray-400)'}}>UGX</div>
                <div style={{marginTop:8,background:'var(--navy)',color:'white',borderRadius:10,padding:'7px 14px',fontSize:12,fontWeight:700}}>Book →</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── POPULAR ROUTES with real images ── */}
      <div style={{padding:'18px 16px 0'}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:800,color:'var(--navy)',marginBottom:10,letterSpacing:'-0.3px'}}>Popular Routes</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {ROUTES.map(r=>(
            <div key={r.to} onClick={()=>nav(`/search?from=${r.from}&to=${r.to}`)}
              style={{borderRadius:16,overflow:'hidden',cursor:'pointer',position:'relative',height:140,border:'1px solid var(--gray-200)'}}>
              <img src={r.img} alt={r.to} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
              <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(16,32,72,0.88) 0%,rgba(16,32,72,0.2) 60%)'}}/>
              <div style={{position:'absolute',bottom:10,left:12,right:10}}>
                <div style={{fontFamily:'var(--font-display)',fontSize:14,fontWeight:800,color:'white',marginBottom:2}}>{r.from} → {r.to}</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:10,color:'rgba(255,255,255,0.65)'}}>⏱ {r.time}</span>
                  <span style={{background:'var(--gold)',color:'var(--navy-dark)',borderRadius:8,padding:'3px 8px',fontSize:11,fontWeight:800}}>{(r.price/1000).toFixed(0)}K</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PARCEL CTA ── */}
      <div style={{margin:'18px 16px 0'}}>
        <div onClick={()=>nav('/parcels')} style={{background:'linear-gradient(135deg,var(--navy-dark),var(--navy))',borderRadius:20,padding:20,cursor:'pointer',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',right:-20,top:-20,width:120,height:120,borderRadius:'50%',background:'rgba(255,199,44,0.12)'}}/>
          <div style={{fontSize:36,marginBottom:8}}>📦</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:800,color:'white',marginBottom:4,letterSpacing:'-0.4px'}}>Send a Parcel Today</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.6)',marginBottom:14}}>Fast tracked delivery to any city in Uganda</div>
          <div style={{display:'flex',gap:8,marginBottom:14}}>
            {[['✉️','Envelope','5K'],['📦','Small','12K'],['🗃️','Large','20K'],['🏋️','Heavy','30K']].map(([i,l,p])=>(
              <div key={l} style={{background:'rgba(255,255,255,0.1)',borderRadius:10,padding:'8px 10px',textAlign:'center',flex:1}}>
                <div style={{fontSize:16}}>{i}</div>
                <div style={{fontSize:10,color:'white',fontWeight:700}}>{l}</div>
                <div style={{fontSize:10,color:'var(--gold)',fontWeight:800}}>UGX {p}</div>
              </div>
            ))}
          </div>
          <div style={{background:'var(--gold)',color:'var(--navy-dark)',borderRadius:12,padding:'11px 20px',fontWeight:800,fontSize:14,display:'inline-block'}}>Send Parcel →</div>
        </div>
      </div>

      {/* ── WHY RAYLANE ── */}
      <div style={{padding:'18px 16px 0'}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:800,color:'var(--navy)',marginBottom:10,letterSpacing:'-0.3px'}}>Why Raylane?</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[['🔒','Secure Booking','Encrypted payments via MTN & Airtel MoMo'],['📍','Live Tracking','Track your bus and parcels in real-time'],['🎫','E-Ticket','QR code on your phone — no printing needed'],['⚡','60-Second Confirm','Seat locked and confirmed instantly'],['🔄','Easy Change','Reschedule or cancel with one tap'],['💰','Best Price','Compare all operators, always lowest fare']].map(([icon,title,desc])=>(
            <div key={title} style={{background:'var(--white)',borderRadius:14,padding:14,border:'1px solid var(--gray-200)'}}>
              <div style={{fontSize:22,marginBottom:6}}>{icon}</div>
              <div style={{fontWeight:700,fontSize:13,color:'var(--navy)',marginBottom:3}}>{title}</div>
              <div style={{fontSize:11,color:'var(--gray-400)',lineHeight:1.5}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SUPPORT ── */}
      <div style={{margin:'16px 16px 0',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <a href='tel:+256700000000'>
          <div style={{background:'var(--red-light)',borderRadius:14,padding:14,display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:24}}>📞</span><div><div style={{fontWeight:700,fontSize:13,color:'var(--red)'}}>Emergency</div><div style={{fontSize:11,color:'#9B1C1C'}}>0700 000 000</div></div>
          </div>
        </a>
        <a href='https://wa.me/256700000000' target='_blank' rel='noreferrer'>
          <div style={{background:'var(--green-light)',borderRadius:14,padding:14,display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:24}}>💬</span><div><div style={{fontWeight:700,fontSize:13,color:'#00885A'}}>WhatsApp</div><div style={{fontSize:11,color:'#004D3A'}}>Chat Support 24/7</div></div>
          </div>
        </a>
      </div>

      {/* ── FOOTER ── */}
      <div style={{padding:'20px 16px 100px',textAlign:'center'}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:800,color:'var(--navy)',marginBottom:4}}>🚌 Raylane Express</div>
        <div style={{fontSize:11,color:'var(--gray-400)'}}>Connecting Uganda, one journey at a time</div>
        <div style={{fontSize:10,color:'var(--gray-300)',marginTop:6}}>© 2026 Raylane Express Limited</div>
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'var(--white)',borderTop:'1px solid var(--gray-200)',display:'flex',padding:'8px 0 20px',zIndex:100,boxShadow:'0 -4px 20px rgba(29,66,138,0.08)'}}>
        {[['🏠','Home','/'],['🔍','Search','/search'],['📦','Parcels','/parcels'],['🎫','Tickets','/track']].map(([icon,label,path])=>(
          <div key={path} onClick={()=>nav(path)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,cursor:'pointer'}}>
            <div style={{fontSize:22}}>{icon}</div>
            <div style={{fontSize:10,fontWeight:600,color:window.location.pathname===path?'var(--gold-dark)':'var(--gray-400)'}}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
