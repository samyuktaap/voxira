import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { VoiceHome } from './pages/VoiceHome';
import { VoicePayment } from './pages/VoicePayment';
import { PaymentConfirmationPage } from './pages/PaymentConfirmation';
import { PaymentResultPage } from './pages/PaymentResult';
import { ScreenReaderAnnouncer } from './components/accessibility/ScreenReaderAnnouncer';
import './styles/accessibility.css';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      {/* Permanent Live Region for Screen Readers */}
      <ScreenReaderAnnouncer />

      <Routes>
        <Route path="/" element={<VoiceHome />} />
        <Route path="/payment" element={<VoicePayment />} />
        <Route path="/confirmation" element={<PaymentConfirmationPage />} />
        <Route path="/result" element={<PaymentResultPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
