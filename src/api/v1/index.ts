import "server-only"
import type { AnyHandler } from "../core/handler"
import { alertsDismiss } from "./alerts/handlers"
import { apiKeysList, apiKeysCreate, apiKeysRevoke } from "./apikeys/handlers"
import { areasList, areasCreate, areasUpdate, areasDelete } from "./areas/handlers"
import { bookingsCreate, bookingsCancel } from "./bookings/handlers"
import { customersList, customersGet, customersCreate, customersUpdate, consentsList, consentsRecord } from "./customers/handlers"
import { jobsCancel } from "./jobs/cancel"
import { jobsCreate } from "./jobs/handlers"
import { linesAdd, linesUpdate, linesCancel } from "./lines/handlers"
import { eventsList, eventsNote } from "./events/handlers"
import { invoicesSend, invoicesList, invoicesGet, invoicesRemind, invoicesCancel, invoicesPayView } from "./invoices/handlers"
import { mirrorUpsert } from "./mirror/handlers"
import { messagesList, messagesSend } from "./messages/handlers"
import { organizationGet } from "./organization/handlers"
import { passesList, passesGet, passesCreate, passesActivate, passesConsent, passesCancel, passesResendConfirmation, passesSendCardUpdateLink, passesStartCardUpdate, passesUpdatePreference, passesAddInspection, passesSkipVisit } from "./passes/handlers"
import { passesSell } from "./passes/sell"
import { paymentsList, paymentsRecord, paymentsRefund } from "./payments/handlers"
import { paymentsChargeCard } from "./payments/charge"
import { peopleList, peopleCreate, peopleUpdate, peopleDeactivate } from "./people/handlers"
import { photosAdd, photosList, photosListForJob, photosRemove, photosUpdate } from "./photos/handlers"
import { propertiesUpdate } from "./properties/handlers"
import { visitsCancelSelf } from "./portal/cancel"
import { jobsGet, jobsList } from "./portal/jobs"
import { customersMe, customersStartCardUpdate, customersUpdateSelf, propertiesUpdateSelf } from "./portal/me"
import { paymentsReceipt } from "./portal/receipt"
import { scheduleRun, scheduleWeek, scheduleDay, scheduleSlots, scheduleOfferDays } from "./schedule/handlers"
import { servicesList, servicesCreate, servicesUpdate, servicesDeactivate } from "./services/handlers"
import { settingsGet, settingsUpdate, settingsChangesList } from "./settings/handlers"
import { visitsList, visitsGet, visitsMove, visitsConfirm, visitsStretch, visitsRequestMove, visitsLinkRequest, visitsAreaDays, visitsPick } from "./visits/handlers"
import { visitsMarkClosed } from "./visits/money"
import { visitsCancel, visitsCreate, visitsMarkNotDone, visitsUpdate } from "./visits/office"
import { webhooksList, webhooksCreate, webhooksDelete, webhooksTest } from "./webhooks/handlers"

/** Every operation of the API, in the order the docs list them. The OpenAPI document, the MCP tools and the routes all read this array. */
export const handlers: AnyHandler[] = [
  alertsDismiss,
  apiKeysList, apiKeysCreate, apiKeysRevoke,
  areasList, areasCreate, areasUpdate, areasDelete,
  bookingsCreate, bookingsCancel,
  customersList, customersGet, customersCreate, customersUpdate, consentsList, consentsRecord, customersMe, customersUpdateSelf, customersStartCardUpdate,
  eventsList, eventsNote,
  invoicesSend, invoicesList, invoicesGet, invoicesRemind, invoicesCancel, invoicesPayView,
  jobsCreate, jobsCancel, jobsList, jobsGet, visitsCancelSelf,
  linesAdd, linesUpdate, linesCancel,
  messagesList, messagesSend,
  mirrorUpsert,
  organizationGet,
  passesList, passesGet, passesCreate, passesSell, passesActivate, passesConsent, passesCancel, passesResendConfirmation, passesSendCardUpdateLink, passesStartCardUpdate, passesUpdatePreference, passesAddInspection, passesSkipVisit,
  paymentsList, paymentsRecord, paymentsRefund, paymentsChargeCard, paymentsReceipt,
  peopleList, peopleCreate, peopleUpdate, peopleDeactivate,
  photosAdd, photosList, photosListForJob, photosUpdate, photosRemove,
  propertiesUpdate, propertiesUpdateSelf,
  scheduleRun, scheduleWeek, scheduleDay, scheduleSlots, scheduleOfferDays,
  servicesList, servicesCreate, servicesUpdate, servicesDeactivate,
  settingsGet, settingsUpdate, settingsChangesList,
  visitsList, visitsGet, visitsMove, visitsConfirm, visitsMarkClosed, visitsStretch, visitsRequestMove, visitsLinkRequest, visitsAreaDays, visitsPick,
  visitsCreate, visitsUpdate, visitsMarkNotDone, visitsCancel,
  webhooksList, webhooksCreate, webhooksDelete, webhooksTest,
]
