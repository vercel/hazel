import Head from 'next/head';
import getLatest from '../../lib/get-latest';
import { extensionAliases } from '../../lib/extensions';

let latestCache = null;
const stripDot = ext => ext.replace('.', '');

export async function unstable_getStaticPaths() {
  const extensions = Object.keys(extensionAliases);
  const aliases = Object.values(extensionAliases).flat();
  const fullList = extensions.concat(aliases);

  return fullList.map(match => {
    return `/download/${match.replace('.', '')}`
  });
};

export async function unstable_getStaticProps(context) {
  const latest = latestCache || await getLatest();
  const { params: { platform } } = context;

  if (!latestCache) {
    latestCache = latest;
  }

  let match = null;

  for (const ext of Object.keys(extensionAliases)) {
    const toCheck = extensionAliases[ext].concat([ stripDot(ext) ]);

    if (toCheck.includes(platform)) {
      match = ext;
      break;
    }
  }

  return {
    props: {
      file: match && latest.platforms[match],
      repository: latest.repository,
      version: latest.version
    }
  };
};

export default function(props) {
  return (
    <main>
      <Head>
        <meta httpEquiv="Refresh" content={`5; url=${props.file.downloadUrl}`} />
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
      main {
        color: #FFF;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
            'Oxygen', 'Ubuntu', 'Fira Sans', 'Helvetica Neue', sans-serif;
      }

      h1 {
        font-weight: normal;
      }

      b {
        border-bottom: 2px solid #fff;
      }
    `}</style>

  <h1>Downloading <b>{props.repository} {props.version}</b></h1>
    </main>
  );
};
