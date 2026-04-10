import React from 'react';

// ── SEAT MAP LAYOUTS ──────────────────────────────────────────────
// Coach 67-seat: 2+3 configuration (AB | aisle | CDE), rows 1-14 normal, row 15 back bench 5 across
// Mini-bus 14-seat: 2+1 config (A+B | aisle | C), rows 1-4 passengers + front row next to driver

// Builds seat layout data for a coach (67 seats)
// Row layout: A B | aisle | C D E  — rows 1-13 (65 seats) + back bench row 14 (2 seats = 67)
export function buildCoachLayout(totalSeats=67) {
  const rows = [];
  // Rows 1–13: 5 seats each (A,B,C,D,E) = 65
  for (let r = 1; r <= 13; r++) {
    rows.push([
      { num: (r-1)*5+1, label:`${r}A` },
      { num: (r-1)*5+2, label:`${r}B` },
      null, // aisle
      { num: (r-1)*5+3, label:`${r}C` },
      { num: (r-1)*5+4, label:`${r}D` },
      { num: (r-1)*5+5, label:`${r}E` },
    ]);
  }
  // Row 14: back bench — 2 seats to fill to 67
  rows.push([
    { num:66, label:'14A' },
    { num:67, label:'14B' },
    null,
    null,
    null,
    null,
  ]);
  return rows;
}

// Builds seat layout for 14-seater minibus (2+1 config)
// Front: driver + 2 passengers alongside = 3 people but 2 passenger seats
// Rows: F(front alongside driver: 2 seats) then rows 1-4: A+B | aisle | C  = 12 seats → total 14
export function buildMinibusLayout() {
  const rows = [];
  // Front row: 2 seats alongside driver
  rows.push([
    { num:1, label:'F1', note:'front' },
    { num:2, label:'F2', note:'front' },
    null,
    null,
  ]);
  // Rows 1-4: A, B | aisle | C
  for (let r = 1; r <= 4; r++) {
    rows.push([
      { num: 2 + (r-1)*3+1, label:`${r}A` },
      { num: 2 + (r-1)*3+2, label:`${r}B` },
      null, // aisle
      { num: 2 + (r-1)*3+3, label:`${r}C` },
    ]);
  }
  return rows;
}

const SEAT_SIZE  = 36;
const SEAT_GAP   = 6;
const AISLE_W    = 20;
const LABEL_H    = 18;
const ROW_H      = SEAT_SIZE + SEAT_GAP;

function seatColor(status, selected, seatNum) {
  if (seatNum === selected)       return { bg:'#F5A623', border:'#C47D00', text:'#0B1628' };
  if (status === 'BOOKED')        return { bg:'#0B1628', border:'#0B1628', text:'rgba(255,255,255,0.7)' };
  if (status === 'LOCKED')        return { bg:'#B8C4DC', border:'#8A9DC0', text:'#4A5568' };
  if (status === 'OFFLINE')       return { bg:'#E5E8EE', border:'#C5CBD8', text:'#9AA4B8' };
  return { bg:'#E0FFF6', border:'#00C896', text:'#004D3A' }; // AVAILABLE
}

function Seat({ x, y, seatNum, label, status='AVAILABLE', selected, onClick, size=SEAT_SIZE }) {
  const c = seatColor(status, seatNum, selected);
  const canClick = status === 'AVAILABLE' || seatNum === selected;
  return (
    <g onClick={canClick ? ()=>onClick(seatNum) : undefined}
       style={{ cursor: canClick ? 'pointer' : 'default' }}>
      <rect x={x} y={y} width={size} height={size}
        rx={6} fill={c.bg} stroke={c.border} strokeWidth={seatNum===selected?2:1}/>
      {/* Headrest */}
      <rect x={x+size*0.2} y={y+2} width={size*0.6} height={size*0.28}
        rx={3} fill={c.border} opacity={0.5}/>
      <text x={x+size/2} y={y+size*0.78} textAnchor='middle'
        fontSize={9} fontWeight='700' fill={c.text} fontFamily='monospace'>
        {label}
      </text>
    </g>
  );
}

