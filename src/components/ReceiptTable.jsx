import { formatCurrency } from '../utils/formatCurrency'

export default function ReceiptTable({ tests }) {
  return (
    <table className="w-full text-sm border-collapse mt-2">
      <thead>
        <tr className="border-y border-black">
          <th className="text-left py-1 pr-2 font-semibold w-12">Sr.</th>
          <th className="text-left py-1 pr-2 font-semibold">Particulars</th>
          <th className="text-right py-1 pl-2 font-semibold w-28">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        {tests.map((test, index) => (
          <tr key={test.id} className="align-top">
            <td className="py-1 pr-2">{index + 1}</td>
            <td className="py-1 pr-2">
              <div>{test.name || '—'}</div>
              {test.description ? (
                <div className="text-xs italic text-gray-700">{test.description}</div>
              ) : null}
            </td>
            <td className="py-1 pl-2 text-right">{formatCurrency(Number(test.price) || 0)}</td>
          </tr>
        ))}
        {tests.length === 0 ? (
          <tr>
            <td colSpan={3} className="py-2 text-center text-gray-500 italic">
              No tests added yet
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  )
}
