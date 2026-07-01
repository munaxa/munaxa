import { headers } from 'next/headers';
import { ANALYTICS } from '@/lib/seo/config';

/**
 * Privacy-respecting analytics loader. Each provider is rendered only when its ID is
 * configured, and every script carries the request CSP nonce (see middleware.ts), so the
 * strict nonce-based Content-Security-Policy stays intact. Under `strict-dynamic`, the
 * nonce'd loader is trusted to pull each vendor's script; the analytics hosts are also
 * allow-listed in the CSP `connect-src`/`img-src` for the network calls they make.
 *
 * Supported: Google Analytics 4 (gtag.js), Microsoft Clarity, PostHog.
 */
export async function Analytics() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const { ga4, clarity, posthogKey, posthogHost } = ANALYTICS;

  return (
    <>
      {ga4 && (
        <>
          <script async nonce={nonce} src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} />
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4}',{anonymize_ip:true});`,
            }}
          />
        </>
      )}

      {clarity && (
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarity}");`,
          }}
        />
      )}

      {posthogKey && (
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init('${posthogKey}',{api_host:'${posthogHost}'});`,
          }}
        />
      )}
    </>
  );
}
