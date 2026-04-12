import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Btn, Badge, formatUGX, statusColor } from '../../components/UI';
import { QRCodeSVG } from 'qrcode.react';

export default function TrackTicket() {
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const track = async e => {
    e.preventDefault(); setLoading(true); setErr('');
    try {
      const { data: d } = await api.get(`/bookings/track/${code}`);
      setData(d);
    } catch { setErr('Booking not found. Check your ticket code.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--gray-50)', paddingBottom:80 }}>
      <div style={{ background:'var(--navy)', padding:'20px 20px 28px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
          <button onClick={() => nav('/')} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:10, width:38, height:38, color:'white', fontSize:18, cursor:'pointer' }}>←</button>
          <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color:'white' }}>My Ticket</div>
        </div>
      </div>

      <div style={{ padding:'24px 16px' }}>
        <div style={{ background:'var(--white)', borderRadius:'var(--radius-lg)', padding:20, boxShadow:'var(--shadow-sm)', marginBottom:20 }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'var(--navy)', marginBottom:16 }}>Enter Your Booking Code</h3>
          <form onSubmit={track}>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder='e.g. BK-AB1234 or RL-XXXX-XXXX'
              style={{ width:'100%', height:52, padding:'0 16px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius-md)', fontSize:16, fontFamily:'monospace', outline:'none', letterSpacing:1, marginBottom:12 }} />
            {err && <div style={{ background:'#FEE2E2', color:'var(--red)', padding:'10px 14px', borderRadius:'var(--radius-md)', marginBottom:12, fontSize:13 }}>{err}</div>}
            <Btn type='submit' full disabled={loading}>{loading ? 'Searching...' : '🔍 Find My Ticket'}</Btn>
          </form>
        </div>

        {data && (
          <div style={{ background:'var(--white)', borderRadius:'var(--radius-xl)', overflow:'hidden', boxShadow:'var(--shadow-lg)' }}>
            <div style={{ background:'var(--navy)', padding:'20px 24px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ background:'var(--gold)', borderRadius:8, padding:6, fontSize:18 }}>🚌</div>
                  <div>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'white', fontSize:16 }}>Raylane Express</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)' }}>Official E-Ticket</div>
                  </div>
                </div>
                <Badge variant={statusColor(data.status)}>{data.status}</Badge>
              </div>
              {data.trip && (
                <>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, color:'white', letterSpacing:'-0.5px' }}>{data.trip.from} → {data.trip.to}</div>
                  <div style={{ fontSize:12, color:'var(--gold)', marginTop:4 }}>
                    {new Date(data.trip.departureTime).toLocaleDateString('en-UG',{weekday:'short',day:'numeric',month:'long'})} · {new Date(data.trip.departureTime).toLocaleTimeString('en-UG',{hour:'2-digit',minute:'2-digit'})}
                  </div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:2 }}>{data.operatorName} · {data.trip.vehicle}</div>
                </>
              )}
            </div>

            <div style={{ borderTop:'2px dashed var(--gray-200)', margin:'0 16px' }} />

            <div style={{ padding:'20px 24px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                {[['Passenger', data.passengerName], ['Seat', `#${data.seatNumber}`], ['Booking ID', data.id], ['Amount Paid', formatUGX(data.amount)]].map(([k,v]) => (
                  <div key={k}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>{k}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--navy)' }}>{v}</div>
                  </div>
                ))}
              </div>
              {data.isAdvance && (
                <div style={{ background:'var(--gold-light)', borderRadius:'var(--radius-md)', padding:12, marginBottom:16, display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:13, color:'var(--navy)', fontWeight:600 }}>Balance remaining</span>
                  <span style={{ fontSize:13, color:'var(--navy)', fontWeight:800 }}>{formatUGX(data.balanceDue)}</span>
                </div>
              )}
              <div style={{ textAlign:'center', padding:16, background:'var(--gray-50)', borderRadius:'var(--radius-md)' }}>
                <QRCodeSVG value={data.ticketCode || data.id} size={150} fgColor='var(--navy)' />
                <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:8, fontFamily:'monospace' }}>{data.ticketCode}</div>
              </div>
              {data.boarded && <div style={{ textAlign:'center', marginTop:12, color:'#00885A', fontWeight:700, fontSize:14 }}>✓ Boarded</div>}
            </div>
          </div>
        )}
      </div>

      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'var(--white)', borderTop:'1px solid var(--gray-200)', display:'flex', padding:'10px 0 16px', zIndex:100 }}>
        {[['🏠','Home','/'],['🔍','Search','/search'],['📦','Parcels','/parcels'],['🎫','Tickets','/track']].map(([icon,label,path]) => (
          <div key={path} onClick={() => nav(path)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, cursor:'pointer' }}>
            <div style={{ fontSize:22 }}>{icon}</div>
            <div style={{ fontSize:10, fontWeight:500, color: window.location.pathname===path?'var(--gold)':'var(--gray-400)' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
