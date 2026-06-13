// Renders each JSON Resume theme with generic sample data to PNG thumbnails
// for the template pickers + public /templates page. Run: node scripts/capture-theme-previews.mjs
import fs from "node:fs";
import puppeteer from "puppeteer";

const THEMES = ["even","stackoverflow","kendall","flat","elegant","onepage","macchiato","paper","short","spartan","caffeine","kards"];
const sample = {
  basics: {
    name: "Alex Morgan", label: "Senior Product Designer",
    email: "alex.morgan@example.com", phone: "+1 (555) 010-2030", url: "alexmorgan.design",
    summary: "Senior product designer with 9+ years shipping consumer and B2B products end to end. Leads design systems, partners closely with engineering, and turns ambiguous problems into measurable outcomes.",
    location: { address: "", city: "San Francisco", region: "CA", countryCode: "US" },
    profiles: [{ network: "LinkedIn", url: "https://linkedin.com/in/alexmorgan", username: "alexmorgan" }],
  },
  work: [
    { name: "Northwind", position: "Lead Product Designer", startDate: "2021-02-01", endDate: "",
      highlights: ["Owned the end-to-end redesign that lifted activation 34%.","Built and maintained the cross-platform design system.","Mentored 4 designers and ran weekly critiques."] },
    { name: "Brightline", position: "Product Designer", startDate: "2017-06-01", endDate: "2021-01-01",
      highlights: ["Shipped the mobile onboarding used by 2M+ users.","Ran usability studies that cut support tickets 22%."] },
    { name: "Loom Studio", position: "UX Designer", startDate: "2015-01-01", endDate: "2017-05-01",
      highlights: ["Designed marketing sites and product UI for 12 startups."] },
  ],
  education: [{ institution: "Rhode Island School of Design", area: "BFA, Graphic Design", studyType: "BFA", startDate: "2011-01-01", endDate: "2015-01-01" }],
  skills: [
    { name: "Product Design", keywords: [] },{ name: "Design Systems", keywords: [] },{ name: "Figma", keywords: [] },
    { name: "Prototyping", keywords: [] },{ name: "User Research", keywords: [] },{ name: "HTML/CSS", keywords: [] },
    { name: "Accessibility", keywords: [] },{ name: "Design Ops", keywords: [] },
  ],
  languages: [{ language: "English", fluency: "Native" },{ language: "Spanish", fluency: "Professional" }],
  projects: [],
};

const b = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
for (const id of THEMES) {
  try {
    const mod = await import(`jsonresume-theme-${id}`);
    const fn = mod.render || mod.default?.render || mod.default;
    const html = await fn(sample);
    const p = await b.newPage();
    await p.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await p.setContent(html, { waitUntil: "networkidle2", timeout: 30000 }).catch(()=>{});
    await p.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
    await p.screenshot({ path: `public/template-previews/theme/${id}.png`, clip: { x:0,y:0,width:794,height:1123 } });
    // thumbnail
    const sharp = await import("sharp").then(m=>m.default).catch(()=>null);
    if (sharp) await sharp(`public/template-previews/theme/${id}.png`).resize(360).png().toFile(`public/template-previews/theme/${id}.thumb.png`);
    await p.close();
    console.log(`${id}: thumbnail ok`);
  } catch(e){ console.log(`${id}: FAIL ${String(e.message).slice(0,60)}`); }
}
await b.close();
