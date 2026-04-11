import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Btn, Empty, Spinner, formatUGX, Badge } from '../../components/UI';
import api from '../../utils/api';

const TABS = ['Overview','Fleet','Operators','Trips','Bookings','Payments','Parcels','Promos','Alerts','Audit'];

const SBadge = ({ s }) => {
  const map = {
    ACTIVE:'#00885A',LIVE:'#00885A',CONFIRMED:'#00885A',DELIVERED:'#00885A',APPROVED:'#00885A',BOARDED:'#00885A',RELEASED:'#00885A',
    PENDING:'#C47D00',PENDING_APPROVAL:'#C47D00',MAINTENANCE:'#C47D00',HELD:'#C47D00',
    SUSPENDED:'#EF4444',CANCELLED:'#EF4444',REJECTED:'#EF4444',FAILED:'#EF4444',
    COMPLETED:'#1D428A',
  };
  const bg = { '#00885A':'#E0FFF6','#C47D00':'#FFF4CC','#EF4444':'#FEE2E2','#1D428A':'#EAF0FF' };
  const c  = map[s]||'#8A95AA';
  return <span style={{padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700,background:bg[c]||'#F0F2F6',color:c}}>{(s||'').replace(/_/g,' ')}</span>;
};

const Card = ({ children, style={} }) => <div style={{background:'var(--white)',borderRadius:16,padding:20,border:'1px solid var(--gray-200)',marginBottom:12,...style}}>{children}</div>;
const H = ({ children }) => <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:800,color:'var(--navy)',marginBottom:16,letterSpacing:'-0.3px'}}>{children}</div>;

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab,      setTab]      = useState('Overview');
  const [stats,    setStats]    = useState({});
  const [ops,      setOps]      = useState([]);
  const [trips,    setTrips]    = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [parcels,  setParcels]  = useState([]);
  const [alerts,   setAlerts]   = useState([]);
  const [promos,   setPromos]   = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [audit,    setAudit]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [msg,      setMsg]      = useState('');
  const [promoName,setPromoName]= useState('');

  // Quick book state
  const [qbTrip,   setQbTrip]   = useState(null);
  const [qbForm,   setQbForm]   = useState({passengerName:'',passengerPhone:'',seatNumber:'',paymentMethod:'MTN_MOMO',amount:''});

  // Vehicle form state
  const [vForm,    setVForm]    = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [s,o,t,b,p,par,al,pr,v] = await Promise.all([
        api.get('/admin/dashboard'), api.get('/operators'), api.get('/trips'),
        api.get('/bookings'), api.get('/payments'), api.get('/parcels'),
        api.get('/admin/alerts'), api.get('/promotions'), api.get('/vehicles'),
      ]);
      setStats(s.data||{}); setOps(o.data||[]); setTrips(t.data||[]);
      setBookings(b.data||[]); setPayments(p.data||[]); setParcels(par.data||[]);
      setAlerts(al.data||[]); setPromos(pr.data||[]); setVehicles(v.data||[]);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadAudit = async () => {
    try { const { data } = await api.get('/admin/audit?limit=100'); setAudit(data||[]); } catch(e) { console.error(e); }
  };

  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''), 3000); };

  const tripAction = async (id, status) => {
    try { await api.patch(`/trips/${id}`, { status }); notify(`Trip ${status.toLowerCase()}`); load(); }
    catch(e) { notify(e.response?.data?.error || 'Failed'); }
  };

  const opAction = async (id, status) => {
    try { await api.patch(`/operators/${id}`, { status }); notify(`Operator ${status.toLowerCase()}`); load(); }
    catch(e) { notify(e.response?.data?.error || 'Failed'); }
  };

  const doPayout = async (tripId) => {
    try { await api.post(`/payments/payout/${tripId}`); notify('Payout released!'); load(); }
    catch(e) { notify(e.response?.data?.error || 'Payout failed'); }
  };

  const approvePromo = async (id) => {
    if (!promoName.trim()) { notify('Enter a promo name first'); return; }
    try { await api.patch(`/promotions/${id}`, { action:'approve', promoName }); setPromoName(''); notify('Promo approved'); load(); }
    catch(e) { notify(e.response?.data?.error || 'Failed'); }
  };

  const rejectPromo = async (id) => {
    try { await api.patch(`/promotions/${id}`, { action:'reject', rejectionNote:'Does not meet requirements' }); notify('Promo rejected'); load(); }
    catch(e) { notify(e.response?.data?.error || 'Failed'); }
  };

  const doQuickBook = async () => {
    if (!qbForm.passengerName || !qbForm.passengerPhone || !qbForm.seatNumber) { notify('Fill all quick book fields'); return; }
    try {
      await api.post('/trips/quickbook', { tripId: qbTrip.id||qbTrip.id, passengerName: qbForm.passengerName, passengerPhone: qbForm.passengerPhone, seatNumber: Number(qbForm.seatNumber), paymentMethod: qbForm.paymentMethod, amount: Number(qbForm.amount)||undefined });
      setQbTrip(null); setQbForm({passengerName:'',passengerPhone:'',seatNumber:'',paymentMethod:'MTN_MOMO',amount:''});
      notify('Booking created!'); load();
    } catch(e) { notify(e.response?.data?.error || 'Quick book failed'); }
  };

  const saveVehicle = async () => {
    if (!vForm?.registration || !vForm?.make || !vForm?.model) { notify('Registration, make and model required'); return; }
    try {
      if (vForm.id) await api.patch(`/vehicles/${vForm.id}`, vForm);
      else await api.post('/vehicles', { ...vForm, isRaylane: true });
      setVForm(null); notify('Vehicle saved'); load();
    } catch(e) { notify(e.response?.data?.error || 'Failed to save vehicle'); }
  };

  const markAlertRead = async (id) => {
    try { await api.patch('/admin/alerts', {}, { params:{id} }); load(); } catch(e) { console.error(e); }
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:12,background:'var(--gray-50)'}}>
      <Spinner size={40}/><div style={{fontSize:14,color:'var(--gray-400)'}}>Loading Raylane Admin…</div>
    </div>
  );

  const inp = {width:'100%',height:42,padding:'0 12px',border:'1.5px solid var(--gray-200)',borderRadius:10,fontSize:14,outline:'none',background:'var(--white)'};
  const lbl = {fontSize:11,fontWeight:700,color:'var(--gray-600)',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:4};
  const unread = alerts.filter(a=>!a.read).length;

  return (
    <div style={{minHeight:'100vh',background:'var(--gray-50)',display:'flex',flexDirection:'column'}}>

      {/* TOPBAR */}
      <div style={{background:'linear-gradient(90deg,var(--navy-dark),var(--navy))',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:58,position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 12px rgba(16,32,72,0.3)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{background:'var(--gold)',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontWeight:900,fontSize:14,color:'var(--navy-dark)',flexShrink:0}}>RL</div>
          <div>
            <div style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:800,color:'white',lineHeight:1,letterSpacing:'-0.3px'}}>Raylane Admin</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.5)'}}>{user?.email}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {unread>0&&<span style={{background:'var(--red)',color:'white',borderRadius:99,padding:'3px 9px',fontSize:12,fontWeight:700}}>{unread}</span>}
          <Btn variant='ghost' onClick={logout} style={{color:'white',borderColor:'rgba(255,255,255,0.25)',padding:'7px 14px',fontSize:12}}>Sign Out</Btn>
        </div>
      </div>

      {/* TABS */}
      <div style={{background:'var(--white)',borderBottom:'1px solid var(--gray-200)',display:'flex',overflowX:'auto',padding:'0 16px'}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>{setTab(t);if(t==='Audit')loadAudit();}}
            style={{padding:'13px 14px',border:'none',borderBottom:`2px solid ${t===tab?'var(--gold)':'transparent'}`,background:'transparent',color:t===tab?'var(--navy)':'var(--gray-400)',fontWeight:t===tab?700:500,fontSize:13,cursor:'pointer',whiteSpace:'nowrap',fontFamily:'var(--font-body)'}}>
            {t}{t==='Alerts'&&unread>0?` (${unread})`:''}
          </button>
        ))}
      </div>

      {msg&&<div style={{background:'var(--gold)',color:'var(--navy-dark)',padding:'10px 24px',fontWeight:700,fontSize:13,textAlign:'center'}}>{msg}</div>}

      <div style={{padding:'20px',flex:1,maxWidth:1100,margin:'0 auto',width:'100%'}}>

        {/* ── OVERVIEW ── */}
        {tab==='Overview'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10,marginBottom:20}}>
              {[
                ['🚌','Live Trips',stats.live_trips||0,'gold'],
                ['⏳','Pending Trips',stats.pending_trips||0,'red'],
                ['🎫','Bookings Today',stats.bookings_today||0,'navy'],
                ['📋','Total Bookings',stats.total_bookings||0,'navy'],
                ['🏢','Active Operators',stats.active_operators||0,'gold'],
                ['⚠️','Pending Operators',stats.pending_operators||0,'red'],
                ['🚐','Fleet Vehicles',stats.active_vehicles||0,'gold'],
                ['🔧','In Maintenance',stats.vehicles_in_maintenance||0,'red'],
                ['📦','Active Parcels',stats.active_parcels||0,'navy'],
                ['🏷️','Pending Promos',stats.pending_promos||0,'red'],
                ['⭐','Raylane Fleet',stats.raylane_fleet_count||0,'gold'],
                ['🔔','Unread Alerts',unread,'red'],
              ].map(([icon,label,val,color])=>(
                <div key={label} style={{background:'var(--white)',borderRadius:14,padding:14,border:`2px solid ${color==='gold'?'var(--gold-light)':color==='red'?'var(--red-light)':'var(--gray-100)'}`,textAlign:'center'}}>
                  <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
                  <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:900,color:`var(--${color==='gold'?'gold-dark':color==='red'?'red':'navy'})`}}>{val}</div>
                  <div style={{fontSize:10,color:'var(--gray-400)',fontWeight:500,lineHeight:1.3}}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Card>
                <H>Revenue</H>
                {[['Total Revenue',formatUGX(stats.total_revenue||0)],['Commission',formatUGX(stats.total_commission||0)],['Held (pending payout)',formatUGX(stats.held_balance||0)]].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--gray-100)'}}>
                    <span style={{fontSize:13,color:'var(--gray-600)'}}>{k}</span>
                    <span style={{fontWeight:700,color:'var(--navy)',fontSize:14}}>{v}</span>
                  </div>
                ))}
              </Card>
              <Card>
                <H>Quick Actions</H>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <Btn full onClick={()=>setTab('Fleet')} style={{background:'var(--navy)',color:'white'}}>🚐 Manage Raylane Fleet</Btn>
                  <Btn full onClick={()=>setTab('Trips')} style={{background:'var(--gold)',color:'var(--navy-dark)'}}>✅ Approve Pending Trips</Btn>
                  <Btn full onClick={()=>setTab('Payments')} variant='ghost'>💰 Release Payouts</Btn>
                  <Btn full onClick={()=>setTab('Promos')} variant='ghost'>🏷️ Review Promotions</Btn>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── FLEET ── */}
        {tab==='Fleet'&&(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <H>Raylane Fleet</H>
              <Btn onClick={()=>setVForm({registration:'',make:'',model:'',year:'',vehicleType:'COACH',capacity:67,purchasePrice:'',nextServiceDate:'',insuranceExpiry:'',fitnessExpiry:'',notes:''})}>+ Add Vehicle</Btn>
            </div>
            {vForm&&(
              <Card style={{border:'2px solid var(--gold)',marginBottom:20}}>
                <H>{vForm.id?'Edit Vehicle':'Add New Vehicle to Raylane Fleet'}</H>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  {[['Registration *','registration','text','e.g. UAA 001A'],['Make *','make','text','e.g. Yutong'],['Model *','model','text','e.g. ZK6900'],['Year','year','number','2022'],['Capacity','capacity','number','67'],['Purchase Price (UGX)','purchasePrice','number','220000000']].map(([label,key,type,ph])=>(
                    <div key={key}>
                      <label style={lbl}>{label}</label>
                      <input value={vForm[key]||''} onChange={e=>setVForm(f=>({...f,[key]:e.target.value}))} type={type} placeholder={ph} style={inp}/>
                    </div>
                  ))}
                  <div>
                    <label style={lbl}>Vehicle Type</label>
                    <select value={vForm.vehicleType||'COACH'} onChange={e=>setVForm(f=>({...f,vehicleType:e.target.value}))} style={{...inp,cursor:'pointer'}}>
                      {['COACH','MINI_BUS','SHUTTLE','TAXI'].map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  {[['Next Service Date','nextServiceDate','date'],['Insurance Expiry','insuranceExpiry','date'],['Fitness Expiry','fitnessExpiry','date']].map(([label,key,type])=>(
                    <div key={key}>
                      <label style={lbl}>{label}</label>
                      <input value={vForm[key]||''} onChange={e=>setVForm(f=>({...f,[key]:e.target.value}))} type={type} style={inp}/>
                    </div>
                  ))}
                </div>
                <div style={{marginBottom:12}}>
                  <label style={lbl}>Notes</label>
                  <textarea value={vForm.notes||''} onChange={e=>setVForm(f=>({...f,notes:e.target.value}))} style={{...inp,height:60,padding:'8px 12px',resize:'vertical'}}/>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <Btn onClick={saveVehicle} style={{background:'var(--gold)',color:'var(--navy-dark)'}}>💾 Save</Btn>
                  <Btn variant='ghost' onClick={()=>setVForm(null)}>Cancel</Btn>
                </div>
              </Card>
            )}
            {vehicles.filter(v=>v.is_raylane_fleet).map(v=>(
              <Card key={v.id} style={{borderLeft:`4px solid ${v.status==='MAINTENANCE'?'var(--gold)':v.status==='ACTIVE'?'var(--green)':'var(--gray-300)'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                  <div>
                    <div style={{fontFamily:'var(--font-display)',fontSize:17,fontWeight:800,color:'var(--navy)',display:'flex',alignItems:'center',gap:8}}>
                      {v.registration} <SBadge s={v.status}/>
                    </div>
                    <div style={{fontSize:12,color:'var(--gray-400)',marginTop:3}}>{v.make} {v.model} {v.year} · {v.vehicle_type} · {v.capacity} seats</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:10,color:'var(--gray-400)'}}>Net Profit</div>
                    <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,color:(v.net_profit||0)>=0?'var(--green)':'var(--red)'}}>{formatUGX(v.net_profit||0)}</div>
                    <div style={{fontSize:10,color:'var(--gray-400)'}}>ROI: {v.roi_percent||0}%</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:10}}>
                  {[['Revenue',formatUGX(v.total_revenue||0)],['Trips',v.total_trips||0],['Maintenance',formatUGX(v.maintenance_cost||0)],['Mileage',`${(v.current_mileage||0).toLocaleString()}km`]].map(([k,val])=>(
                    <div key={k} style={{background:'var(--gray-50)',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:'var(--gray-400)'}}>{k}</div>
                      <div style={{fontWeight:700,color:'var(--navy)',fontSize:13}}>{val}</div>
                    </div>
                  ))}
                </div>
                {(v.service_due_soon||v.insurance_expiring||v.fitness_expiring)&&(
                  <div style={{background:'var(--gold-light)',border:'1px solid var(--gold)',borderRadius:8,padding:'7px 12px',fontSize:12,color:'#92600A',marginBottom:10}}>
                    ⚠️ {[v.service_due_soon&&'Service due soon',v.insurance_expiring&&'Insurance expiring',v.fitness_expiring&&'Fitness cert expiring'].filter(Boolean).join(' · ')}
                  </div>
                )}
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <Btn variant='ghost' onClick={()=>setVForm({...v,vehicleType:v.vehicle_type,purchasePrice:v.purchase_price,nextServiceDate:v.next_service_date,insuranceExpiry:v.insurance_expiry,fitnessExpiry:v.fitness_expiry,lastServiceDate:v.last_service_date,currentMileage:v.current_mileage,maintenanceCost:v.maintenance_cost})}>✏️ Edit</Btn>
                  {v.status==='ACTIVE'&&<Btn variant='danger' onClick={()=>api.patch(`/vehicles/${v.id}`,{status:'MAINTENANCE'}).then(()=>{notify('Set to maintenance');load();})}>🔧 Maintenance</Btn>}
                  {v.status==='MAINTENANCE'&&<Btn onClick={()=>api.patch(`/vehicles/${v.id}`,{status:'ACTIVE'}).then(()=>{notify('Set to active');load();})} style={{background:'var(--green)',color:'var(--navy)'}}>✅ Activate</Btn>}
                </div>
              </Card>
            ))}
            {vehicles.filter(v=>v.is_raylane_fleet).length===0&&<Empty icon='🚐' text='No Raylane fleet vehicles yet. Add your first above.'/>}
          </div>
        )}

        {/* ── OPERATORS ── */}
        {tab==='Operators'&&(
          <div>
            <H>Operator Management</H>
            {ops.map(o=>(
              <Card key={o.id}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15,color:'var(--navy)',display:'flex',alignItems:'center',gap:8}}>
                      {o.name} {o.is_raylane_fleet&&<span style={{background:'var(--gold)',color:'var(--navy-dark)',fontSize:10,fontWeight:800,padding:'2px 8px',borderRadius:99}}>⭐ RAYLANE</span>}
                      <SBadge s={o.status}/>
                    </div>
                    <div style={{fontSize:12,color:'var(--gray-400)',marginTop:3}}>{o.email} · Commission: {o.commission_rate}% · Code: {o.merchant_code||'—'}</div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    {o.status==='PENDING'&&<Btn onClick={()=>opAction(o.id,'ACTIVE')} style={{background:'var(--green)',color:'var(--navy)'}}>Approve</Btn>}
                    {o.status==='ACTIVE'&&<Btn variant='danger' onClick={()=>opAction(o.id,'SUSPENDED')}>Suspend</Btn>}
                    {o.status==='SUSPENDED'&&<Btn onClick={()=>opAction(o.id,'ACTIVE')}>Restore</Btn>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── TRIPS ── */}
        {tab==='Trips'&&(
          <div>
            <H>Trip Management ({trips.length})</H>
            {qbTrip&&(
              <Card style={{border:'2px solid var(--gold)',marginBottom:16}}>
                <H>⚡ Quick Book — {qbTrip.from||qbTrip.from_city} → {qbTrip.to||qbTrip.to_city}</H>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                  {[['Passenger Name','passengerName','text'],['Phone','passengerPhone','tel'],['Seat Number','seatNumber','number'],['Amount (UGX, optional)','amount','number']].map(([label,key,type])=>(
                    <div key={key}>
                      <label style={lbl}>{label}</label>
                      <input value={qbForm[key]} onChange={e=>setQbForm(f=>({...f,[key]:e.target.value}))} type={type} placeholder={key==='amount'?`Default: ${formatUGX(qbTrip.price)}`:''}  style={inp}/>
                    </div>
                  ))}
                  <div>
                    <label style={lbl}>Payment Method</label>
                    <select value={qbForm.paymentMethod} onChange={e=>setQbForm(f=>({...f,paymentMethod:e.target.value}))} style={{...inp,cursor:'pointer'}}>
                      {['MTN_MOMO','AIRTEL_MOMO','CASH','CARD'].map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <Btn onClick={doQuickBook} style={{background:'var(--gold)',color:'var(--navy-dark)'}}>📋 Confirm Booking</Btn>
                  <Btn variant='ghost' onClick={()=>setQbTrip(null)}>Cancel</Btn>
                </div>
              </Card>
            )}
            {trips.map(t=>(
              <Card key={t.id}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14,color:'var(--navy)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                      {t.from||t.from_city} → {t.to||t.to_city}
                      <SBadge s={t.status}/>
                      {t.isRaylane&&<span style={{background:'var(--gold)',color:'var(--navy-dark)',fontSize:10,fontWeight:800,padding:'2px 8px',borderRadius:99}}>⭐</span>}
                    </div>
                    <div style={{fontSize:12,color:'var(--gray-400)',marginTop:3}}>
                      {(t.departureTime||t.departure_time)?new Date(t.departureTime||t.departure_time).toLocaleString('en-UG',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):''}
                      {' · '}{t.operatorName||'—'}{' · '}{formatUGX(t.price)}{' · '}{t.booked_seats||0}/{t.total_seats} booked
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end',marginLeft:10}}>
                    {t.status==='PENDING'&&<>
                      <Btn onClick={()=>tripAction(t.id,'LIVE')} style={{background:'var(--green)',color:'var(--navy)',padding:'7px 12px',fontSize:12}}>✅ Approve</Btn>
                      <Btn variant='danger' onClick={()=>tripAction(t.id,'REJECTED')} style={{padding:'7px 12px',fontSize:12}}>❌ Reject</Btn>
                    </>}
                    {['LIVE','APPROVED'].includes(t.status)&&<>
                      <Btn onClick={()=>setQbTrip(t)} style={{background:'var(--gold)',color:'var(--navy-dark)',padding:'7px 12px',fontSize:12}}>⚡ Quick Book</Btn>
                      <Btn variant='ghost' onClick={()=>doPayout(t.id)} style={{padding:'7px 12px',fontSize:12}}>💰 Payout</Btn>
                    </>}
                  </div>
                </div>
              </Card>
            ))}
            {!trips.length&&<Empty icon='🚌' text='No trips yet'/>}
          </div>
        )}

        {/* ── BOOKINGS ── */}
        {tab==='Bookings'&&(
          <div>
            <H>All Bookings ({bookings.length})</H>
            {bookings.map(b=>(
              <Card key={b.id} style={{padding:'12px 16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:'var(--navy)',display:'flex',gap:8,alignItems:'center'}}>
                      {b.passengerName||b.passenger_name} — {b.route||'—'} <SBadge s={b.status}/>
                    </div>
                    <div style={{fontSize:11,color:'var(--gray-400)',marginTop:3}}>
                      Seat #{b.seatNumber||b.seat_number} · {b.ticketCode||b.ticket_code} · Paid {formatUGX(b.amountPaid||b.amount_paid)} {(b.balanceDue||b.balance_due)>0&&`· Balance: ${formatUGX(b.balanceDue||b.balance_due)}`} · {b.payment_method}
                    </div>
                  </div>
                  <div style={{fontSize:11,color:'var(--gray-400)'}}>{b.created_at?new Date(b.created_at).toLocaleDateString('en-UG'):''}</div>
                </div>
              </Card>
            ))}
            {!bookings.length&&<Empty icon='🎫' text='No bookings yet'/>}
          </div>
        )}

        {/* ── PAYMENTS ── */}
        {tab==='Payments'&&(
          <div>
            <H>Payments & Payouts</H>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
              {[['Total Revenue',formatUGX(payments.reduce((s,p)=>s+(p.amount||0),0)),'💰'],
                ['Commission',formatUGX(payments.reduce((s,p)=>s+(p.commission||0),0)),'📊'],
                ['Held Balance',formatUGX(payments.filter(p=>p.status==='HELD').reduce((s,p)=>s+(p.operatorNet||p.operator_net||0),0)),'🔐']].map(([l,v,i])=>(
                <Card key={l} style={{textAlign:'center',padding:14}}>
                  <div style={{fontSize:20}}>{i}</div>
                  <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:900,color:'var(--navy)'}}>{v}</div>
                  <div style={{fontSize:11,color:'var(--gray-400)'}}>{l}</div>
                </Card>
              ))}
            </div>
            {payments.map(p=>(
              <Card key={p.id} style={{padding:'12px 16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:'var(--navy)',display:'flex',gap:8,alignItems:'center'}}>
                      {p.operatorName||'—'} · {p.route||'—'} <SBadge s={p.status}/>
                    </div>
                    <div style={{fontSize:11,color:'var(--gray-400)',marginTop:3}}>
                      {p.passengerName} · Amount {formatUGX(p.amount)} · Net {formatUGX(p.operatorNet||p.operator_net)} · Comm {formatUGX(p.commission)} · {p.method}
                    </div>
                  </div>
                  {p.status==='HELD'&&<Btn onClick={()=>doPayout(p.trip_id)} style={{background:'var(--green)',color:'var(--navy)',padding:'7px 12px',fontSize:12}}>Release</Btn>}
                </div>
              </Card>
            ))}
            {!payments.length&&<Empty icon='💳' text='No payments yet'/>}
          </div>
        )}

        {/* ── PARCELS ── */}
        {tab==='Parcels'&&(
          <div>
            <H>Parcel Management ({parcels.length})</H>
            {parcels.map(p=>(
              <Card key={p.id} style={{padding:'12px 16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:'var(--navy)',display:'flex',gap:8,alignItems:'center'}}>
                      {p.parcel_ref} — {p.destination} <SBadge s={p.status}/>
                    </div>
                    <div style={{fontSize:11,color:'var(--gray-400)',marginTop:3}}>
                      {p.sender_phone} → {p.recipient_phone} · {p.parcel_type} · {formatUGX(p.total_fee)} {p.insured&&`· Insured (${formatUGX(p.insurance_fee)})`}
                    </div>
                    <div style={{fontSize:10,color:'var(--gray-300)',fontFamily:'monospace',marginTop:2}}>Track: {p.tracking_code}</div>
                  </div>
                  <select onChange={e=>{ if(e.target.value) api.patch(`/parcels/${p.id}`,{status:e.target.value}).then(()=>{load();notify('Status updated');});}}
                    style={{padding:'6px 10px',border:'1.5px solid var(--gray-200)',borderRadius:8,fontSize:12,cursor:'pointer',background:'white'}}>
                    <option value=''>Update…</option>
                    {['PICKUP_REQUESTED','PICKED_UP','VERIFIED','LOADED','IN_TRANSIT','ARRIVED','DELIVERED','FAILED'].map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                  </select>
                </div>
              </Card>
            ))}
            {!parcels.length&&<Empty icon='📦' text='No parcels yet'/>}
          </div>
        )}

        {/* ── PROMOS ── */}
        {tab==='Promos'&&(
          <div>
            <H>Promotion Approvals</H>
            {promos.filter(p=>p.status==='PENDING_APPROVAL').map(p=>(
              <Card key={p.id} style={{border:'2px solid var(--gold)'}}>
                <div style={{fontWeight:700,fontSize:14,color:'var(--navy)',marginBottom:6}}>
                  ⏳ {p.route_from||p.routeFrom} → {p.route_to||p.routeTo} — {p.discount_type||p.discountType}: {p.discount_value||p.discountValue}{(p.discount_type||p.discountType)==='PERCENTAGE'?'%':' UGX'} off
                </div>
                <div style={{fontSize:12,color:'var(--gray-400)',marginBottom:10}}>{p.operators?.name||'—'} · {p.start_date||p.startDate} to {p.end_date||p.endDate}</div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input value={promoName} onChange={e=>setPromoName(e.target.value)} placeholder='Enter promo name to approve (e.g. Weekend Saver)' style={{...inp,flex:1}}/>
                  <Btn onClick={()=>approvePromo(p.id)} style={{background:'var(--green)',color:'var(--navy)'}}>✅ Approve</Btn>
                  <Btn variant='danger' onClick={()=>rejectPromo(p.id)}>❌ Reject</Btn>
                </div>
              </Card>
            ))}
            <H>All Promotions</H>
            {promos.map(p=>(
              <Card key={p.id} style={{padding:'12px 16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:'var(--navy)',display:'flex',gap:8,alignItems:'center'}}>
                      {p.promo_name||p.promoName||'(unnamed)'} — {p.route_from||p.routeFrom}→{p.route_to||p.routeTo} <SBadge s={p.status}/>
                    </div>
                    <div style={{fontSize:11,color:'var(--gray-400)',marginTop:3}}>{p.discount_type||p.discountType}: {p.discount_value||p.discountValue}{(p.discount_type||p.discountType)==='PERCENTAGE'?'%':' UGX'} · {p.start_date||p.startDate} to {p.end_date||p.endDate}</div>
                  </div>
                  {p.status==='APPROVED'&&<Btn variant='danger' onClick={()=>api.patch(`/promotions/${p.id}`,{action:'disable'}).then(()=>{notify('Disabled');load();})} style={{padding:'6px 12px',fontSize:12}}>Disable</Btn>}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── ALERTS ── */}
        {tab==='Alerts'&&(
          <div>
            <H>System Alerts</H>
            {[['CRITICAL','var(--red)'],['HIGH','var(--gold-dark)'],['NORMAL','var(--navy)'],['LOW','var(--gray-400)']].map(([priority,color])=>{
              const filtered=alerts.filter(a=>a.priority===priority);
              if(!filtered.length)return null;
              return(
                <div key={priority}>
                  <div style={{fontSize:11,fontWeight:700,color,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8,marginTop:12}}>{priority}</div>
                  {filtered.map(a=>(
                    <Card key={a.id} style={{opacity:a.read?0.5:1,borderLeft:`4px solid ${color}`,padding:'12px 16px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div>
                          <div style={{fontSize:13,color:'var(--navy)',fontWeight:a.read?400:600}}>{a.message}</div>
                          <div style={{fontSize:11,color:'var(--gray-400)',marginTop:2}}>{a.type} · {a.created_at?new Date(a.created_at).toLocaleString('en-UG'):''}</div>
                        </div>
                        {!a.read&&<Btn variant='ghost' onClick={()=>markAlertRead(a.id)} style={{padding:'5px 10px',fontSize:11}}>Mark Read</Btn>}
                      </div>
                    </Card>
                  ))}
                </div>
              );
            })}
            {!alerts.length&&<Empty icon='🔔' text='No alerts'/>}
          </div>
        )}

        {/* ── AUDIT ── */}
        {tab==='Audit'&&(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <H>Audit Log</H>
              <Btn variant='ghost' onClick={loadAudit}>🔄 Refresh</Btn>
            </div>
            {audit.map(a=>(
              <Card key={a.id} style={{padding:'10px 14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <span style={{fontFamily:'monospace',fontSize:11,background:'var(--gray-100)',padding:'2px 8px',borderRadius:4,marginRight:8}}>{a.action}</span>
                    <span style={{fontSize:12,color:'var(--navy)'}}>{a.actor_email}</span>
                    {a.entity_type&&<span style={{fontSize:11,color:'var(--gray-400)',marginLeft:6}}>on {a.entity_type}</span>}
                  </div>
                  <div style={{fontSize:11,color:'var(--gray-400)'}}>{a.created_at?new Date(a.created_at).toLocaleString('en-UG'):''}</div>
                </div>
              </Card>
            ))}
            {!audit.length&&<Empty icon='📋' text='Click Refresh to load audit entries'/>}
          </div>
        )}
      </div>
    </div>
  );
}
