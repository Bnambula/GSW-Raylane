import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Btn, Empty, Spinner, formatUGX } from '../../components/UI';

const TABS = ['Dashboard','Fleet','Operators','Trips','Bookings','Payments','Parcels','Promotions','Alerts','Audit'];

const sc = { // shared card style
  card: {background:'var(--white)',borderRadius:'var(--radius-lg)',padding:20,border:'1px solid var(--gray-200)',marginBottom:12},
  row:  {display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--gray-100)'},
  th:   {fontSize:11,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'0.06em'},
  badge:(color)=>({display:'inline-block',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700,background:`var(--${color}-light,#eee)`,color:`var(--${color},#333)`}),
};

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [tab, setTab] = useState('Dashboard');
  const [stats,     setStats]     = useState({});
  const [operators, setOperators] = useState([]);
  const [trips,     setTrips]     = useState([]);
  const [bookings,  setBookings]  = useState([]);
  const [payments,  setPayments]  = useState([]);
  const [parcels,   setParcels]   = useState([]);
  const [alerts,    setAlerts]    = useState([]);
  const [promos,    setPromos]    = useState([]);
  const [vehicles,  setVehicles]  = useState([]);
  const [auditLog,  setAuditLog]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [msg,       setMsg]       = useState('');

  // Modals / forms
  const [newVehicle,    setNewVehicle]    = useState(null);
  const [editVehicle,   setEditVehicle]   = useState(null);
  const [promoNameInput,setPromoNameInput]= useState('');
  const [quickBook,     setQuickBook]     = useState(null);
  const [qbForm,        setQbForm]        = useState({passengerName:'',passengerPhone:'',seatNumber:'',paymentMethod:'MTN_MOMO',amount:''});

  useEffect(()=>{ loadAll(); },[]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [stR,opR,trR,bkR,pmR,parR,alR,prR,vhR] = await Promise.all([
        api.get('/admin/dashboard'), api.get('/operators'), api.get('/trips'),
        api.get('/bookings'), api.get('/payments'), api.get('/parcels'),
        api.get('/admin/alerts'), api.get('/promotions'), api.get('/vehicles'),
      ]);
      setStats(stR.data); setOperators(opR.data); setTrips(trR.data);
      setBookings(bkR.data); setPayments(pmR.data); setParcels(parR.data);
      setAlerts(alR.data); setPromos(prR.data); setVehicles(vhR.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadAudit = async () => {
    try { const {data} = await api.get('/admin/audit?limit=100'); setAuditLog(data); } catch(e){}
  };

  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''), 3000); };

  const tripAction   = async (id,status) => { await api.patch(`/trips/${id}`,{status}); notify(`Trip ${status}`); loadAll(); };
  const opAction     = async (id,status) => { await api.patch(`/operators/${id}`,{status}); notify(`Operator ${status}`); loadAll(); };
  const approvePromo = async (id) => { if(!promoNameInput.trim())return notify('Enter promo name first'); await api.patch(`/promotions/${id}`,{action:'approve',promoName:promoNameInput}); setPromoNameInput(''); notify('Promo approved'); loadAll(); };
  const rejectPromo  = async (id) => { await api.patch(`/promotions/${id}`,{action:'reject',rejectionNote:'Does not meet requirements'}); notify('Promo rejected'); loadAll(); };
  const payout       = async (id) => { try{ await api.post(`/payments/payout/${id}`); notify('Payout released!'); loadAll(); }catch(e){ notify(e.response?.data?.error||'Payout failed'); } };
  const readAlert    = async (id) => { await api.patch('/admin/alerts',{},{params:{id}}); loadAll(); };
  const vehicleStatusUpdate = async (id,status) => { await api.patch(`/vehicles/${id}`,{status}); notify(`Vehicle set to ${status}`); loadAll(); };
  const saveVehicle  = async (form,isEdit) => {
    try {
      if (isEdit) await api.patch(`/vehicles/${form.id}`,form);
      else await api.post('/vehicles',{...form,isRaylane:true});
      setNewVehicle(null); setEditVehicle(null); notify('Vehicle saved'); loadAll();
    } catch(e) { notify(e.response?.data?.error||'Failed'); }
  };
  const doQuickBook  = async () => {
    try {
      await api.post('/trips/quickbook',{tripId:quickBook.id,...qbForm,seatNumber:Number(qbForm.seatNumber),amount:Number(qbForm.amount)||quickBook.price});
      setQuickBook(null); setQbForm({passengerName:'',passengerPhone:'',seatNumber:'',paymentMethod:'MTN_MOMO',amount:''});
      notify('Booking created!'); loadAll();
    } catch(e) { notify(e.response?.data?.error||'Quick book failed'); }
  };

  const H = ({children}) => <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:800,color:'var(--navy)',marginBottom:16,letterSpacing:'-0.3px'}}>{children}</div>;

  const statusBadge = s => {
    const map = {ACTIVE:'green',LIVE:'green',CONFIRMED:'green',DELIVERED:'green',APPROVED:'green',RELEASED:'green',PENDING:'gold',PENDING_APPROVAL:'gold',MAINTENANCE:'gold',HELD:'gold',PENDING_PAYMENT:'gold',SUSPENDED:'red',CANCELLED:'red',REJECTED:'red',FAILED:'red',RETIRED:'gray'};
    const color = map[s]||'gray';
    return <span style={{padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700,background:`var(--${color}-light,#eee)`,color:color==='green'?'#00885A':color==='gold'?'#C47D00':color==='red'?'var(--red)':'#6B7A99'}}>{s?.replace(/_/g,' ')}</span>;
  };

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}><Spinner size={40}/></div>;

  return (
    <div style={{minHeight:'100vh',background:'var(--gray-50)',display:'flex',flexDirection:'column'}}>
      {/* Topbar */}
      <div style={{background:'var(--navy)',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 12px rgba(11,22,40,0.3)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{background:'var(--gold)',borderRadius:10,padding:'6px 10px',fontFamily:'var(--font-display)',fontWeight:800,fontSize:16,color:'var(--navy)'}}>RL</div>
          <div>
            <div style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:800,color:'white',letterSpacing:'-0.3px'}}>Raylane Admin</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>Control Centre</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {alerts.filter(a=>!a.read).length>0 && <span style={{background:'var(--red)',color:'white',borderRadius:99,padding:'2px 8px',fontSize:12,fontWeight:700}}>{alerts.filter(a=>!a.read).length} new</span>}
          <Btn variant='ghost' onClick={logout} style={{color:'white',borderColor:'rgba(255,255,255,0.2)',padding:'8px 16px',fontSize:13}}>Sign Out</Btn>
        </div>
      </div>

      {msg && <div style={{background:'var(--green)',color:'var(--navy)',padding:'10px 24px',fontWeight:700,fontSize:14,textAlign:'center'}}>{msg}</div>}

      {/* Tabs */}
      <div style={{background:'var(--white)',borderBottom:'1px solid var(--gray-200)',padding:'0 24px',display:'flex',gap:4,overflowX:'auto'}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>{ setTab(t); if(t==='Audit')loadAudit(); }}
            style={{padding:'14px 16px',border:'none',borderBottom:`2px solid ${tab===t?'var(--gold)':'transparent'}`,background:'transparent',color:tab===t?'var(--navy)':'var(--gray-400)',fontWeight:tab===t?700:500,fontSize:13,cursor:'pointer',fontFamily:'var(--font-body)',whiteSpace:'nowrap'}}>
            {t}{t==='Alerts'&&alerts.filter(a=>!a.read).length>0?` (${alerts.filter(a=>!a.read).length})`:''}
          </button>
        ))}
      </div>

      <div style={{padding:'24px',flex:1,maxWidth:1200,margin:'0 auto',width:'100%'}}>

        {/* ── DASHBOARD ── */}
        {tab==='Dashboard' && (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:24}}>
              {[
                ['Live Trips',        stats.live_trips||0,      '🚌','green'],
                ['Pending Trips',     stats.pending_trips||0,   '⏳','gold'],
                ['Bookings Today',    stats.bookings_today||0,  '🎫','navy'],
                ['Total Bookings',    stats.total_bookings||0,  '📋','navy'],
                ['Active Operators',  stats.active_operators||0,'🏢','green'],
                ['Pending Operators', stats.pending_operators||0,'🔔','gold'],
                ['Fleet Vehicles',    stats.active_vehicles||0, '🚐','navy'],
                ['In Maintenance',    stats.vehicles_in_maintenance||0,'🔧','gold'],
                ['Service Due',       stats.service_due_count||0,'⚠️','red'],
                ['Active Parcels',    stats.active_parcels||0,  '📦','navy'],
                ['Pending Promos',    stats.pending_promos||0,  '🏷️','gold'],
                ['Raylane Fleet',     stats.raylane_fleet_count||0,'⭐','green'],
              ].map(([l,v,i,c])=>(
                <div key={l} style={{background:'var(--white)',borderRadius:'var(--radius-lg)',padding:16,border:`2px solid var(--${c}-light,var(--gray-200))`,textAlign:'center'}}>
                  <div style={{fontSize:24,marginBottom:4}}>{i}</div>
                  <div style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:800,color:`var(--${c})`,letterSpacing:'-0.5px'}}>{v}</div>
                  <div style={{fontSize:11,color:'var(--gray-400)',fontWeight:500}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div style={sc.card}>
                <H>Revenue Summary</H>
                {[['Total Revenue',formatUGX(stats.total_revenue||0)],['Commission Earned',formatUGX(stats.total_commission||0)],['Held (Unpaid Out)',formatUGX(stats.held_balance||0)]].map(([k,v])=>(
                  <div key={k} style={sc.row}><span style={{fontSize:13,color:'var(--gray-600)'}}>{k}</span><span style={{fontWeight:700,color:'var(--navy)'}}>{v}</span></div>
                ))}
              </div>
              <div style={sc.card}>
                <H>Quick Actions</H>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <Btn variant='navy' full onClick={()=>setTab('Fleet')}>🚐 Manage Fleet</Btn>
                  <Btn variant='gold' full onClick={()=>setTab('Trips')}>✅ Approve Pending Trips</Btn>
                  <Btn variant='ghost' full onClick={()=>setTab('Payments')}>💰 Release Payouts</Btn>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── FLEET (Raylane's own vehicles) ── */}
        {tab==='Fleet' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <H>Raylane Fleet Management</H>
              <Btn onClick={()=>setNewVehicle({registration:'',make:'',model:'',year:'',vehicleType:'COACH',capacity:49,purchasePrice:'',nextServiceDate:'',insuranceExpiry:'',fitnessExpiry:'',notes:''})}>+ Add Vehicle</Btn>
            </div>

            {/* Add vehicle form */}
            {(newVehicle||editVehicle) && (
              <div style={{...sc.card,border:'2px solid var(--gold)',marginBottom:20}}>
                <H>{editVehicle?'Edit Vehicle':'Add New Vehicle'}</H>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  {[['Registration','registration','text','e.g. UAA 123B'],['Make','make','text','e.g. Toyota'],['Model','model','text','e.g. Coaster'],['Year','year','number','2022'],['Capacity','capacity','number','49'],['Purchase Price (UGX)','purchasePrice','number','85000000']].map(([label,key,type,ph])=>(
                    <div key={key}>
                      <label style={sc.th}>{label}</label>
                      <input value={(editVehicle||newVehicle)[key]||''} onChange={e=>{const v={...(editVehicle||newVehicle),[key]:e.target.value}; editVehicle?setEditVehicle(v):setNewVehicle(v);}}
                        type={type} placeholder={ph} style={{width:'100%',height:40,padding:'0 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius-md)',fontSize:14,outline:'none',marginTop:4}}/>
                    </div>
                  ))}
                  <div>
                    <label style={sc.th}>Vehicle Type</label>
                    <select value={(editVehicle||newVehicle).vehicleType} onChange={e=>{const v={...(editVehicle||newVehicle),vehicleType:e.target.value}; editVehicle?setEditVehicle(v):setNewVehicle(v);}}
                      style={{width:'100%',height:40,padding:'0 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius-md)',fontSize:14,outline:'none',marginTop:4}}>
                      {['COACH','MINI_BUS','TAXI','SHUTTLE','TRUCK','PICKUP'].map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  {[['Next Service','nextServiceDate','date'],['Insurance Expiry','insuranceExpiry','date'],['Fitness Expiry','fitnessExpiry','date']].map(([label,key,type])=>(
                    <div key={key}>
                      <label style={sc.th}>{label}</label>
                      <input value={(editVehicle||newVehicle)[key]||''} onChange={e=>{const v={...(editVehicle||newVehicle),[key]:e.target.value}; editVehicle?setEditVehicle(v):setNewVehicle(v);}}
                        type={type} style={{width:'100%',height:40,padding:'0 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius-md)',fontSize:14,outline:'none',marginTop:4}}/>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12}}>
                  <label style={sc.th}>Notes</label>
                  <textarea value={(editVehicle||newVehicle).notes||''} onChange={e=>{const v={...(editVehicle||newVehicle),notes:e.target.value}; editVehicle?setEditVehicle(v):setNewVehicle(v);}}
                    style={{width:'100%',padding:'8px 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius-md)',fontSize:14,outline:'none',marginTop:4,resize:'vertical',height:60}}/>
                </div>
                <div style={{display:'flex',gap:8,marginTop:12}}>
                  <Btn onClick={()=>saveVehicle(editVehicle||newVehicle,!!editVehicle)}>💾 Save Vehicle</Btn>
                  <Btn variant='ghost' onClick={()=>{setNewVehicle(null);setEditVehicle(null);}}>Cancel</Btn>
                </div>
              </div>
            )}

            {/* Vehicle cards */}
            {vehicles.filter(v=>v.is_raylane_fleet).map(v=>(
              <div key={v.id} style={{...sc.card,borderLeft:`4px solid ${v.status==='MAINTENANCE'?'var(--gold)':v.status==='ACTIVE'?'var(--green)':'var(--gray-300)'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                  <div>
                    <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:800,color:'var(--navy)'}}>{v.registration} {statusBadge(v.status)}</div>
                    <div style={{fontSize:13,color:'var(--gray-400)',marginTop:2}}>{v.make} {v.model} {v.year} • {v.vehicle_type} • {v.capacity} seats</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:11,color:'var(--gray-400)'}}>Net Profit</div>
                    <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:800,color:v.net_profit>=0?'var(--green)':'var(--red)'}}>{formatUGX(v.net_profit||0)}</div>
                    <div style={{fontSize:10,color:'var(--gray-400)'}}>ROI: {v.roi_percent||0}%</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
                  {[['Revenue',formatUGX(v.total_revenue||0)],['Trips',v.total_trips||0],['Maintenance',formatUGX(v.maintenance_cost||0)],['Mileage',`${(v.current_mileage||0).toLocaleString()} km`]].map(([k,val])=>(
                    <div key={k} style={{background:'var(--gray-50)',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:'var(--gray-400)'}}>{k}</div>
                      <div style={{fontWeight:700,color:'var(--navy)',fontSize:13}}>{val}</div>
                    </div>
                  ))}
                </div>
                {/* Alerts */}
                {(v.service_due_soon||v.insurance_expiring||v.fitness_expiring) && (
                  <div style={{background:'var(--gold-light)',border:'1px solid var(--gold)',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:12,color:'#92600A'}}>
                    ⚠️ {[v.service_due_soon&&'Service due soon',v.insurance_expiring&&'Insurance expiring',v.fitness_expiring&&'Fitness cert expiring'].filter(Boolean).join(' · ')}
                  </div>
                )}
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <Btn variant='ghost' onClick={()=>setEditVehicle({...v,vehicleType:v.vehicle_type,purchasePrice:v.purchase_price,nextServiceDate:v.next_service_date,insuranceExpiry:v.insurance_expiry,fitnessExpiry:v.fitness_expiry,lastServiceDate:v.last_service_date,currentMileage:v.current_mileage,maintenanceCost:v.maintenance_cost})}>✏️ Edit</Btn>
                  {v.status==='ACTIVE' && <Btn variant='danger' onClick={()=>vehicleStatusUpdate(v.id,'MAINTENANCE')}>🔧 Set Maintenance</Btn>}
                  {v.status==='MAINTENANCE' && <Btn variant='green' onClick={()=>vehicleStatusUpdate(v.id,'ACTIVE')}>✅ Back to Active</Btn>}
                  <Btn variant='ghost' onClick={()=>vehicleStatusUpdate(v.id,'RETIRED')}>🗑️ Retire</Btn>
                </div>
              </div>
            ))}
            {vehicles.filter(v=>v.is_raylane_fleet).length===0 && <Empty icon='🚐' text='No Raylane fleet vehicles yet. Add your first vehicle above.'/>}
          </div>
        )}

        {/* ── OPERATORS ── */}
        {tab==='Operators' && (
          <div>
            <H>Operator Management</H>
            {operators.map(op=>(
              <div key={op.id} style={{...sc.card,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:700,color:'var(--navy)',fontSize:15}}>
                    {op.name} {op.is_raylane_fleet&&<span style={{background:'var(--gold)',color:'var(--navy)',fontSize:10,fontWeight:800,padding:'2px 8px',borderRadius:99,marginLeft:4}}>⭐ RAYLANE</span>}
                  </div>
                  <div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>{op.email} · {op.phone} · Commission: {op.commission_rate}% · Code: {op.merchant_code||'—'}</div>
                  <div style={{marginTop:4}}>{statusBadge(op.status)}</div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  {op.status==='PENDING' && <Btn variant='green' onClick={()=>opAction(op.id,'ACTIVE')}>Approve</Btn>}
                  {op.status==='ACTIVE'  && <Btn variant='danger' onClick={()=>opAction(op.id,'SUSPENDED')}>Suspend</Btn>}
                  {op.status==='SUSPENDED'&&<Btn onClick={()=>opAction(op.id,'ACTIVE')}>Restore</Btn>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TRIPS ── */}
        {tab==='Trips' && (
          <div>
            <H>Trip Management</H>
            {/* Quick book modal */}
            {quickBook && (
              <div style={{...sc.card,border:'2px solid var(--gold)',marginBottom:16}}>
                <H>Quick Book — {quickBook.from||quickBook.from_city} → {quickBook.to||quickBook.to_city}</H>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  {[['Passenger Name','passengerName','text'],['Phone','passengerPhone','tel'],['Seat Number','seatNumber','number'],['Amount (UGX)','amount','number']].map(([label,key,type])=>(
                    <div key={key}>
                      <label style={sc.th}>{label}</label>
                      <input value={qbForm[key]} onChange={e=>setQbForm(p=>({...p,[key]:e.target.value}))} type={type} placeholder={key==='amount'?formatUGX(quickBook.price):''}
                        style={{width:'100%',height:40,padding:'0 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius-md)',fontSize:14,outline:'none',marginTop:4}}/>
                    </div>
                  ))}
                  <div>
                    <label style={sc.th}>Payment Method</label>
                    <select value={qbForm.paymentMethod} onChange={e=>setQbForm(p=>({...p,paymentMethod:e.target.value}))} style={{width:'100%',height:40,padding:'0 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius-md)',fontSize:14,outline:'none',marginTop:4}}>
                      {['MTN_MOMO','AIRTEL_MOMO','CASH','CARD','BANK'].map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,marginTop:12}}>
                  <Btn onClick={doQuickBook}>📋 Confirm Booking</Btn>
                  <Btn variant='ghost' onClick={()=>setQuickBook(null)}>Cancel</Btn>
                </div>
              </div>
            )}
            {trips.map(t=>(
              <div key={t.id} style={{...sc.card}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontWeight:700,color:'var(--navy)',fontSize:15}}>{t.from||t.from_city} → {t.to||t.to_city} {statusBadge(t.status)}</div>
                    <div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>
                      {t.departureTime||t.departure_time ? new Date(t.departureTime||t.departure_time).toLocaleString('en-UG',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}
                      {' · '}{t.operatorName||'—'} {t.isRaylane&&'⭐'}{' · '}{formatUGX(t.price)}{' · '}{t.booked_seats||0}/{t.total_seats} seats
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {t.status==='PENDING' && <>
                      <Btn variant='green' onClick={()=>tripAction(t.id,'LIVE')}>✅ Approve</Btn>
                      <Btn variant='danger' onClick={()=>tripAction(t.id,'REJECTED')}>❌ Reject</Btn>
                    </>}
                    {['LIVE','APPROVED'].includes(t.status) && <>
                      <Btn variant='gold' onClick={()=>{setQuickBook(t);setQbForm({passengerName:'',passengerPhone:'',seatNumber:'',paymentMethod:'MTN_MOMO',amount:t.price})}}>⚡ Quick Book</Btn>
                      <Btn variant='ghost' onClick={()=>tripAction(t.id,'COMPLETED')}>Complete</Btn>
                    </>}
                    <Btn variant='ghost' onClick={()=>payout(t.id)}>💰 Payout</Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── BOOKINGS ── */}
        {tab==='Bookings' && (
          <div>
            <H>All Bookings ({bookings.length})</H>
            {bookings.map(b=>(
              <div key={b.id} style={sc.card}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:'var(--navy)'}}>{b.passengerName||b.passenger_name} — {b.route||'—'} {statusBadge(b.status)}</div>
                    <div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>
                      Seat #{b.seatNumber||b.seat_number} · {b.ticketCode||b.ticket_code} · Paid {formatUGX(b.amountPaid||b.amount_paid)} {b.balanceDue>0&&`· Balance: ${formatUGX(b.balanceDue)}`} · {b.payment_method}
                    </div>
                  </div>
                  <div style={{fontSize:12,color:'var(--gray-400)'}}>{new Date(b.created_at).toLocaleDateString('en-UG')}</div>
                </div>
              </div>
            ))}
            {!bookings.length && <Empty icon='🎫' text='No bookings yet'/>}
          </div>
        )}

        {/* ── PAYMENTS ── */}
        {tab==='Payments' && (
          <div>
            <H>Payments & Payouts</H>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
              {[['Total Revenue',formatUGX(payments.reduce((s,p)=>s+(p.amount||0),0)),'💰'],
                ['Commission',   formatUGX(payments.reduce((s,p)=>s+(p.commission||0),0)),'📊'],
                ['Held Balance', formatUGX(payments.filter(p=>p.status==='HELD').reduce((s,p)=>s+(p.operatorNet||0),0)),'🔐']].map(([l,v,i])=>(
                <div key={l} style={{...sc.card,textAlign:'center'}}>
                  <div style={{fontSize:22}}>{i}</div>
                  <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:800,color:'var(--navy)'}}>{v}</div>
                  <div style={{fontSize:11,color:'var(--gray-400)'}}>{l}</div>
                </div>
              ))}
            </div>
            {payments.map(p=>(
              <div key={p.id} style={sc.card}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:'var(--navy)'}}>{p.operatorName||'—'} · {p.route||'—'} {statusBadge(p.status)}</div>
                    <div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>
                      {p.passengerName} · Paid {formatUGX(p.amount)} · Net {formatUGX(p.operatorNet||p.operator_net)} · Comm {formatUGX(p.commission)} · {p.method}
                    </div>
                  </div>
                  {p.status==='HELD' && <Btn variant='green' onClick={()=>payout(p.trip_id)}>Release Payout</Btn>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PARCELS ── */}
        {tab==='Parcels' && (
          <div>
            <H>Parcel Tracking ({parcels.length})</H>
            {parcels.map(p=>(
              <div key={p.id} style={sc.card}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:'var(--navy)'}}>{p.parcel_ref} — {p.destination} {statusBadge(p.status)}</div>
                    <div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>
                      {p.sender_phone} → {p.recipient_phone} · {p.parcel_type} · {formatUGX(p.total_fee)} {p.insured&&'· Insured ('+formatUGX(p.insurance_fee)+')'}
                    </div>
                    <div style={{fontSize:11,color:'var(--gray-300)',fontFamily:'monospace',marginTop:2}}>Track: {p.tracking_code}</div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    {['BOOKED','PICKED_UP','IN_TRANSIT'].includes(p.status) && (
                      <select onChange={e=>api.patch(`/parcels/${p.id}`,{status:e.target.value}).then(()=>{loadAll();notify('Status updated');})}
                        style={{padding:'6px 10px',border:'1.5px solid var(--gray-200)',borderRadius:8,fontSize:12,cursor:'pointer'}}>
                        <option value=''>Update Status</option>
                        {['PICKUP_REQUESTED','PICKED_UP','VERIFIED','LOADED','IN_TRANSIT','ARRIVED','DELIVERED'].map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!parcels.length && <Empty icon='📦' text='No parcels yet'/>}
          </div>
        )}

        {/* ── PROMOTIONS ── */}
        {tab==='Promotions' && (
          <div>
            <H>Promotion Approvals</H>
            {promos.filter(p=>p.status==='PENDING_APPROVAL').map(p=>(
              <div key={p.id} style={{...sc.card,border:'2px solid var(--gold)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15,color:'var(--navy)'}}>⏳ Pending — {p.route_from||p.routeFrom} → {p.route_to||p.routeTo}</div>
                    <div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>{p.discount_type||p.discountType}: {p.discount_value||p.discountValue}{p.discount_type==='PERCENTAGE'?'%':' UGX'} off · {p.start_date||p.startDate} to {p.end_date||p.endDate}</div>
                    <div style={{fontSize:12,color:'var(--gray-400)'}}>{p.operators?.name||'—'}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input value={promoNameInput} onChange={e=>setPromoNameInput(e.target.value)} placeholder='Enter promo name (required to approve)'
                    style={{flex:1,height:38,padding:'0 12px',border:'1.5px solid var(--gray-200)',borderRadius:8,fontSize:13,outline:'none'}}/>
                  <Btn variant='green' onClick={()=>approvePromo(p.id)}>✅ Approve</Btn>
                  <Btn variant='danger' onClick={()=>rejectPromo(p.id)}>❌ Reject</Btn>
                </div>
              </div>
            ))}
            <H>All Promotions</H>
            {promos.map(p=>(
              <div key={p.id} style={sc.card}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:'var(--navy)'}}>{p.promo_name||p.promoName||'(unnamed)'} — {p.route_from||p.routeFrom}→{p.route_to||p.routeTo} {statusBadge(p.status)}</div>
                    <div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>{p.discount_type||p.discountType}: {p.discount_value||p.discountValue}{p.discount_type==='PERCENTAGE'?'%':' UGX'} · {p.start_date||p.startDate} to {p.end_date||p.endDate}</div>
                  </div>
                  {p.status==='APPROVED' && <Btn variant='danger' onClick={()=>api.patch(`/promotions/${p.id}`,{action:'disable'}).then(()=>{loadAll();notify('Disabled')})}>Disable</Btn>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ALERTS ── */}
        {tab==='Alerts' && (
          <div>
            <H>System Alerts</H>
            {[['CRITICAL','red'],['HIGH','gold'],['NORMAL','navy'],['LOW','gray']].map(([priority,color])=>{
              const filtered = alerts.filter(a=>a.priority===priority);
              if(!filtered.length) return null;
              return <div key={priority}>
                <div style={{fontSize:11,fontWeight:700,color:`var(--${color})`,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>{priority} PRIORITY</div>
                {filtered.map(a=>(
                  <div key={a.id} style={{...sc.card,opacity:a.read?0.5:1,borderLeft:`4px solid var(--${color})`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>
                        <div style={{fontSize:14,color:'var(--navy)',fontWeight:a.read?400:600}}>{a.message}</div>
                        <div style={{fontSize:11,color:'var(--gray-400)',marginTop:2}}>{a.type} · {new Date(a.created_at).toLocaleString('en-UG')}</div>
                      </div>
                      {!a.read && <Btn variant='ghost' onClick={()=>readAlert(a.id)}>Mark Read</Btn>}
                    </div>
                  </div>
                ))}
              </div>;
            })}
          </div>
        )}

        {/* ── AUDIT LOG ── */}
        {tab==='Audit' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <H>Audit Log</H>
              <Btn variant='ghost' onClick={loadAudit}>🔄 Refresh</Btn>
            </div>
            {auditLog.map(a=>(
              <div key={a.id} style={{...sc.card,padding:'12px 16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <span style={{fontFamily:'monospace',fontSize:12,background:'var(--gray-100)',padding:'2px 8px',borderRadius:4,marginRight:8}}>{a.action}</span>
                    <span style={{fontSize:13,color:'var(--navy)'}}>{a.actor_email} ({a.actor_role})</span>
                    {a.entity_type && <span style={{fontSize:12,color:'var(--gray-400)',marginLeft:8}}>on {a.entity_type}</span>}
                  </div>
                  <div style={{fontSize:11,color:'var(--gray-400)'}}>{new Date(a.created_at).toLocaleString('en-UG')}</div>
                </div>
              </div>
            ))}
            {!auditLog.length && <Empty icon='📋' text='No audit entries yet. Actions will appear here.'/>}
          </div>
        )}
      </div>
    </div>
  );
}
