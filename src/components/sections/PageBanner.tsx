import type React from "react"
export function PageBanner({
  title,
  description,
  backgroundImage,
  children,
}: {
  title: string
  description?: string
  backgroundImage?: string
  /** Optional small element under the description, e.g. the seasonal chip. */
  children?: React.ReactNode
}) {
  return (
    <section className="relative py-20 md:py-28 flex items-center">
      {backgroundImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${backgroundImage}')` }}
        >
          {/* Same treatment as the homepage hero: dark enough for white text,
              light enough that the photo still reads as a photo. */}
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal/85 via-charcoal/60 to-charcoal/35" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-navy" />
      )}
      <div className="relative container-padding-x mx-auto max-w-7xl text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white">{title}</h1>
        {description && (
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">{description}</p>
        )}
        {children && <div className="mt-6 flex justify-center">{children}</div>}
      </div>
    </section>
  )
}
