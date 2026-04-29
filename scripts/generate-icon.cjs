/**
 * Generate V-Partner app icon — two-person silhouette in light pink.
 * Output: resources/icon.svg → resources/icon.png → resources/icon.icns → resources/icon.ico
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const resources = path.join(root, "resources");

// Light pink background, white silhouettes
const bgColor = "#f8c8d8";
const fgColor = "#ffffff";

// SVG: two abstract human silhouettes (one slightly taller) on a rounded rect
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <clipPath id="rounded">
      <rect x="0" y="0" width="1024" height="1024" rx="200" ry="200"/>
    </clipPath>
  </defs>
  <rect x="0" y="0" width="1024" height="1024" rx="200" ry="200" fill="${bgColor}"/>
  <g clip-path="url(#rounded)" fill="${fgColor}">
    <!-- Left person (taller) -->
    <circle cx="380" cy="340" r="95"/>
    <path d="M280,480 C280,400 480,400 480,480 L480,820 C480,840 460,850 440,840 L420,820 L420,700 C420,680 340,680 340,700 L340,820 L320,840 C300,850 280,840 280,820 Z"/>
    <!-- Right person (shorter) -->
    <circle cx="644" cy="390" r="80"/>
    <path d="M564,520 C564,450 724,450 724,520 L724,750 C724,770 704,780 684,770 L664,750 L664,650 C664,630 624,630 624,650 L624,750 L604,770 C584,780 564,770 564,750 Z"/>
  </g>
</svg>`;

// Write SVG
const svgPath = path.join(resources, "icon.svg");
fs.writeFileSync(svgPath, svg);
console.log("✓ icon.svg generated");

// Generate PNG using macOS sips
const pngPath = path.join(resources, "icon.png");
const iconsetDir = path.join(resources, "icon.iconset");
try {
  // Create temporary PNG from SVG using qlmanage (macOS Quick Look)
  // First generate a 1024x1024 PNG
  execSync(
    `qlmanage -t -s 1024 -o "${resources}" "${svgPath}"`,
    { stdio: "pipe" }
  );
  // qlmanage outputs as icon.svg.png
  const qlOutput = path.join(resources, "icon.svg.png");
  if (fs.existsSync(qlOutput)) {
    fs.renameSync(qlOutput, pngPath);
    console.log("✓ icon.png generated (1024x1024)");
  } else {
    console.log("! qlmanage did not produce output, trying sips fallback");
    // Fallback: use sips to resize from existing png or skip
    throw new Error("qlmanage failed");
  }
} catch (e) {
  console.log("! PNG generation via qlmanage failed, using alternative approach");
  // Try a simpler approach: just create a solid-color PNG with sips
  // sips can't render SVG, so we'll create a placeholder and note it
  console.log("! Note: icon.svg is ready, manual PNG conversion may be needed");
}

// Generate ICNS
try {
  // Remove old iconset
  execSync(`rm -rf "${iconsetDir}"`, { stdio: "pipe" });
  // Create iconset directory
  fs.mkdirSync(iconsetDir, { recursive: true });

  const sizes = [
    { size: 16, name: "icon_16x16.png" },
    { size: 32, name: "icon_16x16@2x.png" },
    { size: 32, name: "icon_32x32.png" },
    { size: 64, name: "icon_32x32@2x.png" },
    { size: 128, name: "icon_128x128.png" },
    { size: 256, name: "icon_128x128@2x.png" },
    { size: 256, name: "icon_256x256.png" },
    { size: 512, name: "icon_256x256@2x.png" },
    { size: 512, name: "icon_512x512.png" },
    { size: 1024, name: "icon_512x512@2x.png" },
  ];

  if (fs.existsSync(pngPath)) {
    for (const { size, name } of sizes) {
      execSync(
        `sips -z ${size} ${size} "${pngPath}" --out "${path.join(iconsetDir, name)}"`,
        { stdio: "pipe" }
      );
    }
    execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(resources, "icon.icns")}"`, { stdio: "pipe" });
    console.log("✓ icon.icns generated");
  }
} catch (e) {
  console.log("! ICNS generation failed:", e.message);
}

// Generate ICO (simple — just the 256x256 PNG for now, Windows will scale)
try {
  if (fs.existsSync(pngPath)) {
    // For ICO we'll use a simple Python script or just copy PNG (electron-builder handles it)
    const ico256Path = path.join(resources, "icon_256.png");
    execSync(`sips -z 256 256 "${pngPath}" --out "${ico256Path}"`, { stdio: "pipe" });
    // Copy 256 PNG as ICO (basic — real .ico needs multi-resolution, but electron-builder accepts PNG)
    fs.copyFileSync(ico256Path, path.join(resources, "icon.ico"));
    fs.unlinkSync(ico256Path);
    console.log("✓ icon.ico generated (256x256 PNG)");
  }
} catch (e) {
  console.log("! ICO generation failed:", e.message);
}

// Cleanup
try {
  execSync(`rm -rf "${iconsetDir}"`, { stdio: "pipe" });
} catch {}

console.log("✓ Icon generation complete");
