import { Link } from 'react-router-dom'
import { LAB_CONFIG } from '../labConfig'

const options = [
  {
    to: '/receipt',
    title: 'Payment Receipt',
    description: 'Create and print a patient payment receipt.',
    icon: '🧾',
  },
  {
    to: '/pdf-editor',
    title: 'PDF Editor',
    description: 'Merge PDFs, reorder pages, delete pages, and download one final PDF.',
    icon: '📄',
  },
  {
    to: '/doctor-incentive',
    title: 'Doctor Incentive Report',
    description: 'Patients, payments and incentives for a doctor over a period.',
    icon: '👨‍⚕️',
  },
  {
    to: '/billing-report',
    title: 'Billing Report',
    description: 'Billing reports for several doctors; each prints on its own page.',
    icon: '📊',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-800">{LAB_CONFIG.name}</h1>
        <p className="text-gray-500 mt-1 mb-8">What would you like to do?</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((opt) => (
            <Link
              key={opt.to}
              to={opt.to}
              className="bg-white rounded-lg shadow-sm hover:shadow-md border border-gray-200 hover:border-blue-400 transition p-6 flex flex-col items-center text-center"
            >
              <span className="text-3xl mb-2" aria-hidden="true">
                {opt.icon}
              </span>
              <span className="font-semibold text-gray-800">{opt.title}</span>
              <span className="text-xs text-gray-500 mt-1">{opt.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
