export interface ActionItem {
    type: "action";
    id: string;
    challenge: string;
    response?: string;
    extension?: string;
}

export interface SensedItem {
    type: "sensed";
    id: string;
    challenge: string;
    response?: string;
    sensed: string;
}

export interface ConditionalItem {
    type: "conditional";
    id: string;
    challenge: string;
    paths: {
        YES: ChecklistItem[];
        NO: ChecklistItem[];
    };
}

export interface MultiSelectItem {
    type: "multi-select";
    id: string;
    challenge: string;
    paths: { [response: string]: ChecklistItem[] };
}

export interface FreeTextItem {
    type: "free-text";
    id: string;
    text: string;
}

export interface FormFeedItem {
    type: "form-feed";
    id: string;
}

export type ChecklistItem = ActionItem | SensedItem | ConditionalItem | MultiSelectItem | FreeTextItem | FormFeedItem;

export type ItemType = ChecklistItem["type"];

export type Category = "normal" | "non-normal" | "procedure";

export interface SectionHeader {
    kind: "header";
    id: string;
    name: string;
}

export interface Checklist {
    kind?: "checklist";
    id: string;
    name: string;
    category: Category;
    items: ChecklistItem[];
}

export type CategoryEntry = Checklist | SectionHeader;

export interface ChecklistDatabase {
    id: string;
    name: string;
    version: string;
    categories: Record<Category, CategoryEntry[]>;
}

export function isHeader(entry: CategoryEntry): entry is SectionHeader {
    return (entry as SectionHeader).kind === "header";
}

export const CATEGORY_LABELS: Record<Category, string> = {
    normal: "Normal",
    "non-normal": "Non-Normal",
    procedure: "Procedure",
};

