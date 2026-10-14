import { formatCurrency } from '../utils/formatCurrency'
import { amountToWords } from '../utils/numberToWords'

export default function ReceiptSummary({ total, discount, received, paymentMode }) {
  const payable = total - discount

  return (
    <div className="mt-3">
      <div className="border-t border-black" />

      <div className="flex justify-end mt-2">
        <table className="text-sm w-56">
          <tbody>
            <tr>
              <td className="py-0.5">Total</td>
              <td className="py-0.5 text-right">₹ {formatCurrency(total)}</td>
            </tr>
            <tr>
              <td className="py-0.5">Discount</td>
              <td className="py-0.5 text-right">₹ {formatCurrency(discount)}</td>
            </tr>
            <tr className="font-semibold border-t border-black">
              <td className="py-0.5">Received</td>
              <td className="py-0.5 text-right">₹ {formatCurrency(received)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-sm border border-black px-2 py-1">
        <span className="font-semibold">Amount in Words: </span>
        {amountToWords(payable)}
      </div>

      <div className="flex justify-between items-end mt-8">
        <div className="text-sm">
          <span className="font-semibold">Payment Mode: </span>
          {paymentMode || '—'}
        </div>

        <div className="text-sm text-center">
          <div className="h-12" />
          <div className="border-t border-black pt-1 px-6">Signature</div>
        </div>
      </div>
    </div>
  )
}
