---
name: robius-matrix-integration
description: |
  CRITICAL: Use for Matrix SDK integration with Makepad. Triggers on:
  Matrix SDK, sliding sync, MatrixRequest, timeline,
  matrix-sdk, matrix client, robrix, matrix room,
  Matrix 集成, 聊天客户端
risk: unknown
source: community
---

# Robius Matrix SDK Integration Skill

Best practices for integrating external APIs with Makepad applications based on Robrix and Moly codebases.

**Source codebases:**
- **Robrix**: Matrix SDK integration - sliding sync, timeline subscriptions, real-time updates
- **Moly**: OpenAI/LLM API integration - SSE streaming, MCP protocol, multi-provider support

## When to Use
Use this skill when:
- Integrating Matrix SDK with Makepad
- Building a Matrix client with Makepad
- Implementing Matrix features (rooms, timelines, messages)
- Handling Matrix SDK async operations in UI
- Keywords: matrix-sdk, matrix client, robrix, matrix timeline, matrix room, sliding sync

## Overview

Robrix uses the `matrix-sdk` and `matrix-sdk-ui` crates to connect to Matrix homeservers. The key architectural decisions:

1. **Sliding Sync**: Uses native sliding sync for efficient room list updates
2. **Separate Runtime**: Tokio runtime runs Matrix operations, Makepad handles UI
3. **Request/Response Pattern**: UI sends requests, receives actions/updates back
4. **Per-Room Background Tasks**: Each room has dedicated timeline subscriber task

## MatrixRequest Pattern

### Request Enum Definition

```rust
/// All async requests that can be made to the Matrix worker task
pub enum MatrixRequest {
    /// Login requests
    Login(LoginRequest),
    Logout { is_desktop: bool },

    /// Timeline operations
    PaginateRoomTimeline {
        room_id: OwnedRoomId,
        num_events: u16,
        direction: PaginationDirection,
    },
    SendMessage {
        room_id: OwnedRoomId,
        message: RoomMessageEventContent,
        replied_to: Option<Reply>,
    },
    EditMessage {
        room_id: OwnedRoomId,
        timeline_event_item_id: TimelineEventItemId,
        edited_content: EditedContent,
    },
    RedactMessage {
        room_id: OwnedRoomId,
        timeline_event_id: TimelineEventItemId,
        reason: Option<String>,
    },

    /// Room operations
    JoinRoom { room_id: OwnedRoomId },
    LeaveRoom { room_id: OwnedRoomId },
    GetRoomMembers {
        room_id: OwnedRoomId,
        memberships: RoomMemberships,
        local_only: bool,
    },

    /// User operations
    GetUserProfile {
        user_id: OwnedUserId,
        room_id: Option<OwnedRoomId>,
        local_only: bool,
    },
    IgnoreUser {
        ignore: bool,
        room_member: RoomMember,
        room_id: OwnedRoomId,
    },

    /// Media operations
    FetchAvatar {
        mxc_uri: OwnedMxcUri,
        on_fetched: fn(AvatarUpdate),
    },
    FetchMedia {
        media_request: MediaRequestParameters,
        on_fetched: OnMediaFetchedFn,
        destination: MediaCacheEntryRef,
        update_sender: Option<crossbeam_channel::Sender<TimelineUpdate>>,
    },

    /// Typing/read indicators
    SendTypingNotice { room_id: OwnedRoomId, typing: bool },
    ReadReceipt { room_id: OwnedRoomId, event_id: OwnedEventId },
    FullyReadReceipt { room_id: OwnedRoomId, event_id: OwnedEventId },

    /// Reactions
    ToggleReaction {
        room_id: OwnedRoomId,
        timeline_event_id: TimelineEventItemId,
        reaction: String,
    },

    /// Subscriptions
    SubscribeToTypingNotices { room_id: OwnedRoomId, subscribe: bool },
    SubscribeToPinnedEvents { room_id: OwnedRoomId, subscribe: bool },
}
```

### Submit Pattern

```rust
static REQUEST_SENDER: Mutex<Option<UnboundedSender<MatrixRequest>>> = Mutex::new(None);

/// Submit request from UI thread to async runtime
pub fn submit_async_request(req: MatrixRequest) {
    if let Some(sender) = REQUEST_SENDER.lock().unwrap().as_ref() {
        sender.send(req).expect("BUG: matrix worker task receiver died!");
    }
}

// Usage in UI
submit_async_request(MatrixRequest::SendMessage {
    room_id: room_id.clone(),
    message: RoomMessageEventContent::text_plain(&text),
    replied_to: self.reply_to.take(),
});
```

