import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import PaymentReceipt from './pages/PaymentReceipt'
import PdfEditor from './pages/PdfEditor'
import DoctorIncentiveReport from './pages/DoctorIncentiveReport'
import BillingReport from './pages/BillingReport'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/receipt" element={<PaymentReceipt />} />
      <Route path="/pdf-editor" element={<PdfEditor />} />
      <Route path="/doctor-incentive" element={<DoctorIncentiveReport />} />
      <Route path="/billing-report" element={<BillingReport />} />
    </Routes>
  )
}
