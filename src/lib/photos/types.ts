/** A photo as a screen holds it (the API's `PhotoOut`, which this matches): the address a browser uses is `url`, `/api/photos/<id>`, never the store's own. */
export interface PhotoItem {
  id: string
  visitId: string
  jobId: string
  customerId: string
  url: string
  contentType: string
  bytes: number
  /** staff: the email that added it; `customer` for the customer's own; a customer is told `staff` */
  addedBy: string
  addedByName: string | null
  byCustomer: boolean
  shownToCustomer: boolean
  canRemove: boolean
  createdAt: string
}
