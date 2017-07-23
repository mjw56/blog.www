*Note: This post is geared towards developers who may not have much experience with implementing an OAuth workflow using GitHub before. This will walk through my implementation of the workflow.*

*Note II: This is part I of a multi-part series. This introductory article will explain the initial OAuth handshake and how to obtain an access token from GitHub. In subsequent article(s), I will explore how the access token can be used to make calls to the GitHub API to perform tasks on behalf of an authenticated GitHub user.* 

During this post, these technologies will be covered:
- HTML
- JavaScript
- NodeJS/yarn

If you're not comfortable yet with these technologies here are some links which might help you getting started:

- [Intro to HTML](https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML)
- [Intro to JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Introduction)
- [nodeschool.io](https://nodeschool.io/)

This post also assumes two things:

- that you have a GitHub account, if you don't have one, you should sign up! It is free! [GitHub Sign Up](https://help.github.com/articles/signing-up-for-a-new-github-account/)

- that you are comfortable working in a command line terminal to use NodeJS/git ( if you're not comfortable yet, check out the [nodeschool.io](https://nodeschool.io/) above)

Take the time you need to get comfortable, these pieces will be important going forward!

Once we're ready, the next step will be to register an application with GitHub which will give us access to a couple pieces of important information. These pieces of information will be important during the authentication process, we'll talk about them shortly. To set this up, open the [GitHub Developer Settings](https://github.com/settings/developers) which should take you right to the developers portion of your GitHub settings. Now, there should be a button in the top right hand corner labeled `Register a new application`. You'll want to click this, this should present you with a form to fill out to register your application. Here is an example of what the form could look like (I filled it out with some example details that you could use to follow along). Feel free to enter with any information that you would like to. You're free to set up as many of these as you like, so we can treat this one for demo purposes only, and we can delete it in the future if needed.

Probably the most important piece of information in this form is the authorization callback URL. This URL is important because this is the place in our app that GitHub will call to finish the authorization process. This will need to match with what we provide. Once everything has been filled out, click the shiny green `Register application` button at the bottom to complete the registration!

Once registered, GitHub is going to give us the two pieces of information we need, the `Client ID` and the `Client Secret`. It's important to note here that the `Client Secret` should never be shared with anyone, and it certainly should never be embedded in code that is being checked into GitHub nor should it be shared on the client! One way to persist these pieces of information so that they are only available on the server, and not included in the source code, is to store them into a dotfile locally on your machine. This file can then be referenced to be loaded into memory when the shell session is started. If you would like more information about this, checkout this article which goes into more depth about this subject! [BASH Environment and Shell Variables](http://www.tricksofthetrades.net/2015/06/14/notes-bash-env-variables/). You are going to see these variables referenced in future code snippets using `process.env.XXXXX` which is NodeJS' mechanism to access the shell environment variables.

Sweet, now that we have everything we need from GitHub, we can start coding the app! To get started, we'll want to init a project from the command line. Open up your favorite terminal and go into a directory where you might host any projects and enter the following commands:

```bash
mkdir github-oauth-demo
cd github-oauth-demo
yarn init
```

Cool, we've initialized the project with [yarn](https://yarnpkg.com) so we are ready to start installing some packages! The only package we're going to need is [express](https://expressjs.com/) which will be the server framework on the Node side.

```bash
yarn add express
```

Let's stay with the server and let's setup the code that will be needed to serve a static html page and accept requests from the client:

**_index.js_**:

```js
const http = require('http');
const https = require('https');
const express = require('express');
const app = express();

const port = 1337;

app.use(express.static(__dirname));

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`==> Server is listening on port ${port}`);
  console.log(`==> Go to localhost:${port}`);
});
```

This is the most basic necessary code that we need to get going and serve up static files. In our case, the only static asset that we will be serving up will be an `index.html` file that will be the basis of our demo. So basically, the code above is what accomplishes that.

Let's add the `index.html` file really quick since we have the server code setup. We can then test it out and make sure the server is serving up everything smoothly.

**_index.html_**:

```html
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\">
  <meta name=\"author\" content=\"mike\">
  <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge,chrome=1\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, user-scalable=0, minimum-scale=1.0, maximum-scale=1.0\">    
  <title>GitHub OAuth Demo</title>
  
  <link rel=\"shortcut icon\" href=\"favicon.ico\" type=\"image/x-icon\" />
</head>
<body class=\"landing\">
  <header role=\"banner\">
    <h1>GitHub OAuth Demo</h1>
  </header>
  <main role=\"main\">
    <section>
      <button>Login To GitHub</button>
    </section>
    </main>
</body>
</html>
```

Ok, great! There isn't much to see here yet. We haven't added the click functionality for the button yet. Let's first quickly test this and make sure that it's running as expected... go back to the terminal, and from the project folder run `node index.js`. This should start the server on `localhost:1337`. Open the browser, and you should see the page load successfully with some text loaded.

Now, let's stay with the client and add the functionality that will happen when the user clicks on the button. Basically, here's what is going to happen when the user clicks on the login button: the page is going to open a new popup window that will be directed to the GitHub oauth login URL. This URL is going to provide instructions of where to callback to via the `redirect_uri`. It's also going to include the client ID that was one of the pieces of information received when registering the GitHub application earlier.

```js
function login() {
  // handle messages received from popup window
  const receiveMessage = event => {
    // Do we trust the sender of this message?
    if (event.origin !== window.location.origin) return;
      
    // remove the listener as we should only receive one message
    window.removeEventListener(\"message\", receiveMessage, false);
    // close the window
    githubWindow.close();
    // listen for messages back from popup
    window.addEventListener(\"message\", receiveMessage, false);
      
    // open the popup
    const githubWindow = window.open(
      `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user%20public_repo&redirect_uri=http://localhost:1337/callback`,
      "GitHubLogin",
      "menubar=no,location=yes,resizable=yes,status=yes,width=786,height=534"
    );
  }
}
```
    
Alright, so there is a lot going on here so let's take a minute to understand what is going on. When the user clicks on the login button, it's going to call the JavaScript function `login`. This is going to setup an event listener to listen for messages on this parent window. Now, next it is going to open up a popup which will have the URL set as the GitHub login screen. This popup is where the user will accept or decline to authorize this application to log them in and do actions on their behalf. What's going to happen then is that if the user accepts, it is going to call back to the node server with a code from GitHub. Then, the node server is going to make a POST request with the code and the Client Id and Secret. Then, the access token will be obtained and will be embedded with some HTML that will be sent back to the calling popup window which is why we set the event listener here. We're going to use the [Post Message API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) to message from the popup window back to the original parent window who is listening for the message. Remember, to use the GitHub API for certain things such as reading or writing to a repository, we need the access token to be passed in the headers. So really, we just need this access token and then we are good to go.
  
Ok, so we're very close now. Basically, all we need to do now is we just need to setup the endpoint on the server which will handle the callback from GitHub when it sends the code to be used for the final part of the OAuth process.
  
```js
app.get(
  "/callback", 
  function(req, res) {
    const data = JSON.stringify({
      client_id: process.env.OAUTH_DEMO_GITHUB_CLIENT_ID,
      client_secret: process.env.OAUTH_DEMO_GITHUB_CLIENT_SECRET,
      code: req.query.code
    });
    
    const options = {
      host: "github.com",
      port: "443",
      path: "/login/oauth/access_token",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
      }  
    };
    
    const post_req = https.request(
      options,
      function(resp) {
        resp.setEncoding("utf8");
        resp.on("data", function(chunk) {
          console.log("GitHub API Response: " + chunk);
          res.send(
            `<html><body><script>window.opener.postMessage("${chunk}", '*')</script></body></html>`
          );
        });
      },
      function(err) {
        console.log("error", err);
      }
    );
    
    post_req.write(data);
    post_req.end();
  }
);
```
    
  So what is happening here? Basically, this route on the server will be called from the popup window as part of the callback URL. It's going to pass a code from GitHub. In turn, this code is going to be used along with the Client ID and Client Secret. They'll be used when making a POST call to the GitHub server to obtain the access token. Once this call successfully completes, I am embedding the token obtained into the markup which will be sent back to the popup window. Then, when this markup is run in the browser, it's going to call the JavaScript which will message back to the parent opener window with the access token that we just embedded. Once the original parent window hears this message, the client will then have the access token, and can then make any authorized request(s) on behalf of the logged in GitHub user!

## Conclusion

This will conclude the first part of this series. I have the full solution posted [on GitHub](https://github.com/mjw56/github-oauth-demo). Please feel free to reach out with any questions or comments you might have.