const fs = require("fs");
const utility = require('./utility');
const config = require('./config.json');

const indexHTML = utility.handlebarsToHTML('./_templates/_index.html', config);

// create index
utility.writeFile('public/index.html', indexHTML).then(function(res) {
  console.log(res);
});

// create posts
config.posts.forEach(function({ date, slug, title }) {
  const postHTML = utility.handlebarsToHTML('./_templates/_post.html', {
    author: config.author,
    body: utility.markdownToHTML(fs.readFileSync(`_posts/${slug}.md`, "utf8")),
    date: date,
    title: title
  });

  utility.writeFile(`public/${slug}.html`, postHTML).then(function(res) {
    console.log(res);
  });
});

