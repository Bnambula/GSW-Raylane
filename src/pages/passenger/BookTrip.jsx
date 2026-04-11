import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { Btn, Spinner, formatUGX } from '../../components/UI';
import SeatMap from '../../components/SeatMap';
import { QRCodeSVG } from 'qrcode.react';

const SESSION_ID = `sess-${Math.random().toString(36).slice(2,10)}`;
const STEPS = ['Select Seat','Your Details','Payment','Ticket'];

export default function BookTrip() {
  const { tripId } = useParams();
  const nav = useNavigate();
  const [step, setStep]       = useState(0);
  const [trip, setTrip]       = useState(null);
  const [seats, setSeats]     = useState({});
  const [selected, setSelected] = useState(null);
  const [locked, setLocked]   = useState(false);
  const [lockTimer, setLockTimer] = useState(300);
  const [form, setForm]       = useState({ name:'', phone:'', method:'MTN_MOMO', isAdvance:false });
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    loadTrip();
    loadSeats();
    return () => clearInterval(timerRef.current);
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTrip  = async () => { try { const { data } = await api.get(`/trips/${tripId}`); setTrip(data); } catch(e) { setErr('Could not load trip.'); } };
  const loadSeats = async () => { try { const { data } = await api.get(`/seats/${tripId}`); setSeats(data); } catch {} };

  // Normalise field names — API returns both snake_case and camelCase
  const tripFrom   = trip?.from_city  || trip?.from  || '';
  const tripTo     = trip?.to_city    || trip?.to    || '';
  const tripDepart = trip?.departure_time || trip?.departureTime || '';
  const tripPrice  = trip?.effective_price || trip?.price || 0;
  const tripOrig   = trip?.original_price  || trip?.promo_original_price || null;

  const amount = form.isAdvance ? Math.round(tripPrice * 0.2) : tripPrice;

  const selectSeat = async (num) => {
    const s = seats[num];
    if (!s || s.status !== 'AVAILABLE') return;
    setErr('');
    try {
      await api.post(`/seats/${tripId}/lock`, { seatNumber: num, sessionId: SESSION_ID });
      setSelected(num);
      setLocked(true);
      setLockTimer(300);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setLockTimer(t => {
          if (t <= 1) { clearInterval(timerRef.current); setLocked(false); setSelected(null); loadSeats(); return 0; }
          return t - 1;
        });
      }, 1000);
      setSeats(p => ({ ...p, [num]: { ...p[num], status:'LOCKED' } }));
    } catch(e) { setErr(e.response?.data?.error || 'Seat unavailable — try another'); }
  };

  const submitBooking = async () => {
    setLoading(true); setErr('');
    try {
      const { data } = await api.post('/bookings', {
        tripId, passengerName: form.name, passengerPhone: form.phone,
        seatNumber: selected, sessionId: SESSION_ID,
        paymentMethod: form.method, isAdvance: form.isAdvance
      });
      setBooking(data);
      // Poll for confirmation
      setTimeout(async () => {
        try { const { data: bk } = await api.get(`/bookings/track/${data.bookingId}`); setBooking(b => ({ ...b, ...bk })); } catch {}
      }, 2500);
      setStep(3);
    } catch(e) { setErr(e.response?.data?.error || 'Booking failed. Please try again.'); }
    finally { setLoading(false); }
  };

  if (!trip) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:12 }}>
      <Spinner size={36} />
      <div style={{ fontSize:13, color:'var(--gray-400)' }}>Loading trip…</div>
    </div>
  );

  const totalSeats = trip.total_seats || trip.totalSeats || 49;

  return (
    <div style={{ minHeight:'100vh', background:'var(--gray-50)', paddingBottom:100 }}>

      {/* Header */}
      <div style={{ background:'var(--navy)', padding:'20px 20px 28px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={() => nav(-1)} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:10, width:38, height:38, color:'white', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'white', letterSpacing:'-0.3px' }}>{tripFrom} → {tripTo}</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginTop:2 }}>
              {tripDepart ? new Date(tripDepart).toLocaleString('en-UG',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ display:'flex', gap:5 }}>
          {STEPS.map((s,i) => <div key={i} style={{ flex:1, height:3, borderRadius:99, background:i<=step?'var(--gold)':'rgba(255,255,255,0.15)', transition:'background 0.3s' }} />)}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:7 }}>
          {STEPS.map((s,i) => <span key={i} style={{ fontSize:10, color:i===step?'var(--gold)':'rgba(255,255,255,0.35)', fontWeight:i===step?700:400 }}>{s}</span>)}
        </div>
      </div>

      <div style={{ padding:'20px 16px' }}>

        {/* ── STEP 0: SEAT MAP ── */}
        {step === 0 && (
          <div>
            {err && <div style={{ background:'#FEE2E2', color:'var(--red)', padding:'10px 14px', borderRadius:'var(--radius-md)', marginBottom:12, fontSize:13 }}>{err}</div>}

            <div style={{ background:'var(--white)', borderRadius:'var(--radius-lg)', padding:20, marginBottom:12, boxShadow:'var(--shadow-sm)', border:'1px solid var(--gray-200)' }}>
              <SeatMap
                seats={seats}
                selected={selected}
                onSelect={selectSeat}
                vehicleType={trip.vehicle_type || trip.vehicleType}
                totalSeats={totalSeats}
              />
            </div>

            {/* Lock timer */}
            {locked && selected && (
              <div style={{ background:'var(--gold-light)', border:'1px solid var(--gold)', borderRadius:'var(--radius-md)', padding:'12px 16px', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontWeight:700, color:'var(--navy)', fontSize:14 }}>Seat #{selected} locked for you</div>
                  <div style={{ fontSize:12, color:'var(--gray-600)' }}>Expires in {Math.floor(lockTimer/60)}:{String(lockTimer%60).padStart(2,'0')}</div>
                </div>
                <div style={{ fontSize:22, fontWeight:800, color:'var(--gold)', fontFamily:'var(--font-display)' }}>{Math.floor(lockTimer/60)}:{String(lockTimer%60).padStart(2,'0')}</div>
              </div>
            )}

            <Btn full onClick={() => { if (selected) setStep(1); }} disabled={!selected} style={{ height:52 }}>
              Confirm Seat #{selected || '?'} →
            </Btn>
          </div>
        )}

        {/* ── STEP 1: PASSENGER DETAILS ── */}
        {step === 1 && (
          <div>
            <div style={{ background:'var(--white)', borderRadius:'var(--radius-lg)', padding:20, boxShadow:'var(--shadow-sm)', marginBottom:12, border:'1px solid var(--gray-200)' }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:800, color:'var(--navy)', marginBottom:18, letterSpacing:'-0.3px' }}>Your Details</h3>
              {[['Full Name','name','text','e.g. Alice Nakato'],['Phone Number','phone','tel','+256 7XX XXX XXX']].map(([label,key,type,ph]) => (
                <div key={key} style={{ marginBottom:14 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:'var(--gray-600)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>{label}</label>
                  <input value={form[key]} onChange={e => setForm(p=>({...p,[key]:e.target.value}))} type={type} placeholder={ph}
                    style={{ width:'100%', height:48, padding:'0 16px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius-md)', fontSize:15, fontFamily:'var(--font-body)', outline:'none', background:'var(--gray-50)' }} />
                </div>
              ))}

              {/* Advance toggle */}
              <div onClick={() => setForm(p=>({...p,isAdvance:!p.isAdvance}))}
                style={{ background:'var(--gray-50)', borderRadius:'var(--radius-md)', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', border:'1px solid var(--gray-200)' }}>
                <div>
                  <div style={{ fontWeight:600, color:'var(--navy)', fontSize:14 }}>Advance Booking (20% now)</div>
                  <div style={{ fontSize:12, color:'var(--gray-400)' }}>Pay UGX {Math.round(tripPrice*0.2).toLocaleString()} now, balance later</div>
                </div>
                <div style={{ width:46, height:26, borderRadius:99, background:form.isAdvance?'var(--green)':'var(--gray-200)', display:'flex', alignItems:'center', padding:3, flexShrink:0, transition:'background 0.2s' }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:'white', transform:form.isAdvance?'translateX(20px)':'translateX(0)', transition:'transform 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div style={{ background:'var(--navy)', borderRadius:'var(--radius-lg)', padding:16, marginBottom:16 }}>
              {[
                ['Route', `${tripFrom} → ${tripTo}`],
                ['Seat', `#${selected}`],
                ['Date', tripDepart ? new Date(tripDepart).toLocaleDateString('en-UG',{day:'numeric',month:'short',year:'numeric'}) : ''],
                ['Amount due', formatUGX(amount)],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:13, color:'rgba(255,255,255,0.55)' }}>{k}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:k==='Amount due'?'var(--gold)':'white' }}>{v}</span>
                </div>
              ))}
            </div>

            {err && <div style={{ background:'#FEE2E2', color:'var(--red)', padding:'10px 14px', borderRadius:'var(--radius-md)', marginBottom:12, fontSize:13 }}>{err}</div>}
            <div style={{ display:'flex', gap:8 }}>
              <Btn variant='ghost' onClick={() => setStep(0)} style={{ flex:1 }}>← Back</Btn>
              <Btn onClick={() => { if (!form.name.trim()||!form.phone.trim()){setErr('Please fill your name and phone');return;} setErr(''); setStep(2); }} style={{ flex:2 }}>Continue →</Btn>
            </div>
          </div>
        )}

        {/* ── STEP 2: PAYMENT ── */}
        {step === 2 && (
          <div>
            <div style={{ background:'var(--white)', borderRadius:'var(--radius-lg)', padding:20, boxShadow:'var(--shadow-sm)', marginBottom:12, border:'1px solid var(--gray-200)' }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:800, color:'var(--navy)', marginBottom:18, letterSpacing:'-0.3px' }}>Payment Method</h3>
              {[['MTN_MOMO','MTN Mobile Money','🟡','Dial *165# after paying'],['AIRTEL_MOMO','Airtel Money','🔴','Dial *185# after paying']].map(([val,label,icon,hint]) => (
                <div key={val} onClick={() => setForm(p=>({...p,method:val}))}
                  style={{ border:`2px solid ${form.method===val?'var(--gold)':'var(--gray-200)'}`, borderRadius:'var(--radius-md)', padding:16, marginBottom:10, cursor:'pointer', display:'flex', alignItems:'center', gap:14, background:form.method===val?'var(--gold-light)':'transparent', transition:'all 0.15s' }}>
                  <div style={{ fontSize:30, flexShrink:0 }}>{icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, color:'var(--navy)', fontSize:15 }}>{label}</div>
                    <div style={{ fontSize:12, color:'var(--gray-400)' }}>{hint}</div>
                  </div>
                  {form.method===val && <div style={{ color:'var(--gold)', fontSize:22, fontWeight:800, flexShrink:0 }}>✓</div>}
                </div>
              ))}
            </div>

            {/* Amount card */}
            <div style={{ background:'var(--navy)', borderRadius:'var(--radius-lg)', padding:16, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ color:'rgba(255,255,255,0.55)', fontSize:13 }}>Seat #{selected} — {tripFrom} → {tripTo}</span>
              </div>
              {tripOrig && (
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ color:'rgba(255,255,255,0.55)', fontSize:13 }}>Original price</span>
                  <span style={{ color:'rgba(255,255,255,0.5)', fontSize:13, textDecoration:'line-through' }}>{formatUGX(tripOrig)}</span>
                </div>
              )}
              {form.isAdvance && (
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ color:'rgba(255,255,255,0.55)', fontSize:13 }}>Advance (20%)</span>
                  <span style={{ color:'var(--gold)', fontSize:13 }}>discount applied</span>
                </div>
              )}
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', marginTop:10, paddingTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:700, color:'white', fontSize:15 }}>Total due now</span>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:24, color:'var(--gold)' }}>{formatUGX(amount)}</span>
              </div>
            </div>

            {err && <div style={{ background:'#FEE2E2', color:'var(--red)', padding:'10px 14px', borderRadius:'var(--radius-md)', marginBottom:12, fontSize:13 }}>{err}</div>}
            <div style={{ display:'flex', gap:8 }}>
              <Btn variant='ghost' onClick={() => setStep(1)} style={{ flex:1 }}>← Back</Btn>
              <Btn onClick={submitBooking} disabled={loading} style={{ flex:2, height:52 }}>
                {loading ? '⏳ Processing…' : `Pay ${formatUGX(amount)} →`}
              </Btn>
            </div>
          </div>
        )}

        {/* ── STEP 3: TICKET ── */}
        {step === 3 && booking && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:64, marginBottom:8 }}>🎉</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, color:'var(--navy)', marginBottom:4, letterSpacing:'-0.5px' }}>Booking Confirmed!</h2>
            <p style={{ fontSize:14, color:'var(--gray-400)', marginBottom:24 }}>Show this QR code at boarding</p>

            <div style={{ background:'var(--white)', borderRadius:'var(--radius-xl)', overflow:'hidden', boxShadow:'var(--shadow-lg)', maxWidth:360, margin:'0 auto', textAlign:'left' }}>
              {/* Ticket header */}
              <div style={{ background:'var(--navy)', padding:'20px 24px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <div style={{ background:'var(--gold)', borderRadius:8, padding:6, fontSize:18 }}>🚌</div>
                  <div>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'white', fontSize:16 }}>Raylane Express</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>Official E-Ticket</div>
                  </div>
                </div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, color:'white', letterSpacing:'-0.5px' }}>{tripFrom} → {tripTo}</div>
                <div style={{ fontSize:12, color:'var(--gold)', marginTop:4 }}>
                  {tripDepart ? new Date(tripDepart).toLocaleString('en-UG',{weekday:'short',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}) : ''}
                </div>
              </div>

              <div style={{ borderTop:'2px dashed var(--gray-200)', margin:'0 16px' }} />

              <div style={{ padding:'20px 24px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                  {[['Passenger', form.name], ['Seat', `#${selected}`], ['Booking ID', booking.bookingId?.slice(0,8)], ['Paid', formatUGX(booking.amount)]].map(([k,v]) => (
                    <div key={k}>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>{k}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--navy)' }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ textAlign:'center', padding:16, background:'var(--gray-50)', borderRadius:'var(--radius-md)' }}>
                  <QRCodeSVG value={booking.ticketCode || booking.bookingId || 'RAYLANE'} size={140} fgColor='#0B1628' />
                  <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:8, fontFamily:'monospace', letterSpacing:1 }}>{booking.ticketCode}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop:20 }}>
              <Btn full variant='navy' onClick={() => nav('/')}>← Back to Home</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
