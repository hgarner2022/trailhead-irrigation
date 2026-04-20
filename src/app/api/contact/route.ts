import { Resend } from "resend"
import { NextResponse } from "next/server"

const TO_EMAIL = "ryan@trailheadirrigation.com"

export async function POST(request: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const formData = await request.formData()

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const address = formData.get("address") as string
    const service = formData.get("service") as string
    const message = formData.get("message") as string

    if (!name || !email || !phone || !service) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const { error: sendError } = await resend.emails.send({
      from: "Trailhead Website <contact@trailheadirrigation.com>",
      to: TO_EMAIL,
      subject: `New Contact: ${service} — ${name}`,
      replyTo: email,
      text: [
        `Name: ${name}`,
        `Phone: ${phone}`,
        `Email: ${email}`,
        `Address: ${address || "(Not provided)"}`,
        `Service: ${service}`,
        ``,
        `Message:`,
        message || "(No message provided)",
      ].join("\n"),
    })

    if (sendError) {
      console.error("Resend error:", sendError)
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Contact form error:", err)
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    )
  }
}
