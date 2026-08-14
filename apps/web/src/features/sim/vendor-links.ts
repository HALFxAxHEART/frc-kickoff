export interface VendorLink {
  vendor: string;
  url: string;
}

export interface VendorCategory {
  id: string;
  label: string;
  note: string;
  links: VendorLink[];
}

// Verified 2026-08-14 by live-fetching each page (or, for VEXpro, live search-result content —
// vexrobotics.com blocks direct fetches, flagged per-category below). Category/collection pages
// on purpose, not individual SKUs, since those go out of stock or get renamed.
export const VENDOR_CATEGORIES: VendorCategory[] = [
  {
    id: "belts-pulleys",
    label: "Belts & Pulleys",
    note: "GT2/HTD timing belts and pulleys.",
    links: [
      { vendor: "WCP", url: "https://wcproducts.com/collections/belts-chain-gears" },
      { vendor: "REV Robotics", url: "https://www.revrobotics.com/ion/motion/gears-chain-belts/" },
      { vendor: "AndyMark", url: "https://andymark.com/collections/belts" },
    ],
  },
  {
    id: "gears-sprockets",
    label: "Gears & Sprockets",
    note: "Spur/bevel gears and #25/#35 chain sprockets.",
    links: [
      { vendor: "WCP", url: "https://wcproducts.com/collections/belts-chain-gears" },
      { vendor: "AndyMark", url: "https://andymark.com/collections/gears" },
      { vendor: "VEXpro", url: "https://www.vexrobotics.com/pro/motion" },
    ],
  },
  {
    id: "chain",
    label: "Chain",
    note: "#25/#35 roller chain.",
    links: [
      { vendor: "AndyMark", url: "https://andymark.com/collections/chain" },
      { vendor: "REV Robotics", url: "https://www.revrobotics.com/ion/motion/gears-chain-belts/" },
    ],
  },
  {
    id: "bearings",
    label: "Bearings",
    note: "Radial, thrust, and linear bearings.",
    links: [
      { vendor: "WCP", url: "https://wcproducts.com/collections/cnc-hardware/bearings" },
      { vendor: "AndyMark", url: "https://andymark.com/collections/bearings" },
      { vendor: "REV Robotics", url: "https://www.revrobotics.com/ion/motion/bearings-shafts-spacers/" },
    ],
  },
  {
    id: "cf-springs",
    label: "Constant-Force Springs",
    note: "For elevator counterbalancing — see the Linear simulator's spring-assist option. VEXpro doesn't currently carry these; REV doesn't either.",
    links: [
      { vendor: "WCP (search)", url: "https://wcproducts.com/search?q=constant+force+spring" },
      { vendor: "AndyMark (springs)", url: "https://andymark.com/collections/springs" },
    ],
  },
  {
    id: "gearboxes-motors",
    label: "Gearboxes & Motors",
    note: "Planetary gearboxes and the motors this app's calculators model.",
    links: [
      { vendor: "WCP", url: "https://wcproducts.com/collections/gearboxes" },
      { vendor: "AndyMark", url: "https://andymark.com/collections/gearboxes" },
      { vendor: "VEXpro", url: "https://www.vexrobotics.com/pro/motion/gearboxes" },
    ],
  },
  {
    id: "tube-stock",
    label: "Tube Stock / Extrusion",
    note: "Nested tube sizes for elevator/climber stages — feed your chosen sizes into the Climber / Elevator Stages tab.",
    links: [
      { vendor: "WCP", url: "https://wcproducts.com/collections/systems-structure/stock" },
      { vendor: "AndyMark", url: "https://andymark.com/collections/extrusion-structure" },
    ],
  },
  {
    id: "elevator-kits",
    label: "Elevator Kits & Bearing Blocks",
    note: "Complete elevator systems and the corner/bearing hardware that lets stages slide. Two different approaches — WCP's Telescope nests nested tube sizes directly; Cascade-style kits (WCP, SDS, REV) use one uniform tube size riding on external bearing blocks instead.",
    links: [
      { vendor: "WCP GreyT Telescope", url: "https://wcproducts.com/products/greyt-telescope" },
      { vendor: "WCP GreyT Cascade Elevator", url: "https://wcproducts.com/products/greyt-cascade-elevator" },
      { vendor: "WCP Elevator Bearing Block", url: "https://wcproducts.com/products/wcp-0199" },
      { vendor: "SDS Billet Elevator Bearing Block", url: "https://www.swervedrivespecialties.com/products/billet-elevator-bearing-block" },
      { vendor: "AndyMark (SDS block kits)", url: "https://www.andymark.com/products/sds-elevator-corner-kits" },
    ],
  },
  {
    id: "wheels",
    label: "Wheels",
    note: "Colson, compliant, mecanum, and omni wheels.",
    links: [
      { vendor: "WCP", url: "https://wcproducts.com/collections/wheels-hubs" },
      { vendor: "AndyMark", url: "https://andymark.com/collections/wheels" },
      { vendor: "VEXpro", url: "https://www.vexrobotics.com/pro/motion/wheels-and-hubs" },
    ],
  },
];
