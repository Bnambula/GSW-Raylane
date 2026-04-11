// api/index.js — Single Vercel Function, all routes
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuid } = require('uuid');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const JWT_SECRET = process.env.JWT_SECRET || 'raylane-secret-2024';

// ── JWT ───────────────────────────────────────────────────────────
const signToken = p  => jwt.sign(p, JWT_SECRET, { expiresIn: '24h' });
const verifyTok = t  => { try { return jwt.verify(t, JWT_SECRET); } catch { return null; } };
const getUser   = req => { const t = (req.headers.authorization||'').replace('Bearer ','').trim(); return t ? verifyTok(t) : null; };
const needAuth  = (req,res) => { const u=getUser(req); if(!u){res.status(401).json({error:'Not authenticated'});return null;} return u; };
const needAdmin = (req,res) => { const u=needAuth(req,res); if(!u)return null; if(u.role!=='admin'){res.status(403).json({error:'Admin only'});return null;} return u; };
const needOp    = (req,res) => { const u=needAuth(req,res); if(!u)return null; if(!['admin','operator'].includes(u.role)){res.status(403).json({error:'Operator required'});return null;} return u; };

// ── CORS ──────────────────────────────────────────────────────────
const cors = res => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
};

// ── ROUTE MATCHER ─────────────────────────────────────────────────
// Handles :param segments, returns params object or null
function match(pattern, pathname) {
  const pp = pattern.split('/').filter(Boolean);
  const ap = pathname.split('/').filter(Boolean);
  if (pp.length !== ap.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i][0] === ':') params[pp[i].slice(1)] = decodeURIComponent(ap[i]);
    else if (pp[i] !== ap[i]) return null;
  }
  return params;
}

// ── HANDLERS ─────────────────────────────────────────────────────

async function health(req, res) {
  try {
    const { count } = await supabase.from('users').select('*',{count:'exact',head:true});
    return res.json({ status:'OK', db:'supabase', users:count });
  } catch(e) { return res.status(500).json({ status:'ERROR', error:e.message }); }
}

// AUTH ─────────────────────────────────────────────────────────────
async function login(req, res) {
  const { email, password } = req.body||{};
  if (!email||!password) return res.status(400).json({error:'Email and password required'});
  try {
    const cleanEmail = email.toLowerCase().trim();

    // Fetch user
    const {data:user, error:fetchErr} = await supabase
      .from('users').select('*').eq('email', cleanEmail).maybeSingle();
    if (fetchErr) return res.status(500).json({error:'Database error: '+fetchErr.message});
    if (!user)    return res.status(401).json({error:'Invalid credentials'});
    if (!user.password_hash) return res.status(500).json({error:'Account has no password — re-run supabase_seed.sql'});

    // PRIMARY: verify using Supabase pgcrypto (same engine that created the hash)
    // crypt(password, stored_hash) == stored_hash when password is correct
    const {data:checkRows, error:checkErr} = await supabase.rpc('verify_password', {
      input_password: password,
      stored_hash:    user.password_hash,
    }).maybeSingle();

    let valid = false;

    if (!checkErr && checkRows !== null) {
      // RPC succeeded — use its result
      valid = checkRows === true;
    } else {
      // Fallback: bcryptjs (works when hash starts with $2a$ or $2b$)
      try { valid = await bcrypt.compare(password, user.password_hash); }
      catch(e) { console.error('bcrypt fallback failed:', e.message); }
    }

    if (!valid) return res.status(401).json({error:'Invalid credentials'});

    const token = signToken({id:user.id,email:user.email,role:user.role,name:user.name,operatorId:user.operator_id});
    return res.json({token, user:{id:user.id,email:user.email,role:user.role,name:user.name,operatorId:user.operator_id}});
  } catch(e) {
    console.error('LOGIN ERROR:', e.message);
    return res.status(500).json({error:'Login failed — '+e.message});
  }
}

// TRIPS ────────────────────────────────────────────────────────────
async function tripsSearch(req, res) {
  const {from,to,date,vehicleType} = req.query;
  try {
    let q = supabase.from('trip_search_view').select('*');
    if (from)        q = q.ilike('from_city',`%${from}%`);
    if (to)          q = q.ilike('to_city',  `%${to}%`);
    if (date)        q = q.gte('departure_time',`${date}T00:00:00`).lte('departure_time',`${date}T23:59:59`);
    if (vehicleType) q = q.eq('vehicle_type',vehicleType);
    const {data,error} = await q;
    if (error) throw error;
    return res.json(data||[]);
  } catch(e) { return res.status(500).json({error:e.message}); }
}

async function tripsGetAll(req, res) {
  const u = needOp(req,res); if(!u) return;
  try {
    let q = supabase.from('trips').select('*, operators(name)').order('departure_time');
    if (u.role!=='admin') q = q.eq('operator_id',u.operatorId);
    const {data,error} = await q; if(error) throw error;
    return res.json((data||[]).map(t=>({...t,from:t.from_city,to:t.to_city,departureTime:t.departure_time,operatorName:t.operators?.name})));
  } catch(e) { return res.status(500).json({error:e.message}); }
}

