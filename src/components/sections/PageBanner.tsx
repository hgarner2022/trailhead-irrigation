export function PageBanner({
  title,
  description,
  backgroundImage,
}: {
  title: string
  description?: string
  backgroundImage?: string
}) {
  return (
    <section className="relative py-20 md:py-28 flex items-center">
      {backgroundImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${backgroundImage}')` }}
        >
          <div className="absolute inset-0 bg-navy/75" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-navy" />
      )}
      <div className="relative container-padding-x mx-auto max-w-7xl text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white">{title}</h1>
        {description && (
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">{description}</p>
        )}
      </div>
    </section>
  )
}
