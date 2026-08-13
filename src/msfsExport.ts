import type { ActionItem, Checklist, ChecklistDatabase, ChecklistItem, NoteLevel } from "./checklist";
import { resolvePart } from "./lib/msfs/parts";
import { type ChecklistStepId, DEFAULT_STEP, PHASE_STEP } from "./lib/msfs/steps";
import { renderXml, type XmlNode } from "./lib/msfs/xml";
import { varName } from "./lib/vars";
import { nameResolverFor } from "./schemas";

export interface MsfsWarning {
    checklist: string;
    item?: string;
    message: string;
}

export interface MsfsExportResult {
    xml: string;
    warnings: MsfsWarning[];
}

const NOTE_PREFIX: Record<NoteLevel, string> = {
    note: "NOTE: ",
    caution: "CAUTION: ",
    warning: "WARNING: ",
};

interface EmitCtx {
    nameOf: (id: string) => string | undefined;
    warn: (message: string, item?: string) => void;
    linkIdRef: { current: number };
    depth: number;
}

function nextLinkId(ctx: EmitCtx): string {
    ctx.linkIdRef.current += 1;
    return String(ctx.linkIdRef.current);
}

function manualTest(): XmlNode[] {
    return [
        {
            tag: "Action",
            attrs: { Copilot: "FALSE", Condition: "Init", Once: "TRUE", SpecialAction: "WaitForUserToDoIt" },
        },
    ];
}

function emitAction(item: ActionItem, ctx: EmitCtx): XmlNode[] {
    const subject = (item.limitation ? "LIMITATION: " : "") + item.challenge;
    const children: XmlNode[] = [
        { tag: "CheckpointDesc", attrs: { SubjectTT: subject, ExpectationTT: item.response } },
    ];

    let instrumentPartId: string | undefined;
    let camera: string | undefined;
    let testBody: XmlNode[];

    if (item.timer !== undefined) {
        testBody = [
            {
                tag: "Action",
                attrs: {
                    Copilot: "FALSE",
                    Condition: "Init",
                    Once: "TRUE",
                    SpecialAction: "WaitForDuration",
                    Value: item.timer,
                },
            },
        ];
    } else if (item.sensed !== undefined) {
        const label = varName(item.sensed) ?? String(item.sensed);
        const part = resolvePart(item.sensed);
        if (!part) {
            ctx.warn(
                `sensed variable "${label}" has no MSFS switch mapping — emitted as a manual checkpoint`,
                item.challenge,
            );
            testBody = manualTest();
        } else {
            instrumentPartId = part.partId;
            camera = part.camera;
            if (part.test === undefined) {
                ctx.warn(
                    `sensed variable "${label}" is mapped but has no test expression yet — emitted as a manual checkpoint`,
                    item.challenge,
                );
                testBody = manualTest();
            } else {
                let valNode: XmlNode = part.test;
                if (item.inverted) valNode = { tag: "Operator", attrs: { OpType: "NOT" }, children: [valNode] };
                testBody = [];
                if (item.latchable) testBody.push({ tag: "Once", text: "True" });
                testBody.push({ tag: "TestValue", children: [valNode] });
            }
        }
    } else {
        testBody = manualTest();
    }

    if (instrumentPartId) children.push({ tag: "Instrument", attrs: { Id: instrumentPartId } });
    if (camera) children.push({ tag: "ForceCamera", attrs: { Name: camera } });
    children.push({ tag: "Test", children: testBody });

    const out: XmlNode[] = [{ tag: "Checkpoint", children }];
    if (item.comment) out.push({ tag: "Clue", attrs: { Name: item.comment, IsOptional: "TRUE" } });
    out.push(...deferFollowOnClues(item.defer, item.followOn, ctx));
    return out;
}

function deferFollowOnClues(defer: string | undefined, followOn: string | undefined, ctx: EmitCtx): XmlNode[] {
    const out: XmlNode[] = [];
    if (defer) out.push({ tag: "Clue", attrs: { Name: `Defer to ${ctx.nameOf(defer) ?? defer}`, IsOptional: "TRUE" } });
    if (followOn)
        out.push({
            tag: "Clue",
            attrs: { Name: `Follow on to ${ctx.nameOf(followOn) ?? followOn}`, IsOptional: "TRUE" },
        });
    return out;
}