async function tripsCreate(req, res) {
  const u = needOp(req,res); if(!u) return;
  const {from,to,departureTime,price,vehicle,totalSeats,vehicleType,amenities} = req.body||{};
  if (!from||!to||!departureTime||!price) return res.status(400).json({error:'from, to, departureTime, price required'});
  try {
    const isAdmin = u.role==='admin';
    const tripId  = uuid();
    const {data:trip,error} = await supabase.from('trips').insert({
      id:tripId, operator_id:isAdmin?null:u.operatorId,
      from_city:from, to_city:to, departure_time:departureTime,
      price:Number(price), vehicle:vehicle||'', total_seats:Number(totalSeats)||49,
      vehicle_type:vehicleType||'COACH', amenities:amenities||[], status:isAdmin?'LIVE':'PENDING', booked_seats:0,
    }).select().single();
    if(error) throw error;
    const seats = Array.from({length:trip.total_seats},(_,i)=>({trip_id:tripId,seat_number:i+1,status:'AVAILABLE'}));
    await supabase.from('seats').insert(seats);
    if(!isAdmin) await supabase.from('alerts').insert({type:'APPROVAL',message:`New trip pending: ${from}→${to}`,entity_type:'trip',entity_id:tripId});
    return res.status(201).json({...trip,from:trip.from_city,to:trip.to_city});
  } catch(e) { return res.status(500).json({error:e.message}); }
}

async function tripById(req, res, params) {
  const {id} = params;
  if (req.method==='GET') {
    try {
      const {data,error} = await supabase.from('trip_search_view').select('*').eq('id',id).maybeSingle();
      if(error) throw error;
      if(!data) return res.status(404).json({error:'Trip not found'});
      return res.json({...data,from:data.from_city,to:data.to_city,departureTime:data.departure_time});
    } catch(e) { return res.status(500).json({error:e.message}); }
  }
  if (req.method==='PATCH') {
    const u = needAdmin(req,res); if(!u) return;
    try {
      const {data,error} = await supabase.from('trips').update({status:req.body.status}).eq('id',id).select().single();
      if(error) throw error;
      return res.json(data);
    } catch(e) { return res.status(500).json({error:e.message}); }
  }
}

// SEATS ────────────────────────────────────────────────────────────
async function seatsGet(req, res, params) {
  const {tripId} = params;
  try {
    // release expired locks
    await supabase.from('seats')
      .update({status:'AVAILABLE',locked_by:null,locked_until:null})
      .eq('trip_id',tripId).eq('status','LOCKED').lt('locked_until',new Date().toISOString());
    const {data,error} = await supabase.from('seats').select('*').eq('trip_id',tripId).order('seat_number');
    if(error) throw error;
    const map = {}; (data||[]).forEach(s=>{map[s.seat_number]=s;}); return res.json(map);
  } catch(e) { return res.status(500).json({error:e.message}); }
}

// POST /seats/:tripId/lock
async function seatsLock(req, res, params) {
  const {tripId} = params;
  const {seatNumber,sessionId} = req.body||{};
  if (!seatNumber||!sessionId) return res.status(400).json({error:'seatNumber and sessionId required'});
  try {
    const {data:seat} = await supabase.from('seats').select('*').eq('trip_id',tripId).eq('seat_number',seatNumber).maybeSingle();
    if (!seat) return res.status(404).json({error:`Seat ${seatNumber} not found`});
    if (seat.status==='BOOKED') return res.status(409).json({error:`Seat ${seatNumber} is already booked`});
    if (seat.status==='LOCKED' && seat.locked_until && new Date(seat.locked_until)>new Date())
      return res.status(409).json({error:`Seat ${seatNumber} is locked by another passenger`});
    const lockedUntil = new Date(Date.now()+5*60*1000).toISOString();
    const {error} = await supabase.from('seats').update({status:'LOCKED',locked_by:sessionId,locked_until:lockedUntil}).eq('trip_id',tripId).eq('seat_number',seatNumber);
    if(error) throw error;
    return res.json({seatNumber,lockedUntil,message:'Seat locked for 5 minutes'});
  } catch(e) { return res.status(500).json({error:e.message}); }
}

async function seatsPatch(req, res, params) {
  const u = needOp(req,res); if(!u) return;
  const {tripId} = params;
  const {seatNumber,status} = req.body||{};
  try {
    await supabase.from('seats').update({status,locked_by:null,locked_until:null}).eq('trip_id',tripId).eq('seat_number',seatNumber);
    return res.json({ok:true});
  } catch(e) { return res.status(500).json({error:e.message}); }
}