## Worker Task Handler

```rust
async fn matrix_worker_task(
    mut request_receiver: UnboundedReceiver<MatrixRequest>,
    login_sender: Sender<LoginRequest>,
) -> Result<()> {
    while let Some(request) = request_receiver.recv().await {
        match request {
            MatrixRequest::PaginateRoomTimeline { room_id, num_events, direction } => {
                let (timeline, sender) = {
                    let rooms = ALL_JOINED_ROOMS.lock().unwrap();
                    let Some(room_info) = rooms.get(&room_id) else {
                        continue;  // Room not ready yet
                    };
                    (room_info.timeline.clone(), room_info.update_sender.clone())
                };

                // Spawn dedicated task for this operation
                Handle::current().spawn(async move {
                    // Notify UI pagination is starting
                    sender.send(TimelineUpdate::PaginationRunning(direction)).unwrap();
                    SignalToUI::set_ui_signal();

                    // Perform pagination
                    let res = if direction == PaginationDirection::Forwards {
                        timeline.paginate_forwards(num_events).await
                    } else {
                        timeline.paginate_backwards(num_events).await
                    };

                    // Send result to UI
                    match res {
                        Ok(fully_paginated) => {
                            sender.send(TimelineUpdate::PaginationIdle {
                                fully_paginated,
                                direction,
                            }).unwrap();
                        }
                        Err(error) => {
                            sender.send(TimelineUpdate::PaginationError {
                                error,
                                direction,
                            }).unwrap();
                        }
                    }
                    SignalToUI::set_ui_signal();
                });
            }

            MatrixRequest::JoinRoom { room_id } => {
                let Some(client) = get_client() else { continue };

                Handle::current().spawn(async move {
                    let result_action = if let Some(room) = client.get_room(&room_id) {
                        match room.join().await {
                            Ok(()) => JoinRoomResultAction::Joined { room_id },
                            Err(e) => JoinRoomResultAction::Failed { room_id, error: e },
                        }
                    } else {
                        match client.join_room_by_id(&room_id).await {
                            Ok(_) => JoinRoomResultAction::Joined { room_id },
                            Err(e) => JoinRoomResultAction::Failed { room_id, error: e },
                        }
                    };
                    Cx::post_action(result_action);
                });
            }
            // ... handle other requests
        }
    }
    Ok(())
}
```

## Timeline Updates

### TimelineUpdate Enum

```rust
pub enum TimelineUpdate {
    /// New items added to timeline
    NewItems {
        new_items: Vector<Arc<TimelineItem>>,
        changed_indices: BTreeSet<usize>,
        is_append: bool,
    },
    /// Pagination state changes
    PaginationRunning(PaginationDirection),
    PaginationIdle {
        fully_paginated: bool,
        direction: PaginationDirection,
    },
    PaginationError {
        error: Error,
        direction: PaginationDirection,
    },
    /// Message edit result
    MessageEdited {
        timeline_event_id: TimelineEventItemId,
        result: Result<(), Error>,
    },
    /// Room members fetched
    RoomMembersListFetched {
        members: Vec<RoomMember>,
        sort: PrecomputedMemberSort,
        is_local_fetch: bool,
    },
    /// Unread count updated
    NewUnreadMessagesCount(UnreadMessageCount),
    /// User power levels fetched
    UserPowerLevels(UserPowerLevels),
}
```

### Per-Room Update Flow

```rust
struct JoinedRoomDetails {
    room_id: OwnedRoomId,
    timeline: Arc<Timeline>,
    timeline_update_sender: crossbeam_channel::Sender<TimelineUpdate>,
    timeline_subscriber_handler_task: JoinHandle<()>,
    typing_notice_subscriber: Option<EventHandlerDropGuard>,
}

impl Drop for JoinedRoomDetails {
    fn drop(&mut self) {
        // Cleanup background tasks when room closes
        self.timeline_subscriber_handler_task.abort();
        drop(self.typing_notice_subscriber.take());
    }
}

// Spawn subscriber for a room
async fn spawn_timeline_subscriber(
    room_id: OwnedRoomId,
    timeline: Arc<Timeline>,
    sender: crossbeam_channel::Sender<TimelineUpdate>,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        let (items, mut stream) = timeline.subscribe().await;

        // Send initial items
        sender.send(TimelineUpdate::NewItems {
            new_items: items,
            changed_indices: BTreeSet::new(),
            is_append: false,
        }).unwrap();
        SignalToUI::set_ui_signal();

        // Listen for updates
        while let Some(diff) = stream.next().await {
            let update = process_timeline_diff(diff);
            sender.send(update).unwrap();
            SignalToUI::set_ui_signal();
        }
    })
}
```