// ── COACH SEAT MAP (67 seats, 2+3) ───────────────────────────────
export function CoachSeatMap({ seats={}, selected, onSelect, totalSeats=67 }) {
  const rows = buildCoachLayout(totalSeats);
  const colW  = [SEAT_SIZE, SEAT_SIZE, AISLE_W, SEAT_SIZE, SEAT_SIZE, SEAT_SIZE];
  const totalW = colW.reduce((a,b)=>a+b,0) + SEAT_GAP*5 + 60; // +60 for row labels
  const totalH = rows.length * ROW_H + LABEL_H + 60; // +60 driver area

  return (
    <div style={{ overflowX:'auto' }}>
      <svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`}
           style={{ fontFamily:'monospace', userSelect:'none', display:'block' }}>

        {/* Bus outline */}
        <rect x={2} y={2} width={totalW-4} height={totalH-4}
          rx={16} fill='rgba(11,22,40,0.03)' stroke='#B8C4DC' strokeWidth={1.5}/>

        {/* Driver area */}
        <g transform='translate(8, 8)'>
          <rect width={44} height={44} rx={8} fill='#E8EDF5' stroke='#B8C4DC'/>
          {/* Steering wheel */}
          <circle cx={22} cy={22} r={12} fill='none' stroke='#0B1628' strokeWidth={2}/>
          <circle cx={22} cy={22} r={3} fill='#0B1628'/>
          <line x1={22} y1={10} x2={22} y2={22} stroke='#0B1628' strokeWidth={2}/>
          <line x1={22} y1={22} x2={34} y2={22} stroke='#0B1628' strokeWidth={2}/>
          <text x={22} y={44+12} textAnchor='middle' fontSize={9} fill='#6B7A99' fontWeight='700'>DRIVER</text>
        </g>

        {/* Column headers */}
        {[{x:72,l:'A'},{x:72+SEAT_SIZE+SEAT_GAP,l:'B'},{x:72+SEAT_SIZE*2+SEAT_GAP*2+AISLE_W+SEAT_GAP,l:'C'},{x:72+SEAT_SIZE*3+SEAT_GAP*3+AISLE_W+SEAT_GAP,l:'D'},{x:72+SEAT_SIZE*4+SEAT_GAP*4+AISLE_W+SEAT_GAP,l:'E'}].map(({x,l})=>(
          <text key={l} x={x+SEAT_SIZE/2} y={58} textAnchor='middle' fontSize={11} fill='#6B7A99' fontWeight='700'>{l}</text>
        ))}

        {/* Aisle label */}
        <text x={72+SEAT_SIZE*2+SEAT_GAP*2+AISLE_W/2} y={58} textAnchor='middle' fontSize={9} fill='#9AA4B8'>│</text>

        {/* Rows */}
        {rows.map((row, ri) => {
          const y = 64 + ri * ROW_H;
          let xCursor = 68;
          return (
            <g key={ri}>
              {/* Row number */}
              <text x={64} y={y+SEAT_SIZE/2+4} textAnchor='end' fontSize={9} fill='#9AA4B8' fontWeight='700'>{ri+1}</text>
              {row.map((seat, ci) => {
                const cellW = ci===0||ci===1 ? SEAT_SIZE : ci===2 ? AISLE_W : SEAT_SIZE;
                const x = xCursor;
                xCursor += cellW + (ci<5?SEAT_GAP:0);
                if (!seat) {
                  // Aisle dashes
                  if (ci===2) return <line key={ci} x1={x+AISLE_W/2} y1={y+4} x2={x+AISLE_W/2} y2={y+SEAT_SIZE-4} stroke='#E5E8EE' strokeWidth={1} strokeDasharray='3,3'/>;
                  return null;
                }
                const status = seats[seat.num]?.status || 'AVAILABLE';
                return (
                  <Seat key={ci} x={x} y={y} seatNum={seat.num} label={seat.label}
                    status={status} selected={selected} onClick={onSelect}/>
                );
              })}
            </g>
          );
        })}

        {/* Back label */}
        <text x={totalW/2} y={totalH-6} textAnchor='middle' fontSize={9} fill='#9AA4B8' fontWeight='700'>REAR</text>
      </svg>
    </div>
  );
}

// ── MINIBUS SEAT MAP (14 seats, 2+1) ─────────────────────────────
export function MinibusSeatMap({ seats={}, selected, onSelect }) {
  const rows = buildMinibusLayout();
  const totalW = 200;
  const totalH = rows.length * ROW_H + LABEL_H + 70;

  return (
    <div style={{ overflowX:'auto' }}>
      <svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`}
           style={{ fontFamily:'monospace', userSelect:'none', display:'block' }}>

        {/* Bus outline */}
        <rect x={2} y={2} width={totalW-4} height={totalH-4}
          rx={14} fill='rgba(11,22,40,0.03)' stroke='#B8C4DC' strokeWidth={1.5}/>

        {/* Driver area */}
        <g transform='translate(8, 8)'>
          <rect width={36} height={36} rx={6} fill='#E8EDF5' stroke='#B8C4DC'/>
          <circle cx={18} cy={18} r={9} fill='none' stroke='#0B1628' strokeWidth={1.5}/>
          <circle cx={18} cy={18} r={2.5} fill='#0B1628'/>
          <text x={18} y={36+12} textAnchor='middle' fontSize={8} fill='#6B7A99' fontWeight='700'>DRV</text>
        </g>

        {/* Column headers */}
        <text x={56+SEAT_SIZE/2}   y={56} textAnchor='middle' fontSize={10} fill='#6B7A99' fontWeight='700'>A</text>
        <text x={56+SEAT_SIZE+6+SEAT_SIZE/2} y={56} textAnchor='middle' fontSize={10} fill='#6B7A99' fontWeight='700'>B</text>
        <text x={56+SEAT_SIZE+6+SEAT_SIZE+AISLE_W+6+SEAT_SIZE/2} y={56} textAnchor='middle' fontSize={10} fill='#6B7A99' fontWeight='700'>C</text>

        {/* Rows */}
        {rows.map((row, ri) => {
          const y = 60 + ri * ROW_H;
          const isFront = ri === 0;
          return (
            <g key={ri}>
              {/* Row label */}
              <text x={50} y={y+SEAT_SIZE/2+4} textAnchor='end' fontSize={8} fill='#9AA4B8' fontWeight='700'>
                {isFront ? 'F' : ri}
              </text>
              {isFront ? (
                // Front row: 2 seats side-by-side next to driver
                <>
                  {row.filter(Boolean).map((seat, si) => (
                    <Seat key={si} x={56+si*(SEAT_SIZE+SEAT_GAP)} y={y} seatNum={seat.num}
                      label={seat.label} status={seats[seat.num]?.status||'AVAILABLE'}
                      selected={selected} onClick={onSelect}/>
                  ))}
                </>
              ) : (
                // Normal rows: A B [aisle] C
                <>
                  <Seat x={56} y={y} seatNum={row[0].num} label={row[0].label}
                    status={seats[row[0].num]?.status||'AVAILABLE'} selected={selected} onClick={onSelect}/>
                  <Seat x={56+SEAT_SIZE+SEAT_GAP} y={y} seatNum={row[1].num} label={row[1].label}
                    status={seats[row[1].num]?.status||'AVAILABLE'} selected={selected} onClick={onSelect}/>
                  {/* Aisle */}
                  <line x1={56+SEAT_SIZE*2+SEAT_GAP+AISLE_W/2} y1={y+4}
                        x2={56+SEAT_SIZE*2+SEAT_GAP+AISLE_W/2} y2={y+SEAT_SIZE-4}
                        stroke='#E5E8EE' strokeWidth={1} strokeDasharray='3,3'/>
                  <Seat x={56+SEAT_SIZE*2+SEAT_GAP+AISLE_W+SEAT_GAP} y={y} seatNum={row[3].num}
                    label={row[3].label} status={seats[row[3].num]?.status||'AVAILABLE'}
                    selected={selected} onClick={onSelect}/>
                </>
              )}
            </g>
          );
        })}

        <text x={totalW/2} y={totalH-6} textAnchor='middle' fontSize={8} fill='#9AA4B8' fontWeight='700'>REAR</text>
      </svg>
    </div>
  );
}