// BOOKINGS ─────────────────────────────────────────────────────────
async function bookingCreate(req, res) {
  const {tripId,passengerName,passengerPhone,seatNumber,sessionId,paymentMethod,isAdvance} = req.body||{};
  if (!tripId||!passengerName||!passengerPhone||!seatNumber||!sessionId)
    return res.status(400).json({error:'tripId, passengerName, passengerPhone, seatNumber, sessionId required'});
  try {
    const {data:trip} = await supabase.from('trip_search_view').select('*').eq('id',tripId).maybeSingle();
    if (!trip||trip.status!=='LIVE') return res.status(400).json({error:'Trip not available'});
    const {data:seat} = await supabase.from('seats').select('*').eq('trip_id',tripId).eq('seat_number',seatNumber).maybeSingle();
    if (!seat)                    return res.status(404).json({error:'Seat not found'});
    if (seat.status!=='LOCKED')   return res.status(409).json({error:'Seat not locked. Select and lock the seat first.'});
    if (seat.locked_by!==sessionId) return res.status(409).json({error:'Seat locked by another session.'});
    const basePrice     = Number(trip.effective_price||trip.price);
    const amount        = isAdvance ? Math.round(basePrice*0.2) : basePrice;
    const promoDiscount = trip.promo_original_price ? Number(trip.promo_original_price)-basePrice : 0;
    const bookingId     = uuid();
    const ticketCode    = `RL-${uuid().slice(0,4).toUpperCase()}-${uuid().slice(0,4).toUpperCase()}`;
    const {data:booking,error:bErr} = await supabase.from('bookings').insert({
      id:bookingId, trip_id:tripId, passenger_name:passengerName, passenger_phone:passengerPhone,
      seat_number:seatNumber, session_id:sessionId, status:'CONFIRMED',
      amount, full_amount:Number(trip.price), is_advance:!!isAdvance,
      balance_due:isAdvance?Number(trip.price)-amount:0,
      payment_method:paymentMethod||'MTN_MOMO', ticket_code:ticketCode, promo_discount:promoDiscount,
    }).select().single();
    if(bErr) throw bErr;
    await supabase.from('seats').update({status:'BOOKED',locked_by:null,locked_until:null,booking_id:bookingId}).eq('trip_id',tripId).eq('seat_number',seatNumber);
    await supabase.from('trips').update({booked_seats:(trip.booked_seats||0)+1}).eq('id',tripId);
    const commission = Math.round(amount*0.08);
    await supabase.from('payments').insert({id:uuid(),booking_id:bookingId,trip_id:tripId,operator_id:trip.operator_id,amount,commission,operator_net:amount-commission,status:'HELD',method:paymentMethod||'MTN_MOMO'});
    await supabase.from('alerts').insert({type:'BOOKING',message:`New booking: ${passengerName} — ${trip.from_city}→${trip.to_city} Seat #${seatNumber}`,entity_type:'booking',entity_id:bookingId});
    return res.status(201).json({bookingId,ticketCode,amount,promoDiscount,status:'CONFIRMED',passengerName,seatNumber});
  } catch(e) { console.error('BOOKING',e.message); return res.status(500).json({error:e.message}); }
}

async function bookingTrack(req, res, params) {
  const code = params.code;
  try {
    const {data,error} = await supabase.from('bookings').select('*, trips(*, operators(name))').or(`ticket_code.eq.${code},id.eq.${code}`).maybeSingle();
    if(error) throw error;
    if(!data) return res.status(404).json({error:'Booking not found'});
    return res.json({...data,passengerName:data.passenger_name,passengerPhone:data.passenger_phone,seatNumber:data.seat_number,ticketCode:data.ticket_code,
      trip:data.trips?{...data.trips,from:data.trips.from_city,to:data.trips.to_city,departureTime:data.trips.departure_time}:null,
      operatorName:data.trips?.operators?.name});
  } catch(e) { return res.status(500).json({error:e.message}); }
}

async function bookingsList(req, res) {
  const u = needOp(req,res); if(!u) return;
  try {
    let q = supabase.from('bookings').select('*').order('created_at',{ascending:false});
    if (u.role!=='admin') {
      const {data:trips} = await supabase.from('trips').select('id').eq('operator_id',u.operatorId);
      if (!trips?.length) return res.json([]);
      q = q.in('trip_id',trips.map(t=>t.id));
    }
    const {data,error} = await q; if(error) throw error;
    return res.json(data||[]);
  } catch(e) { return res.status(500).json({error:e.message}); }
}

async function bookingBoard(req, res, params) {
  const u = needOp(req,res); if(!u) return;
  try { await supabase.from('bookings').update({boarded:true}).eq('id',params.id); return res.json({ok:true}); }
  catch(e) { return res.status(500).json({error:e.message}); }
}

// PARCELS ──────────────────────────────────────────────────────────
// Parcel types with fixed pricing
const PARCEL_PRICES = { ENVELOPE:5000, SMALL:12000, LARGE:20000, HEAVY:30000 };

