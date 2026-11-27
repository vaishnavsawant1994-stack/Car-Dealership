'use client'

import { Bell, CarFront, ClipboardList, Gauge, Heart, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, UserRound, X } from 'lucide-react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const links = [
  ['/account', 'Overview', LayoutDashboard], ['/account/favourites', 'Saved vehicles', Heart], ['/account/enquiries', 'Enquiries', ClipboardList],
  ['/account/test-drives', 'Test drives', Gauge], ['/account/sell-requests', 'Sell requests', CarFront], ['/account/purchases', 'Purchases', CarFront], ['/account/profile', 'Profile', UserRound],
  ['/account/settings', 'Notifications', Bell], ['/account/security', 'Security', ShieldCheck],
] as const

export function AccountNav({ name, email }: { name: string; email: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  return <>
    <button className="account-nav-trigger" type="button" onClick={() => setOpen(true)}><Menu /> Account menu</button>
    {open ? <button className="account-nav-backdrop" type="button" aria-label="Close account menu" onClick={() => setOpen(false)} /> : null}
    <aside className={`account-sidebar${open ? ' is-open' : ''}`}>
      <header><span>{name.charAt(0).toUpperCase()}</span><div><strong>{name}</strong><small>{email}</small></div><button type="button" aria-label="Close account menu" onClick={() => setOpen(false)}><X /></button></header>
      <nav aria-label="Customer account">
        {links.map(([href, label, Icon]) => {
          const active = href === '/account' ? pathname === href : pathname.startsWith(href)
          return <Link className={active ? 'is-active' : ''} href={href} key={href} onClick={() => setOpen(false)}><Icon />{label}</Link>
        })}
      </nav>
      <footer><Link href="/inventory"><Settings />Browse inventory</Link><button type="button" onClick={() => signOut({ callbackUrl: '/' })}><LogOut />Sign out</button></footer>
    </aside>
  </>
}
