import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Btn } from '../../components/UI';

const CITIES = ['Kampala','Mbale','Gulu','Mbarara','Jinja','Masaka','Lira','Arua','Fort Portal','Kabale','Entebbe','Tororo','Soroti','Iganga'];
const TYPES  = [
  { key:'ENVELOPE', label:'Envelope',      price:5000,  icon:'✉️',  desc:'Letters, documents' },
  { key:'SMALL',    label:'Small Package', price:12000, icon:'📦',  desc:'Shoes, books, small items' },
  { key:'LARGE',    label:'Large Package', price:20000, icon:'🗃️',  desc:'Electronics, clothes' },
  { key:'HEAVY',    label:'Heavy Cargo',   price:30000, icon:'🏋️', desc:'Machinery, bulk goods' },
];
const STATUS_FLOW = ['BOOKED','PICKUP_REQUESTED','PICKED_UP','VERIFIED','LOADED','IN_TRANSIT','ARRIVED','DELIVERED'];
const STEPS = ['Parcel Details','Payment','Confirmation'];

const inp = { width:'100%', height:46, padding:'0 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius-md)', fontSize:14, fontFamily:'var(--font-body)', outline:'none', background:'var(--gray-50)', color:'var(--gray-800)' };
const lbl = { fontSize:11, fontWeight:700, color:'var(--gray-600)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 };

export default function Parcels() {
  const nav = useNavigate();
  const [tab,       setTab]       = useState('send');
  const [step,      setStep]      = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [err,       setErr]       = useState('');
  const [result,    setResult]    = useState(null);
  const [trackCode, setTrackCode] = useState('');
  const [tracked,   setTracked]   = useState(null);
  const [payMethod, setPayMethod] = useState('MTN_MOMO');

  const [form, setForm] = useState({
    senderName:'', senderPhone:'',
    recipientName:'', recipientPhone:'',
    destination:'Mbale', description:'',
    parcelType:'SMALL', weight:'',
    declaredValue:'', insure:false,
    pickupRider:false, requireId:false, receiverIdNumber:'',
  });
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const selectedType = TYPES.find(t=>t.key===form.parcelType) || TYPES[1];
  const parcelFee    = selectedType.price;
  const riderFee     = form.pickupRider ? 5000 : 0;
  const declared     = parseFloat(form.declaredValue)||0;
  const insuranceFee = (form.insure && declared>0) ? Math.round(declared*0.03) : 0;
  const total        = parcelFee + riderFee + insuranceFee;

  const goToPayment = e => {
    e.preventDefault(); setErr('');
    if (!form.senderPhone||!form.recipientPhone||!form.destination||!form.description)
      return setErr('Sender phone, recipient phone, destination and description are required');
    if (form.insure && declared<=0)
      return setErr('Please enter a declared value to add insurance');
    setStep(1);
  };

  const submitBooking = async () => {
    setLoading(true); setErr('');
    try {
      const { data } = await api.post('/parcels', { ...form, weight:parseFloat(form.weight)||0, declaredValue:declared, insure:form.insure, pickupRider:form.pickupRider, requireId:form.requireId });
      setResult(data);
      setStep(2);
    } catch(e) { setErr(e.response?.data?.error||'Booking failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const trackParcel = async e => {
    e.preventDefault(); setLoading(true); setErr('');
    try { const { data } = await api.get(`/parcels/track/${trackCode.trim()}`); setTracked(data); }
    catch { setErr('Parcel not found. Check your tracking code.'); }
    finally { setLoading(false); }
  };

  const reset = () => { setStep(0); setResult(null); setErr(''); setTrackCode(''); setTracked(null); };

  return (
    <div style={{minHeight:'100vh',background:'var(--gray-50)',paddingBottom:88}}>
      {/* Header */}
      <div style={{background:'var(--navy)',padding:'20px 20px 0'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
          <button onClick={()=>nav('/')} style={{background:'rgba(255,255,255,0.1)',border:'none',borderRadius:10,width:38,height:38,color:'white',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>
          <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:800,color:'white',letterSpacing:'-0.3px'}}>📦 Parcel Delivery</div>
        </div>
        <div style={{display:'flex',background:'rgba(255,255,255,0.08)',borderRadius:'var(--radius-md)',padding:4,marginBottom:0}}>
          {[['send','📦 Send'],['track','🔍 Track']].map(([t,l])=>(
            <button key={t} onClick={()=>{setTab(t);setErr('');reset();}}
              style={{flex:1,padding:'10px',border:'none',borderRadius:'var(--radius-sm)',background:tab===t?'var(--gold)':'transparent',color:tab===t?'var(--navy)':'rgba(255,255,255,0.7)',fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'var(--font-body)',transition:'all 0.2s'}}>
              {l}
            </button>
          ))}
        </div>
        {tab==='send' && step<2 && (
          <div style={{padding:'12px 0 10px'}}>
            <div style={{display:'flex',gap:4}}>{STEPS.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:99,background:i<=step?'var(--gold)':'rgba(255,255,255,0.15)',transition:'background 0.3s'}}/>)}</div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>{STEPS.map((s,i)=><span key={i} style={{fontSize:10,color:i===step?'var(--gold)':'rgba(255,255,255,0.4)',fontWeight:i===step?700:400}}>{s}</span>)}</div>
          </div>
        )}
      </div>

      <div style={{padding:'20px 16px'}}>
        {/* ── SEND TAB ── */}
        {tab==='send' && <>

          {/* STEP 0 — Details */}
          {step===0 && (
            <form onSubmit={goToPayment}>
              {/* Parcel Type */}
              <div style={{background:'var(--white)',borderRadius:'var(--radius-lg)',padding:20,marginBottom:12,border:'1px solid var(--gray-200)'}}>
                <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,color:'var(--navy)',marginBottom:14}}>Parcel Type</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {TYPES.map(t=>(
                    <div key={t.key} onClick={()=>setForm(p=>({...p,parcelType:t.key}))}
                      style={{border:`2px solid ${form.parcelType===t.key?'var(--gold)':'var(--gray-200)'}`,borderRadius:'var(--radius-md)',padding:12,cursor:'pointer',background:form.parcelType===t.key?'var(--gold-light)':'transparent',transition:'all 0.15s'}}>
                      <div style={{fontSize:22,marginBottom:4}}>{t.icon}</div>
                      <div style={{fontWeight:700,color:'var(--navy)',fontSize:13}}>{t.label}</div>
                      <div style={{fontSize:11,color:'var(--gray-400)',marginBottom:4}}>{t.desc}</div>
                      <div style={{fontWeight:800,color:'var(--gold)',fontSize:14}}>UGX {t.price.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sender */}
              <div style={{background:'var(--white)',borderRadius:'var(--radius-lg)',padding:20,marginBottom:12,border:'1px solid var(--gray-200)'}}>
                <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,color:'var(--navy)',marginBottom:14}}>Sender</div>
                <div style={{marginBottom:12}}><label style={lbl}>Name (optional)</label><input value={form.senderName} onChange={set('senderName')} placeholder='e.g. Alice Nakato' style={inp}/></div>
                <div><label style={lbl}>Phone Number *</label><input value={form.senderPhone} onChange={set('senderPhone')} placeholder='+256 7XX XXX XXX' type='tel' required style={inp}/></div>
              </div>

              {/* Recipient */}
              <div style={{background:'var(--white)',borderRadius:'var(--radius-lg)',padding:20,marginBottom:12,border:'1px solid var(--gray-200)'}}>
                <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,color:'var(--navy)',marginBottom:14}}>Recipient</div>
                <div style={{marginBottom:12}}><label style={lbl}>Name (optional)</label><input value={form.recipientName} onChange={set('recipientName')} placeholder='e.g. John Ssemakula' style={inp}/></div>
                <div style={{marginBottom:12}}><label style={lbl}>Phone Number *</label><input value={form.recipientPhone} onChange={set('recipientPhone')} placeholder='+256 7XX XXX XXX' type='tel' required style={inp}/></div>
                <div><label style={lbl}>Destination *</label>
                  <select value={form.destination} onChange={set('destination')} style={{...inp,cursor:'pointer'}}>
                    {CITIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Parcel Info */}
              <div style={{background:'var(--white)',borderRadius:'var(--radius-lg)',padding:20,marginBottom:12,border:'1px solid var(--gray-200)'}}>
                <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,color:'var(--navy)',marginBottom:14}}>Parcel Info</div>
                <div style={{marginBottom:12}}><label style={lbl}>Description of Contents *</label><input value={form.description} onChange={set('description')} placeholder='e.g. Electronics, clothes, documents' required style={inp}/></div>
                <div style={{marginBottom:16}}><label style={lbl}>Weight (kg, optional)</label><input value={form.weight} onChange={set('weight')} type='number' min='0' step='0.1' placeholder='e.g. 2.5' style={inp}/></div>

                {/* Declared value */}
                <div style={{marginBottom:16}}>
                  <label style={lbl}>Declared Value (UGX) <span style={{color:'var(--gray-400)',fontWeight:400,textTransform:'none'}}>— required for insurance</span></label>
                  <input value={form.declaredValue} onChange={set('declaredValue')} type='number' min='0' placeholder='e.g. 500000' style={inp}/>
                </div>

                {/* Insurance toggle */}
                <div onClick={()=>setForm(p=>({...p,insure:!p.insure}))} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:form.insure?'var(--green-light)':'var(--gray-50)',borderRadius:'var(--radius-md)',padding:'12px 14px',cursor:'pointer',border:`1.5px solid ${form.insure?'var(--green)':'var(--gray-200)'}`,marginBottom:10,transition:'all 0.2s'}}>
                  <div>
                    <div style={{fontWeight:700,color:'var(--navy)',fontSize:14}}>🛡️ Add Insurance (3% of declared value)</div>
                    {form.insure && declared>0
                      ? <div style={{fontSize:12,color:'#00885A',fontWeight:600}}>+UGX {insuranceFee.toLocaleString()} — coverage up to UGX {declared.toLocaleString()}</div>
                      : <div style={{fontSize:12,color:'var(--gray-400)'}}>Enter declared value above, then enable insurance</div>}
                  </div>
                  <div style={{width:44,height:26,borderRadius:99,background:form.insure?'var(--green)':'var(--gray-200)',display:'flex',alignItems:'center',padding:3,flexShrink:0,transition:'background 0.2s'}}>
                    <div style={{width:20,height:20,borderRadius:'50%',background:'white',transform:form.insure?'translateX(18px)':'translateX(0)',transition:'transform 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}}/>
                  </div>
                </div>

                {/* Rider pickup */}
                <div onClick={()=>setForm(p=>({...p,pickupRider:!p.pickupRider}))} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:form.pickupRider?'var(--gold-light)':'var(--gray-50)',borderRadius:'var(--radius-md)',padding:'12px 14px',cursor:'pointer',border:`1.5px solid ${form.pickupRider?'var(--gold)':'var(--gray-200)'}`,marginBottom:10,transition:'all 0.2s'}}>
                  <div>
                    <div style={{fontWeight:700,color:'var(--navy)',fontSize:14}}>🛵 Rider Pickup (+UGX 5,000)</div>
                    <div style={{fontSize:12,color:'var(--gray-400)'}}>We send a rider to collect from your location</div>
                  </div>
                  <div style={{width:44,height:26,borderRadius:99,background:form.pickupRider?'var(--gold)':'var(--gray-200)',display:'flex',alignItems:'center',padding:3,flexShrink:0,transition:'background 0.2s'}}>
                    <div style={{width:20,height:20,borderRadius:'50%',background:'white',transform:form.pickupRider?'translateX(18px)':'translateX(0)',transition:'transform 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}}/>
                  </div>
                </div>

                {/* National ID at pickup */}
                <div onClick={()=>setForm(p=>({...p,requireId:!p.requireId}))} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--gray-50)',borderRadius:'var(--radius-md)',padding:'12px 14px',cursor:'pointer',border:'1.5px solid var(--gray-200)',transition:'all 0.2s'}}>
                  <div>
                    <div style={{fontWeight:700,color:'var(--navy)',fontSize:14}}>🪪 Require National ID at pickup</div>
                    <div style={{fontSize:12,color:'var(--gray-400)'}}>Recipient must show ID to collect parcel</div>
                  </div>
                  <div style={{width:44,height:26,borderRadius:99,background:form.requireId?'var(--navy)':'var(--gray-200)',display:'flex',alignItems:'center',padding:3,flexShrink:0,transition:'background 0.2s'}}>
                    <div style={{width:20,height:20,borderRadius:'50%',background:'white',transform:form.requireId?'translateX(18px)':'translateX(0)',transition:'transform 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}}/>
                  </div>
                </div>
                {form.requireId && (
                  <div style={{marginTop:10}}>
                    <label style={lbl}>Recipient National ID Number (optional)</label>
                    <input value={form.receiverIdNumber} onChange={set('receiverIdNumber')} placeholder='e.g. CM90100012345ABCD' style={inp}/>
                  </div>
                )}
              </div>

              {/* Cost summary */}
              <div style={{background:'var(--navy)',borderRadius:'var(--radius-lg)',padding:16,marginBottom:16}}>
                {[
                  [`${selectedType.icon} ${selectedType.label}`, `UGX ${parcelFee.toLocaleString()}`],
                  ...(form.pickupRider ? [['🛵 Rider pickup', 'UGX 5,000']] : []),
                  ...(insuranceFee>0 ? [`🛡️ Insurance (3% of UGX ${declared.toLocaleString()})`, `UGX ${insuranceFee.toLocaleString()}`].map(v=>[v]) : []),
                ].flat(0).filter(Array.isArray).map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontSize:13,color:'rgba(255,255,255,0.6)'}}>{k}</span>
                    <span style={{fontSize:13,color:'white'}}>{v}</span>
                  </div>
                ))}
                <div style={{borderTop:'1px solid rgba(255,255,255,0.1)',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontWeight:700,color:'white'}}>Total due</span>
                  <span style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:22,color:'var(--gold)'}}>UGX {total.toLocaleString()}</span>
                </div>
              </div>

              {err && <div style={{background:'#FEE2E2',color:'var(--red)',padding:'10px 14px',borderRadius:'var(--radius-md)',marginBottom:12,fontSize:13}}>{err}</div>}
              <Btn type='submit' full style={{height:52}}>Continue to Payment →</Btn>
            </form>
          )}

          {/* STEP 1 — Payment */}
          {step===1 && (
            <div>
              {/* Summary */}
              <div style={{background:'var(--navy)',borderRadius:'var(--radius-lg)',padding:18,marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:10}}>Parcel Summary</div>
                {[
                  ['Type',      `${selectedType.icon} ${selectedType.label}`],
                  ['From',      form.senderPhone+(form.senderName?` (${form.senderName})`:'')],
                  ['To',        `${form.recipientPhone} — ${form.destination}`+(form.recipientName?` (${form.recipientName})`:'' )],
                  ['Contents',  form.description],
                  ...(form.pickupRider   ? [['Pickup',    'Rider pickup']]                    : []),
                  ...(insuranceFee>0     ? [['Insurance', `UGX ${insuranceFee.toLocaleString()} (3% of declared)`]] : []),
                  ...(form.requireId     ? [['ID required','Yes — at collection']]            : []),
                  ['Total',     `UGX ${total.toLocaleString()}`],
                ].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{k}</span>
                    <span style={{fontSize:12,fontWeight:600,color:k==='Total'?'var(--gold)':'white',textAlign:'right',maxWidth:'65%'}}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Payment method */}
              <div style={{background:'var(--white)',borderRadius:'var(--radius-lg)',padding:20,marginBottom:12,border:'1px solid var(--gray-200)'}}>
                <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,color:'var(--navy)',marginBottom:14}}>Payment Method</div>
                {[['MTN_MOMO','MTN Mobile Money','🟡','Dial *165#'],['AIRTEL_MOMO','Airtel Money','🔴','Dial *185#'],['CARD','Visa / Mastercard','💳','Online card payment']].map(([val,label,icon,hint])=>(
                  <div key={val} onClick={()=>setPayMethod(val)} style={{border:`2px solid ${payMethod===val?'var(--gold)':'var(--gray-200)'}`,borderRadius:'var(--radius-md)',padding:14,marginBottom:10,cursor:'pointer',display:'flex',alignItems:'center',gap:12,background:payMethod===val?'var(--gold-light)':'transparent',transition:'all 0.15s'}}>
                    <div style={{fontSize:26,flexShrink:0}}>{icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,color:'var(--navy)',fontSize:14}}>{label}</div>
                      <div style={{fontSize:12,color:'var(--gray-400)'}}>{hint}</div>
                    </div>
                    {payMethod===val && <div style={{color:'var(--gold)',fontSize:20,fontWeight:800}}>✓</div>}
                  </div>
                ))}
              </div>

              {err && <div style={{background:'#FEE2E2',color:'var(--red)',padding:'10px 14px',borderRadius:'var(--radius-md)',marginBottom:12,fontSize:13}}>{err}</div>}
              <div style={{display:'flex',gap:8}}>
                <Btn variant='ghost' onClick={()=>{setStep(0);setErr('');}} style={{flex:1}}>← Back</Btn>
                <Btn onClick={submitBooking} disabled={loading} style={{flex:2,height:52}}>{loading?'⏳ Processing…':`Pay UGX ${total.toLocaleString()} →`}</Btn>
              </div>
            </div>
          )}

          {/* STEP 2 — Confirmation */}
          {step===2 && result && (
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:64,marginBottom:8}}>📦</div>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:800,color:'var(--navy)',marginBottom:4,letterSpacing:'-0.5px'}}>Parcel Booked!</h2>
              <p style={{fontSize:14,color:'var(--gray-400)',marginBottom:20}}>Screenshot your tracking code</p>

              <div style={{background:'var(--white)',borderRadius:'var(--radius-xl)',overflow:'hidden',boxShadow:'var(--shadow-lg)',maxWidth:360,margin:'0 auto',textAlign:'left'}}>
                <div style={{background:'var(--navy)',padding:'20px 24px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                    <div style={{background:'var(--gold)',borderRadius:8,padding:6,fontSize:18}}>🚌</div>
                    <div>
                      <div style={{fontFamily:'var(--font-display)',fontWeight:800,color:'white',fontSize:14}}>Raylane Parcels</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>Delivery Confirmation</div>
                    </div>
                  </div>
                  <div style={{fontFamily:'var(--font-display)',fontSize:13,color:'rgba(255,255,255,0.7)'}}>→ {result.destination}</div>
                </div>

                <div style={{background:'var(--gold-light)',border:'2px dashed var(--gold)',margin:'0 20px',borderRadius:'var(--radius-md)',padding:'14px 16px',marginTop:20,textAlign:'center'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Tracking Code</div>
                  <div style={{fontFamily:'monospace',fontSize:24,fontWeight:900,color:'var(--navy)',letterSpacing:3}}>{result.trackingCode}</div>
                  <div style={{fontSize:10,color:'var(--gray-400)',marginTop:4}}>Parcel Ref: {result.parcelRef}</div>
                </div>

                <div style={{padding:'16px 24px 24px'}}>
                  {[
                    ['Type',        `${selectedType.icon} ${selectedType.label}`],
                    ['Transport',   `UGX ${(result.parcelFee||parcelFee).toLocaleString()}`],
                    ...(result.riderFee>0         ? [['Rider Pickup',  `UGX ${result.riderFee.toLocaleString()}`]]      : []),
                    ...(result.insuranceFee>0     ? [['Insurance',     `UGX ${result.insuranceFee.toLocaleString()}`]]   : []),
                    ...(result.declaredValue>0    ? [['Declared Value',`UGX ${result.declaredValue.toLocaleString()}`]]  : []),
                    ['Total Paid',  `UGX ${(result.totalFee||total).toLocaleString()}`],
                    ['Status',      '✅ Booked'],
                  ].map(([k,v])=>(
                    <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--gray-100)'}}>
                      <span style={{fontSize:12,color:'var(--gray-400)'}}>{k}</span>
                      <span style={{fontSize:12,fontWeight:700,color:k==='Total Paid'?'var(--gold)':'var(--navy)'}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{marginTop:20,display:'flex',gap:8}}>
                <Btn variant='ghost' onClick={reset} style={{flex:1}}>Send Another</Btn>
                <Btn variant='navy' onClick={()=>nav('/')} style={{flex:1}}>← Home</Btn>
              </div>
            </div>
          )}
        </>}

        {/* ── TRACK TAB ── */}
        {tab==='track' && (
          <div>
            <form onSubmit={trackParcel}>
              <div style={{background:'var(--white)',borderRadius:'var(--radius-lg)',padding:20,border:'1px solid var(--gray-200)',marginBottom:16}}>
                <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16,color:'var(--navy)',marginBottom:14}}>Track Your Parcel</div>
                <label style={lbl}>Tracking Code or Parcel ID</label>
                <input value={trackCode} onChange={e=>setTrackCode(e.target.value)} placeholder='e.g. RYAB1234 or PCL-20260407-AB12' required style={{...inp,fontSize:16,fontFamily:'monospace',letterSpacing:1,marginBottom:12}}/>
                {err && <div style={{background:'#FEE2E2',color:'var(--red)',padding:'10px 14px',borderRadius:'var(--radius-md)',marginBottom:12,fontSize:13}}>{err}</div>}
                <Btn type='submit' full disabled={loading}>{loading?'Searching…':'🔍 Track Parcel'}</Btn>
              </div>
            </form>

            {tracked && (
              <div style={{background:'var(--white)',borderRadius:'var(--radius-lg)',padding:20,boxShadow:'var(--shadow-md)',border:'1px solid var(--gray-200)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div>
                    <div style={{fontFamily:'var(--font-display)',fontSize:17,fontWeight:700,color:'var(--navy)'}}>{tracked.parcelRef||tracked.id}</div>
                    <div style={{fontSize:13,color:'var(--gray-400)'}}>→ {tracked.destination}</div>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,padding:'5px 12px',borderRadius:99,background:tracked.status==='DELIVERED'?'var(--green-light)':tracked.status==='IN_TRANSIT'?'#E8EDF5':'var(--gold-light)',color:tracked.status==='DELIVERED'?'#00885A':tracked.status==='IN_TRANSIT'?'var(--navy)':'#C47D00',textTransform:'uppercase',letterSpacing:'0.05em'}}>{tracked.status?.replace(/_/g,' ')}</span>
                </div>

                {/* Progress timeline */}
                <div style={{position:'relative',paddingLeft:28,marginBottom:16}}>
                  <div style={{position:'absolute',left:10,top:8,bottom:8,width:2,background:'var(--gray-200)'}}/>
                  {STATUS_FLOW.map((s,i)=>{
                    const currentIdx = STATUS_FLOW.indexOf(tracked.status);
                    const done = currentIdx >= i;
                    const active = currentIdx === i;
                    return (
                      <div key={s} style={{display:'flex',gap:12,alignItems:'center',marginBottom:14,position:'relative'}}>
                        <div style={{position:'absolute',left:-22,width:18,height:18,borderRadius:'50%',background:done?'var(--green)':active?'var(--gold)':'var(--gray-200)',border:`2px solid ${done?'var(--green)':active?'var(--gold)':'var(--gray-300)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'white',fontWeight:800,flexShrink:0}}>{done&&!active?'✓':active?'●':''}</div>
                        <div style={{fontSize:13,fontWeight:done?700:400,color:done?'var(--navy)':'var(--gray-400)'}}>{s.replace(/_/g,' ')}</div>
                      </div>
                    );
                  })}
                </div>

                {[
                  ['Sender',      tracked.sender_name?`${tracked.sender_name} (${tracked.sender_phone})`:tracked.sender_phone],
                  ['Recipient',   tracked.recipient_name?`${tracked.recipient_name} (${tracked.recipient_phone})`:tracked.recipient_phone],
                  ['Description', tracked.description],
                  ['Type',        tracked.parcelType||'—'],
                  ['Declared Val',tracked.declaredValue>0?`UGX ${Number(tracked.declaredValue).toLocaleString()}`:'Not declared'],
                  ['Insurance',   tracked.insured?`Yes — UGX ${(tracked.insurance_fee||tracked.insuranceFee||0).toLocaleString()}`:'No'],
                  ['ID Required', tracked.requireId?'Yes':'No'],
                  ['Total Fee',   `UGX ${(tracked.fee||0).toLocaleString()}`],
                ].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderTop:'1px solid var(--gray-100)'}}>
                    <span style={{fontSize:12,color:'var(--gray-400)'}}>{k}</span>
                    <span style={{fontSize:12,fontWeight:600,color:'var(--navy)',textAlign:'right',maxWidth:'60%'}}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'var(--white)',borderTop:'1px solid var(--gray-200)',display:'flex',padding:'10px 0 18px',zIndex:100}}>
        {[['🏠','Home','/'],['🔍','Search','/search'],['📦','Parcels','/parcels'],['🎫','Tickets','/track']].map(([icon,label,path])=>(
          <div key={path} onClick={()=>nav(path)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,cursor:'pointer'}}>
            <div style={{fontSize:22}}>{icon}</div>
            <div style={{fontSize:10,fontWeight:500,color:window.location.pathname===path?'var(--gold)':'var(--gray-400)'}}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