async function parcelCreate(req, res) {
  const {senderName,senderPhone,recipientName,recipientPhone,destination,description,
         parcelType,weight,declaredValue,insure,pickupRider,requireId,receiverIdNumber} = req.body||{};
  if (!senderPhone||!recipientPhone||!destination||!description)
    return res.status(400).json({error:'senderPhone, recipientPhone, destination, description required'});

  // Calculate fee from parcel type
  const typeKey   = (parcelType||'SMALL').toUpperCase();
  const parcelFee = PARCEL_PRICES[typeKey] || PARCEL_PRICES.SMALL;
  const riderFee  = pickupRider ? 5000 : 0;

  // Insurance: 3% of DECLARED VALUE (not transport fee)
  const declared      = Number(declaredValue)||0;
  const insuranceFee  = (insure && declared>0) ? Math.round(declared*0.03) : 0;
  const totalFee      = parcelFee + riderFee + insuranceFee;

  // Generate IDs
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const parcelId = `PCL-${dateStr}-${uuid().slice(0,4).toUpperCase()}`;
  const trackingCode = `RY${uuid().slice(0,6).toUpperCase()}`;

  try {
    const {data,error} = await supabase.from('parcels').insert({
      id: uuid(),
      sender_name:    senderName||'',
      sender_phone:   senderPhone,
      recipient_name: recipientName||'',
      recipient_phone:recipientPhone,
      destination,
      description,
      weight:         Number(weight)||0,
      status:         'BOOKED',
      fee:            totalFee,
      insurance_fee:  insuranceFee,
      insured:        !!insure,
      tracking_code:  trackingCode,
      notes: JSON.stringify({
        parcelType:typeKey, parcelFee, riderFee, insuranceFee, totalFee,
        declaredValue:declared, pickupRider:!!pickupRider,
        requireId:!!requireId, receiverIdNumber:receiverIdNumber||null,
        parcelRef: parcelId,
      }),
    }).select().single();
    if(error) throw error;
    return res.status(201).json({
      ...data,
      parcelRef:    parcelId,
      trackingCode: data.tracking_code,
      parcelType:   typeKey,
      parcelFee,    riderFee, insuranceFee,
      totalFee,     declaredValue: declared,
    });
  } catch(e) { console.error('PARCEL',e.message); return res.status(500).json({error:e.message}); }
}

async function parcelTrack(req, res, params) {
  const code = params.code;
  try {
    const {data,error} = await supabase.from('parcels').select('*').or(`tracking_code.eq.${code},id.eq.${code}`).maybeSingle();
    if(error) throw error;
    if(!data) return res.status(404).json({error:'Parcel not found. Check your tracking code.'});
    let extra = {};
    try { extra = JSON.parse(data.notes||'{}'); } catch {}
    return res.json({...data,...extra,trackingCode:data.tracking_code});
  } catch(e) { return res.status(500).json({error:e.message}); }
}

async function parcelsList(req, res) {
  const u = needOp(req,res); if(!u) return;
  try {
    const {data,error} = await supabase.from('parcels').select('*').order('created_at',{ascending:false});
    if(error) throw error;
    return res.json(data||[]);
  } catch(e) { return res.status(500).json({error:e.message}); }
}

async function parcelStatus(req, res, params) {
  const u = needOp(req,res); if(!u) return;
  try {
    const {data,error} = await supabase.from('parcels').update({status:req.body.status}).eq('id',params.id).select().single();
    if(error) throw error;
    return res.json(data);
  } catch(e) { return res.status(500).json({error:e.message}); }
}

// OPERATORS ────────────────────────────────────────────────────────
async function operatorsAll(req, res) {
  const u = needAdmin(req,res); if(!u) return;
  try {
    const {data,error} = await supabase.from('operators').select('*').order('created_at',{ascending:false});
    if(error) throw error;
    return res.json((data||[]).map(o=>({...o,merchantCode:o.merchant_code,managedByRaylane:o.managed_by_raylane})));
  } catch(e) { return res.status(500).json({error:e.message}); }
}

async function operatorMe(req, res) {
  const u = needOp(req,res); if(!u) return;
  try {
    const {data,error} = await supabase.from('operators').select('*').eq('id',u.operatorId).maybeSingle();
    if(error) throw error;
    if(!data) return res.status(404).json({error:'Operator not found'});
    return res.json({...data,merchantCode:data.merchant_code,managedByRaylane:data.managed_by_raylane});
  } catch(e) { return res.status(500).json({error:e.message}); }
}

async function operatorById(req, res, params) {
  const u = needAdmin(req,res); if(!u) return;
  const update = {};
  const b = req.body||{};
  if (b.status!==undefined)          update.status              = b.status;
  if (b.modules!==undefined)         update.modules             = b.modules;
  if (b.merchantCode!==undefined)    update.merchant_code       = b.merchantCode;
  if (b.merchant_code!==undefined)   update.merchant_code       = b.merchant_code;
  if (b.managedByRaylane!==undefined)update.managed_by_raylane  = b.managedByRaylane;
  try {
    const {data,error} = await supabase.from('operators').update(update).eq('id',params.id).select().single();
    if(error) throw error;
    return res.json({...data,merchantCode:data.merchant_code,modules:data.modules||[]});
  } catch(e) { return res.status(500).json({error:e.message}); }
}

