import type { ReactElement } from "react";

const paths: Record<string, ReactElement> = {
    search: (
        <path d="M7 1.5a5.5 5.5 0 1 1-3.5 9.74L1.06 13.7a.75.75 0 1 1-1.06-1.06l2.44-2.44A5.5 5.5 0 0 1 7 1.5Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
    ),
    plus: <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />,
    chev: (
        <path
            d="M5 3l5 4-5 4"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    ),
    "chevron-down": (
        <path
            d="M3 5.5l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    ),
    check: (
        <path
            d="M2.5 7.5l3 3 6-6.5"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    ),
    db: (
        <path d="M2 3v8c0 1.1 2.2 2 5 2s5-.9 5-2V3c0-1.1-2.2-2-5-2S2 1.9 2 3Zm5 1c-2.2 0-4-.4-4-1s1.8-1 4-1 4 .4 4 1-1.8 1-4 1Zm-4 1.6c1.1.5 2.5.7 4 .7s2.9-.2 4-.7V7c0 .6-1.8 1-4 1s-4-.4-4-1V5.6Zm0 3c1.1.5 2.5.7 4 .7s2.9-.2 4-.7V10c0 .6-1.8 1-4 1s-4-.4-4-1V8.6Z" />
    ),
    copy: (
        <g fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="3" y="3" width="7" height="9" rx="1.2" />
            <path d="M5.5 3V1.5h5.5a1 1 0 0 1 1 1V9" />
        </g>
    ),
    settings: (
        <g fill="none" stroke="currentColor" strokeWidth="1.2">
            <circle cx="7" cy="7" r="2" />
            <path d="M7 1v1.5M7 11.5V13M13 7h-1.5M2.5 7H1M11.24 2.76l-1.06 1.06M3.82 10.18l-1.06 1.06M11.24 11.24l-1.06-1.06M3.82 3.82L2.76 2.76" />
        </g>
    ),
    download: (
        <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <path d="M7 1v8" />
            <path d="M3.5 6L7 9.5 10.5 6" />
            <path d="M2 12h10" />
        </g>
    ),
    upload: (
        <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <path d="M7 13V5" />
            <path d="M3.5 8L7 4.5 10.5 8" />
            <path d="M2 2h10" />
        </g>
    ),
    trash: (
        <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <path d="M2.5 3.5h9M5.5 3.5V2h3v1.5M3.5 3.5l.5 8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l.5-8" />
        </g>
    ),
};

export function Icon({ name, size = 12 }: { name: string; size?: number }) {
    return (
        <svg className="ic-svg" width={size} height={size} viewBox="0 0 14 14" fill="currentColor">
            {paths[name]}
        </svg>
    );
}
