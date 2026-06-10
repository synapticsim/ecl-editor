import { highlightJson } from "./jsonHighlight";

export function JsonView({ json }: { json: string }) {
    const lines = highlightJson(json);
    return (
        <pre className="json">
            <div className="gutter">
                {lines.map((_, i) => (
                    <div key={i}>{i + 1}</div>
                ))}
            </div>
            <div className="code">
                {lines.map((line, i) => (
                    <div key={i} dangerouslySetInnerHTML={{ __html: line || "&nbsp;" }} />
                ))}
            </div>
        </pre>
    );
}