// PAYMENTS ─────────────────────────────────────────────────────────
async function paymentsList(req, res) {
  const u = needOp(req,res); if(!u) return;
  try {
    let q = supabase.from('payments').select('*, bookings(passenger_name), trips(from_city,to_city), operators(name)').order('created_at',{ascending:false});
    if (u.role!=='admin') q = q.eq('operator_id',u.operatorId);
    const {data,error} = await q; if(error) throw error;
    return res.json((data||[]).map(p=>({...p,operatorNet:p.operator_net,passengerName:p.bookings?.passenger_name,route:p.trips?`${p.trips.from_city}→${p.trips.to_city}`:'',operatorName:p.operators?.name})));
  } catch(e) { return res.status(500).json({error:e.message}); }
}

async function payoutCreate(req, res, params) {
  const u = needAdmin(req,res); if(!u) return;
  const {tripId} = params;
  try {
    const {data:pays} = await supabase.from('payments').select('*').eq('trip_id',tripId).eq('status','HELD');
    if (!pays?.length) return res.status(400).json({error:'No held payments for this trip'});
    const {data:ex} = await supabase.from('payouts').select('id').eq('trip_id',tripId).maybeSingle();
    if (ex) return res.status(400).json({error:'Payout already released'});
    const {data:trip} = await supabase.from('trips').select('operator_id').eq('id',tripId).maybeSingle();
    const {data:op}   = await supabase.from('operators').select('*').eq('id',trip?.operator_id).maybeSingle();
    if (!op?.merchant_code) return res.status(400).json({error:'No merchant code on operator'});
    const totalNet=pays.reduce((s,p)=>s+(p.operator_net||0),0), totalComm=pays.reduce((s,p)=>s+(p.commission||0),0);
    await supabase.from('payments').update({status:'PAID_OUT'}).eq('trip_id',tripId).eq('status','HELD');
    const {data:payout} = await supabase.from('payouts').insert({id:uuid(),trip_id:tripId,operator_id:op.id,merchant_code:op.merchant_code,amount:totalNet,commission:totalComm,released_by:u.id}).select().single();
    await supabase.from('alerts').insert({type:'FINANCIAL',message:`Payout UGX ${totalNet.toLocaleString()} → ${op.name}`,entity_type:'payout',entity_id:payout.id});
    return res.json({message:'Payout released',payout});
  } catch(e) { return res.status(500).json({error:e.message}); }
}

// PROMOTIONS ───────────────────────────────────────────────────────
async function promosGet(req, res) {
  if (req.query.active==='true') {
    const today = new Date().toISOString().split('T')[0];
    try {
      const {data,error} = await supabase.from('promotions').select('*').eq('status','APPROVED').lte('start_date',today).gte('end_date',today);
      if(error) throw error;
      return res.json(data||[]);
    } catch(e) { return res.status(500).json({error:e.message}); }
  }
  const u = needOp(req,res); if(!u) return;
  try {
    let q = supabase.from('promotions').select('*, operators(name)').order('created_at',{ascending:false});
    if (u.role!=='admin') q = q.eq('operator_id',u.operatorId);
    if (req.query.status) q = q.eq('status',req.query.status);
    const {data,error} = await q; if(error) throw error;
    return res.json((data||[]).map(p=>({...p,promoName:p.promo_name,operatorId:p.operator_id,routeFrom:p.route_from,routeTo:p.route_to,discountType:p.discount_type,discountValue:p.discount_value,startDate:p.start_date,endDate:p.end_date})));
  } catch(e) { return res.status(500).json({error:e.message}); }
}

async function promoCreate(req, res) {
  const u = needOp(req,res); if(!u) return;
  if (u.role==='admin') return res.status(400).json({error:'Admins cannot create promos'});
  const {routeFrom,routeTo,tripId,discountType,discountValue,startDate,endDate,conditions,maxUses} = req.body||{};
  if (!routeFrom||!routeTo||!discountType||!discountValue||!startDate||!endDate) return res.status(400).json({error:'All promo fields required'});
  if (discountType==='PERCENTAGE'&&(Number(discountValue)<1||Number(discountValue)>50)) return res.status(400).json({error:'Percentage must be 1-50%'});
  try {
    const id = uuid();
    const {data,error} = await supabase.from('promotions').insert({id,operator_id:u.operatorId,route_from:routeFrom,route_to:routeTo,trip_id:tripId||null,discount_type:discountType,discount_value:Number(discountValue),start_date:startDate,end_date:endDate,conditions:conditions||null,max_uses:maxUses||null,status:'PENDING_APPROVAL'}).select().single();
    if(error) throw error;
    await supabase.from('alerts').insert({type:'PROMO',message:`Promo request: ${routeFrom}→${routeTo} (${discountValue}${discountType==='PERCENTAGE'?'%':' UGX'} off)`,entity_type:'promo',entity_id:id});
    return res.status(201).json(data);
  } catch(e) { return res.status(500).json({error:e.message}); }
}

