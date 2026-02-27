function AboutPanel() {
  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title">About</h5>
      </div>
      <div className="card-body">
        <div>
          Source code:{' '}
          <a href="https://github.com/golle-com/golle.com">
            https://github.com/golle-com/golle.com
          </a>
        </div>
        <div>This project is not affiliated with, endorsed by, or sponsored by Real-Debrid.</div>
        <div>This app is hosted on Cloudflare at <a href="https://gole.com">golle.com</a>.</div>
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