function emitBranch(challenge: string, branches: [string, ChecklistItem[]][], ctx: EmitCtx): XmlNode[] {
    const lead: XmlNode = { tag: "Checkpoint", children: [{ tag: "CheckpointDesc", attrs: { SubjectTT: challenge } }] };

    if (ctx.depth >= 2) {
        ctx.warn(`branch nested past the EFB's 2-block limit — flattened inline under "${challenge}"`, challenge);
        const out: XmlNode[] = [lead];
        for (const [label, items] of branches) {
            out.push({
                tag: "Checkpoint",
                children: [{ tag: "CheckpointDesc", attrs: { SubjectTT: `${challenge} - ${label}` } }],
            });
            out.push(...emitItems(items, { ...ctx, depth: ctx.depth + 1 }));
        }
        return out;
    }

    const linkId = nextLinkId(ctx);
    const out: XmlNode[] = [lead];
    for (const [label, items] of branches) {
        out.push({
            tag: "Block",
            // LinkId alone makes these blocks mutually exclusive; Facultative is
            // a separate, unrelated flag (hides a block by default behind a
            // Settings toggle) and must NOT be set here. The block's own
            // SubjectTT repeats the challenge (docs have no non-interactive
            // text element to hang it on otherwise) so "YES"/"NO" tabs don't
            // read as orphaned labels once the lead checkpoint scrolls away.
            attrs: { SubjectTT: `${challenge} ${label}`, LinkId: linkId },
            children: emitItems(items, { ...ctx, depth: ctx.depth + 1 }),
        });
    }
    return out;
}

function emitItem(item: ChecklistItem, ctx: EmitCtx): XmlNode[] {
    switch (item.type) {
        case "action":
            return emitAction(item, ctx);
        case "note":
            return [
                {
                    tag: "Checkpoint",
                    children: [{ tag: "CheckpointDesc", attrs: { SubjectTT: NOTE_PREFIX[item.level] + item.text } }],
                },
                ...deferFollowOnClues(item.defer, item.followOn, ctx),
            ];
        case "free-text":
            return [
                { tag: "Checkpoint", children: [{ tag: "CheckpointDesc", attrs: { SubjectTT: item.text } }] },
                ...deferFollowOnClues(item.defer, item.followOn, ctx),
            ];
        case "form-feed":
            return [];
        case "conditional":
            return emitBranch(
                item.challenge,
                [
                    ["YES", item.paths.YES],
                    ["NO", item.paths.NO],
                ],
                ctx,
            );
        case "multi-select":
            return emitBranch(item.challenge, Object.entries(item.paths), ctx);
    }
}

function emitItems(items: ChecklistItem[], ctx: EmitCtx): XmlNode[] {
    return items.flatMap((it) => emitItem(it, ctx));
}

function emitPage(cl: Checklist, ctx: EmitCtx): XmlNode {
    return { tag: "Page", attrs: { SubjectTT: cl.name }, children: emitItems(cl.items, ctx) };
}

export function toMsfsXml(db: ChecklistDatabase): MsfsExportResult {
    const warnings: MsfsWarning[] = [];
    const nameOf = nameResolverFor(db);
    const linkIdRef = { current: 0 };

    const stepOrder: ChecklistStepId[] = [];
    const byStep = new Map<ChecklistStepId, Checklist[]>();
    let phaselessCount = 0;
    for (const cl of db.categories.normal) {
        let step: ChecklistStepId;
        if (cl.phase) {
            step = PHASE_STEP[cl.phase];
        } else {
            step = DEFAULT_STEP;
            phaselessCount++;
        }
        if (!byStep.has(step)) {
            byStep.set(step, []);
            stepOrder.push(step);
        }
        byStep.get(step)?.push(cl);
    }
    if (phaselessCount > 0) {
        warnings.push({
            checklist: "",
            message: `${phaselessCount} normal checklist(s) have no phase set — defaulted to ${DEFAULT_STEP}`,
        });
    }

    const skippedCount =
        db.categories.non_normal.reduce((n, s) => n + s.checklists.length, 0) +
        db.categories.procedure.reduce((n, s) => n + s.checklists.length, 0);
    if (skippedCount > 0) {
        warnings.push({
            checklist: "",
            message: `${skippedCount} non-normal/procedure checklist(s) were skipped (MSFS export covers Normal checklists only)`,
        });
    }

    const steps: XmlNode[] = stepOrder.map((step) => ({
        tag: "Step",
        attrs: { ChecklistStepId: step },
        children: (byStep.get(step) ?? []).map((cl) =>
            emitPage(cl, {
                nameOf,
                warn: (message, item) => warnings.push({ checklist: cl.name, item, message }),
                linkIdRef,
                depth: 0,
            }),
        ),
    }));

    const root: XmlNode = {
        tag: "SimBase.Document",
        attrs: { Type: "Checklist", version: "1,0" },
        children: [{ tag: "Checklist.Checklist", attrs: { Type: "Checklist" }, children: steps }],
    };

    return { xml: renderXml(root), warnings };
}