async function promoById(req, res, params) {
  const u = needAdmin(req,res); if(!u) return;
  const {id} = params;
  const b = req.body||{};
  try {
    let update = {};
    if      (b.action==='approve') { if(!b.promoName?.trim()) return res.status(400).json({error:'promoName required'}); update={status:'APPROVED',promo_name:b.promoName.trim(),admin_notes:b.adminNotes||null,approved_by:u.id,approved_at:new Date().toISOString(),min_price:b.minPrice||null,max_discount:b.maxDiscount||null}; await supabase.from('alerts').insert({type:'PROMO',message:`Promo "${b.promoName}" approved LIVE`,entity_type:'promo',entity_id:id}); }
    else if (b.action==='reject')  { update={status:'REJECTED',rejection_note:b.rejectionNote||'Does not meet requirements'}; }
    else if (b.action==='disable') { update={status:'DISABLED'}; }
    else {
      if(b.promo_name!==undefined)    update.promo_name    = b.promo_name;
      if(b.discount_value!==undefined)update.discount_value= b.discount_value;
      if(b.start_date!==undefined)    update.start_date    = b.start_date;
      if(b.end_date!==undefined)      update.end_date      = b.end_date;
      if(b.conditions!==undefined)    update.conditions    = b.conditions;
    }
    const {data,error} = await supabase.from('promotions').update(update).eq('id',id).select().single();
    if(error) throw error;
    return res.json({...data,promoName:data.promo_name});
  } catch(e) { return res.status(500).json({error:e.message}); }
}

// ADMIN ────────────────────────────────────────────────────────────
async function adminDashboard(req, res) {
  const u = needAdmin(req,res); if(!u) return;
  try {
    const {data,error} = await supabase.from('admin_stats_view').select('*').maybeSingle();
    if(error) throw error;
    return res.json(data||{});
  } catch(e) { return res.status(500).json({error:e.message}); }
}

async function adminAlerts(req, res) {
  const u = needAdmin(req,res); if(!u) return;
  if (req.method==='GET') {
    try {
      const {data,error} = await supabase.from('alerts').select('*').order('created_at',{ascending:false});
      if(error) throw error;
      return res.json(data||[]);
    } catch(e) { return res.status(500).json({error:e.message}); }
  }
  if (req.method==='PATCH') {
    const alertId = req.query.id||req.body?.id;
    if (!alertId) return res.status(400).json({error:'id required'});
    try { await supabase.from('alerts').update({read:true}).eq('id',alertId); return res.json({ok:true}); }
    catch(e) { return res.status(500).json({error:e.message}); }
  }
}


// ── VEHICLES ──────────────────────────────────────────────────────
async function hVehiclesList(req, res) {
  const u = needOp(req,res); if(!u) return;
  try {
    let q = supabase.from('vehicle_profitability').select('*').order('registration');
    if (u.role !== 'admin') q = q.eq('operator_id', u.operatorId);
    const {data,error} = await q; if(error) throw error;
    return res.json(data||[]);
  } catch(e) { return res.status(500).json({error:e.message}); }
}

async function hVehicleCreate(req, res) {
  const u = needOp(req,res); if(!u) return;
  const b = req.body||{};
  const {registration,make,model,year,vehicleType,capacity,purchasePrice,
    lastServiceDate,nextServiceDate,insuranceExpiry,fitnessExpiry,notes,isRaylane} = b;
  if (!registration||!make||!model) return res.status(400).json({error:'registration, make, model required'});
  try {
    const opId = (u.role==='admin'&&isRaylane)
      ? 'a0000001-0000-4000-8000-000000000001'
      : u.operatorId;
    const {data,error} = await supabase.from('vehicles').insert({
      operator_id:opId, registration:registration.toUpperCase(),
      make, model, year:Number(year)||null, vehicle_type:vehicleType||'COACH',
      capacity:Number(capacity)||49, purchase_price:Number(purchasePrice)||0,
      last_service_date:lastServiceDate||null, next_service_date:nextServiceDate||null,
      insurance_expiry:insuranceExpiry||null, fitness_expiry:fitnessExpiry||null,
      notes:notes||null, status:'ACTIVE',
    }).select().single();
    if(error) throw error;
    return res.status(201).json(data);
  } catch(e) { return res.status(500).json({error:e.message}); }
}

async function hVehicleUpdate(req, res, params) {
  const u = needOp(req,res); if(!u) return;
  const b = req.body||{};
  const map = {vehicleType:'vehicle_type',currentMileage:'current_mileage',
    lastServiceDate:'last_service_date',nextServiceDate:'next_service_date',
    insuranceExpiry:'insurance_expiry',fitnessExpiry:'fitness_expiry',
    maintenanceCost:'maintenance_cost',purchasePrice:'purchase_price'};
  const allowed = ['make','model','year','vehicle_type','capacity','status','current_mileage',
    'last_service_date','next_service_date','insurance_expiry','fitness_expiry',
    'notes','maintenance_cost','purchase_price'];
  const update = {};
  for(const [k,v] of Object.entries(b)){
    const key = map[k]||k;
    if(allowed.includes(key)) update[key]=v;
  }
  if(!Object.keys(update).length) return res.status(400).json({error:'No valid fields'});
  try {
    const {data:old} = await supabase.from('vehicles').select('registration,operator_id').eq('id',params.id).maybeSingle();
    if (update.status==='MAINTENANCE') {
      await supabase.from('alerts').insert({
        type:'VEHICLE',
        message:'Vehicle '+old?.registration+' moved to MAINTENANCE — check and schedule repairs',
        entity_type:'vehicle',entity_id:params.id,priority:'HIGH'
      });
    }
    const {data,error} = await supabase.from('vehicles').update(update).eq('id',params.id).select().single();
    if(error) throw error;
    return res.json(data);
  } catch(e) { return res.status(500).json({error:e.message}); }
}

