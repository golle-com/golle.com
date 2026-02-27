function AboutPanel() {
  return (
    <div className="card shadow-sm">
      <div className="card-header bg-body">
        <h5 className="mb-0">About</h5>
      </div>
      <div className="card-body d-flex flex-column gap-2">
        <div>
          Source code:{' '}
          <a href="https://github.com/golle-com/golle.com">
            https://github.com/golle-com/golle.com
          </a>
        </div>
        <div>This project is not affiliated with, endorsed by, or sponsored by Real-Debrid.</div>
        <div>This app is hosted on Cloudflare.</div>
        <div>
          Cloudflare system status:{' '}
          <a href="https://www.cloudflarestatus.com/">
            https://www.cloudflarestatus.com/
          </a>
        </div>
      </div>
    </div>
  )
}

export default AboutPanel