### Handling Updates in UI

```rust
impl Widget for RoomScreen {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        // Poll timeline updates on Signal events
        if let Event::Signal = event {
            while let Ok(update) = self.timeline_state.update_receiver.try_recv() {
                match update {
                    TimelineUpdate::NewItems { new_items, changed_indices, is_append } => {
                        self.apply_new_items(cx, new_items, changed_indices, is_append);
                    }
                    TimelineUpdate::PaginationIdle { fully_paginated, direction } => {
                        self.set_pagination_idle(cx, direction, fully_paginated);
                    }
                    TimelineUpdate::PaginationError { error, direction } => {
                        self.show_pagination_error(cx, direction, &error);
                    }
                    // ... handle other updates
                }
            }
        }

        self.view.handle_event(cx, event, scope);
    }
}
```

## Room List Updates

### RoomsListUpdate Enum

```rust
pub enum RoomsListUpdate {
    NotLoaded,
    LoadedRooms { max_rooms: Option<u32> },
    AddInvitedRoom(InvitedRoomInfo),
    AddJoinedRoom(JoinedRoomInfo),
    ClearRooms,
    UpdateLatestEvent {
        room_id: OwnedRoomId,
        timestamp: MilliSecondsSinceUnixEpoch,
        latest_message_text: String,
    },
    UpdateNumUnreadMessages {
        room_id: OwnedRoomId,
        unread_messages: UnreadMessageCount,
        unread_mentions: u64,
    },
    UpdateRoomName { new_room_name: RoomNameId },
    UpdateRoomAvatar { room_id: OwnedRoomId, avatar: FetchedRoomAvatar },
    RemoveRoom { room_id: OwnedRoomId, new_state: RoomState },
    Status { status: String },
    ScrollToRoom(OwnedRoomId),
}

static PENDING_ROOM_UPDATES: SegQueue<RoomsListUpdate> = SegQueue::new();

pub fn enqueue_rooms_list_update(update: RoomsListUpdate) {
    PENDING_ROOM_UPDATES.push(update);
    SignalToUI::set_ui_signal();
}
```

## Client Build Pattern

```rust
async fn build_client(
    homeserver_url: &str,
    data_dir: &Path,
) -> Result<(Client, ClientSessionPersisted)> {
    // Generate unique subfolder for this session
    let db_subfolder = format!("db_{}", chrono::Local::now().format("%F_%H_%M_%S_%f"));
    let db_path = data_dir.join(db_subfolder);

    // Generate random passphrase for encryption
    let passphrase: String = {
        use rand::{Rng, thread_rng};
        thread_rng()
            .sample_iter(rand::distributions::Alphanumeric)
            .take(32)
            .map(char::from)
            .collect()
    };

    let client = Client::builder()
        .server_name_or_homeserver_url(homeserver_url)
        .sqlite_store(&db_path, Some(&passphrase))
        .sliding_sync_version_builder(VersionBuilder::DiscoverNative)
        .with_decryption_settings(DecryptionSettings {
            sender_device_trust_requirement: TrustRequirement::Untrusted,
        })
        .with_encryption_settings(EncryptionSettings {
            auto_enable_cross_signing: true,
            backup_download_strategy: BackupDownloadStrategy::OneShot,
            auto_enable_backups: true,
        })
        .request_config(
            RequestConfig::new().timeout(Duration::from_secs(60))
        )
        .build()
        .await?;

    Ok((client, ClientSessionPersisted { homeserver: homeserver_url.to_string(), db_path, passphrase }))
}
```

## Best Practices

1. **Always spawn tasks**: Don't block the worker task receiver loop
2. **Use crossbeam channels for per-room updates**: More efficient than global queue
3. **Always call SignalToUI::set_ui_signal()**: After enqueueing any update
4. **Handle room not ready**: Skip requests for rooms not yet in `ALL_JOINED_ROOMS`
5. **Cleanup on drop**: Abort background tasks when rooms are closed
6. **Use Cx::post_action for results**: Posted actions are handled in App::handle_actions
7. **Use SegQueue for high-frequency updates**: Lock-free for room list updates

## Reference Files

- `references/matrix-client.md` - Matrix client setup and login patterns (Robrix)
- `references/timeline-handling.md` - Matrix timeline subscription patterns (Robrix)
- `references/moly-api-integration.md` - Moly API integration patterns
  - OpenAI client with SSE streaming
  - Platform-agnostic async streams
  - MCP (Model Context Protocol) integration
  - Tool approval flow
  - MolyClient for local server
  - BotContext for multi-provider support

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