export const ECL_VARIABLE = {
    DOME_ON: 0,
    PROBE_HEAT_ON: 1,
    WINDOW_HEAT_L_WINDOW_OFF: 2,
    WINDOW_HEAT_L_WSHLD_OFF: 3,
    WINDOW_HEAT_R_WSHLD_OFF: 4,
    WINDOW_HEAT_R_WINDOW_OFF: 5,
    PFCC1_OFF: 6,
    PFCC2_OFF: 7,
    PFCC3_OFF: 8,
    CVR_TEST: 9,
    CVR_ERASE: 10,
    ANNUN_DIM: 11,
    ANNUN_BRT: 12,
    ANNUN_STORM: 13,
    SERV_INT_ON: 14,
    AURAL_WARN_INHIB: 15,
    HYD_1_SOV_CLSD: 16,
    HYD_2_SOV_CLSD: 17,
    HYD_3A_OFF: 18,
    HYD_3A_AUTO: 19,
    HYD_3A_ON: 20,
    HYD_3B_OFF: 21,
    HYD_3B_AUTO: 22,
    HYD_3B_ON: 23,
    HYD_2B_OFF: 24,
    HYD_2B_AUTO: 25,
    HYD_2B_ON: 26,
    HYD_PTU_OFF: 27,
    HYD_PTU_AUTO: 28,
    HYD_PTU_ON: 29,
    ELEC_BUS_ISOL_MAIN: 30,
    ELEC_BUS_ISOL_AUTO: 31,
    ELEC_BUS_ISOL_ESS: 32,
    CABIN_PWR_OFF: 33,
    RAT_GEN_ON: 34,
    BATT_1_OFF: 35,
    BATT_1_AUTO: 36,
    BATT_2_OFF: 37,
    BATT_2_AUTO: 38,
    ELEC_L_GEN_OFF: 39,
    ELEC_L_DISC_DISCONNECT: 40,
    ELEC_R_GEN_OFF: 41,
    ELEC_R_DISC_DISCONNECT: 42,
    ELEC_EXT_PWR_ON: 43,
    APU_GEN_OFF: 44,
    APU_OFF: 45,
    APU_RUN: 46,
    APU_START: 47,
    TAWS_GEAR_INHIB: 48,
    TAWS_TERR_INHIB: 49,
    TAWS_FLAP_INHIB: 50,
    TAWS_GS_CNCL: 51,
    MAN_XFR_OFF: 52,
    MAN_XFR_L: 53,
    MAN_XFR_R: 54,
    MAN_XFR_CTR: 55,
    GRAV_XFR_ON: 56,
    L_BOOST_PUMP_OFF: 57,
    L_BOOST_PUMP_AUTO: 58,
    L_BOOST_PUMP_ON: 59,
    R_BOOST_PUMP_OFF: 60,
    R_BOOST_PUMP_AUTO: 61,
    R_BOOST_PUMP_ON: 62,
    ACT_XFR_OFF: 63,
    ACT_XFR_AUTO: 64,
    ACT_XFR_BACKUP: 65,
    ACT_SOV_CLOSE: 66,
    ACT_SOV_AUTO: 67,
    ACT_SOV_OPEN: 68,
    MAN_TEMP_ON: 69,
    FWD_CARGO_OFF: 70,
    FWD_CARGO_VENT: 71,
    FWD_CARGO_LO_HEAT: 72,
    FWD_CARGO_HI_HEAT: 73,
    AFT_CARGO_OFF: 74,
    AFT_CARGO_VENT: 75,
    TRIM_AIR_OFF: 76,
    PACK_FLOW_HI: 77,
    RECIRC_OFF: 78,
    RAM_AIR_OPEN: 79,
    XBLEED_MAN_CLSD: 80,
    XBLEED_AUTO: 81,
    XBLEED_MAN_OPEN: 82,
    L_PACK_OFF: 83,
    L_BLEED_OFF: 84,
    R_PACK_OFF: 85,
    R_BLEED_OFF: 86,
    APU_BLEED_OFF: 87,
    L_COWL_OFF: 88,
    L_COWL_AUTO: 89,
    L_COWL_ON: 90,
    WING_OFF: 91,
    WING_AUTO: 92,
    WING_ON: 93,
    R_COWL_OFF: 94,
    R_COWL_AUTO: 95,
    R_COWL_ON: 96,
    ELT_TEST: 97,
    ELT_ARM: 98,
    ELT_ON: 99,
    FWD_CARGO_FIRE_PRESSED: 10,
    AFT_CARGO_FIRE_PRESSED: 11,
    CARGO_FIRE_BTL_PRESSED: 12,
    INLET_OFF: 13,
    EXHAUST_VLV_ONLY: 14,
    EXHAUST_AUTO: 15,
    EXHAUST_ON: 16,
    EMER_DEPRESS_ON: 17,
    AUTO_PRESS_MAN: 18,
    DITCHING_ON: 19,
    PASS_OXY_DPLY: 110,
    EVAC_CMD_ON: 111,
    EMER_LIGHTS_OFF: 112,
    EMER_LIGHTS_ARM: 113,
    EMER_LIGHTS_ON: 114,
    L_ENG_FIRE_PRESSED: 115,
    R_ENG_FIRE_PRESSED: 116,
    APU_FIRE_PRESSED: 117,
    NAV_LTS_ON: 118,
    BEACON_LTS_ON: 119,
    STROBE_LTS_ON: 120,
    EXTERNAL_LTS_ON: 121,
    LOGO_LTS_ON: 122,
    WING_INSP_LTS_ON: 123,
    TAXI_LTS_OFF: 124,
    TAXI_LTS_NARROW: 125,
    TAXI_LTS_WIDE: 126,
    L_LDG_LTS_ON: 127,
    NOSE_LDG_LTS_ON: 128,
    R_LDG_LTS_ON: 129,
    LANDING_LTS_ON: 130,
    SEAT_BELTS_OFF: 131,
    SEAT_BELTS_AUTO: 132,
    SEAT_BELTS_ON: 133,
    NO_PED_OFF: 134,
    NO_PED_AUTO: 135,
    NO_PED_ON: 136,
    ALTN_GEAR_NORM: 137,
    ALTN_GEAR_DOWN: 138,
    GEAR_AURAL_CNCL: 139,
    NOSE_STEER_OFF: 140,
    ALTN_BRAKE_ON: 141,
    ENG_START_L_ENG_CRANK: 142,
    ENG_START_AUTO: 143,
    ENG_START_R_ENG_CRANK: 144,
    CONT_IGNITION_ON: 145,
    DOOR_UNLOCK_PRESSED: 146,
    EMER_ACCESS_DENY: 147,
    PARK_BRAKE_ON: 148,
    L_SIDESTICK_PTY: 149,
    R_SIDESTICK_PTY: 150,
    L_ENG_RUN_ON: 151,
    R_ENG_RUN_ON: 152,
    L_THRUST_LEVER_IDLE: 153,
    R_THRUST_LEVER_IDLE: 154,
    L_THRUST_LEVER_MAX: 155,
    R_THRUST_LEVER_MAX: 156,
    L_THRUST_LEVER_REV: 157,
    R_THRUST_LEVER_REV: 158,
    THRUST_LEVERS_IDLE: 159,
    THRUST_LEVERS_MAX: 160,
    THRUST_LEVERS_REV: 161,
    SPOILER_LEVER_0: 162,
    SPOILER_LEVER_1: 163,
    SPOILER_LEVER_2: 164,
    SPOILER_LEVER_3: 165,
    SPOILER_LEVER_4: 166,
    SPOILER_LEVER_5: 167,
    SLAT_FLAP_LEVER_0: 168,
    SLAT_FLAP_LEVER_1: 169,
    SLAT_FLAP_LEVER_2: 170,
    SLAT_FLAP_LEVER_3: 171,
    SLAT_FLAP_LEVER_4: 172,
    SLAT_FLAP_LEVER_5: 173,
    ALTN_FLAP_SW: 174,
    LANDING_GEAR_LEVER_UP: 175,
    LANDING_GEAR_LEVER_DOWN: 176,
    AUTOBRAKE_LO: 177,
    AUTOBRAKE_MED: 178,
    AUTOBRAKE_HI: 179,
    AUTOBRAKE_RTO: 180,
    AUTOBRAKE_OFF: 181,
    FWD_PAX_DOOR_CLOSED: 182,
    FWD_SERV_DOOR_CLOSED: 183,
    AFT_PAX_DOOR_CLOSED: 184,
    AFT_SERV_DOOR_CLOSED: 185,
    L_OWEED_CLOSED: 186,
    R_OWEED_CLOSED: 187,
    L_AFT_OWEED_CLOSED: 188,
    R_AFT_OWEED_CLOSED: 189,
    FWD_CARGO_DOOR_CLOSED: 190,
    AFT_CARGO_DOOR_CLOSED: 191,
    FWD_EQUIP_BAY_DOOR_CLOSED: 192,
    MID_EQUIP_BAY_DOOR_CLOSED: 193,
    AFT_EQUIP_BAY_DOOR_CLOSED: 194,
    CABIN_DOORS_CLOSED: 195,
    CARGO_DOORS_CLOSED: 196,
    OWEED_DOORS_CLOSED: 197,
    ALL_DOORS_CLOSED: 198,
    L_CTP_INHIBIT: 199,
    R_CTP_INHIBIT: 200,
    DSPL_TUNE_INHIBIT: 201,
    AP_DISENGAGED: 202,
    AT_DISCONNECTED: 203,
    EDM_SELECTED: 204,
    RSP_DISPLAY_REV: 205,
    RSP_DISPLAY_SWAP: 206,
    RSP_DISPLAY_NORM: 207,
    STEEP_APPR_SELECTED: 208,
    TOGA_SELECTED: 209,
};

export const ECL_VARIABLE_NAMES = Object.keys(ECL_VARIABLE);
