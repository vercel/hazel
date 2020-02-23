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
    props: match && latest.platforms[match]
  };
};

export default function(props) {
  return (
    <meta httpEquiv="Refresh" content={`0; url=${props.downloadUrl}`} />
  );
};
