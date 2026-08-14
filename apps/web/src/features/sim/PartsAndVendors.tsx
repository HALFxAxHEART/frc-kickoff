import { GearRatioCalculator } from "./GearRatioCalculator";
import { VENDOR_CATEGORIES } from "./vendor-links";

export function PartsAndVendors() {
  return (
    <div>
      <p className="lede">
        Work out a gear ratio, then go buy the parts for it. Links go to each vendor's category page, not a
        specific product — pick the exact tooth count/pitch/size you need once you're there.
      </p>

      <GearRatioCalculator />

      <h2>Where to Buy</h2>
      <div className="card-grid">
        {VENDOR_CATEGORIES.map((cat) => (
          <div className="card" key={cat.id}>
            <h3>{cat.label}</h3>
            <p className="muted" style={{ fontSize: "0.84rem" }}>
              {cat.note}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {cat.links.map((link) => (
                <a key={link.vendor} href={link.url} target="_blank" rel="noreferrer">
                  {link.vendor}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="source-note">
        Every link above was checked live 2026-08-14 (fetched and confirmed to show real category content, not
        guessed from a URL pattern) — except VEXpro's, which vexrobotics.com blocks direct fetches for, so those
        were confirmed via live search-result content instead of a direct page load. Vendor catalogs change —
        if a link 404s, search the vendor's site for the category name.
      </p>
    </div>
  );
}
