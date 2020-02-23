import getLatest from '../lib/get-latest';

export async function unstable_getStaticProps(context) {
  return {
    props: await getLatest('zeit', 'hyper')
  };
}

export default props => {
  console.log(props);
  return (
    <main>
      <style jsx global>{`
        html,
        body,
        #__next {
          height: 100%;
          width: 100%;
        }

        body {
          background: #000;
          margin: 0;
        }

        #__next {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      <style jsx>{`
        a {
          color: #3291ff;
          text-decoration: none;
          border-bottom: 2px solid transparent;
        }

        a:hover {
          border-bottom-color: #3291ff;
        }

        main {
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
            "Oxygen", "Ubuntu", "Fira Sans", "Helvetica Neue", sans-serif;
          max-width: 400px;
          width: 100%;
          padding: 0 24px;
        }

        aside {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 0;
        }

        h1,
        h2 {
          font-weight: normal;
          margin: 0;
        }

        nav {
          border-top: 1px solid #333;
          border-bottom: 1px solid #333;
          padding: 24px 0;
        }

        nav span {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 24px;
        }

        nav i {
          color: #999;
        }

        legend a {
          margin-left: 32px;
        }
      `}</style>

      <aside>
        <h1>
          zeit/<b>hyper</b>
        </h1>
        <time>10 months ago</time>
      </aside>

      <nav>
        <span>
          <a href="#">.dmg</a>
          <i>53.8 MB</i>
        </span>
        <span>
          <a href="#">.AppImage</a>
          <i>57.1 MB</i>
        </span>
        <span>
          <a href="#">.zip</a>
          <i>55.6 MB</i>
        </span>
        <span>
          <a href="#">.rpm</a>
          <i>39.2 MB</i>
        </span>
        <span>
          <a href="#">.exe</a>
          <i>60 MB</i>
        </span>
        <span>
          <a href="#">.deb</a>
          <i>39.2 MB</i>
        </span>
      </nav>

      <aside>
        <h2>3.0.2</h2>

        <legend>
          <a href="#">Release Notes</a>
          <a href="#">All Releases</a>
        </legend>
      </aside>
    </main>
  );
};
