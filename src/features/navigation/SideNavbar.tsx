import { NavLink } from 'react-router-dom'

export type NavView = {
  id: string
  label: string
  path: string
}

type SideNavbarProps = {
  authTokens: boolean
  views: NavView[]
}

function SideNavbar({ authTokens, views }: SideNavbarProps) {
  const handleNavClick = () => {
    const nav = document.getElementById('pageNav')
    if (!nav) {
      return
    }
    const bootstrap = (window as { bootstrap?: { Collapse?: { getOrCreateInstance?: (element: Element) => { hide: () => void } } } }).bootstrap
    if (!bootstrap?.Collapse?.getOrCreateInstance) {
      return
    }
    bootstrap.Collapse.getOrCreateInstance(nav).hide()
  }

  return (
    <nav className="navbar navbar-expand-md bg-light">
      <div className="container-fluid">
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#pageNav"
          aria-controls="pageNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="pageNav">
          <div className="navbar-nav">
            {authTokens
              ? views.map((view) => (
                  <NavLink
                    key={view.id}
                    to={view.path}
                    end
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `nav-link${isActive ? ' active' : ''}`
                    }
                  >
                    {view.label}
                  </NavLink>
                ))
              : null}
            <NavLink
              to="/about"
              end
              onClick={handleNavClick}
              className={({ isActive }) =>
                `nav-link${isActive ? ' active' : ''}`
              }
            >
              About
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default SideNavbar