// Financial summary
async function hFinanceSummary(req, res) {
  const u = needOp(req,res); if(!u) return;
  try {
    let q = supabase.from('payments').select('amount,commission,operator_net,status,method,created_at');
    if (u.role!=='admin') q = q.eq('operator_id',u.operatorId);
    const {data:pays} = await q;
    const today = new Date().toISOString().split('T')[0];
    const held  = (pays||[]).filter(p=>p.status==='HELD').reduce((s,p)=>s+(p.operator_net||0),0);
    const paid  = (pays||[]).filter(p=>p.status==='PAID_OUT').reduce((s,p)=>s+(p.operator_net||0),0);
    const comm  = (pays||[]).reduce((s,p)=>s+(p.commission||0),0);
    const rev   = (pays||[]).reduce((s,p)=>s+(p.amount||0),0);
    const todayRev = (pays||[]).filter(p=>(p.created_at||'').startsWith(today)).reduce((s,p)=>s+(p.amount||0),0);
    return res.json({totalRevenue:rev,totalCommission:comm,heldBalance:held,paidOut:paid,revenueToday:todayRev});
  } catch(e) { return res.status(500).json({error:e.message}); }
}

// Quick Book (counter booking for staff/operator)
async function hQuickBook(req, res) {
  const u = needOp(req,res); if(!u) return;
  const {tripId,passengerName,passengerPhone,seatNumber,paymentMethod,amount} = req.body||{};
  if(!tripId||!passengerName||!passengerPhone||!seatNumber||!paymentMethod)
    return res.status(400).json({error:'tripId, passengerName, passengerPhone, seatNumber, paymentMethod required'});
  try {
    const {data:seat} = await supabase.from('seats').select('*').eq('trip_id',tripId).eq('seat_number',seatNumber).maybeSingle();
    if(!seat||seat.status!=='AVAILABLE') return res.status(409).json({error:'Seat not available'});
    const {data:trip} = await supabase.from('trips').select('*').eq('id',tripId).maybeSingle();
    if(!trip||!['LIVE','APPROVED'].includes(trip.status)) return res.status(400).json({error:'Trip not available'});
    const paid = amount||trip.price;
    const bookingId  = uuid();
    const ticketCode = 'RL-'+uuid().slice(0,4).toUpperCase()+'-'+uuid().slice(0,4).toUpperCase();
    const {data:booking,error:bErr} = await supabase.from('bookings').insert({
      id:bookingId,trip_id:tripId,seat_number:seatNumber,
      passenger_name:passengerName,passenger_phone:passengerPhone,
      booking_type:'FULL',status:'CONFIRMED',
      amount_total:trip.price,amount_paid:paid,balance_due:trip.price-paid,
      payment_method:paymentMethod,payment_verified:true,ticket_code:ticketCode,
    }).select().single();
    if(bErr) throw bErr;
    await supabase.from('seats').update({status:'BOOKED',locked_by:null,locked_until:null,booking_id:bookingId}).eq('trip_id',tripId).eq('seat_number',seatNumber);
    await supabase.from('trips').update({booked_seats:trip.booked_seats+1}).eq('id',tripId);
    const comm = Math.round(paid*0.08);
    await supabase.from('payments').insert({id:uuid(),booking_id:bookingId,trip_id:tripId,operator_id:trip.operator_id,amount:paid,commission:comm,operator_net:paid-comm,status:'HELD',method:paymentMethod,verified:true,idempotency_key:'qb-'+bookingId});
    return res.status(201).json({bookingId,ticketCode,amount:paid,status:'CONFIRMED',passengerName,seatNumber});
  } catch(e) { return res.status(500).json({error:e.message}); }
}

// Balance payment (advance booking top-up)
async function hBookingBalance(req, res, params) {
  const u = needOp(req,res); if(!u) return;
  const {amount,paymentMethod} = req.body||{};
  if(!amount||!paymentMethod) return res.status(400).json({error:'amount and paymentMethod required'});
  try {
    const {data:bk} = await supabase.from('bookings').select('*').eq('id',params.id).maybeSingle();
    if(!bk) return res.status(404).json({error:'Booking not found'});
    if(bk.balance_due<=0) return res.status(400).json({error:'No balance due on this booking'});
    await supabase.from('bookings').update({amount_paid:bk.amount_paid+bk.balance_due,balance_due:0}).eq('id',params.id);
    await supabase.from('payments').insert({id:uuid(),booking_id:params.id,amount:bk.balance_due,commission:0,operator_net:bk.balance_due,status:'HELD',method:paymentMethod,verified:true,idempotency_key:'bal-'+params.id+'-'+Date.now()});
    return res.json({ok:true,message:'Balance payment recorded'});
  } catch(e) { return res.status(500).json({error:e.message}); }
}

