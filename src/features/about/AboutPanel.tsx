declare const __BUILD_INFO__: {
  BUILD_DATE: string
  GIT_SHA: string
  GIT_SHA_FULL: string
}

function AboutPanel() {
  const buildDate = __BUILD_INFO__.BUILD_DATE
  const gitSha = __BUILD_INFO__.GIT_SHA
  const gitShaFull = __BUILD_INFO__.GIT_SHA_FULL

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

        <hr />
        <div>
          <strong>Build date:</strong> {buildDate}
        </div>
        <div>
          <strong>Git SHA: </strong> 
            <a href={`https://github.com/golle-com/golle.com/commit/${gitShaFull}`}>{gitSha}</a>
        </div>
      </div>
    </div>
  )
}

export default AboutPanel
