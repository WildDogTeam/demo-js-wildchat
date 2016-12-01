// Wildchat is a simple, easily-extensible data layer for multi-user,
// multi-room chat, built entirely on [Wilddog](https://wilddog.com).
//
// The Wildchat object is the primary conduit for all underlying data events.
// It exposes a number of methods for binding event listeners, creating,
// entering, or leaving chat rooms, initiating chats, sending messages,
// and moderator actions such as warning, kicking, or suspending users.
// --------------
(function() {

  // Establish a reference to the `window` object, and save the previous value
  // of the `Wildchat` variable.
  var root = this,
    previousWildchat = root.Wildchat;

  function Wildchat(wilddogRef, options) {

    // Instantiate a new connection to Wilddog.
    this._wilddog = wilddogRef;

    // User-specific instance variables.
    this._user = null;
    this._userId = null;
    this._userName = null;
    this._isModerator = false;

    // A unique id generated for each session.
    this._sessionId = null;

    // A mapping of event IDs to an array of callbacks.
    this._events = {};

    // A mapping of room IDs to a boolean indicating presence.
    this._rooms = {};

    // A mapping of operations to re-queue on disconnect.
    this._presenceBits = {};

    // Commonly-used Wilddog references.
    this._userRef = null;
    this._messageRef = this._wilddog.child('room-messages');
    this._roomRef = this._wilddog.child('room-metadata');
    this._privateRoomRef = this._wilddog.child('room-private-metadata');
    this._moderatorsRef = this._wilddog.child('moderators');
    this._suspensionsRef = this._wilddog.child('suspensions');
    this._usersOnlineRef = this._wilddog.child('user-names-online');

    // Setup and establish default options.
    this._options = options || {};

    // The number of historical messages to load per room.
    this._options.numMaxMessages = this._options.numMaxMessages || 50;
  }

  // Run Wildchat in *noConflict* mode, returning the `Wildchat` variable to
  // its previous owner, and returning a reference to the Wildchat object.
  Wildchat.noConflict = function noConflict() {
    root.Wildchat = previousWildchat;
    return Wildchat;
  };

  // Export the Wildchat object as a global.
  root.Wildchat = Wildchat;

  // Wildchat Internal Methods
  // --------------
  Wildchat.prototype = {

    // Load the initial metadata for the user's account and set initial state.
    _loadUserMetadata: function(onComplete) {
      var self = this;

      // Update the user record with a default name on user's first visit.
      this._userRef.transaction(function(current) {
        if (!current || !current.id || !current.name) {
          return {
            id: self._userId,
            name: self._userName
          };
        }
      }, function(error, committed, snapshot) {
        self._user = snapshot.val();
        self._moderatorsRef.child(self._userId).once('value', function(snapshot) {
          self._isModerator = !!snapshot.val();
          root.setTimeout(onComplete, 0);
        });
      });
    },

    // Initialize Wilddog listeners and callbacks for the supported bindings.
    _setupDataEvents: function() {
      // Monitor connection state so we can requeue disconnect operations if need be.
      this._wilddog.root().child('.info/connected').on('value', function(snapshot) {
        if (snapshot.val() === true) {
          // We're connected (or reconnected)! Set up our presence state.
          for (var i = 0; i < this._presenceBits; i++) {
            var op = this._presenceBits[i],
              ref = this._wilddog.root().child(op.ref);

            ref.onDisconnect().set(op.offlineValue);
            ref.set(op.onlineValue);
          }
        }
      }, this);

      // Generate a unique session id for the visit.
      var sessionRef = this._userRef.child('sessions').push();
      this._sessionId = sessionRef.key();
      this._queuePresenceOperation(sessionRef, true, null);

      // Register our username in the public user listing.
      var usernameRef = this._usersOnlineRef.child(this._userName.toLowerCase());
      var usernameSessionRef = usernameRef.child(this._sessionId);
      this._queuePresenceOperation(usernameSessionRef, {
        id: this._userId,
        name: this._userName
      }, null);

      // Listen for state changes for the given user.
      this._userRef.on('value', this._onUpdateUser, this);

      // Listen for chat invitations from other users.
      this._userRef.child('invites').on('child_added', this._onWildchatInvite, this);

      // Listen for messages from moderators and adminstrators.
      this._userRef.child('notifications').on('child_added', this._onNotification, this);
    },

    // Append the new callback to our list of event handlers.
    _addEventCallback: function(eventId, callback) {
      this._events[eventId] = this._events[eventId] || [];
      this._events[eventId].push(callback);
    },

    // Retrieve the list of event handlers for a given event id.
    _getEventCallbacks: function(eventId) {
      if (this._events.hasOwnProperty(eventId)) {
        return this._events[eventId];
      }
      return [];
    },

    // Invoke each of the event handlers for a given event id with specified data.
    _invokeEventCallbacks: function(eventId) {
      var args = [],
        callbacks = this._getEventCallbacks(eventId);

      Array.prototype.push.apply(args, arguments);
      args = args.slice(1);

      for (var i = 0; i < callbacks.length; i += 1) {
        callbacks[i].apply(null, args);
      }
    },

    // Keep track of on-disconnect events so they can be requeued if we disconnect the reconnect.
    _queuePresenceOperation: function(ref, onlineValue, offlineValue) {
      ref.onDisconnect().set(offlineValue);
      ref.set(onlineValue);
      this._presenceBits[ref.toString()] = {
        ref: ref,
        onlineValue: onlineValue,
        offlineValue: offlineValue
      };
    },

    // Remove an on-disconnect event from firing upon future disconnect and reconnect.
    _removePresenceOperation: function(ref, value) {
      ref.onDisconnect().cancel();
      ref.set(value);
      delete this._presenceBits[path];
    },

    // Event to monitor current user state.
    _onUpdateUser: function(snapshot) {
      this._user = snapshot.val();
      this._invokeEventCallbacks('user-update', this._user);
    },

    // Event to monitor current auth + user state.
    _onAuthRequired: function() {
      this._invokeEventCallbacks('auth-required');
    },

    // Events to monitor room entry / exit and messages additional / removal.
    _onEnterRoom: function(room) {
      this._invokeEventCallbacks('room-enter', room);
    },
    _onNewMessage: function(roomId, snapshot) {
      var message = snapshot.val();
      message.id = snapshot.key();
      this._invokeEventCallbacks('message-add', roomId, message);
    },
    _onRemoveMessage: function(roomId, snapshot) {
      var messageId = snapshot.key();
      this._invokeEventCallbacks('message-remove', roomId, messageId);
    },
    _onLeaveRoom: function(roomId) {
      this._invokeEventCallbacks('room-exit', roomId);
    },

    // Event to listen for notifications from administrators and moderators.
    _onNotification: function(snapshot) {
      var notification = snapshot.val();
      if (!notification.read) {
        if (notification.notificationType !== 'suspension' || notification.data.suspendedUntil < new Date().getTime()) {
          snapshot.ref().child('read').set(true);
        }
        this._invokeEventCallbacks('notification', notification);
      }
    },

    // Events to monitor chat invitations and invitation replies.
    _onWildchatInvite: function(snapshot) {
      var self = this,
        invite = snapshot.val();

      // Skip invites we've already responded to.
      if (invite.status) {
        return;
      }

      invite.id = invite.id || snapshot.key();
      self.getRoom(invite.roomId, function(room) {
        invite.toRoomName = room.name;
        self._invokeEventCallbacks('room-invite', invite);
      });
    },
    _onWildchatInviteResponse: function(snapshot) {
      var self = this,
        invite = snapshot.val();

      invite.id = invite.id || snapshot.key();
      this._invokeEventCallbacks('room-invite-response', invite);
    }
  };

  // Wildchat External Methods
  // --------------

  // Initialize the library and setup data listeners.
  Wildchat.prototype.setUser = function(userId, userName, callback) {
    var self = this;

    self._wilddog.app.auth().onAuthStateChanged(function(user) {
      if (user) {
        self._userId = userId.toString();
        self._userName = userName.toString();
        self._userRef = self._wilddog.child('users').child(self._userId);
        self._loadUserMetadata(function() {
          root.setTimeout(function() {
            callback(self._user);
            self._setupDataEvents();
          }, 0);
        });
      } else {
        self.warn('Wildchat requires an authenticated Wilddog reference. Pass an authenticated reference before loading.');
      }
    });
  };

  // Resumes the previous session by automatically entering rooms.
  Wildchat.prototype.resumeSession = function() {
    this._userRef.child('rooms').once('value', function(snapshot) {
      var rooms = snapshot.val();
      for (var roomId in rooms) {
        this.enterRoom(rooms[roomId].id);
      }
    }, /* onError */ function() {}, /* context */ this);
  };

  // Callback registration. Supports each of the following events:
  Wildchat.prototype.on = function(eventType, cb) {
    this._addEventCallback(eventType, cb);
  };

  // Create and automatically enter a new chat room.
  Wildchat.prototype.createRoom = function(roomName, roomType, callback) {
    var self = this,
      newRoomRef = this._roomRef.push();

    var newRoom = {
      id: newRoomRef.key(),
      name: roomName,
      type: roomType || 'public',
      createdByUserId: this._userId,
      createdAt: this._wilddog.ServerValue.TIMESTAMP
    };

    if (roomType === 'private') {
      newRoom.authorizedUsers = {};
      newRoom.authorizedUsers[this._userId] = true;
    }

    newRoomRef.set(newRoom, function(error) {
      if (!error) {
        self.enterRoom(newRoomRef.key());
      }
      if (callback) {
        callback(newRoomRef.key());
      }
    });
  };

  // Enter a chat room.
  Wildchat.prototype.enterRoom = function(roomId) {
    var self = this;
    self.getRoom(roomId, function(room) {
      var roomName = room.name;

      if (!roomId || !roomName) return;

      // Skip if we're already in this room.
      if (self._rooms[roomId]) {
        return;
      }

      self._rooms[roomId] = true;

      if (self._user) {
        // Save entering this room to resume the session again later.
        self._userRef.child('rooms').child(roomId).set({
          id: roomId,
          name: roomName,
          active: true
        });

        // Set presence bit for the room and queue it for removal on disconnect.
        var presenceRef = self._wilddog.child('room-users').child(roomId).child(self._userId).child(self._sessionId);
        self._queuePresenceOperation(presenceRef, {
          id: self._userId,
          name: self._userName
        }, null);
      }

      // Invoke our callbacks before we start listening for new messages.
      self._onEnterRoom({
        id: roomId,
        name: roomName
      });

      // Setup message listeners
      self._roomRef.child(roomId).once('value', function(snapshot) {
        self._messageRef.child(roomId).limitToLast(self._options.numMaxMessages).on('child_added', function(snapshot) {
          self._onNewMessage(roomId, snapshot);
        }, /* onCancel */ function() {
          // Turns out we don't have permission to access these messages.
          self.leaveRoom(roomId);
        }, /* context */ self);

        self._messageRef.child(roomId).limitToLast(self._options.numMaxMessages).on('child_removed', function(snapshot) {
          self._onRemoveMessage(roomId, snapshot);
        }, /* onCancel */ function() {}, /* context */ self);
      }, /* onFailure */ function() {}, self);
    });
  };

  // Leave a chat room.
  Wildchat.prototype.leaveRoom = function(roomId) {
    var self = this,
      userRoomRef = self._wilddog.child('room-users').child(roomId);

    // Remove listener for new messages to this room.
    self._messageRef.child(roomId).off();

    if (self._user) {
      var presenceRef = userRoomRef.child(self._userId).child(self._sessionId);

      // Remove presence bit for the room and cancel on-disconnect removal.
      self._removePresenceOperation(presenceRef, null);

      // Remove session bit for the room.
      self._userRef.child('rooms').child(roomId).remove();
    }

    delete self._rooms[roomId];

    // Invoke event callbacks for the room-exit event.
    self._onLeaveRoom(roomId);
  };

  Wildchat.prototype.sendMessage = function(roomId, messageContent, messageType, cb) {
    var self = this,
      message = {
        userId: self._userId,
        name: self._userName,
        timestamp: self._wilddog.ServerValue.TIMESTAMP,
        message: messageContent,
        type: messageType || 'default'
      },
      newMessageRef;

    if (!self._user) {
      self._onAuthRequired();
      if (cb) {
        cb(new Error('Not authenticated or user not set!'));
      }
      return;
    }

    newMessageRef = self._messageRef.child(roomId).push();
    newMessageRef.setWithPriority(message, self._wilddog.ServerValue.TIMESTAMP, cb);
  };

  Wildchat.prototype.deleteMessage = function(roomId, messageId, cb) {
    var self = this;

    self._messageRef.child(roomId).child(messageId).remove(cb);
  };

  // Mute or unmute a given user by id. This list will be stored internally and
  // all messages from the muted clients will be filtered client-side after
  // receipt of each new message.
  Wildchat.prototype.toggleUserMute = function(userId, cb) {
    var self = this;

    if (!self._user) {
      self._onAuthRequired();
      if (cb) {
        cb(new Error('Not authenticated or user not set!'));
      }
      return;
    }

    self._userRef.child('muted').child(userId).transaction(function(isMuted) {
      return (isMuted) ? null : true;
    }, cb);
  };

  // Send a moderator notification to a specific user.
  Wildchat.prototype.sendSuperuserNotification = function(userId, notificationType, data, cb) {
    var self = this,
      userNotificationsRef = self._wilddog.child('users').child(userId).child('notifications');

    userNotificationsRef.push({
      fromUserId: self._userId,
      timestamp: self._wilddog.ServerValue.TIMESTAMP,
      notificationType: notificationType,
      data: data || {}
    }, cb);
  };

  // Warn a user for violating the terms of service or being abusive.
  Wildchat.prototype.warnUser = function(userId) {
    var self = this;

    self.sendSuperuserNotification(userId, 'warning');
  };

  // Suspend a user by putting the user into read-only mode for a period.
  Wildchat.prototype.suspendUser = function(userId, timeLengthSeconds, cb) {
    var self = this,
      suspendedUntil = new Date().getTime() + 1000 * timeLengthSeconds;

    self._suspensionsRef.child(userId).set(suspendedUntil, function(error) {
      if (error && cb) {
        return cb(error);
      } else {
        self.sendSuperuserNotification(userId, 'suspension', {
          suspendedUntil: suspendedUntil
        });
        return cb(null);
      }
    });
  };

  // Invite a user to a specific chat room.
  Wildchat.prototype.inviteUser = function(userId, roomId) {
    var self = this,
      sendInvite = function() {
        var inviteRef = self._wilddog.child('users').child(userId).child('invites').push();
        inviteRef.set({
          id: inviteRef.key(),
          fromUserId: self._userId,
          fromUserName: self._userName,
          roomId: roomId
        });

        // Handle listen unauth / failure in case we're kicked.
        inviteRef.on('value', self._onWildchatInviteResponse, function() {}, self);
      };

    if (!self._user) {
      self._onAuthRequired();
      return;
    }

    self.getRoom(roomId, function(room) {
      if (room.type === 'private') {
        var authorizedUserRef = self._roomRef.child(roomId).child('authorizedUsers');
        authorizedUserRef.child(userId).set(true, function(error) {
          if (!error) {
            sendInvite();
          }
        });
      } else {
        sendInvite();
      }
    });
  };

  Wildchat.prototype.acceptInvite = function(inviteId, cb) {
    var self = this;

    self._userRef.child('invites').child(inviteId).once('value', function(snapshot) {
      var invite = snapshot.val();
      if (invite === null && cb) {
        return cb(new Error('acceptInvite(' + inviteId + '): invalid invite id'));
      } else {
        self.enterRoom(invite.roomId);
        self._userRef.child('invites').child(inviteId).update({
          'status': 'accepted',
          'toUserName': self._userName
        }, cb);
      }
    }, self);
  };

  Wildchat.prototype.declineInvite = function(inviteId, cb) {
    var self = this,
      updates = {
        'status': 'declined',
        'toUserName': self._userName
      };

    self._userRef.child('invites').child(inviteId).update(updates, cb);
  };

  Wildchat.prototype.getRoomList = function(cb) {
    var self = this;

    self._roomRef.once('value', function(snapshot) {
      cb(snapshot.val());
    });
  };

  Wildchat.prototype.getUsersByRoom = function() {
    var self = this,
      roomId = arguments[0],
      query = self._wilddog.child('room-users').child(roomId),
      cb = arguments[arguments.length - 1],
      limit = null;

    if (arguments.length > 2) {
      limit = arguments[1];
    }

    query = (limit) ? query.limitToLast(limit) : query;

    query.once('value', function(snapshot) {
      var usernames = snapshot.val() || {},
        usernamesUnique = {};

      for (var username in usernames) {
        for (var session in usernames[username]) {
          // Skip all other sessions for this user as we only need one.
          usernamesUnique[username] = usernames[username][session];
          break;
        }
      }

      root.setTimeout(function() {
        cb(usernamesUnique);
      }, 0);
    });
  };

  Wildchat.prototype.getUsersByPrefix = function(prefix, startAt, endAt, limit, cb) {
    var self = this,
      query = this._usersOnlineRef,
      prefixLower = prefix.toLowerCase();

    if (startAt) {
      query = query.startAt(null, startAt);
    } else if (endAt) {
      query = query.endAt(null, endAt);
    } else {
      query = (prefixLower) ? query.startAt(null, prefixLower) : query.startAt();
    }

    query = (limit) ? query.limitToLast(limit) : query;

    query.once('value', function(snapshot) {
      var usernames = snapshot.val() || {},
        usernamesFiltered = {};

      for (var userNameKey in usernames) {
        var sessions = usernames[userNameKey],
          userName, userId, usernameClean;

        // Grab the user data from the first registered active session.
        for (var sessionId in sessions) {
          userName = sessions[sessionId].name;
          userId = sessions[sessionId].id;

          // Skip all other sessions for this user as we only need one.
          break;
        }

        // Filter out any usernames that don't match our prefix and break.
        if ((prefix.length > 0) && (userName.toLowerCase().indexOf(prefixLower) !== 0))
          continue;

        usernamesFiltered[userName] = {
          name: userName,
          id: userId
        };
      }

      root.setTimeout(function() {
        cb(usernamesFiltered);
      }, 0);
    });
  };

  // Miscellaneous helper methods.
  Wildchat.prototype.getRoom = function(roomId, callback) {
    this._roomRef.child(roomId).once('value', function(snapshot) {
      console.log(snapshot.val());
      callback(snapshot.val());
    });
  };

  Wildchat.prototype.userIsModerator = function() {
    return this._isModerator;
  };

  Wildchat.prototype.warn = function(msg) {
    if (console) {
      msg = 'Wildchat Warning: ' + msg;
      if (typeof console.warn === 'function') {
        console.warn(msg);
      } else if (typeof console.log === 'function') {
        console.log(msg);
      }
    }
  };
})();