// Audit log
async function hAuditLog(req, res) {
  const u = needAdmin(req,res); if(!u) return;
  const {entityType,entityId,limit=50} = req.query;
  try {
    let q = supabase.from('audit_log').select('*').order('created_at',{ascending:false}).limit(Number(limit));
    if(entityType) q = q.eq('entity_type',entityType);
    if(entityId)   q = q.eq('entity_id',entityId);
    const {data,error} = await q; if(error) throw error;
    return res.json(data||[]);
  } catch(e) { return res.status(500).json({error:e.message}); }
}

// ── MAIN ROUTER ───────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method==='OPTIONS') return res.status(200).end();

  // Strip /api or /api/index from the URL, keep the rest
  const raw  = (req.url||'/');
  const path = raw.replace(/^\/api(\/index)?/,'').split('?')[0].replace(/\/+$/,'') || '/';
  const m    = req.method;

  // ── DEBUG: log every request ───────────────────────────────────
  console.log(`${m} ${path} (raw: ${raw})`);

  // ── EXACT ROUTES ──────────────────────────────────────────────
  if (path==='/health'              && m==='GET')                    return health(req,res);
  if (path==='/auth/login'          && m==='POST')                   return login(req,res);
  if (path==='/trips/search'        && m==='GET')                    return tripsSearch(req,res);
  if (path==='/trips'               && m==='GET')                    return tripsGetAll(req,res);
  if (path==='/trips'               && m==='POST')                   return tripsCreate(req,res);
  if (path==='/bookings'            && m==='POST')                   return bookingCreate(req,res);
  if (path==='/bookings'            && m==='GET')                    return bookingsList(req,res);
  if (path==='/parcels'             && m==='POST')                   return parcelCreate(req,res);
  if (path==='/parcels'             && m==='GET')                    return parcelsList(req,res);
  if (path==='/operators'           && m==='GET')                    return operatorsAll(req,res);
  if (path==='/operators/me'        && m==='GET')                    return operatorMe(req,res);
  if (path==='/payments'            && m==='GET')                    return paymentsList(req,res);
  if (path==='/promotions'          && m==='GET')                    return promosGet(req,res);
  if (path==='/promotions'          && m==='POST')                   return promoCreate(req,res);
  if (path==='/admin/dashboard'     && m==='GET')                    return adminDashboard(req,res);
  if (path==='/admin/alerts'        && ['GET','PATCH'].includes(m))  return adminAlerts(req,res);

  // ── DYNAMIC ROUTES ─────────────────────────────────────────────
  let p;
  if ((p=match('/trips/:id',              path))) return tripById(req,res,p);

  // Seats — /seats/:tripId  (GET) and /seats/:tripId/lock (POST)
  if ((p=match('/seats/:tripId/lock',     path)) && m==='POST')  return seatsLock(req,res,p);
  if ((p=match('/seats/:tripId',          path)) && m==='GET')   return seatsGet(req,res,p);
  if ((p=match('/seats/:tripId',          path)) && m==='PATCH') return seatsPatch(req,res,p);

  if ((p=match('/bookings/track/:code',   path))) return bookingTrack(req,res,p);
  if ((p=match('/bookings/board/:id',     path)) && m==='PATCH') return bookingBoard(req,res,p);

  if ((p=match('/parcels/track/:code',    path)) && m==='GET')   return parcelTrack(req,res,p);
  if ((p=match('/parcels/:id',            path)) && m==='PATCH') return parcelStatus(req,res,p);

  if ((p=match('/operators/:id',          path)) && m==='PATCH') return operatorById(req,res,p);
  if ((p=match('/payments/payout/:tripId',path)) && m==='POST')  return payoutCreate(req,res,p);
  if ((p=match('/promotions/:id',         path)) && m==='PATCH') return promoById(req,res,p);

  // Vehicles
  if (path==='/vehicles'               && m==='GET')   return hVehiclesList(req,res);
  if (path==='/vehicles'               && m==='POST')  return hVehicleCreate(req,res);
  if ((p=match('/vehicles/:id',path))  && m==='PATCH') return hVehicleUpdate(req,res,p);

  // Finance
  if (path==='/finance/summary'        && m==='GET')   return hFinanceSummary(req,res);
  if (path==='/trips/quickbook'        && m==='POST')  return hQuickBook(req,res);

  // Advance booking balance payment
  if ((p=match('/bookings/balance/:id',path)) && m==='PATCH') return hBookingBalance(req,res,p);

  // Audit log
  if (path==='/admin/audit'            && m==='GET')   return hAuditLog(req,res);

  console.error(`UNMATCHED: ${m} ${path}`);
  return res.status(404).json({ error:`Route not found: ${m} ${path}` });
};
