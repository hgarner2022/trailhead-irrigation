import { RECORD_ROW, RecordList, RecordRowEnd, RecordRowText } from "@/components/blocks/RecordPanel"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { moneySigned, shortDate } from "@/lib/admin/format"
import type { AdminPayment } from "@/lib/admin/types"
import type { VisitActions } from "./visit-actions-types"
import type { BillState } from "./bill-model"
import { BillSent } from "./VisitBill"
import type { JobRow } from "./jobs-model"
import { paymentWords } from "./job-panel-model"

// The Money section of the job panel: where the job stands in the words of `src/lib/money/words.ts` (Paid, "$115 unpaid", Invoice
// sent, Past due, Failed), every payment newest first with how it came and its reference, and the open invoice with when it was
// sent and is due, its pay link and Remind. A tech's data carries no references and no pay link, so none shows for them.


export function JobMoneySection({ row, payments, bill, actions }: { row: JobRow; payments: AdminPayment[]; bill: BillState; actions?: VisitActions }) {
  const ok = payments.filter((p) => p.status === "succeeded")
  return (
    <section aria-labelledby="job-money" data-slot="job-money">
      <SectionHeading id="job-money">Money</SectionHeading>
      <p className="mt-2 text-sm font-medium">{row.moneyText}</p>
      {ok.length > 0 ? (
        <RecordList data-slot="job-payments">
          {ok.map((p) => (
            <li key={p.id} className={`flex items-center ${RECORD_ROW}`}>
              <RecordRowText title={paymentWords(p)} detail={p.paidOn ? shortDate(p.paidOn) : undefined} />
              <RecordRowEnd>
                <span className="tabular-nums">{moneySigned(p.amount)}</span>
              </RecordRowEnd>
            </li>
          ))}
        </RecordList>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No payments yet.</p>
      )}
      {bill.invoice && (
        <div className="mt-4" data-slot="job-bill">
          <BillSent invoice={bill.invoice} actions={actions} />
          <p className="mt-1 text-sm text-muted-foreground">{`Sent ${shortDate(bill.invoice.sentOn)}, due ${shortDate(bill.invoice.dueOn)}`}</p>
        </div>
      )}
    </section>
  )
}
