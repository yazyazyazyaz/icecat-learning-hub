export default function HomePage() {
  return (
    <div className="grid gap-6">
      <section className="soft-section">
        <h1 className="text-base md:text-lg font-semibold heading-underline">Welcome!</h1>
        <p className="text-neutral-700 mt-3 text-sm leading-relaxed">
          This is a Beta version of Icecat Hub. If you spot any bugs, please report them to{' '}
          <a className="underline" href="mailto:yagiz@icecat.com">yagiz@icecat.com</a>.
        </p>
      </section>
    </div>
  )
}
