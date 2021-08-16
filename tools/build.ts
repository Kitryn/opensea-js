// Stolen from https://stackoverflow.com/questions/56902517/how-can-i-copy-my-static-files-to-my-output-location-in-a-typescript-express-pro
import shell from "shelljs";
import path from "path";

const buildFolder = "./lib/";
const srcFolder = "./src/";
const folders = new Set(["./api/gql"]);

// Copy Folders
folders.forEach((folder) => {
  const fullPath = path.resolve(srcFolder, folder);
  const fullDest = path.resolve(buildFolder, folder);
  shell.cp("-R", fullPath, fullDest);
});
