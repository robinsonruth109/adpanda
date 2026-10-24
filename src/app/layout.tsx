import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata={title:'AdPanda | Food delivery in Alamdanga',description:'Discover local cloud kitchens and order food with cash on delivery in Alamdanga.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><header className="topbar"><div className="container nav"><Link href="/" className="logo">ad<span>panda</span> 🐼</Link><nav className="links"><Link href="/">Explore food</Link><Link href="/merchant/login">Merchant portal</Link><Link href="/rider">Rider preview</Link><Link href="/admin">Admin preview</Link></nav></div></header>{children}<footer className="footer"><div className="container">© AdPanda · Built for Alamdanga · COD marketplace preview</div></footer></body></html>}
