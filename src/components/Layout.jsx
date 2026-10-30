import { Link, NavLink, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Undervisning i Naturvidenskab – forside">
          <img src="/icons/uinLogoWhite_BlackBackground.svg" alt="" width="44" height="44" />
          <span>
            undervisning i
            <br />
            naturvidenskab
          </span>
        </Link>
        <nav>
          <NavLink to="/" end>Materialer</NavLink>
          <NavLink to="/om">Om</NavLink>
        </nav>
      </header>
      <main className="container">
        <Outlet />
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Undervisning i Naturvidenskab</span>
        <Link to="/admin">Admin</Link>
      </footer>
    </>
  )
}
