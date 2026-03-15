import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Campus Admin',
  description: 'Campus Admin Location Tracking Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
