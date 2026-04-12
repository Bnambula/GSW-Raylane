import React from 'react';

export const Btn = ({ children, variant='primary', full, onClick, disabled, type='button', style={} }) => {
  const base = { display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'var(--font-body)', fontWeight:700, borderRadius:'var(--r-md)', border:'none', cursor:disabled?'not-allowed':'pointer', transition:'all 0.18s', fontSize:14, padding:'11px 22px', lineHeight:1, opacity:disabled?0.6:1, whiteSpace:'nowrap' };
  const variants = {
    primary: { background:'var(--gold)', color:'var(--navy)' },
    navy:    { background:'var(--navy)', color:'var(--white)' },
    green:   { background:'var(--green)', color:'var(--navy)' },
    danger:  { background:'#FEE2E2', color:'var(--red)' },
    ghost:   { background:'transparent', color:'var(--navy)', border:'1.5px solid var(--gray-200)' },
    gold:    { background:'var(--gold)', color:'var(--navy)' },
  };
  return <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant]||variants.primary, width:full?'100%':'auto', ...style }}>{children}</button>;
};

export const Badge = ({ children, variant='gray' }) => {
  const v = { green:{bg:'var(--green-light)',c:'#00885A'}, gold:{bg:'var(--gold-light)',c:'var(--gold-dark)'}, red:{bg:'#FEE2E2',c:'var(--red)'}, navy:{bg:'#E8EDF5',c:'var(--navy)'}, gray:{bg:'var(--gray-100)',c:'var(--gray-600)' } };
  const s = v[variant]||v.gray;
  return <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700, background:s.bg, color:s.c }}>{children}</span>;
};

export const Stat = ({ label, value, sub, icon }) => (
  <div style={{ background:'var(--white)', borderRadius:'var(--r-lg)', padding:16, border:'1px solid var(--gray-200)', textAlign:'center' }}>
    {icon && <div style={{ fontSize:24, marginBottom:6 }}>{icon}</div>}
    <div style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:800, color:'var(--navy)' }}>{value}</div>
    <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{label}</div>
    {sub && <div style={{ fontSize:11, color:'var(--green)', fontWeight:600, marginTop:2 }}>{sub}</div>}
  </div>
);

export const Spinner = ({ size=28 }) => (
  <div style={{ width:size, height:size, border:`3px solid var(--gray-200)`, borderTop:`3px solid var(--gold)`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

export const Empty = ({ icon='📭', text='Nothing here yet' }) => (
  <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--gray-400)' }}>
    <div style={{ fontSize:40, marginBottom:10 }}>{icon}</div>
    <div style={{ fontSize:14 }}>{text}</div>
  </div>
);

export const formatUGX = n => `UGX ${Number(n||0).toLocaleString()}`;
export const formatDate = d => new Date(d).toLocaleDateString('en-UG',{day:'numeric',month:'short',year:'numeric'});
export const formatTime = d => new Date(d).toLocaleTimeString('en-UG',{hour:'2-digit',minute:'2-digit'});
export const statusColor = s => ({ LIVE:'green',ACTIVE:'green',CONFIRMED:'green',DELIVERED:'green',APPROVED:'green',BOARDED:'green', PENDING:'gold',PENDING_PAYMENT:'gold',IN_TRANSIT:'gold',HELD:'gold',PENDING_APPROVAL:'gold', SUSPENDED:'red',CANCELLED:'red',REJECTED:'red',FAILED:'red',MAINTENANCE:'gold', COMPLETED:'navy' }[s]||'gray');
