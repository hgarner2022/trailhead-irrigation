/** After a Continue that could not pass and more than one thing is missing: one short alert naming the fields, above the buttons. One problem needs no summary; its own line sits by its field. */
export function ErrorSummary({ problems }: { problems: string[] }) {
  if (problems.length < 2) return null
  return (
    <div role="alert" data-slot="checkout-error-summary" className="mt-6 rounded-lg border border-destructive/40 bg-background p-4 text-destructive">
      <p className="text-base">{`Check these before you continue: ${problems.join(", ")}.`}</p>
    </div>
  )
}
