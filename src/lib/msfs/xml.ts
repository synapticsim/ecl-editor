export interface XmlNode {
    tag: string;
    attrs?: Record<string, string | number | undefined>;
    children?: XmlNode[];
    /** Text body, for the rare element without child elements or attributes (e.g. `<Once>True</Once>`). */
    text?: string;
}

function escapeAttr(value: string): string {
    return value
        .replace(/[\n\r\t]+/g, " ")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function renderAttrs(attrs: XmlNode["attrs"]): string {
    if (!attrs) return "";
    let out = "";
    for (const [key, value] of Object.entries(attrs)) {
        if (value === undefined) continue;
        out += ` ${key}="${escapeAttr(String(value))}"`;
    }
    return out;
}

function renderNode(node: XmlNode, depth: number, out: string[]): void {
    const indent = "    ".repeat(depth);
    const attrs = renderAttrs(node.attrs);
    const hasChildren = node.children && node.children.length > 0;

    if (!hasChildren && node.text === undefined) {
        out.push(`${indent}<${node.tag}${attrs}/>`);
        return;
    }

    if (node.text !== undefined) {
        out.push(`${indent}<${node.tag}${attrs}>${escapeAttr(node.text)}</${node.tag}>`);
        return;
    }

    out.push(`${indent}<${node.tag}${attrs}>`);
    for (const child of node.children ?? []) renderNode(child, depth + 1, out);
    out.push(`${indent}</${node.tag}>`);
}

export function renderXml(root: XmlNode, declaration = true): string {
    const out: string[] = [];
    if (declaration) out.push('<?xml version="1.0" encoding="UTF-8"?>', "");
    renderNode(root, 0, out);
    return out.join("\n");
}
