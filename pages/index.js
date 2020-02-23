import Head from 'next/head';
import bytes from 'bytes';
import getLatest from '../lib/get-latest';

export async function unstable_getStaticProps(context) {
  return {
    props: await getLatest()
  };
}

export default props => {
  const githubUrl = `https://github.com/${props.account}/${props.repository}/`;

  return (
    <main>
      <Head>
        <title>Download {props.repository}</title>
      </Head>

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
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
            'Oxygen', 'Ubuntu', 'Fira Sans', 'Helvetica Neue', sans-serif;
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

        h1 a {
          color: inherit;
        }

        h1 a:hover {
          border-color: #fff;
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
          <a href={githubUrl}>{props.account}/<b>{props.repository}</b></a>
        </h1>
        <time>{props.age}</time>
      </aside>

      <nav>
        {Object.keys(props.platforms).map(extension => {
          const platform = props.platforms[extension];

          return (
            <span>
              <a href={platform.url}>{extension}</a>
              <i>{bytes(platform.size, { unitSeparator: ' ' })}</i>
            </span>
          );
        })}
      </nav>

      <aside>
        <h2>{props.version}</h2>

        <legend>
          <a href={githubUrl + 'releases/tag/' + props.version}>
            Release Notes
          </a>
          <a href={githubUrl + 'releases'}>All Releases</a>
        </legend>
      </aside>
    </main>
  );
};
