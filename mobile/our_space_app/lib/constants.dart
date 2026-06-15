// Shared constants for "Our Space" companion app.

/// The live web app this companion wraps.
const String ourSpaceWebUrl =
    'https://arnoldmapindu.github.io/sam_n_al_space_to_inf_n_beyond/';

/// Firebase Realtime Database REST root (open rules, no auth needed).
const String firebaseDbBaseUrl =
    'https://our-space-857e7-default-rtdb.firebaseio.com';

/// shared_preferences key storing the device owner ("arnold" | "varaidzo").
const String prefDeviceOwner = 'device_owner';

/// shared_preferences keys used to detect changes between background ticks.
const String prefLastPartnerStatus = 'last_partner_status';
const String prefLastPartnerMoodTimestamp = 'last_partner_mood_ts';
const String prefLastChatKey = 'last_chat_key';
const String prefLastPartnerSosTimestamp = 'last_partner_sos_ts';
const String prefHasSyncedOnce = 'has_synced_once';

/// Background sync interval.
const Duration backgroundSyncInterval = Duration(minutes: 10);

/// Notification channel for partner activity alerts.
const String partnerChannelId = 'our_space_partner_updates';
const String partnerChannelName = 'Partner Updates';

/// Notification channel for the persistent foreground service notice.
const String serviceChannelId = 'our_space_service';
const String serviceChannelName = 'Our Space Background Sync';

const Map<String, String> partnerDisplayNames = {
  'arnold': 'Arnold',
  'varaidzo': 'Varaidzo',
};

const Map<String, String> partnerHearts = {
  'arnold': '💙',
  'varaidzo': '💖',
};

String otherOwner(String owner) => owner == 'arnold' ? 'varaidzo' : 'arnold';
