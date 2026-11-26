# A customer's contact preference: research and rule

Status: research only, nothing built. Hannah, Nov 19 2026: "We need to think about email and text. We should get the customer's preference first."

Sourcing note: the vendor findings below come from each vendor's public help centre and product pages as I know them; they were not re-fetched while writing this doc, so verify any line before quoting it to a customer. Links point at the vendor's help or legal home.

## 1. What the five tools do

| Tool | Where the preference is asked | Stored as | One setting or per message type |
|---|---|---|---|
| Jobber ([help.getjobber.com](https://help.getjobber.com)) | Not asked of the customer at booking. The office sets it per client in the client's communication settings (text and email each on or off). The client can unsubscribe by link or STOP. | On the client record, per channel | Per message type: quote, job, invoice and reminder follow-ups each have their own on/off, plus a company default |
| Housecall Pro ([help.housecallpro.com](https://help.housecallpro.com)) | Office, on the customer profile: notification toggles for text and email. Online booking asks for a mobile number with a "text me" consent line. | Customer profile, per channel | Per type: confirmations, reminders, "on my way", invoices, each with its own toggle |
| ServiceTitan ([help.servicetitan.com](https://help.servicetitan.com)) | Office, on the customer's contact methods (each phone or email flagged as usable for text, call, email); booking widgets ask for a number with a consent line. | Per contact method, not per customer | Per message type through the company's automation rules, then limited by what the contact method allows |
| Square Appointments ([squareup.com/help](https://squareup.com/help)) | At booking: a checkbox for text reminders next to the phone number; the account owner turns reminder types on. | On the customer profile, per channel | Per type: confirmations, reminders, changes; the customer opts out by STOP or link |
| Calendly ([help.calendly.com](https://help.calendly.com)) | The booker is asked for a phone number only when the host adds an SMS question; email reminders are always on, text reminders only when the invitee gave a number and agreed. | On the booking, not on a profile | Host chooses per workflow step (confirmation, reminder); the invitee picks nothing |

What they agree on: (1) the customer is asked at booking only as one consent checkbox beside the phone number, never "text or email?"; (2) the real preference is a pair of toggles the office edits on the profile; (3) message types are switched by the company, and the customer's only controls are STOP and the unsubscribe link; (4) none asks the customer to choose per message type.

The gap Hannah is pointing at is real: the tools default to "both, whatever the office set", and a customer who prefers email learns they are getting texts when the first one arrives. Asking once, in the customer's words, at booking beats all five.

## 2. Consent rules

Texts (US, TCPA and FCC rules, CTIA guidelines; [fcc.gov](https://www.fcc.gov/consumers/guides/stop-unwanted-robocalls-and-texts), [ctia.org](https://www.ctia.org/the-wireless-industry/industry-commitments/messaging-interoperability-sms-mms)):
- A text about a service the customer asked for (confirmations, reminders, on my way, receipts) needs prior express consent. Giving a mobile number at booking, knowing what it will be used for, is generally taken as that consent, but a plain statement beside the number is the safe form and what Twilio's registration review looks for.
- Marketing texts need prior express written consent: a separate unticked box, never bundled with the service text.
- Wording that works: "Text me about my visits. Message and data rates may apply. Reply STOP to opt out."
- STOP must end texts on that number at once (one confirmation text is allowed). HELP must answer. Keep the consent record (who, when, source, wording version), which Trailhead already stores in `consent`.
- Quiet hours: avoid texts between 9 pm and 8 am local time. A daytime "on my way" is fine.

Email (CAN-SPAM, [ftc.gov](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)): transactional messages about a requested service need no opt-in and no unsubscribe link, but must not mislead; marketing needs an unsubscribe and a postal address. Trailhead already splits `TRANSACTIONAL_KINDS` from marketing.

Two consequences: a customer who chose Email has not consented to texts, so we must not text them, even about a visit; a customer who chose Text must have given a mobile number beside the consent line.

## 3. Urgent day-of messages when the preference is email

The five tools do not solve this; they send what is switched on. In the order I recommend:
1. Respect the preference. "On my way" and a same-day move go as an email only (subject "Ryan is on the way to 412 Ash St") with the account link. Email is slower, so the office dialog says so before sending.
2. The office may call. A call by a person is not a text and is the escape for something truly urgent (the crew is cancelled today for weather). The dialog shows the phone number.
3. Never override with a text "just this once". That is the line that creates TCPA exposure and customer distrust.

## 4. Trailhead's rule

**One preference per customer, not per message type.** `customer.contact_preference`: `text` | `email` | `both`, nullable. Reason: the job is "reach this person the way they want"; per-type toggles are a settings page no customer opens, and our message list is small. Receipts and invoices follow the same preference; STOP and unsubscribe stay absolute.

**Default when nothing is chosen (null, an office-made customer, old rows):** text when the customer has a mobile and a consent that allows texts; else email. Null is read through one function (`contactChannels(customer)`, returning the channels to use), never inline, so every sender agrees.

**Where it is asked and changed**
- Booking and Season Pass checkout, contact step, under the phone and email fields: "How should we reach you about visits?" with Text, Email, Both. Text and Both show the consent line ("Message and data rates may apply. Reply STOP to opt out."). Marketing stays its own unticked box. Text or Both with no valid mobile is a field error.
- Account Details: the same question, editable by the customer (`customers.updateSelf` gains the field).
- Admin customer panel: a fact row "Contact: Text" with Edit; the office sets it when it takes a call. The change writes a `customer.edited` event, and a `consent` event when text becomes allowed (source admin, "customer said so by phone").
- A STOP reply sets the preference to `email` (never null) and records the consent event.

**What the senders do**
- Every customer message (day set, moved, two weeks out, day before, receipt, invoice, reminder, cancel confirmation) goes to the channels in `contactChannels`. Today's rule "a text when there is a mobile and no STOP, else an email" becomes "the channels from the preference".
- Urgent day-of messages (on my way, a same-day move) go by text only when the preference allows text. For an email customer they go as an email.
- The office dialogs read the preference before sending: "Andrea gets an email with the day." / "Andrea gets a text and an email." / "Andrea gets a text." For On my way with an email customer: "Andrea gets email only, so this may not reach her in time. Call her at (303) 555-0148 if it is urgent." The button still sends the email and never texts.

## 5. DATA_MODEL row (add when built)

| customer.contact_preference | `customer.contact_preference` (text, nullable; `text` \| `email` \| `both`; null means the default: text when the customer has a mobile and text consent, else email, read only through `contactChannels` in `src/lib/messaging/channels.ts`) | checkout and booking contact steps ("How should we reach you about visits?"); `customers.updateSelf` (the account's Details); `customers.update` (the office; `customer.edited` event, plus a `consent` event with source admin when text becomes allowed); a STOP reply sets it to `email` | every message sender (`sendMessageRow` picks the channels; a customer who chose email is never texted, On my way and a same-day move included, which go as email); the office dialogs' line ("Andrea gets an email with the day") and the On my way warning; admin Customers panel "Contact" fact; the account's Details; API `customers.get` (`contactPreference`, write scope) |

It also touches the `customer.phone` and `consent` rows (a mobile is required for Text or Both).

## 6. Two questions for Hannah

1. When a customer picked Email and a same-day change happens, should the office dialog only warn and send the email, or should Home also get a "call her" row for that visit? Default: warn and send the email, no extra row.
2. For existing customers with no choice, is it right to start with text when they have a mobile and a consent row, and ask them once on their account Home? Default: yes, text, with a one-line question on the account Home until answered.
