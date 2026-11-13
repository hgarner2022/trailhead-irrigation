/** What Task 0.1 confirmed (docs/jobber-api-facts.md). The adapters read these; nothing else asks the question again. Per-account ids are columns on `organization`. Values marked "not confirmed" in the doc are the plan's defaults and Phase 6 must verify them against GraphiQL before any adapter relies on them. */
export const JOBBER_FACTS = {
  /** The value sent in the X-JOBBER-GRAPHQL-VERSION header (newest entry in Jobber's changelog on 2026-11-12) */
  apiVersion: "2026-09-25",
  /** Not confirmed: whether jobCreate can place a visit in one call. Assumed: create the job, then edit the visit ("edit"). */
  scheduleWrite: "edit" as "visit" | "edit",
  /** Not confirmed: assumed name of the mutation that moves or reassigns a visit. */
  moveMutation: "visitEdit",
  /** Not confirmed: assumed no payment mutation; payments are recorded by hand in Jobber and arrive as PAYMENT_CREATE / INVOICE_UPDATE. */
  invoicePayment: "manual" as "api" | "manual",
  /** Not confirmed: assumed no per-job switch for Jobber's client emails. */
  notificationsPerJob: false,
  /** Not confirmed: assumed no job cancel or archive mutation. */
  jobCancelByApi: false,
  /** "api" when the route order can be read back; "app" when the app orders each truck-day itself. No route or order field on visits in the account data. */
  stopOrder: "app" as "api" | "app",
  /** how a personal calendar block is told apart from a visit in the visits query. Confirmed: this account's blocks are ordinary jobs on a dummy client ("Scott Unavailable", "Pick up Mason"), so they appear in visit searches with a client and are matched by the dummy client's name. */
  calendarBlockMarker: "dummyClient" as "noClient" | "kind" | "dummyClient",
  topics: {
    visitComplete: "VISIT_COMPLETE",
    visitUpdate: "VISIT_UPDATE",
    jobUpdate: "JOB_UPDATE",
    clientUpdate: "CLIENT_UPDATE",
    invoiceCreate: "INVOICE_CREATE",
    invoiceUpdate: "INVOICE_UPDATE",
    quoteCreate: "QUOTE_CREATE",
    quoteUpdate: "QUOTE_UPDATE",
  },
  /** Webhooks are added per app in the Developer Center (topic plus URL), never by mutation. */
  webhookSubscription: "developerCenter" as "developerCenter" | "mutation",
  /** Header carrying the base64 HMAC-SHA256 of the raw body, keyed with the OAuth client secret. */
  webhookSignatureHeader: "X-Jobber-Hmac-SHA256",
  /** Webhooks must be answered within this many milliseconds; process after responding. */
  webhookResponseMs: 1000,
  /** Query cost bucket: leaky bucket per app and account. */
  rateLimit: {
    maximumAvailable: 10000,
    restoreRatePerSecond: 500,
    requestsPer300Seconds: 2500,
  },
  /** Fields under `extensions.cost` on every response. */
  costExtensionFields: ["requestedQueryCost", "actualQueryCost", "throttleStatus"],
  throttleStatusFields: ["maximumAvailable", "currentlyAvailable", "restoreRate"],
  /** Shape of `jobberWebUri` on a job (and on `visit.job`); the trailing number is the job's numeric id, not the encoded GraphQL id. */
  jobberWebUriPattern: "^https://secure\\.getjobber\\.com/work_orders/\\d+$",
  /** An app may create at most this many custom field configurations per Jobber object. */
  customFieldsPerObject: 5,
} as const
