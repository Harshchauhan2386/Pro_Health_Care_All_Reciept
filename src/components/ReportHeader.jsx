import { LAB_CONFIG } from '../labConfig'

/** Laboratory name / address / contact plus the report title. Details come from labConfig only. */
export default function ReportHeader({ title }) {
  return (
    <div className="report-header-block text-center border-b border-black pb-2">
      <h1 className="text-xl font-bold tracking-wide">{LAB_CONFIG.name}</h1>
      <p className="text-xs mt-1">Address: {LAB_CONFIG.address}</p>
      <p className="text-xs">Contact: {LAB_CONFIG.phone}</p>
      <h2 className="text-base font-semibold mt-3 inline-block border-b border-black px-4 pb-0.5">
        {title}
      </h2>
    </div>
  )
}
