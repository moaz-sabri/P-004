const fs = require("fs");

// Mirror the production build into the project root too, so the app (and any
// page generated from src/*.html) also works when served/opened from "/".
fs.cpSync("dist", ".", { recursive: true, force: true });
console.log("Copied dist/ to project root.");