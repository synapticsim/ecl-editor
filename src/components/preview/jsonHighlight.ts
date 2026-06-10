/** Tokenize a JSON string into syntax-highlighted HTML lines. */
export function highlightJson(jsonStr: string): string[] {
    return jsonStr.split("\n").map((rawLine) => {
        let line = rawLine.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
        // strings — keys (followed by ":") vs values
        line = line.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"(\s*:)?/g, (_m, body: string, colon?: string) => {
            const cls = colon ? "k" : "s";
            return `<span class="${cls}">"${body}"</span>` + (colon || "");
        });
        // numbers
        line = line.replace(/(?<![\w"])(-?\d+\.?\d*)(?![\w"])/g, '<span class="n">$1</span>');
        // booleans + null
        line = line.replace(/\b(true|false)\b/g, '<span class="b">$1</span>');
        line = line.replace(/\bnull\b/g, '<span class="null">null</span>');
        // brackets / punctuation
        line = line.replace(/([{}[\],])/g, '<span class="p">$1</span>');
        return line;
    });
}
