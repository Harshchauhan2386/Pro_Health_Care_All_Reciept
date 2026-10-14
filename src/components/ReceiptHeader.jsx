import { LAB_CONFIG } from '../labConfig'

export default function ReceiptHeader({ receiptNo }) {
  return (
    <div className="border-b-2 border-black pb-2 mb-3">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-wide">{LAB_CONFIG.name}</h1>
        <p className="text-xs tracking-widest">{LAB_CONFIG.tagline}</p>
        <p className="text-xs mt-1">
          {LAB_CONFIG.email} &nbsp;|&nbsp; {LAB_CONFIG.phone}
        </p>
      </div>

      <div className="flex items-center justify-center relative mt-3">
        <h2 className="text-base font-semibold border-b border-black px-4 pb-0.5">
          {LAB_CONFIG.documentTitle}
        </h2>
        {receiptNo ? (
          <span className="absolute right-0 text-xs">Receipt No.: {receiptNo}</span>
        ) : null}
      </div>
    </div>
  )
}
