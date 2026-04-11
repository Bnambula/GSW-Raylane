import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { Empty } from '../../components/UI';

export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState({ vehicleType: params.get('vehicleType')||'', sortBy:'departure' });

  const from = params.get('from')||'';
  const to   = params.get('to')||'';
  const date = params.get('date')||'';

  const paramsStr = params.toString();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/trips/search', { params: Object.fromEntries(params) });
        setTrips(data);
      } catch { setTrips([]); }
      finally { setLoading(false); }
    })();
  }, [paramsStr]); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = [...trips].sort((a,b) => {
    if (filter.sortBy === 'price') return (a.effective_price||a.price) - (b.effective_price||b.price);
    if (filter.sortBy === 'seats') return (b.available_seats||b.availableSeats||0) - (a.available_seats||a.availableSeats||0);
    return new Date(a.departure_time||a.departureTime) - new Date(b.departure_time||b.departureTime);
  }).filter(t => filter.vehicleType ? (t.vehicle_type||t.vehicleType) === filter.vehicleType : true);

  const promoCount = trips.filter(t => t.promo_name||t.promoName).length;

  return (
    <div style={{ minHeight:'100vh', background:'var(--gray-50)', paddingBottom:88 }}>
      {/* Sticky header */}
      <div style={{ background:'var(--navy)', padding:'20px 20px 0', position:'sticky', top:0, zIndex:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <button onClick={() => nav('/')}
            style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:10, width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:20, cursor:'pointer' }}>
            ←
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:19, fontWeight:800, color:'white', letterSpacing:'-0.3px' }}>
              {from && to ? `${from} → ${to}` : from ? `From ${from}` : 'All Trips'}
            </div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.55)', marginTop:1 }}>
              {date || 'Any date'} · {sorted.length} trip{sorted.length !== 1 ? 's' : ''} found
              {promoCount > 0 && <span style={{ color:'var(--gold)', marginLeft:6 }}>· {promoCount} with deals 🏷️</span>}
            </div>
          </div>
          <button onClick={() => setShowFilter(f=>!f)}
            style={{ background: showFilter ? 'var(--gold)' : 'rgba(255,255,255,0.1)', border:'none', borderRadius:10, width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, cursor:'pointer', color: showFilter ? 'var(--navy)' : 'white' }}>
            ⚙
          </button>
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:'var(--radius-md)', padding:'14px 16px', marginBottom:0, display:'flex', gap:10, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:130 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Vehicle</div>
              <select value={filter.vehicleType} onChange={e => setFilter(f=>({...f,vehicleType:e.target.value}))}
                style={{ width:'100%', height:36, padding:'0 10px', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, background:'rgba(255,255,255,0.08)', color:'white', fontSize:13, fontFamily:'var(--font-body)' }}>
                <option value=''>All types</option>
                <option value='COACH'>Coach Bus</option>
                <option value='MINI_BUS'>Mini Bus</option>
              </select>
            </div>
            <div style={{ flex:1, minWidth:130 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Sort by</div>
              <select value={filter.sortBy} onChange={e => setFilter(f=>({...f,sortBy:e.target.value}))}
                style={{ width:'100%', height:36, padding:'0 10px', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, background:'rgba(255,255,255,0.08)', color:'white', fontSize:13, fontFamily:'var(--font-body)' }}>
                <option value='departure'>Departure time</option>
                <option value='price'>Lowest price</option>
                <option value='seats'>Most seats</option>
              </select>
            </div>
          </div>
        )}

        {/* Date quick-select pills */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', padding:'12px 0 0', paddingBottom:12 }}>
          {[0,1,2,3,4].map(d => {
            const dt = new Date(); dt.setDate(dt.getDate()+d);
            const val = dt.toISOString().split('T')[0];
            const label = d===0?'Today':d===1?'Tomorrow':dt.toLocaleDateString('en-UG',{weekday:'short',day:'numeric',month:'short'});
            const active = date === val;
            return (
              <button key={d} onClick={() => { const p = new URLSearchParams(params); p.set('date',val); setParams(p); }}
                style={{ flexShrink:0, padding:'6px 14px', borderRadius:99, border:`1.5px solid ${active?'var(--gold)':'rgba(255,255,255,0.2)'}`, background: active?'var(--gold)':'transparent', color: active?'var(--navy)':'rgba(255,255,255,0.8)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)', whiteSpace:'nowrap' }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div style={{ padding:'16px 16px 0' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:56 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ width:40, height:40, border:'3px solid var(--gray-200)', borderTop:'3px solid var(--gold)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <div style={{ fontSize:13, color:'var(--gray-400)' }}>Searching trips…</div>
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <Empty icon='🔍' text='No trips found. Try a different date or route.' />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {sorted.map(trip => (
              <TripCard key={trip.id} trip={trip} onClick={() => nav(`/book/${trip.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'var(--white)', borderTop:'1px solid var(--gray-200)', display:'flex', padding:'10px 0 18px', zIndex:100 }}>
        {[['🏠','Home','/'],['🔍','Search','/search'],['📦','Parcels','/parcels'],['🎫','Tickets','/track']].map(([icon,label,path])=>(
          <div key={path} onClick={()=>nav(path)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, cursor:'pointer' }}>
            <div style={{ fontSize:22 }}>{icon}</div>
            <div style={{ fontSize:10, fontWeight:500, color:window.location.pathname===path?'var(--gold)':'var(--gray-400)' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TripCard({ trip, onClick }) {
  const avail        = trip.available_seats ?? trip.availableSeats ?? 0;
  const totalSeats   = trip.total_seats     ?? trip.totalSeats     ?? 49;
  const pct          = avail / totalSeats;
  const urgency      = pct < 0.15 ? 'red' : pct < 0.45 ? 'gold' : 'green';
  const hasPromo     = !!(trip.promo_name || trip.promoName);
  const promoName    = trip.promo_name || trip.promoName;
  const effectiveP   = trip.effective_price ?? trip.price;
  const originalP    = trip.original_price ?? trip.promo_original_price ?? null;
  const discountAmt  = originalP ? originalP - effectiveP : 0;
  const discountPct  = originalP ? Math.round(discountAmt / originalP * 100) : 0;
  const departTime   = trip.departure_time  || trip.departureTime;
  const fromCity     = trip.from_city       || trip.from;
  const toCity       = trip.to_city         || trip.to;
  const opName       = trip.operator_name   || trip.operatorName || 'Raylane Express';
  const vType        = trip.vehicle_type    || trip.vehicleType;

  return (
    <div onClick={onClick}
      style={{ background:'var(--white)', borderRadius:'var(--radius-lg)', overflow:'hidden', cursor:'pointer', boxShadow: hasPromo ? '0 4px 20px rgba(245,166,35,0.18)' : 'var(--shadow-sm)', border: hasPromo ? '1.5px solid var(--gold)' : '1px solid var(--gray-200)', transition:'all 0.18s' }}>

      {/* Promo banner strip */}
      {hasPromo && (
        <div style={{ background:'linear-gradient(90deg, var(--gold) 0%, #F5C842 100%)', padding:'7px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ fontSize:14 }}>🏷️</span>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, color:'var(--navy)' }}>{promoName}</span>
            {discountPct > 0 && (
              <span style={{ background:'var(--navy)', color:'var(--gold)', fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:99 }}>{discountPct}% OFF</span>
            )}
          </div>
          <span style={{ fontSize:11, fontWeight:600, color:'var(--navy)', opacity:0.7 }}>
            {trip.conditions || trip.promo_conditions || ''}
          </span>
        </div>
      )}

      {/* Top urgency bar */}
      <div style={{ height:3, background: urgency==='green'?'var(--green)':urgency==='gold'?'var(--gold)':'var(--red)' }} />

      <div style={{ padding:16 }}>
        {/* Route + price */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:19, fontWeight:800, color:'var(--navy)', letterSpacing:'-0.4px', lineHeight:1.1 }}>
              {fromCity} <span style={{ color:'var(--gold)' }}>→</span> {toCity}
            </div>
            <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:3 }}>
              {departTime ? new Date(departTime).toLocaleTimeString('en-UG',{hour:'2-digit',minute:'2-digit'}) : ''} · {trip.duration}
            </div>
          </div>

          {/* Price block */}
          <div style={{ textAlign:'right', flexShrink:0 }}>
            {originalP && originalP !== effectiveP ? (
              <>
                <div style={{ fontSize:12, color:'var(--gray-400)', textDecoration:'line-through', lineHeight:1 }}>
                  UGX {(originalP/1000).toFixed(0)}K
                </div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, color:'var(--gold)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
                  {(effectiveP/1000).toFixed(0)}K
                </div>
                <div style={{ fontSize:10, color:'#00885A', fontWeight:700 }}>SAVE {formatDiscount(discountAmt)}</div>
              </>
            ) : (
              <>
                <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, color:'var(--gold)', letterSpacing:'-0.5px' }}>
                  {(effectiveP/1000).toFixed(0)}K
                </div>
                <div style={{ fontSize:10, color:'var(--gray-400)' }}>UGX per seat</div>
              </>
            )}
          </div>
        </div>

        {/* Operator row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ width:30, height:30, background:'var(--gold-light)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🚌</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--gray-800)' }}>{opName}</div>
              <div style={{ fontSize:11, color:'var(--gray-400)' }}>{trip.vehicle} · {vType?.replace('_',' ')}</div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
            <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:99, background: urgency==='green'?'var(--green-light)':urgency==='gold'?'var(--gold-light)':'#FEE2E2', color: urgency==='green'?'#00885A':urgency==='gold'?'#C47D00':'var(--red)' }}>
              {avail} seat{avail!==1?'s':''} left
            </span>
            {avail <= 5 && avail > 0 && <span style={{ fontSize:10, color:'var(--red)', fontWeight:700 }}>🔥 Almost full!</span>}
          </div>
        </div>

        {/* Amenities */}
        {(trip.amenities?.length > 0) && (
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:12 }}>
            {trip.amenities.map(a => (
              <span key={a} style={{ fontSize:11, background:'var(--gray-100)', color:'var(--gray-600)', padding:'3px 8px', borderRadius:99, fontWeight:500 }}>{a}</span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div style={{ background: hasPromo ? 'var(--gold)' : 'var(--navy)', borderRadius:'var(--radius-md)', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <span style={{ fontSize:14, fontWeight:800, color: hasPromo ? 'var(--navy)' : 'var(--gold)', fontFamily:'var(--font-display)' }}>
            {hasPromo ? `Book with ${promoName} Deal` : 'Select Seat & Book'}
          </span>
          <span style={{ color: hasPromo ? 'var(--navy)' : 'var(--gold)' }}>→</span>
        </div>
      </div>
    </div>
  );
}

const formatDiscount = n => `UGX ${Number(n||0).toLocaleString()}`;
