import Script from "next/script"
import { stripSecretParams } from "@/lib/analytics-url"

const GA_MEASUREMENT_ID = "G-QZJP9M6LNQ"

/**
 * Google Analytics 4 (gtag.js), loaded after the page is interactive. Used by the root layouts that are measured. The page's location
 * is sent with the `token` parameter taken out (`stripSecretParams`), because the pay page and the renewal link carry a bearer token in it.
 */
export function GoogleAnalytics() {
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { page_location: (${stripSecretParams.toString()})(location.href) });
        `}
      </Script>
    </>
  )
}
