import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tayyab Mart Self Checkout',
  description: 'Self checkout system for Tayyab Mart',
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