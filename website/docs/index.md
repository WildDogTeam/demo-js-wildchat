---
layout: docs
---

<!-- <a name="overview"> </a> -->

### 概述

Wildchat 是一个简单，使用 [Wilddog](https://www.wilddog.com/) 构建的聊天 widget。
它的目的是作为一个简洁的，建立在 Wilddog 基础上面向文档的聊天产品。它的工作原理简单，并很容易扩展。

<!-- <a name="getting_started"> </a> -->

### 入门

Wildchat 工作原理简单，前提是在你的应用程序正确的依赖它，并配置 Wilddog 帐户系统。

#### 下载 Wildchat

为了在你的项目使用 Wildchat， 需要包括 HTML 在内的以下文件：
{% highlight html %}
<!-- jQuery -->
<script src='http://apps.bdimg.com/libs/jquery/2.1.1/jquery.js'></script>

<!-- Wilddog -->
<script src='https://cdn.wilddog.com/sdk/js/2.3.9/wilddog.js'></script>

<!-- Wildchat -->
<link rel='stylesheet' href='https://cdn.wilddog.com/app/wildchat/0.6.0/wildchat.min.css' />
<script src='https://cdn.wilddog.com/app/wildchat/0.6.0/wildchat.min.js'></script>
{% endhighlight %}

使用上面的网址可以下载两个压缩的和非压缩版本的 Wildchat 的 JavaScript 和 CSS 文件。您也可以从
[Wildchat GitHub repository](https://github.com/WildDogTeam/demo-js-wildchat/releases)发布页下载。
[Wilddog](https://z.wilddog.com/web/quickstart) and
[jQuery](https://code.jquery.com/) 可以直接从他们各自的网站上下载。

<!--
您也可以通过 NPM 或 Bower 安装 Wildchat 及其依赖：

```bash
$ npm install firechat --save
```

```bash
$ bower install firechat --save
```
-->

#### Wilddog 入门

Wildchat 需要 Wilddog 来同步和存储数据。您可以在这里[注册](https://www.wilddog.com/my-account/signup)一个免费帐户。


#### 例子

*Wildchat 需要经过身份认证的 Wilddog 引用* 。Wilddog 支持自定义认证系统或一些内置的供应商认证（详见下文）。

让开始吧，在我们的例子中使用新浪微博的身份认证：

{% highlight html %}
<!doctype html>
<html>
  <head>
    <meta charset='utf-8' />

    <!-- jQuery -->
    <script src='http://apps.bdimg.com/libs/jquery/2.1.1/jquery.min.js'></script>

    <!-- Wilddog -->
    <script src='https://cdn.wilddog.com/js/client/current/wilddog.js'></script>

    <!-- Wildchat -->
    <link rel='stylesheet' href='https://cdn.wilddog.com/app/wildchat/0.6.0/wildchat.min.css' />
    <script src='https://cdn.wilddog.com/app/wildchat/0.6.0/wildchat.min.js'></script>
  </head>
  <body>
    <script type='text/javascript'>
      // Create a new Wilddog reference, and a new instance of the Login client
      var config = {
        authDomain: "<appId>.wilddog.com",
        syncURL: "https://<appId>.wilddogio.com",
      };
      wilddog.initializeApp(config);

      var chatRef = wilddog.sync();
      var auth = wilddog.auth();
      var weiboProvider = new wilddog.auth.WeiboAuthProvider();

      function login() {
        wilddog.auth().signInWithPopup(weiboProvider).then(function (user) {
          //  一旦通过验证，Wildchat实例携带我们的用户ID和用户名
          initChat(user);
        }).catch(function (error) {
           console.log(error);
        });
      }
    </script>
    <div id='wildchat-wrapper'>
      <a href='#' onclick='login("weibo");'>Login</a>
    </div>
  </body>
</html>
{% endhighlight %}


<a name="authentication"> </a>
### 用户认证

Wildchat 使用 Wilddog [身份验证](https://z.wilddog.com/web/auth)和[安全规则](https://z.wilddog.com/rule/quickstart)，无论是自己的自定义认证系统或一些内置的供应商认证都将给你巨大灵活性。

#### 整合自己的用户认证

如果在你的应用程序已经包含用户认证，你可以用通过生成 JSON Web Tokens（JWT）集成到 Wilddog。

Wilddog 提供生成 token 的库，其中包括：[Java](https://github.com/WildDogTeam/wilddog-token-generator-java)， [PHP](https://github.com/WildDogTeam/wilddog-token-generator-php)。

生成 token 必须包含 `uid`:

  * `uid` 是每一个用户的唯一标示 (*string*)。

生成 JWT 后，认证用户：

{% highlight javascript %}
var auth = wilddog.auth();
auth.authWithCustomToken(<token>, function(error, authData) {
  if (error) {
    console.log(error);
  }
});
{% endhighlight %}

欲了解更多信息，查看的文档[终端用户认证](https://z.wilddog.com/web/auth).

#### Wilddog用户认证

Wilddog 一些内置的供应商认证，包括[新浪微博](https://z.wilddog.com/android/auth), [微信](https://z.wilddog.com/android/auth), 或 [email / password](https://z.wilddog.com/android/auth) 。

* 首先，在你的 Wilddog 账户里启用选择的供应商， `https://<YOUR-WILDDOG>.wilddogio.com`。社交登录服务，可能需要创建和配置应用程序和要求授权。

* 然后，使用 authWithOAuthPopup 登录：

{% highlight javascript %}
var auth = wilddog.auth();
var provider = new wilddog.auth.WeiboAuthProvider();
auth.onAuthStateChanged(function(user) { ... });
...
auth.authWithOAuthPopup(provider, function(error, user) {
  if (error) {
    console.log(error);
  }
});
{% endhighlight %}

欲了解更多信息，查看的文档[终端用户认证](https://z.wilddog.com/web/auth).


<a name="customizing"> </a>
### 自定义Wildchat

深入剖析 Wildchat 代码来调整默认的界面， 改变行为或添加新的功能。

#### 代码结构

* **`wildchat.js`** 是包括数据操作和绑定事件，提供进入或退出聊天室、发送和接收消息、创建房间、并邀请用户到聊天室等，其中唯一的依赖是 Wilddog。

* **`wildchat-ui.js`** 是`wildchat.js`的 UI，提供一组丰富的功能给用户，即开即装即用。

<!--
* **`rules.json`** defines a rule structure that maps to the data structure defined in `wildchat.js`, defining both the data structure requirements and which users may read or write to which locations in Wilddog. When uploaded to your Wilddog, this configuration offers robust security to ensure that only properly authenticated users may chat, and neither user data nor private chat messages can be compromised. -->

#### 修改默认的UI

Wildchat UI 默认使用 jQuery 和 Underscore.js 构建的，以及样式和 UI 元素组件使用 Bootstrap 构建。要更改，请参阅 `wildchat.js` 和 `styles.less` 修改用户界面的外观和体验。

当你准备好构建，只需从项目的根目录执行 `grunt`， 编译并生成结果到 dest 目录。

<!--
#### 构建新的UI

To get started with a new UI layer, create a directory for your new interface under the `layouts` directory, using the name of your new interface.

Next, create a primary JavaScript interface for your UI using the name `wildchat-ui.js`, and add styles, layouts, and templates following the same convention as the default layout.

Lastly, begin hooking into the Wildchat API, detailed below, using the exposed methods and defined bindings.

<div class="emphasis-box">Missing something? Send us a <a href="https://github.com/WildDogTeam/demo-js-wildchat/pulls" target="_blank">pull request</a> and contribute to the repository!</div>


<a name="api"> </a>
-->
### Wildchat API 接口

Wildchat 暴露了一些有用的方法和绑定发起聊天的事件，包括进入和退出聊天室、发送邀请函、创建聊天室和发送信息。

#### 实例化 Wildchat
{% highlight javascript %}
var chat = new Wildchat(wilddogRef);
chat.setUser(userId, userName, function(user) {
  chat.resumeSession();
});
{% endhighlight %}


<a name="api_methods"> </a>
#### API - Public 方法

`Wildchat.setUser(userId, userName, onComplete)`

> 打开身份认证 Wilddog 云端的连接，加载任何用户的元数据，初始化 Wilddog 聊天监听事件。

`Wildchat.resumeSession()`

<!--
> Automatically re-enters any chat rooms that the user was previously in, if the
> user has history saved.
-->

> 如果用户历史保存了，将自动进入以前的聊天室。

`Wildchat.on(eventType, callback)`

> Sets up a binding for the specified event type (*string*), for which the
> callback will be invoked. See [API - Exposed Bindings](#api_bindings)
> for more information.

`Wildchat.createRoom(roomName, roomType, callback(roomId))`

> Creates a new room with the given name (*string*) and type (*string* - `public` or `private`) and invokes the callback with the room ID on completion.

`Wildchat.enterRoom(roomId)`

> Enters the chat room with the specified id. On success, all methods bound to the `room-enter` event will be invoked.

`Wildchat.leaveRoom(roomId)`

> Leaves the chat room with the specified id. On success, all methods bound to the `room-exit` event will be invoked.

`Wildchat.sendMessage(roomId, messageContent, messageType='default', callback)`

> Sends the message content to the room with the specified id and invokes the callback on completion.

`Wildchat.toggleUserMute(userId, callback)`

> Mute or unmute a given user by id.

`Wildchat.inviteUser(userId, roomId)`

> Invite a the specified user to the specific chat room.

`Wildchat.acceptInvite(inviteId, callback)`

> Accept the specified invite, join the relevant chat room, and notify the user who sent it.

`Wildchat.declineInvite(inviteId, callback)`

> Decline the specified invite and notify the user who sent it.

`Wildchat.getRoomList(callback)`

> Fetch the list of all chat rooms.

`Wildchat.getUsersByRoom(roomId, [limit=100], callback)`

> Fetch the list of users in the specified chat room, with an optional limit.

`Wildchat.getUsersByPrefix(prefix, startAt, endAt, limit, callback)`

> Fetch the list of all active users, starting with the specified prefix, optionally between the specified startAt and endAt values, up to the optional, specified limit.

`Wildchat.getRoom(roomId, callback)`

> Fetch the metadata for the specified chat room.


<a name="api_bindings"> </a>
#### API - 绑定事件

To bind events to Wildchat, invoke the public `on` method using an event ID and callback function. Public bindings are detailed below:

> Supported event types include:

> * `user-update` - Invoked when the user's metadata changes.
> * `room-enter` - Invoked when the user successfully enters a room.
> * `room-exit` - Invoked when the user exists a room.
> * `message-add` - Invoked when a new message is received.
> * `message-remove` - Invoked when a message is deleted.
> * `room-invite` - Invoked when a new room invite is received.
> * `room-invite-response` - Invoked when a response to a previous invite is received.


<a name="data_structure"> </a>
### 数据结构

Wildchat uses [Wilddog](https://www.wilddog.com/) for its data storage and synchronization. This means (a) you don't need to run any server code and (b) you get access to all the the Wilddog features, including first-class data security, automatic scaling, and data portability.

You own all of the data and can interact with it in a variety of ways. Wildchat stores your data at the Wilddog location you specify using the
following data structure:

* `moderators/`
    * `<user-id>` - A list of user ids and their moderator status.
        * `true|false` - A boolean value indicating the user's moderator status.
* `room-messages/`
    * `<room-id`>
        * `<message-id`>
            * `userId` - The id of the user that sent the message.
            * `name` - The name of the user that sent the message.
            * `message` - The content of the message.
            * `timestamp` - The time at which the message was sent.
* `room-metadata/`
    * `<room-id>`
        * `createdAt` - The time at which the room was created.
        * `createdByUserId`- The id of the user that created the room.
        * `id` - The id of the room.
        * `name` - The public display name of the room.
        * `type` - The type of room, `public` or `private`.
* `room-users/`
* `user-names-online/`
* `users/`
    * `<user-id`>
        * `id` - The id of the user.
        * `name` - The display name of the user.
        * `invites` - A list of invites the user has received.
        * `muted` - A list of user ids currently muted by the user.
        * `rooms` - A list of currently active rooms, used for sessioning.

You may find it useful to interact directly with the Wilddog data when building related features on your site. See the code or view the data in Forge (just enter your Wilddog URL in a browser) for more details.

<!--
### Security 安全
To lock down your Wildchat data, you can use Wilddog's builtin
security rules for Wildchat, see these [example rules on Github](https://github.com/WildDogTeam/demo-js-wildchat/tree/master/rules.json).
-->
