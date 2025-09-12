import React from 'react'

type Props = {
  className?: string
  title?: string
}

// Stylized "Icecat" logo: a walking bear with a smiling cat mask.
// Stroke-only so it adapts to light/dark via currentColor.
export default function Logo({ className = 'h-7 w-7', title = 'Icecat Logo' }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 160"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Ground shadow */}
        <ellipse cx="104" cy="138" rx="58" ry="10" opacity="0.25" />

        {/* Bear body */}
        <path d="M30 92c5-18 24-37 54-38 28-1 52 20 57 43 3 14-2 27-10 33" />

        {/* Bear head and snout */}
        <path d="M48 78c-8-2-14-7-14-13 0-9 11-17 24-18 13-1 26 7 26 16 0 5-4 10-10 13" />
        <path d="M60 74c-5 2-10 7-10 10 0 3 7 3 15 1" />
        <circle cx="70" cy="64" r="2.5" />

        {/* Front leg */}
        <path d="M58 96c-10 6-20 20-22 30 8 2 17-1 22-6 3-3 4-8 6-10" />

        {/* Hind leg */}
        <path d="M122 110c-10 8-14 16-16 28 9 3 19 0 24-7 4-6 5-12 5-18" />

        {/* Cat mask behind back */}
        <path d="M120 46c8-8 21-14 34-14 10 0 20 3 28 9l8-5-2 12c2 4 3 9 3 14 0 21-17 38-38 38-21 0-38-17-38-38 0-6 1-11 3-16" />

        {/* Cat facial features (eyes + smile) */}
        <path d="M140 68q6-6 12 0" />
        <path d="M166 68q6-6 12 0" />
        <path d="M144 84c8 6 18 6 26 0" />
      </g>
    </svg>
  )
}

