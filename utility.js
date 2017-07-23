const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const showdown = require("showdown");
const converter = new showdown.Converter();

// populate handlebars template with data
function handlebarsToHTML(path, context) {
  const base = fs.readFileSync(path, "utf8");

  const template = handlebars.compile(base);
  const html = template(context);

  return html;
}

// convert markdown to HTML blob
function markdownToHTML(content) {
  return converter.makeHtml(content);
}

// write a file given path and file content
function writeFile(destination, content) {
  return new Promise(function(resolve, reject) {
    fs.writeFileSync(destination, content, function(err) {
        if(err) {
            reject(err);
        }

        resolve(`${destination} was saved`);
    });
  });
}

module.exports = {
  handlebarsToHTML,
  markdownToHTML,
  writeFile
}