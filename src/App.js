import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import PassengerHome from './pages/passenger/Home';
import Search from './pages/passenger/Search';
import BookTrip from './pages/passenger/BookTrip';
import Parcels from './pages/passenger/Parcels';
import TrackTicket from './pages/passenger/TrackTicket';
import AdminDashboard from './pages/admin/Dashboard';
import OperatorDashboard from './pages/operator/Dashboard';

function Guard({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace/>;
  if (role && user.role !== role) return <Navigate to="/" replace/>;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role==='admin'?'/admin':user.role==='operator'?'/operator':'/'} replace/> : <Login/>}/>
      <Route path="/" element={<PassengerHome/>}/>
      <Route path="/search" element={<Search/>}/>
      <Route path="/book/:tripId" element={<BookTrip/>}/>
      <Route path="/parcels" element={<Parcels/>}/>
      <Route path="/track" element={<TrackTicket/>}/>
      <Route path="/admin/*" element={<Guard role="admin"><AdminDashboard/></Guard>}/>
      <Route path="/operator/*" element={<Guard role="operator"><OperatorDashboard/></Guard>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><BrowserRouter><AppRoutes/></BrowserRouter></AuthProvider>;
}
