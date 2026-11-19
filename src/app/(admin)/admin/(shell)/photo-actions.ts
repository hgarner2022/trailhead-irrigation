"use server"

import "server-only"
import { callApi } from "@/api/core/call"
import { photosAdd, photosRemove, photosUpdate } from "@/api/v1/photos/handlers"
import type { PhotoItem } from "@/lib/photos/types"
import { act, nothing, type ActionOutcome } from "./act"

// The server actions of the Photos block (visit panel and job panel). Each runs a `photos.*` handler through `callApi` as the signed-in person; the
// file itself went from the browser straight to the private store (a token from `/api/photos/upload`), and `addPhoto` only tells the API which file
// arrived. A tech may add and remove their own on a visit they had (the handler checks); showing a photo to the customer is a manager's.

/** `photos.add`: the browser's finished upload becomes the visit's photo (and one `visit.photo_added` event). */
export const addPhoto = async (visitId: string, blobKey: string): Promise<ActionOutcome<PhotoItem>> => act((ctx) => callApi(ctx, photosAdd, { id: visitId, blobKey }), "tech")

/** `photos.update`: Show to customer on or off. */
export const showPhoto = async (photoId: string, shown: boolean): Promise<ActionOutcome<PhotoItem>> => act((ctx) => callApi(ctx, photosUpdate, { id: photoId, shownToCustomer: shown }))

/** `photos.remove`: a soft delete, by the person who added it or an owner. */
export const removePhoto = async (photoId: string): Promise<ActionOutcome> => act((ctx) => nothing(callApi(ctx, photosRemove, { id: photoId })), "tech")
