# Wildchat

Wildchat 是使用 [Wilddog](https://www.wilddog.com/) 一个开源的、实时的聊天应用。它提供完全多用户，多房间，用户搜索，站内短信，聊天邀请等等。

## Live Demo

访问 [wildchat.wilddogapp.com](http://wildchat.wilddogapp.com/)  查看 Wildchat 在线示例.

[![ 在 Wildchat 演示聊天截图](screenshot.png)](http://wildchat.wilddogapp.com/)

## Setup

Wildchat 工作原理简单，前提是在你的应用程序正确的依赖它，并配置 Wilddog 帐户系统。
为了在你的项目使用 Wildchat， 需要包括 HTML 在内的以下文件：

```HTML
<!-- jQuery -->
<script src='http://apps.bdimg.com/libs/jquery/2.1.1/jquery.min.js'></script>

<!-- Wilddog -->
<script src='https://cdn.wilddog.com/js/client/current/wilddog.js'></script>

<!-- Wildchat -->
<link rel='stylesheet' href='https://cdn.wilddog.com/app/wildchat/0.5.0/wildchat.min.css' />
<script src='https://cdn.wilddog.com/app/wildchat/0.5.0/wildchat.min.js'></script>
```

添加用户登录

```HTML
<script>
// Create a new Wilddog reference, and a new instance of the Login client
var chatRef = new Wildchat('https://<YOUR-WILDDOG>.wilddogio.com/chat');

function login() {
  chatRef.authWithOAuthPopup("weibo", function(error, authData) {
    if (error) {
      console.log(error);
    }
  });
}

chatRef.onAuth(function(authData) {
  //  一旦通过验证，Wildchat实例携带我们的用户ID和用户名
  if (authData) {
    initChat(authData);
  }
});
</script>

<a href='#' onclick='login();'>登录微博</a>
```
    
初始化一个聊天。

```HTML
<script>
function initChat(authData) {
  var chat = new WildchatUI(chatRef, document.getElementById('wildchat-wrapper'));
  chat.setUser(authData.uid, authData[authData.provider].displayName);
}
</script>

<div id='wildchat-wrapper'></div>
```

有关详细说明，请参阅[Wildchat 文档](http://wildchat.wilddogapp.com/docs/).

## Wilddog 入门

Wildchat 需要 Wilddog 来同步和存储数据。您可以在这里[注册](https://www.wilddog.com/my-account/signup)一个免费帐户。

