import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Btn, Badge, Stat, Empty, Spinner, formatUGX, statusColor } from '../../components/UI';
import OperatorPromos from './Promotions';

const TABS = ['Overview','Trips','Bookings','Seats','Parcels','Promotions','Finance'];
const CITIES = ['Kampala','Mbale','Gulu','Mbarara','Jinja','Masaka','Lira','Arua','Fort Portal','Kabale','Entebbe','Tororo'];

export default function OperatorDashboard() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab]           = useState('Overview');
  const [operator, setOperator] = useState(null);
  const [trips, setTrips]       = useState([]);
  const [bookings, setBookings] = useState([]);
  const [parcels, setParcels]   = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [tripForm, setTripForm] = useState({ from:'Kampala', to:'Mbale', departureTime:'', price:'', vehicle:'', totalSeats:49, vehicleType:'COACH' });
  const [msg, setMsg]           = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [opR,trR,bkR,parR,payR] = await Promise.all([
        api.get('/operators/me'),
        api.get('/trips'),
        api.get('/bookings'),
        api.get('/parcels'),
        api.get('/payments'),
      ]);
      setOperator(opR.data); setTrips(trR.data); setBookings(bkR.data); setParcels(parR.data); setPayments(payR.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''), 3000); };

  const createTrip = async e => {
    e.preventDefault();
    try {
      await api.post('/trips', { ...tripForm, price: Number(tripForm.price) });
      setShowNewTrip(false);
      notify('Trip submitted for admin approval');
      loadAll();
    } catch(e) { notify(e.response?.data?.error||'Failed'); }
  };

  const confirmBoarding = async id => {
    await api.patch(`/bookings/board/${id}`);
    notify('Boarding confirmed ✓');
    loadAll();
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column', gap:12 }}>
      <Spinner size={36} />
      <div style={{ fontSize:13, color:'var(--gray-400)' }}>Loading dashboard…</div>
    </div>
  );

  const totalRevenue  = payments.reduce((s,p)=>s+(p.amount||0),0);
  const totalComm     = payments.reduce((s,p)=>s+(p.commission||0),0);
  const heldBalance   = payments.filter(p=>p.status==='HELD').reduce((s,p)=>s+(p.operator_net||p.operatorNet||0),0);
  const liveTrips     = trips.filter(t=>t.status==='LIVE').length;
  const confirmedBks  = bookings.filter(b=>b.status==='CONFIRMED').length;
  const activeModules = operator?.modules || [];
  const hasFinance    = activeModules.includes('FINANCIAL');

  const tabsVisible = TABS.filter(t => {
    if (t === 'Finance') return hasFinance;
    return true;
  });

  return (
    <div style={{ minHeight:'100vh', background:'var(--gray-50)', display:'flex', flexDirection:'column' }}>

      {/* ── HEADER ── */}
      <div style={{ background:'var(--navy)', padding:'16px 20px', position:'sticky', top:0, zIndex:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, background:'var(--gold)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🚌</div>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'white', fontSize:16, letterSpacing:'-0.2px' }}>{operator?.name}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>Operator Portal</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <Badge variant={operator?.status==='ACTIVE'?'green':'gold'}>{operator?.status}</Badge>
            <button onClick={()=>{logout();nav('/login');}} style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:8, padding:'6px 12px', color:'rgba(255,255,255,0.6)', fontSize:12, cursor:'pointer', fontFamily:'var(--font-body)' }}>Exit</button>
          </div>
        </div>
        <div style={{ display:'flex', gap:4, overflowX:'auto', paddingBottom:2 }}>
          {tabsVisible.map(t => (
            <button key={t} onClick={()=>setTab(t)}
              style={{ flexShrink:0, padding:'8px 14px', border:'none', borderRadius:8, background: tab===t?'var(--gold)':'rgba(255,255,255,0.07)', color: tab===t?'var(--navy)':'rgba(255,255,255,0.65)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-body)', whiteSpace:'nowrap' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div style={{ background:'var(--green-light)', color:'#00885A', padding:'12px 20px', fontSize:13, fontWeight:700, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>✓ {msg}</span>
          <span style={{ cursor:'pointer', fontSize:16 }} onClick={()=>setMsg('')}>×</span>
        </div>
      )}

      <div style={{ flex:1, padding:'20px 16px', maxWidth:840, width:'100%', margin:'0 auto' }}>

        {/* ── OVERVIEW ── */}
        {tab === 'Overview' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
              <Stat label='Live Trips'   value={liveTrips}        icon='🛣️' />
              <Stat label='Bookings'     value={confirmedBks}     icon='🎫' />
              <Stat label='Revenue'      value={formatUGX(totalRevenue)} color='var(--gold)' icon='💰' />
              <Stat label='Held Balance' value={formatUGX(heldBalance)} icon='🏦' />
            </div>

            <div style={{ background:'var(--white)', borderRadius:'var(--radius-lg)', padding:20, marginBottom:16, border:'1px solid var(--gray-200)' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--navy)', marginBottom:12 }}>Active Modules</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {activeModules.map(m => (
                  <span key={m} style={{ background:'var(--green-light)', color:'#00885A', fontSize:11, fontWeight:700, padding:'5px 12px', borderRadius:99, letterSpacing:'0.03em' }}>✓ {m.replace('_',' ')}</span>
                ))}
                {activeModules.length === 0 && <span style={{ fontSize:13, color:'var(--gray-400)' }}>No modules active — contact Raylane Admin</span>}
              </div>
            </div>

            <div style={{ background:'var(--white)', borderRadius:'var(--radius-lg)', padding:20, border:'1px solid var(--gray-200)' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--navy)', marginBottom:12 }}>Recent Bookings</div>
              {bookings.slice(0,6).map(b => (
                <div key={b.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 0', borderBottom:'1px solid var(--gray-100)' }}>
                  <div>
                    <div style={{ fontWeight:600, color:'var(--navy)', fontSize:14 }}>{b.passenger_name||b.passengerName}</div>
                    <div style={{ fontSize:12, color:'var(--gray-400)' }}>Seat #{b.seat_number||b.seatNumber} · {b.id}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <Badge variant={statusColor(b.status)}>{b.status?.replace('_',' ')}</Badge>
                    <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:4 }}>{formatUGX(b.amount)}</div>
                  </div>
                </div>
              ))}
              {bookings.length === 0 && <Empty icon='🎫' text='No bookings yet' />}
            </div>
          </div>
        )}

        {/* ── TRIPS ── */}
        {tab === 'Trips' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:'var(--navy)', letterSpacing:'-0.3px' }}>My Trips</div>
              <Btn size='sm' onClick={()=>setShowNewTrip(s=>!s)}>{showNewTrip ? '✕ Cancel' : '+ New Trip'}</Btn>
            </div>

            {showNewTrip && (
              <div style={{ background:'var(--white)', borderRadius:'var(--radius-lg)', padding:20, marginBottom:16, border:'2px solid var(--gold)', boxShadow:'0 4px 20px rgba(245,166,35,0.12)' }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'var(--navy)', marginBottom:16 }}>Create New Trip</div>
                <form onSubmit={createTrip}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                    {[['from','From'],['to','To']].map(([k,l])=>(
                      <div key={k}>
                        <label style={lbl}>{l}</label>
                        <select value={tripForm[k]} onChange={e=>setTripForm(p=>({...p,[k]:e.target.value}))} style={inp}>
                          {CITIES.map(c=><option key={c}>{c}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                    {[['departureTime','Departure','datetime-local'],['price','Price (UGX)','number'],['vehicle','Vehicle Reg.','text'],['totalSeats','Seats','number']].map(([k,l,t])=>(
                      <div key={k}>
                        <label style={lbl}>{l}</label>
                        <input value={tripForm[k]} onChange={e=>setTripForm(p=>({...p,[k]:e.target.value}))} type={t} required style={inp} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label style={lbl}>Vehicle Type</label>
                    <select value={tripForm.vehicleType} onChange={e=>setTripForm(p=>({...p,vehicleType:e.target.value}))} style={inp}>
                      <option value='COACH'>Coach Bus</option>
                      <option value='MINI_BUS'>Mini Bus</option>
                      <option value='SHUTTLE'>Shuttle</option>
                    </select>
                  </div>
                  <div style={{ background:'var(--gold-light)', borderRadius:'var(--radius-md)', padding:'10px 14px', marginBottom:14, fontSize:12, color:'#C47D00' }}>
                    ⏳ Trips require Raylane Admin approval before going live. You'll be notified once approved.
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <Btn type='submit' style={{ flex:2 }}>Submit for Approval →</Btn>
                    <Btn variant='ghost' type='button' onClick={()=>setShowNewTrip(false)} style={{ flex:1 }}>Cancel</Btn>
                  </div>
                </form>
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {trips.map(t => {
                const booked = t.booked_seats ?? t.bookedSeats ?? 0;
                const total  = t.total_seats  ?? t.totalSeats  ?? 49;
                return (
                  <div key={t.id} style={{ background:'var(--white)', borderRadius:'var(--radius-lg)', padding:16, border:'1px solid var(--gray-200)', boxShadow:'var(--shadow-sm)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div>
                        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'var(--navy)' }}>{t.from_city||t.from} → {t.to_city||t.to}</div>
                        <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>
                          {new Date(t.departure_time||t.departureTime).toLocaleString('en-UG',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} · {t.vehicle}
                        </div>
                        <div style={{ fontSize:12, color:'var(--gray-400)' }}>{booked}/{total} seats · {formatUGX(t.price)}</div>
                      </div>
                      <Badge variant={statusColor(t.status)}>{t.status}</Badge>
                    </div>
                    <div style={{ background:'var(--gray-100)', borderRadius:99, height:5, overflow:'hidden' }}>
                      <div style={{ height:'100%', background:'var(--gold)', borderRadius:99, width:`${(booked/total)*100}%`, transition:'width 0.5s' }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
                      <span style={{ fontSize:11, color:'var(--gray-400)' }}>{total-booked} available</span>
                    </div>
                  </div>
                );
              })}
              {trips.length === 0 && <Empty icon='🚌' text='No trips yet. Create your first trip!' />}
            </div>
          </div>
        )}

        {/* ── BOOKINGS ── */}
        {tab === 'Bookings' && (
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:'var(--navy)', letterSpacing:'-0.3px', marginBottom:16 }}>Passenger Bookings</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {bookings.map(b => (
                <div key={b.id} style={{ background:'var(--white)', borderRadius:'var(--radius-lg)', padding:16, border:'1px solid var(--gray-200)', boxShadow:'var(--shadow-sm)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, color:'var(--navy)' }}>{b.passenger_name||b.passengerName}</div>
                      <div style={{ fontSize:12, color:'var(--gray-400)' }}>{b.passenger_phone||b.passengerPhone} · Seat #{b.seat_number||b.seatNumber}</div>
                      <div style={{ fontSize:11, fontFamily:'monospace', color:'var(--gray-400)', marginTop:2 }}>{b.ticket_code||b.ticketCode}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <Badge variant={statusColor(b.status)}>{b.status?.replace('_',' ')}</Badge>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--gold)', marginTop:6 }}>{formatUGX(b.amount)}</div>
                    </div>
                  </div>
                  {b.promo_discount > 0 && (
                    <div style={{ fontSize:11, color:'#00885A', fontWeight:600, marginBottom:8 }}>🏷️ Promo discount applied: -{formatUGX(b.promo_discount)}</div>
                  )}
                  {b.status === 'CONFIRMED' && !b.boarded && (
                    <Btn size='sm' variant='green' onClick={()=>confirmBoarding(b.id)}>✓ Confirm Boarding</Btn>
                  )}
                  {b.boarded && <span style={{ fontSize:12, color:'#00885A', fontWeight:700 }}>✓ Boarded</span>}
                </div>
              ))}
              {bookings.length === 0 && <Empty icon='🎫' text='No bookings yet' />}
            </div>
          </div>
        )}

        {/* ── SEATS ── */}
        {tab === 'Seats' && (
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:'var(--navy)', letterSpacing:'-0.3px', marginBottom:16 }}>Live Seat Management</div>
            {trips.filter(t=>t.status==='LIVE').map(trip => (
              <SeatPanel key={trip.id} trip={trip} onUpdate={loadAll} />
            ))}
            {trips.filter(t=>t.status==='LIVE').length === 0 && <Empty icon='💺' text='No live trips to manage' />}
          </div>
        )}

        {/* ── PARCELS ── */}
        {tab === 'Parcels' && (
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:'var(--navy)', letterSpacing:'-0.3px', marginBottom:16 }}>Parcel Management</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {parcels.map(p => (
                <div key={p.id} style={{ background:'var(--white)', borderRadius:'var(--radius-lg)', padding:16, border:'1px solid var(--gray-200)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div>
                      <div style={{ fontWeight:700, color:'var(--navy)', fontSize:14 }}>{p.id}</div>
                      <div style={{ fontSize:12, color:'var(--gray-400)' }}>{p.sender_name||p.senderName} → {p.recipient_name||p.recipientName}</div>
                      <div style={{ fontSize:12, color:'var(--gray-400)' }}>📍 {p.destination} · {p.weight}kg · {p.description}</div>
                      <div style={{ fontSize:11, fontFamily:'monospace', color:'var(--gold)', marginTop:2 }}>{p.tracking_code||p.trackingCode}</div>
                    </div>
                    <Badge variant={statusColor(p.status)}>{p.status}</Badge>
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {['PICKED_UP','IN_TRANSIT','DELIVERED'].map(s => (
                      <button key={s} onClick={async()=>{await api.patch(`/parcels/${p.id}`,{status:s});loadAll();}}
                        style={{ fontSize:11, padding:'5px 10px', border:'1px solid var(--gray-200)', borderRadius:99, background:p.status===s?'var(--navy)':'transparent', color:p.status===s?'white':'var(--gray-600)', cursor:'pointer', fontFamily:'var(--font-body)', fontWeight:600 }}>
                        {s.replace('_',' ')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {parcels.length === 0 && <Empty icon='📦' text='No parcels yet' />}
            </div>
          </div>
        )}

        {/* ── PROMOTIONS ── */}
        {tab === 'Promotions' && (
          <OperatorPromos operatorId={operator?.id} trips={trips} />
        )}

        {/* ── FINANCE ── */}
        {tab === 'Finance' && hasFinance && (
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:'var(--navy)', letterSpacing:'-0.3px', marginBottom:16 }}>Financial Overview</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
              <Stat label='Total Revenue'   value={formatUGX(totalRevenue)}            color='var(--gold)' />
              <Stat label='Commission (8%)' value={formatUGX(totalComm)}               color='var(--red)' />
              <Stat label='Net Earned'      value={formatUGX(totalRevenue-totalComm)}  color='var(--green)' />
              <Stat label='Pending Payout'  value={formatUGX(heldBalance)} />
            </div>
            <div style={{ background:'var(--white)', borderRadius:'var(--radius-lg)', padding:20, border:'1px solid var(--gray-200)' }}>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--navy)', marginBottom:14 }}>Transactions</div>
              {payments.map(p => (
                <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--gray-100)' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--navy)' }}>{(p.method||p.payment_method||'').replace(/_/g,' ')}</div>
                    <div style={{ fontSize:11, color:'var(--gray-400)' }}>{p.booking_id||p.bookingId}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--navy)' }}>{formatUGX(p.operator_net||p.operatorNet)}</div>
                    <Badge variant={statusColor(p.status)}>{p.status}</Badge>
                  </div>
                </div>
              ))}
              {payments.length === 0 && <Empty icon='💰' text='No transactions yet' />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const lbl = { fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 };
const inp = { width:'100%', height:44, padding:'0 12px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius-md)', fontSize:14, fontFamily:'var(--font-body)', outline:'none', background:'var(--gray-50)' };

function SeatPanel({ trip, onUpdate }) {
  const [seats, setSeats] = useState({});
  useEffect(() => {
    api.get(`/seats/${trip.id}`).then(r=>setSeats(r.data)).catch(()=>{});
  }, [trip.id]);

  const toggle = async num => {
    const current = seats[num]?.status;
    if (current === 'LOCKED') return;
    const next = current === 'AVAILABLE' ? 'BOOKED' : 'AVAILABLE';
    await api.patch(`/seats/${trip.id}/${num}`, { status: next });
    setSeats(p => ({ ...p, [num]: { ...p[num], status: next } }));
    onUpdate();
  };

  const entries = Object.entries(seats).sort((a,b) => Number(a[0])-Number(b[0]));

  return (
    <div style={{ background:'var(--white)', borderRadius:'var(--radius-lg)', padding:20, marginBottom:16, border:'1px solid var(--gray-200)' }}>
      <div style={{ fontWeight:700, color:'var(--navy)', marginBottom:3 }}>{trip.from_city||trip.from} → {trip.to_city||trip.to}</div>
      <div style={{ fontSize:12, color:'var(--gray-400)', marginBottom:14 }}>
        {new Date(trip.departure_time||trip.departureTime).toLocaleString('en-UG',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
        · {entries.filter(([,s])=>s.status==='AVAILABLE').length} available
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:5 }}>
        {entries.map(([num,seat]) => {
          const bg = seat.status==='BOOKED'?'var(--navy)':seat.status==='LOCKED'?'var(--gray-200)':'var(--green-light)';
          const color = seat.status==='BOOKED'?'rgba(255,255,255,0.7)':'var(--navy)';
          return (
            <div key={num} onClick={()=>toggle(Number(num))}
              style={{ aspectRatio:'1', borderRadius:7, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color, cursor:seat.status==='LOCKED'?'default':'pointer', transition:'background 0.15s' }}>
              {num}
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:12, marginTop:12 }}>
        {[['var(--green-light)','var(--navy)','Available'],['var(--navy)','white','Booked'],['var(--gray-200)','var(--gray-600)','Locked']].map(([bg,c,l])=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:14, height:14, background:bg, borderRadius:4 }} />
            <span style={{ fontSize:10, color:'var(--gray-600)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
