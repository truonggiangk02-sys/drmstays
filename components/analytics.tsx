import { headers } from 'next/headers';
import { analyticsId } from '@/lib/analytics';

/** Google Analytics (GA4) for the public pages. Renders nothing unless GA_MEASUREMENT_ID is set and this is the real, indexable site. */
export async function Analytics() {
  const id = analyticsId((await headers()).get('host'));
  if (!id) return null;
  const init = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;
  return <>
    <script async src={`https://www.googletagmanager.com/gtag/js?id=${id}`} />
    <script dangerouslySetInnerHTML={{ __html: init }} />
  </>;
}