// ── SMART SEAT MAP — picks layout based on capacity ───────────────
export default function SeatMap({ seats={}, selected, onSelect, vehicleType='COACH', totalSeats=49 }) {
  const isMinibus = vehicleType==='MINI_BUS' || totalSeats<=20;

  // Legend
  const legend = [
    { color:'#E0FFF6', border:'#00C896', label:'Available' },
    { color:'#F5A623', border:'#C47D00', label:'Selected' },
    { color:'#B8C4DC', border:'#8A9DC0', label:'Locked' },
    { color:'#0B1628', border:'#0B1628', label:'Booked' },
  ];

  return (
    <div>
      {/* Legend */}
      <div style={{ display:'flex', gap:12, marginBottom:12, flexWrap:'wrap' }}>
        {legend.map(l=>(
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:14, height:14, background:l.color, border:`1.5px solid ${l.border}`, borderRadius:3 }}/>
            <span style={{ fontSize:11, color:'var(--gray-600)', fontWeight:500 }}>{l.label}</span>
          </div>
        ))}
      </div>

      {isMinibus
        ? <MinibusSeatMap seats={seats} selected={selected} onSelect={onSelect}/>
        : <CoachSeatMap seats={seats} selected={selected} onSelect={onSelect} totalSeats={totalSeats||67}/>
      }

      {/* Seat count summary */}
      <div style={{ display:'flex', gap:12, marginTop:10, fontSize:12, color:'var(--gray-400)' }}>
        {[
          ['Available', Object.values(seats).filter(s=>s.status==='AVAILABLE').length, '#00C896'],
          ['Booked',    Object.values(seats).filter(s=>s.status==='BOOKED').length,    '#0B1628'],
          ['Locked',    Object.values(seats).filter(s=>s.status==='LOCKED').length,    '#B8C4DC'],
        ].map(([l,c,col])=>(
          <span key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:col, display:'inline-block' }}/>
            {l}: <strong style={{ color:'var(--navy)' }}>{c}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
