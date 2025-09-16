import Image from "next/image"

type Props = {
  className?: string
  title?: string
}

export default function Logo({ className = 'h-7 w-7', title = 'Icecat Logo' }: Props) {
  return (
    <Image
      src="/icecat-favicon.ico"
      alt={title}
      className={className}
      width={40}
      height={40}
      priority
      unoptimized
    />
  )
}
