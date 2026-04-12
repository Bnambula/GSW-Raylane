import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Btn, Empty } from '../../components/UI';

const CITIES = ['Kampala','Mbale','Gulu','Mbarara','Jinja','Masaka','Lira','Arua','Fort Portal','Kabale','Entebbe','Tororo'];

const STATUS_META = {
  PENDING_APPROVAL: { label:'Awaiting Approval', color:'#C47D00', bg:'var(--gold-light)', icon:'⏳' },
  APPROVED:         { label:'Live',               color:'#00885A', bg:'var(--green-light)', icon:'✅' },
  REJECTED:         { label:'Rejected',           color:'var(--red)', bg:'#FEE2E2', icon:'❌' },
  DISABLED:         { label:'Disabled by Admin',  color:'var(--gray-600)', bg:'var(--gray-100)', icon:'🔕' },
  EXPIRED:          { label:'Expired',            color:'var(--gray-400)', bg:'var(--gray-100)', icon:'⌛' },
};

export default function OperatorPromos({ operatorId, trips = [] }) {
  const [promos, setPromos]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [msg, setMsg]             = useState({ text:'', type:'' });
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
  const nextWeek  = new Date(); nextWeek.setDate(nextWeek.getDate()+7);

  const [form, setForm] = useState({
    routeFrom:'Kampala', routeTo:'', tripId:'',
    discountType:'PERCENTAGE', discountValue:10,
    startDate: new Date().toISOString().split('T')[0],
    endDate:   nextWeek.toISOString().split('T')[0],
    conditions:'', maxUses:'',
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/promotions'); setPromos(data); }
    catch { setPromos([]); }
    finally { setLoading(false); }
  };

  const notify = (text, type='success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text:'', type:'' }), 3500);
  };

  const submit = async e => {
    e.preventDefault();
    try {
      await api.post('/promotions', {
        ...form,
        discountValue: Number(form.discountValue),
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        tripId: form.tripId || undefined,
      });
      notify('Promotion submitted! Awaiting Raylane Admin approval.');
      setShowForm(false);
      setForm(f => ({ ...f, routeTo:'', conditions:'', discountValue:10 }));
      load();
    } catch(e) { notify(e.response?.data?.error || 'Submission failed', 'error'); }
  };

  const previewDiscount = (price=25000) => {
    const val = Number(form.discountValue);
    if (form.discountType === 'PERCENTAGE') return price - Math.round(price * val/100);
    return Math.max(0, price - val);
  };

  const pendingCount   = promos.filter(p => p.status === 'PENDING_APPROVAL').length;
  const approvedCount  = promos.filter(p => p.status === 'APPROVED').length;

  return (
    <div>
      {/* Toast */}
      {msg.text && (
        <div style={{ position:'fixed', top:16, left:'50%', transform:'translateX(-50%)', zIndex:999, background: msg.type==='error'?'#FEE2E2':'var(--green-light)', color: msg.type==='error'?'var(--red)':'#00885A', padding:'12px 20px', borderRadius:'var(--radius-md)', boxShadow:'var(--shadow-lg)', fontWeight:600, fontSize:13, maxWidth:340, width:'90vw', textAlign:'center' }}>
          {msg.type === 'error' ? '⚠️ ' : '✓ '}{msg.text}
        </div>
      )}

      {/* Header row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:'var(--navy)', letterSpacing:'-0.3px' }}>My Promotions</div>
          <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{approvedCount} live · {pendingCount} pending approval</div>
        </div>
        <Btn size='sm' onClick={() => setShowForm(s=>!s)}>
          {showForm ? '✕ Cancel' : '+ New Promo'}
        </Btn>
      </div>

      {/* ── CREATION FORM ── */}
      {showForm && (
        <div style={{ background:'var(--white)', borderRadius:'var(--radius-lg)', border:'2px solid var(--gold)', boxShadow:'0 4px 20px rgba(245,166,35,0.15)', marginBottom:20, overflow:'hidden' }}>
          {/* Form header */}
          <div style={{ background:'linear-gradient(90deg, var(--navy) 0%, #162238 100%)', padding:'16px 20px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:22 }}>🏷️</div>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'white', fontSize:16 }}>Create Promotion Request</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>Sent to Raylane Admin for approval · Admin assigns the promo name</div>
            </div>
          </div>

          <form onSubmit={submit} style={{ padding:20 }}>
            {/* Route */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              {[['routeFrom','From City'],['routeTo','To City']].map(([k,l])=>(
                <div key={k}>
                  <label style={labelStyle}>{l}</label>
                  <select value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={selectStyle} required={k==='routeTo'}>
                    {k==='routeTo' && <option value=''>Select city</option>}
                    {CITIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Specific trip (optional) */}
            {trips.filter(t=>t.status==='LIVE').length > 0 && (
              <div style={{ marginBottom:14 }}>
                <label style={labelStyle}>Link to Specific Trip <span style={{ color:'var(--gray-400)', fontWeight:400, textTransform:'none' }}>(optional)</span></label>
                <select value={form.tripId} onChange={e=>setForm(f=>({...f,tripId:e.target.value}))} style={selectStyle}>
                  <option value=''>Apply to all matching trips</option>
                  {trips.filter(t=>t.status==='LIVE').map(t=>(
                    <option key={t.id} value={t.id}>
                      {t.from_city||t.from} → {t.to_city||t.to} · {new Date(t.departure_time||t.departureTime).toLocaleDateString('en-UG',{day:'numeric',month:'short'})}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Discount type + value */}
            <div style={{ marginBottom:14 }}>
              <label style={labelStyle}>Discount Type</label>
              <div style={{ display:'flex', gap:8 }}>
                {[['PERCENTAGE','% Percentage'],['FIXED','UGX Fixed Amount']].map(([val,label])=>(
                  <div key={val} onClick={()=>setForm(f=>({...f,discountType:val}))}
                    style={{ flex:1, padding:'12px', border:`2px solid ${form.discountType===val?'var(--gold)':'var(--gray-200)'}`, borderRadius:'var(--radius-md)', cursor:'pointer', background:form.discountType===val?'var(--gold-light)':'transparent', textAlign:'center', transition:'all 0.15s' }}>
                    <div style={{ fontWeight:700, fontSize:14, color:form.discountType===val?'var(--navy)':'var(--gray-600)' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={labelStyle}>
                Discount Value {form.discountType==='PERCENTAGE' ? '(%)' : '(UGX)'}
                {form.discountType==='PERCENTAGE' && <span style={{ color:'var(--gray-400)', fontWeight:400, marginLeft:4 }}>max 50%</span>}
              </label>
              <input type='number' value={form.discountValue} onChange={e=>setForm(f=>({...f,discountValue:e.target.value}))}
                min={1} max={form.discountType==='PERCENTAGE'?50:undefined} required style={inputStyle} />
            </div>

            {/* Preview */}
            <div style={{ background:'var(--navy)', borderRadius:'var(--radius-md)', padding:'14px 16px', marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Discount Preview (on UGX 25,000 fare)</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', textDecoration:'line-through' }}>UGX 25,000</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, color:'var(--gold)' }}>
                    UGX {previewDiscount(25000).toLocaleString()}
                  </div>
                </div>
                <div style={{ background:'var(--gold)', color:'var(--navy)', fontWeight:800, fontSize:16, padding:'8px 14px', borderRadius:10 }}>
                  {form.discountType==='PERCENTAGE' ? `${form.discountValue}% OFF` : `UGX ${Number(form.discountValue).toLocaleString()} OFF`}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              {[['startDate','Start Date'],['endDate','End Date']].map(([k,l])=>(
                <div key={k}>
                  <label style={labelStyle}>{l}</label>
                  <input type='date' value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} required style={inputStyle} />
                </div>
              ))}
            </div>

            {/* Conditions + max uses */}
            <div style={{ marginBottom:14 }}>
              <label style={labelStyle}>Conditions <span style={{ color:'var(--gray-400)', fontWeight:400, textTransform:'none' }}>(optional)</span></label>
              <input value={form.conditions} onChange={e=>setForm(f=>({...f,conditions:e.target.value}))} placeholder='e.g. Last 10 seats only, Book 2+ days in advance' style={inputStyle} />
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={labelStyle}>Max Uses <span style={{ color:'var(--gray-400)', fontWeight:400, textTransform:'none' }}>(optional — leave blank for unlimited)</span></label>
              <input type='number' value={form.maxUses} onChange={e=>setForm(f=>({...f,maxUses:e.target.value}))} min={1} placeholder='e.g. 50' style={inputStyle} />
            </div>

            {/* Info box */}
            <div style={{ background:'#E8EDF5', borderRadius:'var(--radius-md)', padding:'12px 14px', marginBottom:16, display:'flex', gap:10 }}>
              <div style={{ fontSize:18, flexShrink:0 }}>ℹ️</div>
              <div style={{ fontSize:12, color:'var(--navy)', lineHeight:1.55 }}>
                Your promotion will be reviewed by <strong>Raylane Admin</strong>. Once approved, they will assign an official promo name (e.g. "Weekend Saver") and it will appear live on trip cards and the home screen.
              </div>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <Btn type='submit' style={{ flex:2 }}>🏷️ Submit for Approval</Btn>
              <Btn variant='ghost' type='button' onClick={()=>setShowForm(false)} style={{ flex:1 }}>Cancel</Btn>
            </div>
          </form>
        </div>
      )}

      {/* ── PROMO LIST ── */}
      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>Loading promotions…</div>
      ) : promos.length === 0 ? (
        <Empty icon='🏷️' text="No promotions yet. Create your first one — it'll go live once Raylane approves it." />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {promos.map(p => {
            const meta = STATUS_META[p.status] || STATUS_META.EXPIRED;
            const route = p.route_from && p.route_to ? `${p.route_from} → ${p.route_to}` : 'All routes';
            const discLabel = p.discount_type === 'PERCENTAGE' ? `${p.discount_value}% OFF` : `UGX ${Number(p.discount_value).toLocaleString()} OFF`;
            const end = new Date(p.end_date);
            const daysLeft = Math.ceil((end - new Date()) / (1000*60*60*24));
            const isLive   = p.status === 'APPROVED' && daysLeft >= 0;
            return (
              <div key={p.id}
                style={{ background:'var(--white)', borderRadius:'var(--radius-lg)', overflow:'hidden', border: isLive ? '1.5px solid var(--gold)' : '1px solid var(--gray-200)', boxShadow: isLive ? '0 4px 16px rgba(245,166,35,0.12)' : 'var(--shadow-sm)' }}>

                {/* Status banner */}
                <div style={{ background:meta.bg, padding:'8px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ fontSize:14 }}>{meta.icon}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:meta.color }}>{meta.label}</span>
                  </div>
                  {isLive && daysLeft <= 3 && (
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--red)' }}>🔥 {daysLeft}d left!</span>
                  )}
                  {p.status === 'APPROVED' && daysLeft > 3 && (
                    <span style={{ fontSize:11, color:meta.color }}>Ends {end.toLocaleDateString('en-UG',{day:'numeric',month:'short'})}</span>
                  )}
                </div>

                <div style={{ padding:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div>
                      {p.promo_name ? (
                        <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'var(--navy)', letterSpacing:'-0.3px' }}>
                          🏷️ {p.promo_name}
                        </div>
                      ) : (
                        <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:'var(--gray-600)', fontStyle:'italic' }}>
                          Pending name assignment
                        </div>
                      )}
                      <div style={{ fontSize:13, color:'var(--gray-400)', marginTop:3 }}>{route}</div>
                    </div>
                    <div style={{ background: isLive?'var(--gold)':'var(--gray-100)', color: isLive?'var(--navy)':'var(--gray-600)', fontFamily:'var(--font-display)', fontWeight:800, fontSize:16, padding:'6px 12px', borderRadius:10 }}>
                      {discLabel}
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                    {[
                      ['Type',    p.discount_type?.replace('_',' ')],
                      ['Period',  `${new Date(p.start_date).toLocaleDateString('en-UG',{day:'numeric',month:'short'})} – ${end.toLocaleDateString('en-UG',{day:'numeric',month:'short'})}`],
                      ...(p.uses_count !== undefined ? [['Uses', `${p.uses_count}${p.max_uses?'/'+p.max_uses:''}`]] : []),
                    ].map(([k,v]) => (
                      <div key={k} style={{ background:'var(--gray-50)', borderRadius:8, padding:'6px 10px' }}>
                        <div style={{ fontSize:9, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{k}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--navy)', marginTop:1 }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {p.conditions && (
                    <div style={{ marginTop:10, fontSize:12, color:'var(--gray-600)', background:'var(--gray-50)', borderRadius:8, padding:'6px 10px' }}>
                      📋 {p.conditions}
                    </div>
                  )}

                  {p.status === 'REJECTED' && p.rejection_note && (
                    <div style={{ marginTop:10, background:'#FEE2E2', borderRadius:'var(--radius-sm)', padding:'8px 12px', fontSize:12, color:'var(--red)' }}>
                      <strong>Rejection note:</strong> {p.rejection_note}
                    </div>
                  )}

                  {p.status === 'PENDING_APPROVAL' && (
                    <div style={{ marginTop:10, background:'var(--gold-light)', borderRadius:'var(--radius-sm)', padding:'8px 12px', fontSize:12, color:'#C47D00', display:'flex', gap:6, alignItems:'center' }}>
                      <span>⏳</span>
                      <span>Under review by Raylane Admin. Once approved, they'll assign an official promo name and it goes live instantly.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelStyle = { fontSize:11, fontWeight:700, color:'var(--gray-600)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 };
const inputStyle  = { width:'100%', height:44, padding:'0 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius-md)', fontSize:14, fontFamily:'var(--font-body)', outline:'none', background:'var(--gray-50)', color:'var(--navy)' };
const selectStyle = { ...inputStyle };
