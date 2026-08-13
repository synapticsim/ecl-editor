import type { ECL_VARIABLE } from "../vars";
import { MSFS_BINDINGS, type MsfsExpr } from "./bindings";
import { MSFS_SWITCHES, type MsfsSwitch } from "./switches";
import type { XmlNode } from "./xml";

export interface ResolvedPart {
    partId?: string;
    camera?: string;
    /** The <Val>/<Operator> node testing this variable's state. undefined => no test can be built; caller falls back to a manual checkpoint. */
    test?: XmlNode;
}

/** The switch a leaf/combinator expression touches first, in argument order.
 *  Used to pick the <Instrument>/<ForceCamera> for an aggregate — the docs
 *  don't confirm multiple <Instrument> elements per checkpoint, so an
 *  aggregate highlights one representative part rather than all of them. */
function firstSwitch(expr: MsfsExpr): MsfsSwitch | undefined {
    if ("switch" in expr) return MSFS_SWITCHES[expr.switch] as MsfsSwitch;
    if (expr.op === "NOT") return firstSwitch(expr.arg);
    for (const arg of expr.args) {
        const sw = firstSwitch(arg);
        if (sw) return sw;
    }
    return undefined;
}

function leafNode(expr: Extract<MsfsExpr, { switch: unknown }>): XmlNode | undefined {
    const sw = MSFS_SWITCHES[expr.switch] as MsfsSwitch;
    if (!sw?.varName || !sw.unit) return undefined;

    let node: XmlNode;
    if (expr.state !== undefined) {
        const ordinal = sw.states?.[expr.state];
        if (ordinal === undefined) return undefined;
        node = {
            tag: "Operator",
            attrs: { OpType: "Equal" },
            children: [
                { tag: "Val", attrs: { SimVarName: sw.varName, Units: sw.unit } },
                { tag: "Val", attrs: { Value: ordinal } },
            ],
        };
    } else if (expr.value !== undefined) {
        node = {
            tag: "Operator",
            attrs: { OpType: "Equal" },
            children: [
                { tag: "Val", attrs: { SimVarName: sw.varName, Units: sw.unit } },
                { tag: "Val", attrs: { Value: expr.value } },
            ],
        };
    } else {
        node = { tag: "Val", attrs: { SimVarName: sw.varName, Units: sw.unit } };
    }
    return expr.negate ? { tag: "Operator", attrs: { OpType: "NOT" }, children: [node] } : node;
}

/** OpType only ever takes two operands (Between takes 3, Not takes 1, per the
 *  docs), so an N-way AND/OR nests N-1 binary Operators. */
function buildTest(expr: MsfsExpr): XmlNode | undefined {
    if ("switch" in expr) return leafNode(expr);

    if (expr.op === "NOT") {
        const inner = buildTest(expr.arg);
        return inner && { tag: "Operator", attrs: { OpType: "NOT" }, children: [inner] };
    }

    const nodes = expr.args.map(buildTest).filter((n): n is XmlNode => n !== undefined);
    if (nodes.length === 0) return undefined;
    return nodes.reduce((acc, node) => ({ tag: "Operator", attrs: { OpType: expr.op }, children: [acc, node] }));
}

/** Resolves an ECL_VARIABLE (as stored on `ActionItem.sensed`) to the MSFS
 *  cockpit part + test node that highlights and validates it. Returns
 *  `undefined` when there is no binding at all (unmapped variable). */
export function resolvePart(v: ECL_VARIABLE): ResolvedPart | undefined {
    const expr = MSFS_BINDINGS[v];
    if (!expr) return undefined;

    const sw = firstSwitch(expr);
    return {
        partId: sw?.partId,
        camera: sw?.camera,
        test: buildTest(expr),
    };
}
