'use client'

import {
  Bell, Boxes, Building2, CarFront, ChevronDown, ChevronLeft, ChevronRight, CircleGauge, ClipboardCheck,
  ContactRound, FileImage, Files, GalleryHorizontal, LayoutDashboard, Menu, MessageSquareText, Search,
  Settings, ShieldCheck, Star, Tags, UserRound, UsersRound, Wrench, X, LogOut,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { signOut } from 'next-auth/react'
import { useFocusTrap } from '@/lib/hooks/use-focus-trap'

export type AdminNavItem = { label: string; href: string; icon: string }

const icons: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard, vehicles: CarFront, brands: Tags, bodyTypes: Boxes, features: Wrench,
  enquiries: MessageSquareText, testDrives: ClipboardCheck, sellRequests: CarFront, contacts: ContactRound,
  testimonials: Star, gallery: GalleryHorizontal, content: Files, newsletter: FileImage, showrooms: Building2,
  users: UsersRound, organisation: Building2, settings: Settings, audit: ShieldCheck,
}

export function AdminShell({ children, navGroups, name, role, unread }: { children: ReactNode; navGroups: Array<{ label: string; items: AdminNavItem[] }>; name: string; role: string; unread: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const mobileDrawerRef = useFocusTrap<HTMLElement>(mobileOpen)

  useEffect(() => { const saved = localStorage.getItem('optimum-admin-sidebar') ?? localStorage.getItem('deccan-admin-sidebar'); setCollapsed(saved === 'collapsed'); if (saved) localStorage.setItem('optimum-admin-sidebar', saved); localStorage.removeItem('deccan-admin-sidebar') }, [])
  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMobileOpen(false); setProfileOpen(false) } }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close) }, [])

  function toggleSidebar() {
    setCollapsed((value) => {
      localStorage.setItem('optimum-admin-sidebar', value ? 'expanded' : 'collapsed')
      return !value
    })
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = new FormData(event.currentTarget).get('q')?.toString().trim()
    if (query) router.push(`/admin/vehicles?search=${encodeURIComponent(query)}`)
  }

  const sidebar = <>
    <div className="admin-brand"><span className="admin-brand__mark">OA</span><span><strong>Car Dealership Demo</strong><small>Staff operations</small></span><button type="button" className="admin-mobile-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X /></button></div>
    <nav className="admin-nav" aria-label="Admin navigation">
      {navGroups.map((group) => <section key={group.label}><p>{group.label}</p>{group.items.map((item) => { const Icon = icons[item.icon] ?? CircleGauge; const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`)); return <Link key={item.href} href={item.href} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined} title={collapsed ? item.label : undefined}><Icon /><span>{item.label}</span></Link> })}</section>)}
    </nav>
  </>

  return <div className={`admin-shell${collapsed ? ' is-collapsed' : ''}`}>
    <aside className="admin-sidebar">{sidebar}<button className="admin-sidebar-toggle" type="button" onClick={toggleSidebar} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight /> : <ChevronLeft />}<span>Collapse</span></button></aside>
    {mobileOpen ? <div className="admin-mobile-layer"><button className="admin-mobile-backdrop" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} /><aside className="admin-mobile-drawer" role="dialog" aria-modal="true" aria-label="Admin navigation" ref={mobileDrawerRef}>{sidebar}</aside></div> : null}
    <div className="admin-workspace">
      <header className="admin-topbar">
        <button className="admin-menu-button" type="button" aria-label="Open admin menu" onClick={() => setMobileOpen(true)}><Menu /></button>
        <form className="admin-global-search" role="search" onSubmit={search}><Search /><label className="sr-only" htmlFor="admin-search">Search inventory</label><input id="admin-search" name="q" placeholder="Search stock, model or registration" /></form>
        <div className="admin-top-actions"><Link href="/admin/notifications" className="admin-icon-action" aria-label={`${unread} unread notifications`}><Bell />{unread ? <span>{unread > 9 ? '9+' : unread}</span> : null}</Link><div className="admin-profile-menu"><button type="button" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen}><span>{name.charAt(0)}</span><span><strong>{name}</strong><small>{role.replaceAll('_', ' ')}</small></span><ChevronDown /></button>{profileOpen ? <div><Link href="/admin/profile"><UserRound />My profile</Link><Link href="/"><CarFront />Public website</Link><button type="button" onClick={() => signOut({ callbackUrl: '/login' })}><LogOut />Sign out</button></div> : null}</div></div>
      </header>
      <main className="admin-main" id="admin-main">{children}</main>
    </div>
  </div>
}
