import "server-only"
import type { AnyHandler } from "../core/handler"
import { apiKeysList, apiKeysCreate, apiKeysRevoke } from "./apikeys/handlers"
import { areasList, areasCreate, areasUpdate, areasDelete } from "./areas/handlers"
import { bookingsCreate, bookingsCancel, quoteRequestsCreate, quoteRequestsList } from "./bookings/handlers"
import { customersList, customersGet, customersCreate, customersUpdate, consentsList, consentsRecord } from "./customers/handlers"
import { mirrorUpsert } from "./mirror/handlers"
import { messagesList, messagesSend } from "./messages/handlers"
import { organizationGet } from "./organization/handlers"
import { passesList, passesGet, passesCreate, passesActivate, passesConsent, passesCancel, passesResendConfirmation, passesSendCardUpdateLink, passesStartCardUpdate, passesUpdatePreference, passesAddInspection, passesSkipVisit } from "./passes/handlers"
import { scheduleRun, scheduleWeek, scheduleDay, scheduleSlots } from "./schedule/handlers"
import { servicesList, servicesCreate, servicesUpdate, servicesDeactivate } from "./services/handlers"
import { settingsGet, settingsUpdate, settingsChangesList } from "./settings/handlers"
import { trucksList, trucksCreate, trucksUpdate, trucksDeactivate } from "./trucks/handlers"
import { visitsList, visitsGet, visitsMove, visitsMarkClosed, visitsStretch, visitsRequestMove, visitsLinkRequest, visitsAreaDays, visitsPick } from "./visits/handlers"
import { webhooksList, webhooksCreate, webhooksDelete, webhooksTest } from "./webhooks/handlers"

/** Every operation of the API, in the order the docs list them. The OpenAPI document, the MCP tools and the routes all read this array. */
export const handlers: AnyHandler[] = [
  apiKeysList, apiKeysCreate, apiKeysRevoke,
  areasList, areasCreate, areasUpdate, areasDelete,
  bookingsCreate, bookingsCancel, quoteRequestsCreate, quoteRequestsList,
  customersList, customersGet, customersCreate, customersUpdate, consentsList, consentsRecord,
  messagesList, messagesSend,
  mirrorUpsert,
  organizationGet,
  passesList, passesGet, passesCreate, passesActivate, passesConsent, passesCancel, passesResendConfirmation, passesSendCardUpdateLink, passesStartCardUpdate, passesUpdatePreference, passesAddInspection, passesSkipVisit,
  scheduleRun, scheduleWeek, scheduleDay, scheduleSlots,
  servicesList, servicesCreate, servicesUpdate, servicesDeactivate,
  settingsGet, settingsUpdate, settingsChangesList,
  trucksList, trucksCreate, trucksUpdate, trucksDeactivate,
  visitsList, visitsGet, visitsMove, visitsMarkClosed, visitsStretch, visitsRequestMove, visitsLinkRequest, visitsAreaDays, visitsPick,
  webhooksList, webhooksCreate, webhooksDelete, webhooksTest,
]
