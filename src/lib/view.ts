import path from "path";
import fs from "fs/promises";
import handlebars from "handlebars";

export const prepareView = async () => {
  const viewPath = path.join(process.cwd(), "views", "index.hbs");
  const viewContent = await fs.readFile(viewPath, "utf8");
  return handlebars.compile(viewContent);
};
