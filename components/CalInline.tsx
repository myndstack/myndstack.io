"use client";

import Script from "next/script";

/** Cal.com booking link (public). Unset ⇒ no booking UI and no third-party JS. */
export const CAL_LINK = process.env.NEXT_PUBLIC_CAL_LINK;

/**
 * The bare Cal.com inline embed: its mount point plus the loader script
 * (`next/script` runs a given id once per page, so keep one mounted instance).
 * Renders nothing unless NEXT_PUBLIC_CAL_LINK is set. BookingEmbed wraps it
 * with a heading; the landing's contact tabs mount it on first open.
 */
export default function CalInline() {
  if (!CAL_LINK) return null;

  return (
    <>
      <div
        data-cal-namespace="intro"
        data-cal-link={CAL_LINK}
        data-cal-config='{"theme":"dark","layout":"month_view"}'
        className="clip-angular-26 min-h-[420px] overflow-hidden border border-line bg-surface"
      />

      <Script id="cal-embed" strategy="lazyOnload">
        {`(function(C,A,L){let p=function(a,ar){a.q.push(ar)};let d=C.document;C.Cal=C.Cal||function(){let cal=C.Cal;let ar=arguments;if(!cal.loaded){cal.ns={};cal.q=cal.q||[];d.head.appendChild(d.createElement("script")).src=A;cal.loaded=true}if(ar[0]===L){const api=function(){p(api,arguments)};const namespace=ar[1];api.q=api.q||[];typeof namespace==="string"?(cal.ns[namespace]=cal.ns[namespace]||api)&&p(cal.ns[namespace],ar)&&p(cal,["initNamespace",namespace]):p(cal,ar);return}p(cal,ar)}})(window,"https://app.cal.com/embed/embed.js","init");
Cal("init","intro",{origin:"https://cal.com"});
Cal.ns.intro("inline",{elementOrSelector:'[data-cal-namespace="intro"]',config:{layout:"month_view",theme:"dark"},calLink:${JSON.stringify(CAL_LINK)}});
Cal.ns.intro("ui",{hideEventTypeDetails:false,layout:"month_view",theme:"dark",cssVarsPerTheme:{dark:{"cal-brand":"#C9F24D"}}});`}
      </Script>
    </>
  );
}
