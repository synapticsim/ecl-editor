import type { ChecklistItem } from "../../checklist";
import "./items/items.css";

import { ActionItemView } from "./items/ActionItemView";
import { ConditionalItemView } from "./items/ConditionalItemView";
import { FormFeedItemView } from "./items/FormFeedItemView";
import { FreeTextItemView } from "./items/FreeTextItemView";
import { MultiSelectItemView } from "./items/MultiSelectItemView";

export function ChecklistItemView({ item, number }: { item: ChecklistItem; number: string }) {
    switch (item.type) {
        case "action":
            return <ActionItemView item={item} number={number} />;
        case "conditional":
            return <ConditionalItemView item={item} number={number} />;
        case "multi-select":
            return <MultiSelectItemView item={item} number={number} />;
        case "free-text":
            return <FreeTextItemView item={item} number={number} />;
        case "form-feed":
            return <FormFeedItemView item={item} number={number} />;
    }
}
