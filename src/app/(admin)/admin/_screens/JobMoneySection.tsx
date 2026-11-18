import { PANEL_ROW, PanelHeading, PanelList, PanelRowEnd, PanelRowText } from "@/components/blocks/PanelParts"
import type { AdminPayment } from "@/lib/admin/types"
import type { VisitActions } from "./visit-actions-types"
import type { BillState } from "./bill-model"
import { BillSent } from "./VisitBill"
import type { JobRow } from "./jobs-model"
import { paymentWords } from "./job-panel-model"

// The Money section of the job panel: where the job stands in the words of `src/lib/money/words.ts` (Paid, "$115 owed", Bill
// sent, Overdue, Failed), every payment newest first with how it came and its reference, and the open bill with when it was
// sent and is due, its pay link and Remind. A tech's data carries no references and no pay link, so none shows for them.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const day = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`
const dollars = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US")}`

export function JobMoneySection({ row, payments, bill, actions }: { row: JobRow; payments: AdminPayment[]; bill: BillState; actions?: VisitActions }) {
  const ok = payments.filter((p) => p.status === "succeeded")
  return (
    <section aria-labelledby="job-money" data-slot="job-money">
      <PanelHeading id="job-money">Money</PanelHeading>
      <p className="mt-2 text-sm font-medium">{row.moneyText}</p>
      {ok.length > 0 ? (
        <PanelList data-slot="job-payments">
          {ok.map((p) => (
            <li key={p.id} className={`flex items-center ${PANEL_ROW}`}>
              <PanelRowText title={paymentWords(p)} detail={p.paidOn ? day(p.paidOn) : undefined} />
              <PanelRowEnd>
                <span className="tabular-nums">{dollars(p.amount)}</span>
              </PanelRowEnd>
            </li>
          ))}
        </PanelList>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No payments yet.</p>
      )}
      {bill.invoice && (
        <div className="mt-4" data-slot="job-bill">
          <BillSent invoice={bill.invoice} actions={actions} />
          <p className="mt-1 text-sm text-muted-foreground">{`Sent ${day(bill.invoice.sentOn)}, due ${day(bill.invoice.dueOn)}`}</p>
        </div>
      )}
    </section>
  )
}
