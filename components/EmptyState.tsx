import Link from "next/link";

type Props = {
  /** Mono status line, e.g. "No open roles". */
  readonly label: string;
  readonly body: string;
  readonly action: { readonly href: string; readonly text: string };
};

/**
 * What a list shows when it has nothing in it: says so plainly and offers the
 * next step, instead of an empty grid under a heading that promises content.
 */
export default function EmptyState({ label, body, action }: Props) {
  return (
    <div className="border border-dashed border-line-3 bg-surface px-6 py-8">
      <div className="mb-3 font-mono text-11 tracking-[0.1em] text-t5 uppercase">
        {label}
      </div>
      <p className="m-0 mb-5 max-w-[520px] text-15 leading-body text-t3">{body}</p>
      <Link href={action.href} className="btn btn-outline">
        {action.text}
      </Link>
    </div>
  );
}
